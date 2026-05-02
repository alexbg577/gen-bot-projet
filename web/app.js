require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const db = require('./utils/database');

const app = express();
const PORT = process.env.WEB_PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './data' }),
  secret: process.env.SESSION_SECRET || 'raizen_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

app.get('/login', (req, res) => {
  res.render('login', { error: req.query.error });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'raizen2026') {
    req.session.user = { username: 'admin', role: 'admin' };
    return res.redirect('/dashboard');
  }
  res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/dashboard', requireAuth, (req, res) => {
  const stock = db.all('SELECT tier, service, COUNT(*) as count FROM stock WHERE claimed_by IS NULL GROUP BY tier, service', []);
  const tickets = db.all('SELECT * FROM tickets WHERE status = "open" ORDER BY created_at DESC LIMIT 10', []);
  const users = db.all('SELECT * FROM users ORDER BY vouches DESC LIMIT 10', []);
  res.render('dashboard', { user: req.session.user, stock, tickets, topUsers: users });
});

app.get('/gen', requireAuth, (req, res) => {
  const { tier, service } = req.query;
  if (!tier || !service) return res.status(400).json({ error: 'Missing parameters' });

  const stock = db.get('SELECT * FROM stock WHERE tier = ? AND service LIKE ? AND claimed_by IS NULL LIMIT 1', [tier, `%${service}%`]);
  if (!stock) return res.status(404).json({ error: 'No stock available' });

  db.run('INSERT INTO tickets (user_id, service, tier, status) VALUES (?, ?, ?, ?)', [req.session.user?.id || 'web_user', service, tier, 'open']);
  db.run('UPDATE stock SET claimed_by = ?, claimed_at = ? WHERE id = ?', ['web_user', Math.floor(Date.now() / 1000), stock.id]);

  res.json({ success: true, credentials: stock.credentials });
});

module.exports = app;
