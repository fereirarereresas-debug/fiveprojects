// ========================================
// FIVE SPOOFER - MAIN SERVER
// ========================================

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const crypto = require('crypto');
const config = require('./config');

// ========================================
// APP INITIALIZATION
// ========================================

const app = express();

// ========================================
// SECURITY MIDDLEWARE
// ========================================

// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);
app.use('/auth/', limiter);

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ========================================
// SESSION CONFIGURATION
// ========================================

app.use(session({
    secret: config.session.secret,
    name: config.session.name,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: config.session.maxAge,
        httpOnly: config.session.httpOnly,
        secure: config.session.secure,
        sameSite: config.session.sameSite,
        domain: config.session.domain
    }
}));

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Send anonymous log to Discord webhook
 * @param {string} event - Event name
 * @param {object} data - Additional data (optional)
 */
async function sendWebhookLog(event, data = {}) {
    try {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        
        const embed = {
            title: '🔔 Five Spoofer - Evento Anônimo',
            color: 3447003, // Blue color
            fields: [
                {
                    name: '📌 Evento',
                    value: event,
                    inline: true
                },
                {
                    name: '🕐 Horário (UTC)',
                    value: timestamp,
                    inline: true
                }
            ],
            footer: {
                text: 'Five Spoofer Logs'
            },
            timestamp: new Date()
        };

        // Add additional fields if provided
        if (Object.keys(data).length > 0) {
            Object.entries(data).forEach(([key, value]) => {
                embed.fields.push({
                    name: key,
                    value: String(value),
                    inline: true
                });
            });
        }

        await axios.post(config.webhookUrl, {
            username: 'Five Spoofer Bot',
            avatar_url: 'https://cdn.discordapp.com/attachments/1433046622119395398/1434603914765926430/8c483fb4-b068-4f95-a95c-0fe9bdfb3931.png',
            embeds: [embed]
        });

        console.log(`✅ Webhook log sent: ${event}`);
    } catch (error) {
        console.error('❌ Error sending webhook log:', error.message);
    }
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
    
    return { verifier, challenge };
}

/**
 * Generate CSRF state token
 */
function generateState() {
    return crypto.randomBytes(32).toString('hex');
}

// ========================================
// ROUTES
// ========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ========================================
// DISCORD OAUTH2 ROUTES
// ========================================

/**
 * Initiate Discord OAuth2 login
 */
app.get('/auth/discord', (req, res) => {
    try {
        // Generate CSRF state
        const state = generateState();
        req.session.oauthState = state;

        // Generate PKCE (optional but recommended)
        const { verifier, challenge } = generatePKCE();
        req.session.codeVerifier = verifier;

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: config.discord.clientId,
            redirect_uri: config.discord.redirectUri,
            response_type: 'code',
            scope: config.discord.scope,
            state: state,
            // code_challenge: challenge, // Uncomment for PKCE
            // code_challenge_method: 'S256'
        });

        const authUrl = `${config.discord.authUrl}?${params.toString()}`;

        // Log event
        sendWebhookLog('Login Iniciado');

        res.json({ authUrl });
    } catch (error) {
        console.error('Error initiating Discord auth:', error);
        res.status(500).json({ error: 'Failed to initiate authentication' });
    }
});

/**
 * Discord OAuth2 callback
 */
app.get('/auth/discord/callback', async (req, res) => {
    const { code, state } = req.query;

    try {
        // Validate state (CSRF protection)
        if (!state || state !== req.session.oauthState) {
            throw new Error('Invalid state parameter');
        }

        // Clear state from session
        delete req.session.oauthState;

        // Exchange code for access token
        const tokenParams = new URLSearchParams({
            client_id: config.discord.clientId,
            client_secret: config.discord.clientSecret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: config.discord.redirectUri,
            // code_verifier: req.session.codeVerifier // Uncomment for PKCE
        });

        const tokenResponse = await axios.post(
            config.discord.tokenUrl,
            tokenParams.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Fetch user information
        const userResponse = await axios.get(config.discord.userUrl, {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        const user = userResponse.data;

        // Store user in session
        req.session.user = {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: Date.now() + expires_in * 1000
        };

        // Log successful login
        sendWebhookLog('Login Concluído', {
            '👤 Usuário': `${user.username}#${user.discriminator}`
        });

        // Redirect to frontend
        res.redirect(`${config.frontendUrl}?login=success`);
    } catch (error) {
        console.error('Discord callback error:', error.response?.data || error.message);
        res.redirect(`${config.frontendUrl}?login=error`);
    }
});

/**
 * Logout
 */
app.post('/auth/logout', (req, res) => {
    const username = req.session.user?.username || 'Unknown';
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }

        res.clearCookie(config.session.name);
        
        // Log logout
        sendWebhookLog('Logout Realizado', {
            '👤 Usuário': username
        });

        res.json({ success: true });
    });
});

// ========================================
// USER API ROUTES
// ========================================

/**
 * Get current user
 */
app.get('/api/user', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Return user without sensitive data
    const { accessToken, refreshToken, expiresAt, ...safeUser } = req.session.user;
    
    res.json({
        user: {
            ...safeUser,
            avatar_url: safeUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${safeUser.id}/${safeUser.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(safeUser.discriminator) % 5}.png`
        }
    });
});

// ========================================
// WEBHOOK LOG ROUTE
// ========================================

/**
 * Send anonymous event log
 */
app.post('/webhook/log', async (req, res) => {
    try {
        const { event, data } = req.body;

        if (!event) {
            return res.status(400).json({ error: 'Event name is required' });
        }

        await sendWebhookLog(event, data || {});

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook log error:', error);
        res.status(500).json({ error: 'Failed to send log' });
    }
});

// ========================================
// CONTACT FORM ROUTE
// ========================================

/**
 * Handle contact form submission
 */
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validate input
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Send to webhook
        await axios.post(config.webhookUrl, {
            username: 'Five Spoofer - Contato',
            avatar_url: 'https://cdn.discordapp.com/attachments/1433046622119395398/1434603914765926430/8c483fb4-b068-4f95-a95c-0fe9bdfb3931.png',
            embeds: [{
                title: '📧 Nova Mensagem de Contato',
                color: 3447003,
                fields: [
                    {
                        name: '👤 Nome',
                        value: name,
                        inline: true
                    },
                    {
                        name: '📧 E-mail',
                        value: email,
                        inline: true
                    },
                    {
                        name: '💬 Mensagem',
                        value: message.length > 1000 ? message.substring(0, 1000) + '...' : message,
                        inline: false
                    }
                ],
                footer: {
                    text: 'Five Spoofer Contact Form'
                },
                timestamp: new Date()
            }]
        });

        // Log event
        sendWebhookLog('Formulário de Contato Enviado', {
            '📧 E-mail': email
        });

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: config.env === 'development' ? err.message : undefined
    });
});

// ========================================
// START SERVER
// ========================================

app.listen(config.port, () => {
    console.log('\n🚀 Five Spoofer Backend Server');
    console.log('================================');
    console.log(`📡 Server running on port ${config.port}`);
    console.log(`🌍 Environment: ${config.env}`);
    console.log(`🔗 Frontend URL: ${config.frontendUrl}`);
    console.log(`✅ Discord OAuth2 configured`);
    console.log(`✅ Webhook logging enabled`);
    console.log('================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    process.exit(0);
});