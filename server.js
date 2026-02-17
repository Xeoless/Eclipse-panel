const express = require('express');
const path = require('path');
const Docker = require('dockerode');

const app = express();
const docker = new Docker();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Dashboard at root and /dashboard
app.get(['/', '/dashboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Real create server API
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
        PortBindings: { '25565/tcp': [{ HostPort: '' }] },
        Memory: 2147483648,
        NanoCPUs: Math.floor(cpu * 10000000),
        Binds: [`${path.join(__dirname, 'volumes', serverName)}:/data`]
      },
      Tty: true,
      OpenStdin: true,
      Labels: { 'eclipser.owner': 'user' }
    });

    await container.start();

    res.json({
      success: true,
      message: `Server "${serverName}" (${mcType}) created!`,
      containerId: container.id.slice(0, 12)
    });
  } catch (err) {
    console.error('Creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Running on port 3000');
});
