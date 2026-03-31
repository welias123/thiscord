const GoogleStrategy  = require('passport-google-oauth20').Strategy;
const GitHubStrategy  = require('passport-github2').Strategy;
const db = require('../database');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function upsertGoogle(profile) {
  const email  = profile.emails?.[0]?.value ?? null;
  const avatar = profile.photos?.[0]?.value ?? null;
  const name   = profile.displayName || 'Unknown';

  let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id);
  if (user) {
    db.prepare(`UPDATE users SET display_name=?, avatar_url=?, last_login=CURRENT_TIMESTAMP WHERE id=?`)
      .run(name, avatar, user.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

  // Try to merge with existing account by email
  if (email) {
    const byEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (byEmail) {
      db.prepare('UPDATE users SET google_id=?, last_login=CURRENT_TIMESTAMP WHERE id=?')
        .run(profile.id, byEmail.id);
      return db.prepare('SELECT * FROM users WHERE id = ?').get(byEmail.id);
    }
  }

  const row = db.prepare(
    `INSERT INTO users (google_id, email, display_name, avatar_url, provider)
     VALUES (?, ?, ?, ?, 'google')`
  ).run(profile.id, email, name, avatar);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.lastInsertRowid);
}

function upsertGitHub(profile) {
  const email    = profile.emails?.[0]?.value ?? null;
  const avatar   = profile.photos?.[0]?.value ?? null;
  const name     = profile.displayName || profile.username || 'Unknown';
  const username = profile.username ?? null;
  const ghId     = String(profile.id);

  let user = db.prepare('SELECT * FROM users WHERE github_id = ?').get(ghId);
  if (user) {
    db.prepare(`UPDATE users SET display_name=?, avatar_url=?, last_login=CURRENT_TIMESTAMP WHERE id=?`)
      .run(name, avatar, user.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

  const row = db.prepare(
    `INSERT INTO users (github_id, email, display_name, avatar_url, username, provider)
     VALUES (?, ?, ?, ?, ?, 'github')`
  ).run(ghId, email, name, avatar, username);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.lastInsertRowid);
}

// ─── Export ───────────────────────────────────────────────────────────────────
module.exports = (passport) => {
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || false);
  });

  // Google
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  `${process.env.BASE_URL}/auth/google/callback`,
      },
      (_at, _rt, profile, done) => {
        try { done(null, upsertGoogle(profile)); }
        catch (e) { done(e); }
      }
    ));
  }

  // GitHub
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy(
      {
        clientID:     process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:  `${process.env.BASE_URL}/auth/github/callback`,
        scope:        ['user:email'],
      },
      (_at, _rt, profile, done) => {
        try { done(null, upsertGitHub(profile)); }
        catch (e) { done(e); }
      }
    ));
  }
};
