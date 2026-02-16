const express = require('express');
const path = require('path');

const app = express();

// Serve static files (CSS, images, etc.) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Main route → serve dashboard.html directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Optional: Catch-all for 404 pages (you can remove or customize)
app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eclipser Dashboard is running on port ${PORT}`);
  console.log(`Open in browser: http://localhost:${PORT}`);
});
