// server.js
// This is the "brain" of the website. It runs on your computer (or a host later)
// and handles: saving new accounts, checking logins, and hashing passwords
// so real passwords are never stored anywhere.

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const passport = require('passport');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const SALT_ROUNDS = 10; // how much "scrambling" work goes into hashing each password

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

// ---------- Tiny "database" (a JSON file) ----------
// For a real, public website you'd swap this for a real database (Postgres, MongoDB, etc).
// For learning and small/personal projects, a JSON file is perfectly fine.
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const raw = fs.readFileSync(USERS_FILE, 'utf-8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = loadUsers().find(u => u.id === id);
  done(null, user || null);
});

// ---------- Sign up ----------
app.post('/api/signup', async (req, res) => {
  const { username, email, password, phone, preferences, experience } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please fill in every field.' });
  }

  const users = loadUsers();
  const exists = users.find(u => u.email === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  // This is the important part: we NEVER save the plain password.
  // bcrypt turns "mypassword123" into something like
  // "$2b$10$N9qo8uLOickgx2ZMRZoMy..." which cannot be reversed back into the original.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = {
    id: Date.now().toString(),
    username,
    email: email.toLowerCase(),
    passwordHash,
    phone: phone || '',
    preferences: preferences || [],
    experience: experience || '',
    provider: 'local',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  req.login(newUser, () => {
    res.json({ message: 'Account created!', username: newUser.username });
  });
});

// ---------- Log in ----------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please fill in every field.' });
  }

  const users = loadUsers();
  const user = users.find(u => u.email === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'No account found with that email.' });
  }

  // bcrypt.compare re-hashes the typed password and checks it against the stored hash.
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  req.login(user, () => {
    res.json({ message: 'Welcome back!', username: user.username });
  });
});

app.get('/api/me', (req, res) => {
  if (req.user) {
    res.json({ loggedIn: true, username: req.user.username });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post('/api/logout', (req, res) => {
  req.logout(() => res.json({ message: 'Logged out' }));
});

// ---------- Social login (Google / Facebook / LinkedIn) ----------
// These only turn on if you've added real API keys in a .env file.
// See README.md -> "Turning on Google/Facebook/LinkedIn sign-in" for the exact steps.
// Until you add keys, the buttons will show a friendly message instead of crashing the app.
require('./social-login')(app, passport);

app.listen(PORT, () => {
  console.log(`\n✅ Server running! Open http://localhost:${PORT}/login.html in your browser\n`);
});
