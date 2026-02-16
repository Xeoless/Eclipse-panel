const express = require('express');
const path = require('path');

const app = express();

// Serve static files from public/ (CSS, future images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Clean URLs - serve dashboard.html for these paths
app.get(['/', '/dashboard', '/home'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Optional: Redirect old /dashboard.html to clean URL
app.get('/dashboard.html', (req, res) => {
  res.redirect('/dashboard');
});

// Example future routes (add these when ready)
app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create.html')); // if you make a separate create page
});

app.get('/shop', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'shop.html'));
});

// Catch-all fallback (404)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html')); // optional - create a simple 404.html
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eclipser running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
});
