require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// Serve static files from public/ (CSS, JS if added later, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Root route loads dashboard.html directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Optional: Catch-all for any other routes (404 page or redirect)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html')); // Create a simple 404.html if you want
  // or res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eclipser Dashboard running on port ${PORT}`);
  console.log(`Open: http://localhost:${PORT}`);
});
