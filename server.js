// server.js - Eclipser Panel MVP (fixed version)
require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Docker = require('dockerode');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const docker = new Docker(); // Will throw if Docker not available

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const db = new sqlite3.Database('./eclipser.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user'
    )
  `, (err) => {
    if (err) console.error('Table creation error:', err.message);
  });

  // Default admin user
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (err) {
      console.error('Admin check error:', err.message);
    } else if (!row) {
      const hash = bcrypt.hashSync('changeMe123!', 10);
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        ['admin', hash, 'admin'],
        (err) => {
          if (err) console.error('Admin creation error:', err.message);
          else console.log('Default admin created');
        }
      );
    }
  });
});

// Middleware: authenticate JWT
const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.redirect('/login');
    req.user = decoded;
    next();
  });
};

// Routes
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('login', { error: 'Username and password required' });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      console.error('Login DB error:', err.message);
      return res.render('login', { error: 'Server error, try later' });
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.render('login', { error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, { httpOnly: true, secure: false }); // secure: true in production
    res.redirect('/dashboard');
  });
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('register', { error: 'Username and password required' });
  }

  const hash = bcrypt.hashSync(password, 10);

  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash], function(err) {
    if (err) {
      console.error('Register error:', err.message);
      return res.render('register', { error: 'Username already taken or server error' });
    }
    res.redirect('/login');
  });
});

app.get('/dashboard', authenticate, async (req, res) => {
  let servers = [];
  let error = null;

  try {
    const containers = await docker.listContainers({ all: true });
    servers = containers.map(c => ({
      id: c.Id.slice(0, 12),
      name: c.Names[0]?.replace(/^\//, '') || 'Unnamed',
      state: c.State,
      status: c.Status
    }));
  } catch (err) {
    console.error('Docker list error:', err.message);
    error = 'Could not load servers (Docker issue). ' + err.message;
  }

  res.render('dashboard', { user: req.user, servers, error });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Eclipser Panel running → http://localhost:${PORT}`);
});
