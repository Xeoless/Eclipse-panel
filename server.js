const express = require('express');
const path = require('path');
const Docker = require('dockerode');

const app = express();
const docker = new Docker(); // Connects to local Docker daemon

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve dashboard at root and /dashboard
app.get(['/', '/dashboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API endpoint for creating server (called from JS in dashboard.html)
app.post('/api/create-server', async (req, res) => {
  const {
    serverName = 'myserver',
    cpu = 100,
    disk = 5,
    node = 'india',
    alloc = 1,
    backup = 1,
    type = 'paper'
  } = req.body;

  try {
    // Map type to image variant (itzg/minecraft-server supports these)
    const serverTypeMap = {
      paper: 'PAPER',
      purpur: 'PURPUR',
      fabric: 'FABRIC',
      forge: 'FORGE',
      bungeecord: 'BUNGEECORD',
      velocity: 'VELOCITY'
    };

    const typeEnv = serverTypeMap[type.toLowerCase()] || 'PAPER';

    const container = await docker.createContainer({
      Image: 'itzg/minecraft-server:latest',
      name: `eclipser-${serverName}-${Date.now()}`,
      Env: [
        'EULA=TRUE',
        `TYPE=${typeEnv}`,
        `MEMORY=2G`, // Can make dynamic later
        'DIFFICULTY=normal',
        'ENABLE_RCON=true',
        'RCON_PASSWORD=secret123',
        // Add more env vars as needed (mods, plugins, etc.)
      ],
      ExposedPorts: { '25565/tcp': {} },
      HostConfig: {
        PortBindings: { '25565/tcp': [{ HostPort: '25565' }] }, // Change to dynamic port later
        Memory: 2 * 1024 * 1024 * 1024, // 2GB example
        NanoCPUs: Math.floor(cpu * 1e9 / 100), // CPU % → nano CPUs (approximate)
        Binds: [`/home/eclipser/volumes/${serverName}:/data`], // Persistent disk
      },
      Labels: {
        'eclipser.owner': 'user1', // Later use real user ID
        'eclipser.node': node,
        'eclipser.cpu': cpu.toString(),
        'eclipser.disk': disk.toString()
      },
      Tty: true,
      OpenStdin: true
    });

    await container.start();

    res.json({
      success: true,
      message: `Server "${serverName}" created and started!`,
      containerId: container.id.slice(0, 12)
    });
  } catch (err) {
    console.error('Docker error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create server'
    });
  }
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).send('Not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eclipser running on port ${PORT}`);
});
