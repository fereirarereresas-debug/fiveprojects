// ========================================
// FiveProjects Anti-Cheat - Main Script
// ========================================

// Discord Webhook URL - CONFIGURE AQUI
const DISCORD_WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL_HERE';

// ========================================
// Loading Screen
// ========================================
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
        
        // Send visitor log to Discord
        sendVisitorLog();
    }, 1500);
});

// ========================================
// Language Detection and Switching
// ========================================
let currentLang = localStorage.getItem('language') || detectBrowserLanguage();

function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('pt') ? 'pt' : 'en';
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = getNestedTranslation(translations[lang], key);
        
        if (translation) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        }
    });
    
    // Update select options
    updateSelectOptions();
    
    // Update language toggle button
    document.getElementById('current-lang').textContent = lang.toUpperCase();
}

function getNestedTranslation(obj, path) {
    return path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
}

function updateSelectOptions() {
    const typeSelect = document.getElementById('type');
    if (typeSelect) {
        const options = typeSelect.querySelectorAll('option');
        options.forEach(option => {
            const key = option.getAttribute('data-i18n');
            if (key) {
                const translation = getNestedTranslation(translations[currentLang], key);
                if (translation) option.textContent = translation;
            }
        });
    }
}

// Language toggle button
document.getElementById('lang-toggle').addEventListener('click', () => {
    const newLang = currentLang === 'pt' ? 'en' : 'pt';
    setLanguage(newLang);
});

// Initialize language on page load
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
});

// ========================================
// Navigation Menu Toggle (Mobile)
// ========================================
const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.getElementById('nav-menu');

menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// Close menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// ========================================
// Smooth Scrolling & Active Sections
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for section animations
const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, observerOptions);

document.querySelectorAll('.section, .hero-section').forEach(section => {
    observer.observe(section);
});

// ========================================
// FAQ Accordion
// ========================================
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const faqItem = button.parentElement;
        const isActive = faqItem.classList.contains('active');
        
        // Close all FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Open clicked item if it wasn't active
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

// ========================================
// Contact Form Submission
// ========================================
document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        playerId: document.getElementById('player-id').value,
        type: document.getElementById('type').value,
        message: document.getElementById('message').value
    };
    
    // Send to Discord webhook
    await sendContactFormToDiscord(formData);
    
    // Reset form
    e.target.reset();
    
    // Show success message
    alert(currentLang === 'pt' 
        ? 'Mensagem enviada com sucesso! Entraremos em contato em breve.' 
        : 'Message sent successfully! We will contact you soon.');
});

// ========================================
// Discord Webhook Functions
// ========================================
async function sendVisitorLog() {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
        console.warn('Discord webhook not configured');
        return;
    }
    
    const userAgent = navigator.userAgent;
    const browser = getBrowserInfo(userAgent);
    const timestamp = new Date().toISOString();
    
    // Get visitor IP (using external API)
    let userIP = 'Unknown';
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
    } catch (error) {
        console.error('Failed to get IP:', error);
    }
    
    const embed = {
        embeds: [{
            title: '🆕 New Visitor on FiveProjects Anti-Cheat',
            color: 0x007BFF,
            fields: [
                {
                    name: '🌐 IP Address',
                    value: userIP,
                    inline: true
                },
                {
                    name: '🖥️ Browser',
                    value: browser,
                    inline: true
                },
                {
                    name: '🌍 Language',
                    value: currentLang.toUpperCase(),
                    inline: true
                },
                {
                    name: '📱 User Agent',
                    value: `\`\`\`${userAgent}\`\`\``,
                    inline: false
                }
            ],
            timestamp: timestamp,
            footer: {
                text: 'FiveProjects Anti-Cheat Visitor Log'
            }
        }]
    };
    
    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(embed)
        });
    } catch (error) {
        console.error('Failed to send visitor log to Discord:', error);
    }
}

async function sendContactFormToDiscord(formData) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
        console.warn('Discord webhook not configured');
        return;
    }
    
    const timestamp = new Date().toISOString();
    const typeLabels = {
        support: '🛠️ Support / Suporte',
        appeal: '⚖️ Appeal / Apelação',
        partnership: '🤝 Partnership / Parceria'
    };
    
    const embed = {
        embeds: [{
            title: '📬 New Contact Form Submission',
            color: 0x00FF00,
            fields: [
                {
                    name: '👤 Name / Nome',
                    value: formData.name,
                    inline: true
                },
                {
                    name: '📧 Email',
                    value: formData.email,
                    inline: true
                },
                {
                    name: '🎮 Player ID',
                    value: formData.playerId || 'Not provided / Não fornecido',
                    inline: true
                },
                {
                    name: '📋 Type / Tipo',
                    value: typeLabels[formData.type],
                    inline: false
                },
                {
                    name: '💬 Message / Mensagem',
                    value: formData.message,
                    inline: false
                }
            ],
            timestamp: timestamp,
            footer: {
                text: 'FiveProjects Anti-Cheat Contact Form'
            }
        }]
    };
    
    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(embed)
        });
    } catch (error) {
        console.error('Failed to send contact form to Discord:', error);
    }
}

function getBrowserInfo(userAgent) {
    let browser = 'Unknown';
    
    if (userAgent.indexOf('Firefox') > -1) {
        browser = '🦊 Firefox';
    } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
        browser = '🎭 Opera';
    } else if (userAgent.indexOf('Trident') > -1) {
        browser = '🌐 Internet Explorer';
    } else if (userAgent.indexOf('Edge') > -1) {
        browser = '🔷 Edge';
    } else if (userAgent.indexOf('Chrome') > -1) {
        browser = '🟢 Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
        browser = '🧭 Safari';
    }
    
    return browser;
}