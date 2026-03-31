const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'thiscord.db'));

db.exec(`PRAGMA journal_mode = WAL;`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id     TEXT UNIQUE,
    github_id     TEXT UNIQUE,
    email         TEXT,
    display_name  TEXT NOT NULL,
    avatar_url    TEXT,
    username      TEXT,
    provider      TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
