# Login / Sign Up Website

A dark, teal login + sign-up page (matching your screenshot) with:
- Real animations (button ripple, shake + "please fill in this field" bubble, loading spinner)
- A working backend that hashes passwords with bcrypt (real passwords are never stored)
- Google / LinkedIn / Facebook sign-in buttons, ready to activate once you get API keys

## 0. What you need before starting
- Install **Node.js** (this lets your computer run JavaScript outside the browser): https://nodejs.org — download the "LTS" version and click through the installer.
- Install **VS Code**: https://code.visualstudio.com

## 1. Open the project in VS Code
1. Unzip/extract the `loginapp` folder somewhere you'll remember (like your Desktop).
2. Open VS Code.
3. Go to **File → Open Folder…** and select the `loginapp` folder.

## 2. Open a terminal inside VS Code
- Go to **Terminal → New Terminal** (top menu). A black panel opens at the bottom — this is where you'll type commands.

## 3. Install the project's building blocks
In that terminal, type this and press Enter:
```
npm install
```
This downloads the small code libraries the project depends on (Express for the web server, bcrypt for password hashing, etc.) into a `node_modules` folder. It can take a minute — that's normal.

## 4. Run the website
```
npm start
```
You should see:
```
✅ Server running! Open http://localhost:3000/login.html in your browser
```
Open that link in your browser (Chrome, Edge, etc.). You now have a live, working login page.

To stop the server later, click into the terminal and press `Ctrl + C`.

## 5. Try it out
1. Go to `http://localhost:3000/signup.html`
2. Fill in a username, email, and password (try leaving a field blank first — you'll see the shake + tooltip animation from your screenshot).
3. Click **Sign Up**. Your account is created and saved (with a hashed password) in `users.json`.
4. You're redirected to a welcome page. Click **Log out**, then log back in at `login.html` with the same email/password to prove it works.

Open `users.json` in VS Code — you'll see your account, but the `passwordHash` field is a scrambled string like `$2b$10$...`, never your real password. That's bcrypt at work.

## 6. Making changes
- **Colors / layout** → edit `public/style.css`
- **Page text / structure** → edit `public/login.html` and `public/signup.html`
- **Animations / form behavior** → edit `public/script.js`
- **Account logic (signup/login rules)** → edit `server.js`

After changing a file, save it (`Ctrl + S`), then just refresh your browser. If you changed `server.js`, stop the server (`Ctrl + C`) and run `npm start` again — or run `npm run dev` instead of `npm start`, which restarts automatically every time you save (uses the `nodemon` tool already listed in the project).

## 7. Turning on real Google / LinkedIn / Facebook sign-in
Right now, clicking those buttons shows a friendly "not set up yet" page instead of crashing. Each company requires you to register your website with them first — there's no way to skip this step for a real, working integration. Here's how:

1. In the `loginapp` folder, copy `.env.example` and rename the copy to `.env`.
2. **Google**: Go to https://console.cloud.google.com → create a project → "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID" → Web application. Set the redirect URI to `http://localhost:3000/auth/google/callback`. Copy the Client ID/Secret into `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
3. **Facebook**: Go to https://developers.facebook.com → "My Apps" → Create App → add "Facebook Login" product. Set the redirect URI to `http://localhost:3000/auth/facebook/callback`. Copy the App ID/Secret into `.env`.
4. **LinkedIn**: Go to https://developer.linkedin.com → "My Apps" → Create App → request "Sign In with LinkedIn". Set the redirect URI to `http://localhost:3000/auth/linkedin/callback`. Copy the Client ID/Secret into `.env`.
5. Restart the server (`Ctrl + C`, then `npm start`). The buttons will now log people in for real.

You only need to set up the ones you actually want — leave the others blank in `.env` and they'll keep showing the friendly placeholder page.

## 8. Moving this online (optional, later)
Right now this only runs on your own computer (`localhost`). To make it a real public website, you'd deploy it to a host like Render, Railway, or Vercel, and swap `users.json` for a real database (e.g. SQLite or PostgreSQL), since most hosts don't keep files saved between restarts. Ask me when you're ready for that step — it's a separate, smaller job once the site itself works the way you want.

## Project structure
```
loginapp/
  server.js          -> the web server: routes, sessions
  social-login.js     -> Google/Facebook/LinkedIn wiring
  users.json           -> where accounts are stored (auto-created)
  .env.example         -> template for your secret API keys
  public/
    login.html
    signup.html
    welcome.html
    style.css
    script.js
```
