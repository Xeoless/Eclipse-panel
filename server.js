require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const db = new sqlite3.Database('./eclipser.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )`);

  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      const hash = bcrypt.hashSync('changeMe123!', 10);
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hash, 'admin']);
    }
  });
});

const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  jwt.verify(token, process.env.JWT_SECRET || 'supersecret', (err, decoded) => {
    if (err) return res.sendFile(path.join(__dirname, 'public', 'login.html'));
    req.user = decoded;
    next();
  });
};

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password)) {
      return res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
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

  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash], function(err) {
    if (err) {
      return res.sendFile(path.join(__dirname, 'public', 'register.html'));
    }
    res.redirect('/login');
  });
});

app.get('/dashboard', authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eclipser running on port ${PORT}`);
});
