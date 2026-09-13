// server.js
// This is the "brain" of the website. It runs on your computer (or a host later)
// and handles: saving new accounts, checking logins, and hashing passwords
// so real passwords are never stored anywhere.

require('dotenv').config();
const express = require('express');
const {MongoClient} = require('mongodb');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const multer = require('multer');
const mammoth = require('mammoth');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const SALT_ROUNDS = 10; // how much "scrambling" work goes into hashing each password
const upload = multer({ storage: multer.memoryStorage() });
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

let db;
async function connectDB() {
  await client.connect();
  db = client.db('swiftapply');
  console.log('✅ Connected to MongoDB');
}

// ---------- Basic setup ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'change-this-to-a-random-string-later', // see README: move this to an env variable
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// ---------- MongoDB database ----------

function usersCollection() {
  return db.collection('users');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await usersCollection().findOne({ id });
    done(null, user || null);
  } catch (err) {
    done(err);
  }
});

// ---------- Sign up ----------
app.post('/api/signup', async (req, res) => {
  const { username, email, password, phone, preferences, experience } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please fill in every field.' });
  }

  const emailLower = email.toLowerCase();

  try {
    const exists = await usersCollection().findOne({
      email: emailLower
    });

    if (exists) {
      return res.status(409).json({
        error: 'An account with that email already exists.'
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      id: Date.now().toString(),
      username,
      email: emailLower,
      passwordHash,
      phone: phone || '',
      preferences: preferences || [],
      experience: experience || '',
      provider: 'local',
      createdAt: new Date().toISOString()
    };

    await usersCollection().insertOne(newUser);

    req.login(newUser, () => {
      res.json({
        message: 'Account created!',
        username: newUser.username
      });
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      error: 'Could not create account.'
    });
  }
});

// ---------- Log in ----------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Please fill in every field.'
    });
  }

  const emailLower = email.toLowerCase();

  try {
    const user = await usersCollection().findOne({
      email: emailLower
    });

    if (!user) {
      return res.status(401).json({
        error: 'No account found with that email.'
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      return res.status(401).json({
        error: 'Incorrect password.'
      });
    }

    req.login(user, () => {
      res.json({
        message: 'Welcome back!',
        username: user.username
      });
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'Could not log in right now.'
    });
  }
});
// ---------- Job search (Adzuna) ----------
app.get('/api/jobs', async (req, res) => {
  const query = req.query.q || 'developer';
  const country = 'in'; // Adzuna's free tier covers gb, us, in, and others

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=10&what=${encodeURIComponent(query)}&content-type=application/json`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const jobs = (data.results || []).map(job => ({
      title: job.title,
      company: job.company?.display_name || 'Unknown company',
      location: job.location?.display_name || 'Not specified',
      description: job.description,
      url: job.redirect_url,
      salary: job.salary_min ? `₹${Math.round(job.salary_min)} - ₹${Math.round(job.salary_max)}` : 'Not listed'
    }));

    res.json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch jobs right now.' });
  }
});

// ---------- Resume matching (ported from teammate's Streamlit logic) ----------

// Same idea as her extract_text_from_file(), but PDF now uses pdfjs-dist
// in "recovery mode" so it can still read PDFs with minor structural issues
// that stricter parsers reject outright.
async function extractTextFromFile(file) {
  try {
    if (file.originalname.toLowerCase().endsWith('.pdf')) {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(file.buffer),
        stopAtErrors: false,
        disableFontFace: true
      });
      const pdfDoc = await loadingTask.promise;
      let text = '';
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      return text;
    } else if (file.originalname.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value;
    }
    return '';
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}

// Same idea as her check_ats_health()
function checkAtsHealth(text) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(text);
  const hasPhone = /\+?\d[\d -]{8,}\d/.test(text);
  let score = 0;
  if (wordCount >= 100) score += 40;
  if (hasEmail) score += 30;
  if (hasPhone) score += 30;
  return { score, wordCount, hasEmail, hasPhone };
}

app.post('/api/resume/analyze', upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const resumeText = await extractTextFromFile(req.file);
  const ats = checkAtsHealth(resumeText);

  res.json({ resumeText, ats });
});

// ---------- Social login (Google / Facebook / LinkedIn) ----------
// These only turn on if you've added real API keys in a .env file.
// See README.md -> "Turning on Google/Facebook/LinkedIn sign-in" for the exact steps.
// Until you add keys, the buttons will show a friendly message instead of crashing the app.
require('./social-login')(app, passport);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n✅ Server running! Open http://localhost:${PORT}/login.html in your browser\n`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });