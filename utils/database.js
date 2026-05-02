const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || './data/raizen_gen.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let SQL = null;

async function init() {
  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    createTables();
  }
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      vouches INTEGER DEFAULT 0,
      last_vouch_time INTEGER DEFAULT 0,
      joined_at INTEGER DEFAULT (strftime('%s', 'now')),
      is_verified INTEGER DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier TEXT NOT NULL,
      service TEXT NOT NULL,
      credentials TEXT NOT NULL,
      added_by TEXT NOT NULL,
      added_at INTEGER DEFAULT (strftime('%s', 'now')),
      claimed_by TEXT,
      claimed_at INTEGER
    )
  `);
  db.run(`
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
    )
  `);
  db.run(`
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
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS vouch_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id TEXT NOT NULL,
      voucher_id TEXT NOT NULL,
      timestamp INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      created_by TEXT NOT NULL
    )
  `);
  save();
}

function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql, params);
  const result = stmt.getAsObject();
  stmt.free();
  return Object.keys(result).length ? result : null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql, params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function prepare(sql) {
  return {
    run: (...params) => { db.run(sql, params); save(); },
    get: (...params) => {
      const stmt = db.prepare(sql, params);
      const result = stmt.getAsObject();
      stmt.free();
      return Object.keys(result).length ? result : null;
    },
    all: (...params) => {
      const stmt = db.prepare(sql, params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  };
}

// Initialize on require
init().catch(console.error);

module.exports = { run, get, all, prepare, init };
