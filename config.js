// ========================================
// CONFIGURATION MODULE
// ========================================

require('dotenv').config();

const config = {
    // Server
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    
    // Frontend
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5500',
    
    // Discord OAuth2
    discord: {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        redirectUri: process.env.DISCORD_REDIRECT_URI,
        guildId: process.env.DISCORD_GUILD_ID,
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userUrl: 'https://discord.com/api/users/@me',
        scope: 'identify'
    },
    
    // Webhook
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    
    // Session
    session: {
        secret: process.env.SESSION_SECRET || 'change-this-secret-key',
        name: 'five_spoofer_session',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.COOKIE_SECURE === 'true',
        httpOnly: true,
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        domain: process.env.COOKIE_DOMAIN
    }
};

// Validate required environment variables
const requiredVars = [
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_REDIRECT_URI',
    'DISCORD_WEBHOOK_URL'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n📝 Please create a .env file based on .env.example\n');
    process.exit(1);
}

module.exports = config;