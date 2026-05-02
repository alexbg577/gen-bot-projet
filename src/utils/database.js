const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/raizen_gen.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    vouches INTEGER DEFAULT 0,
    last_vouch_time INTEGER DEFAULT 0,
    joined_at INTEGER DEFAULT (strftime('%s', 'now')),
    is_verified BOOLEAN DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tier TEXT NOT NULL,
    service TEXT NOT NULL,
    credentials TEXT NOT NULL,
    added_by TEXT NOT NULL,
    added_at INTEGER DEFAULT (strftime('%s', 'now')),
    claimed_by TEXT,
    claimed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT UNIQUE,
    user_id TEXT NOT NULL,
    service TEXT NOT NULL,
    tier TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    staff_claimed TEXT,
    account_given TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    closed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prize TEXT NOT NULL,
    end_time INTEGER NOT NULL,
    entries TEXT DEFAULT '[]',
    winner_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_by TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT
  );

  CREATE TABLE IF NOT EXISTS vouch_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT NOT NULL,
    voucher_id TEXT NOT NULL,
    timestamp INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    created_by TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_stock_tier_service ON stock(tier, service, claimed_by);
  CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_vouch_logs_staff ON vouch_logs(staff_id, voucher_id);
`);

module.exports = db;
