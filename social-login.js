// social-login.js
// This file wires up "Sign in with Google / Facebook / LinkedIn".
//
// IMPORTANT: Each of these companies requires you to register your app with
// them first and get a "Client ID" and "Client Secret" — two secret codes
// that prove your website is really yours. There is no way around this step;
// it's how every real app does social login, not just this project.
//
// Until you add real keys below (in a .env file), clicking these buttons
// will show a friendly "not set up yet" message instead of crashing.
// Full instructions are in README.md.

require('dotenv').config();
const fs = require('fs');
const path = require('path');

module.exports = function (app, passport) {
  const USERS_FILE = path.join(__dirname, 'users.json');
  function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    const raw = fs.readFileSync(USERS_FILE, 'utf-8').trim();
    return raw ? JSON.parse(raw) : [];
  }
  function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }

  function findOrCreateSocialUser(provider, profile) {
    const users = loadUsers();
    let user = users.find(u => u.provider === provider && u.providerId === profile.id);
    if (user) return user;

    user = {
      id: Date.now().toString(),
      username: profile.displayName || `${provider}_user`,
      email: (profile.emails && profile.emails[0] && profile.emails[0].value) || '',
      provider,
      providerId: profile.id,
      passwordHash: null, // social accounts don't need a password
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  const providers = [
    {
      name: 'google',
      envId: 'GOOGLE_CLIENT_ID',
      envSecret: 'GOOGLE_CLIENT_SECRET',
      Strategy: require('passport-google-oauth20').Strategy,
      strategyOptions: {
        callbackURL: '/auth/google/callback',
        scope: ['profile', 'email']
      }
    },
    {
      name: 'facebook',
      envId: 'FACEBOOK_APP_ID',
      envSecret: 'FACEBOOK_APP_SECRET',
      Strategy: require('passport-facebook').Strategy,
      strategyOptions: {
        callbackURL: '/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'emails'],
        scope: ['email']
      }
    },
    {
      name: 'linkedin',
      envId: 'LINKEDIN_CLIENT_ID',
      envSecret: 'LINKEDIN_CLIENT_SECRET',
      Strategy: require('passport-linkedin-oauth2').Strategy,
      strategyOptions: {
        callbackURL: '/auth/linkedin/callback',
        scope: ['r_emailaddress', 'r_liteprofile']
      }
    }
  ];

  providers.forEach(({ name, envId, envSecret, Strategy, strategyOptions }) => {
    const clientID = process.env[envId];
    const clientSecret = process.env[envSecret];
    const isConfigured = Boolean(clientID && clientSecret);

    if (isConfigured) {
      passport.use(new Strategy(
        { clientID, clientSecret, ...strategyOptions },
        (accessToken, refreshToken, profile, done) => {
          const user = findOrCreateSocialUser(name, profile);
          done(null, user);
        }
      ));

      app.get(`/auth/${name}`, passport.authenticate(name));
      app.get(`/auth/${name}/callback`,
        passport.authenticate(name, { failureRedirect: '/login.html' }),
        (req, res) => res.redirect('/welcome.html')
      );
    } else {
      // Not configured yet -> send a clear message instead of a crash.
      app.get(`/auth/${name}`, (req, res) => {
        res.status(501).send(`
          <body style="font-family: sans-serif; text-align:center; padding:60px;">
            <h2>${name[0].toUpperCase() + name.slice(1)} sign-in isn't set up yet</h2>
            <p>Add ${envId} and ${envSecret} to your .env file to turn this on.</p>
            <p>See README.md → "Turning on social sign-in".</p>
            <a href="/login.html">← Back to login</a>
          </body>
        `);
      });
    }
  });
};
