const socket = io();
const chatContainer = document.getElementById('chat-container');

const TIKTOK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-tiktok" viewBox="0 0 16 16"> <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/> </svg>`;
const TWITCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-twitch" viewBox="0 0 16 16"> <path d="M3.857 0 1 2.857v10.286h3.429V16l2.857-2.857H9.57L14.714 8V0H3.857zm9.714 7.429-2.285 2.285H9l-2 2v-2H4.429V1.143h9.142v6.286z"/> <path d="M11.857 3.143h-1.143V6.57h1.143V3.143zm-3.143 0H7.571V6.57h1.143V3.143z"/> </svg>`;

let currentConfig = {
    theme: 'default',
    chatAlign: 'left',
    chatFade: 0,
    fontSize: 16
};

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('initial_state', (config) => {
    setConfig(config);
});

socket.on('config_update', (config) => {
    setConfig(config);
});

socket.on('chat', (data) => {
    addMessage(data);
});

function setConfig(config) {
    if (!config) return;
    currentConfig = { ...currentConfig, ...config };

    const theme = config.theme || 'default';
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-align', config.chatAlign || 'left');
    document.documentElement.style.setProperty('--font-size', (config.fontSize || 16) + 'px');
}

function addMessage(data) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';

    const platformIconHtml = data.platform === 'tiktok' ? TIKTOK_ICON : TWITCH_ICON;

    if (currentConfig.theme === 'nosockzone') {
        const titleBar = document.createElement('div');
        titleBar.className = 'xp-title-bar';

        const titleLeft = document.createElement('div');
        titleLeft.style.display = 'flex';
        titleLeft.style.alignItems = 'center';
        titleLeft.style.gap = '5px';
        titleLeft.innerHTML = `${platformIconHtml} <span>${data.user}</span>`;

        const titleRight = document.createElement('div');
        // Simple close button graphic
        titleRight.innerHTML = `<div style="width:16px; height:16px; background:#e73f3f; border:1px solid white; border-radius:2px; display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-family:sans-serif;">x</div>`;

        titleBar.appendChild(titleLeft);
        titleBar.appendChild(titleRight);

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'xp-body';
        bodyDiv.textContent = data.message;

        msgDiv.appendChild(titleBar);
        msgDiv.appendChild(bodyDiv);

    } else {
        const iconSpan = document.createElement('span');
        iconSpan.className = `platform-icon ${data.platform}-icon`;

        if (data.platform === 'tiktok') {
            iconSpan.innerHTML = TIKTOK_ICON;
        } else if (data.platform === 'twitch') {
            iconSpan.innerHTML = TWITCH_ICON;
        }

        const userSpan = document.createElement('span');
        userSpan.className = 'user';
        userSpan.style.color = data.color || generateColor(data.user);
        userSpan.textContent = data.user + ': ';

        const textSpan = document.createElement('span');
        textSpan.className = 'text';
        textSpan.textContent = data.message;

        msgDiv.appendChild(iconSpan);
        msgDiv.appendChild(userSpan);
        msgDiv.appendChild(textSpan);
    }

    chatContainer.appendChild(msgDiv);

    // Fadeout Logic
    if (currentConfig.chatFade > 0) {
        setTimeout(() => {
            msgDiv.style.transition = 'opacity 1s ease-out';
            msgDiv.style.opacity = '0';
            setTimeout(() => {
                if (msgDiv.parentNode) msgDiv.remove();
            }, 1000);
        }, currentConfig.chatFade * 1000);
    }

    // Auto-scroll logic if needed, or remove old messages
    if (chatContainer.children.length > 50) {
        chatContainer.removeChild(chatContainer.firstChild);
    }

    // Scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);
}

function generateColor(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}
