const express = require('express');
const path = require('path');
const Docker = require('dockerode');

const app = express();
const docker = new Docker();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Serve dashboard at root and /dashboard
app.get(['/', '/dashboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Real Minecraft server creation API
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
    const typeMap = {
      paper: 'PAPER',
      purpur: 'PURPUR',
      fabric: 'FABRIC',
      forge: 'FORGE',
      bungeecord: 'BUNGEECORD',
      velocity: 'VELOCITY'
    };

    const mcType = typeMap[type.toLowerCase()] || 'PAPER';

    const container = await docker.createContainer({
      Image: 'itzg/minecraft-server:latest',
      name: `eclipser-${serverName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      Env: [
        'EULA=TRUE',
        `TYPE=${mcType}`,
        'MEMORY=2G',
        'DIFFICULTY=normal',
        'ENABLE_RCON=true',
        'RCON_PASSWORD=secret123',
        'USE_AIKAR_FLAGS=true'
      ],
      ExposedPorts: { '25565/tcp': {} },
      HostConfig: {
        PortBindings: { '25565/tcp': [{ HostPort: '' }] }, // auto-assign host port
        Memory: 2147483648, // 2 GB (adjust later)
        NanoCPUs: Math.floor(cpu * 10000000), // rough % to nanoCPUs
        Binds: [`${path.join(__dirname, 'volumes', serverName)}:/data`] // persistent volume
      },
      Tty: true,
      OpenStdin: true,
      Labels: {
        'eclipser.owner': 'user', // add real user later
        'eclipser.node': node
      }
    });

    await container.start();

    res.json({
      success: true,
      message: `Minecraft server "${serverName}" (${mcType}) created and started!`,
      containerId: container.id.slice(0, 12)
    });
  } catch (err) {
    console.error('Docker creation failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create server' });
  }
});

app.listen(3000, () => {
  console.log('Eclipser running on port 3000');
});
