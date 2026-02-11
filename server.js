const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const tmi = require('tmi.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const config = {
    tiktokUsername: '',
    twitchChannel: '',
    theme: 'default',
    chatAlign: 'left',
    chatFade: 0,
    fontSize: 16
};

let tiktokLiveConnection = null;
let twitchClient = null;

async function connectServices() {
    // Disconnect existing
    if (tiktokLiveConnection) {
        try {
            tiktokLiveConnection.removeAllListeners();
            tiktokLiveConnection = null;
        } catch (e) { console.error('Error disconnecting TikTok:', e); }
    }
    if (twitchClient) {
        try {
            await twitchClient.disconnect();
        } catch (e) {
            // Ignore disconnect errors if not connected
        }
        twitchClient = null;
    }

    console.log('Reconnecting services with config:', config);

    // TikTok Connection
    if (config.tiktokUsername && config.tiktokUsername !== 'NONE') {
        tiktokLiveConnection = new WebcastPushConnection(config.tiktokUsername);

        tiktokLiveConnection.connect().then(state => {
            console.info(`Connected to TikTok Live: ${state.roomId}`);
        }).catch(err => {
            console.error('Failed to connect to TikTok Live:', err);
        });

        tiktokLiveConnection.on('chat', data => {
            io.emit('chat', {
                platform: 'tiktok',
                user: data.uniqueId,
                message: data.comment,
                color: '#ff0050',
                theme: config.theme
            });
        });
    }

    // Twitch Connection
    if (config.twitchChannel && config.twitchChannel !== 'NONE') {
        twitchClient = new tmi.Client({
            channels: [config.twitchChannel]
        });

        twitchClient.connect().catch(console.error);

        twitchClient.on('message', (channel, tags, message, self) => {
            io.emit('chat', {
                platform: 'twitch',
                user: tags['display-name'],
                message: message,
                color: tags['color'] || '#9146FF',
                theme: config.theme
            });
        });
    }

    // Demo Mode Management
    manageDemoMode();
}

// Demo Mode Interval
let demoInterval = null;
function manageDemoMode() {
    if (demoInterval) clearInterval(demoInterval);

    // Only run demo mode if BOTH Username/Channel are empty/NONE
    const noTiktok = !config.tiktokUsername || config.tiktokUsername === 'NONE';
    const noTwitch = !config.twitchChannel || config.twitchChannel === 'NONE';

    if (noTiktok && noTwitch) {
        console.log('Starting DEMO MODE');
        demoInterval = setInterval(() => {
            const platforms = ['tiktok', 'twitch'];
            const platform = platforms[Math.floor(Math.random() * platforms.length)];
            const users = ['User1', 'StreamFan', 'Gamer123', 'Viewer99'];
            const messages = ['Hello!', 'Cool stream!', 'Larry Smells', 'Nice overlay!'];

            io.emit('chat', {
                platform: platform,
                user: users[Math.floor(Math.random() * users.length)],
                message: messages[Math.floor(Math.random() * messages.length)],
                color: platform === 'tiktok' ? '#ff0050' : '#9146FF',
                theme: config.theme
            });
        }, 3000);
    } else {
        console.log('Stopping DEMO MODE (Real credentials provided)');
    }
}

// API Endpoints
app.get('/api/config', (req, res) => {
    res.json(config);
});

// Serve Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.post('/api/config', async (req, res) => {
    const newConfig = req.body;

    let needsReconnect = false;
    if (newConfig.tiktokUsername !== config.tiktokUsername || newConfig.twitchChannel !== config.twitchChannel) {
        needsReconnect = true;
    }

    // Update config
    config = { ...config, ...newConfig };

    // Emit full config update
    io.emit('config_update', config);

    if (needsReconnect) {
        await connectServices();
    }

    res.json({ status: 'ok', config });
});

io.on('connection', (socket) => {
    console.log('Frontend connected');
    socket.emit('initial_state', config);
});

connectServices();

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
