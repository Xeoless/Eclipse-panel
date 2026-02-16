require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Docker = require('dockerode');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const docker = new Docker();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
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
  if (!token) return res.redirect('/login');
  jwt.verify(token, process.env.JWT_SECRET || 'supersecret', (err, decoded) => {
    if (err) return res.redirect('/login');
    req.user = decoded;
    next();
  });
};

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password)) {
      return res.render('login', { error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/dashboard');
  });
});

app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.render('register', { error: 'Missing fields' });
  const hash = bcrypt.hashSync(password, 10);
  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash], (err) => {
    if (err) return res.render('register', { error: 'Username taken' });
    res.redirect('/login');
  });
});

app.get('/dashboard', authenticate, async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    res.render('dashboard', { user: req.user, servers: containers });
  } catch (err) {
    res.render('dashboard', { user: req.user, servers: [], error: err.message });
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Eclipser running on port ${PORT}`);
});
