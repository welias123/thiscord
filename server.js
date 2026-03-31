require('dotenv').config();
const express        = require('express');
const session        = require('express-session');
const passport       = require('passport');
const path           = require('path');
const SQLiteStore    = require('connect-sqlite3')(session);

require('./auth/passport')(passport);

const app  = express();
const PORT = process.env.PORT || 8080;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Always add ngrok bypass header to every response
app.use((_req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Sessions (stored in SQLite so they survive restarts)
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname) }),
  secret:            process.env.SESSION_SECRET || 'thiscord-dev-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   false,           // set to true if behind HTTPS-only proxy
    httpOnly: true,
    maxAge:   7 * 24 * 60 * 60 * 1000,  // 1 week
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ─── Auth Routes ──────────────────────────────────────────────────────────────
const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasGitHub = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

if (hasGoogle) {
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=google' }),
    (_req, res) => res.redirect('/profile')
  );
}

if (hasGitHub) {
  app.get('/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );
  app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login?error=github' }),
    (_req, res) => res.redirect('/profile')
  );
}

app.get('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect('/'));
  });
});

// ─── API ─────────────────────────────────────────────────────────────────────
app.get('/api/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.user);
});

// Tell the frontend which providers are configured
app.get('/api/providers', (_req, res) => {
  res.json({ google: hasGoogle, github: hasGitHub });
});

// ─── Page Routes ─────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/profile');
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// ─── Static Files (must be last) ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ⚡  ThisCord server started');
  console.log(`  →   http://localhost:${PORT}`);
  console.log(`  →   Google OAuth : ${hasGoogle ? '✓ configured' : '✗ not configured (add GOOGLE_CLIENT_ID to .env)'}`);
  console.log(`  →   GitHub OAuth : ${hasGitHub ? '✓ configured' : '✗ not configured (add GITHUB_CLIENT_ID to .env)'}`);
  console.log('');
});
