require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Parse form data and cookies FIRST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ──────────────────────────────────────────────
// Define ALL routes BEFORE static middleware
// ──────────────────────────────────────────────

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }

  const db = new sqlite3.Database('./eclipser.db');
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password)) {
      return res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }

    const token = jwt.sign(
      { username: user.username },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '24h' }
    );

    res.cookie('token', token, { httpOnly: true });
    res.redirect('/dashboard');
  });
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.sendFile(path.join(__dirname, 'public', 'register.html'));
  }

  const hash = bcrypt.hashSync(password, 10);
  const db = new sqlite3.Database('./eclipser.db');

  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash], function(err) {
    if (err) {
      return res.sendFile(path.join(__dirname, 'public', 'register.html'));
    }
    res.redirect('/login');
  });
});

app.get('/dashboard', (req, res) => {
  // Simple auth check (improve later)
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// ──────────────────────────────────────────────
// Static files LAST — only for CSS, images, etc.
// ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all for 404
app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eclipser running on port ${PORT}`);
});
