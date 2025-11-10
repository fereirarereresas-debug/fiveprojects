// ========================================
// FiveProjects Anti-Cheat - Futuristic Script
// ========================================

// Discord Webhook URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1434621471707107378/u-JzEqQ5D22kWKyJeP_qv0MgOZaKMK3jcB96ocH8EPOoSv2PFEORm1bbb8Jr8b_R2WsR';

// ========================================
// Dark Theme Auto-Detection (Time-Based)
// ========================================
function setThemeByTime() {
    const hour = new Date().getHours();
    // Dark theme from 18:00 to 6:00
    if (hour >= 18 || hour < 6) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// ========================================
// Particles.js Configuration
// ========================================
function initParticles() {
    if (typeof tsParticles !== 'undefined') {
        tsParticles.load("particles-js", {
            particles: {
                number: {
                    value: 80,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: "#007BFF"
                },
                shape: {
                    type: "circle"
                },
                opacity: {
                    value: 0.5,
                    random: true,
                    anim: {
                        enable: true,
                        speed: 1,
                        opacity_min: 0.1,
                        sync: false
                    }
                },
                size: {
                    value: 3,
                    random: true,
                    anim: {
                        enable: true,
                        speed: 2,
                        size_min: 0.1,
                        sync: false
                    }
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: "#00D9FF",
                    opacity: 0.4,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: "none",
                    random: false,
                    straight: false,
                    out_mode: "out",
                    bounce: false
                }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: {
                        enable: true,
                        mode: "repulse"
                    },
                    onclick: {
                        enable: true,
                        mode: "push"
                    },
                    resize: true
                },
                modes: {
                    repulse: {
                        distance: 100,
                        duration: 0.4
                    },
                    push: {
                        particles_nb: 4
                    }
                }
            },
            retina_detect: true
        });
    }
}

// ========================================
// Loading Screen
// ========================================
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
        
        // Send visitor log to Discord
        sendVisitorLog();
    }, 2000);
});

// ========================================
// Language Detection and Switching
// ========================================
let currentLang = localStorage.getItem('language') || detectBrowserLanguage();

function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('es')) return 'es';
    return 'en';
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
                element.innerHTML = translation;
            }
        }
    });
    
    // Update language toggle button
    document.getElementById('current-lang').textContent = lang.toUpperCase();
    
    // Update Discord tooltip
    updateDiscordTooltip();
}

function getNestedTranslation(obj, path) {
    return path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
}

function updateDiscordTooltip() {
    const tooltip = document.querySelector('.discord-tooltip');
    if (tooltip) {
        const tooltips = {
            pt: 'Entrar no Discord',
            en: 'Join Discord',
            es: 'Unirse a Discord'
        };
        tooltip.textContent = tooltips[currentLang] || tooltips.en;
    }
}

// Language toggle button
document.getElementById('lang-toggle').addEventListener('click', () => {
    const langs = ['pt', 'en', 'es'];
    const currentIndex = langs.indexOf(currentLang);
    const nextLang = langs[(currentIndex + 1) % langs.length];
    setLanguage(nextLang);
});

// Initialize language on page load
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
    setThemeByTime();
    initParticles();
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
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Intersection Observer for section animations
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -100px 0px'
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
// Accordion Functionality
// ========================================
document.querySelectorAll('.accordion-header').forEach(button => {
    button.addEventListener('click', () => {
        const accordionItem = button.parentElement;
        const isActive = accordionItem.classList.contains('active');
        
        // Close all accordion items
        document.querySelectorAll('.accordion-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Open clicked item if it wasn't active
        if (!isActive) {
            accordionItem.classList.add('active');
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
        message: document.getElementById('message').value
    };
    
    // Send to Discord webhook
    await sendContactFormToDiscord(formData);
    
    // Reset form
    e.target.reset();
    
    // Show success message
    const messages = {
        pt: '✅ Mensagem enviada com sucesso! Entraremos em contato em breve.',
        en: '✅ Message sent successfully! We will contact you soon.',
        es: '✅ ¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.'
    };
    alert(messages[currentLang] || messages.en);
});

// ========================================
// Discord Webhook Functions
// ========================================
async function sendVisitorLog() {
    if (!DISCORD_WEBHOOK_URL) {
        console.warn('Discord webhook not configured');
        return;
    }
    
    const userAgent = navigator.userAgent;
    const browser = getBrowserInfo(userAgent);
    const timestamp = new Date().toISOString();
    
    // Get visitor IP
    let userIP = 'Unknown';
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
    } catch (error) {
        console.error('Failed to get IP:', error);
    }
    
    // Get location info
    let locationInfo = 'Unknown';
    try {
        const locationResponse = await fetch(`https://ipapi.co/${userIP}/json/`);
        const locationData = await locationResponse.json();
        locationInfo = `${locationData.city || 'Unknown'}, ${locationData.country_name || 'Unknown'}`;
    } catch (error) {
        console.error('Failed to get location:', error);
    }
    
    const embed = {
        embeds: [{
            title: '🆕 Novo Visitante - FiveProjects Anti-Cheat',
            description: 'Um novo usuário acessou o site do FiveProjects Anti-Cheat.',
            color: 0x007BFF,
            fields: [
                {
                    name: '🌐 Endereço IP',
                    value: `\`${userIP}\``,
                    inline: true
                },
                {
                    name: '📍 Localização',
                    value: locationInfo,
                    inline: true
                },
                {
                    name: '🖥️ Navegador',
                    value: browser,
                    inline: true
                },
                {
                    name: '🌍 Idioma',
                    value: currentLang.toUpperCase(),
                    inline: true
                },
                {
                    name: '🕐 Horário',
                    value: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                    inline: true
                },
                {
                    name: '🎨 Tema',
                    value: document.body.classList.contains('dark-theme') ? 'Escuro 🌙' : 'Claro ☀️',
                    inline: true
                },
                {
                    name: '📱 User Agent',
                    value: `\`\`\`${userAgent.substring(0, 100)}...\`\`\``,
                    inline: false
                }
            ],
            thumbnail: {
                url: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png'
            },
            footer: {
                text: 'FiveProjects Anti-Cheat - Sistema de Logs',
                icon_url: 'https://cdn-icons-png.flaticon.com/512/2919/2919906.png'
            },
            timestamp: timestamp
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
        console.log('✅ Visitor log sent to Discord');
    } catch (error) {
        console.error('❌ Failed to send visitor log to Discord:', error);
    }
}

async function sendContactFormToDiscord(formData) {
    if (!DISCORD_WEBHOOK_URL) {
        console.warn('Discord webhook not configured');
        return;
    }
    
    const timestamp = new Date().toISOString();
    
    const embed = {
        embeds: [{
            title: '📬 Nova Mensagem de Contato',
            description: 'Um usuário enviou uma mensagem através do formulário de contato.',
            color: 0x00FF00,
            fields: [
                {
                    name: '👤 Nome',
                    value: formData.name,
                    inline: true
                },
                {
                    name: '📧 E-mail',
                    value: formData.email,
                    inline: true
                },
                {
                    name: '🌍 Idioma',
                    value: currentLang.toUpperCase(),
                    inline: true
                },
                {
                    name: '💬 Mensagem',
                    value: `\`\`\`${formData.message}\`\`\``,
                    inline: false
                }
            ],
            thumbnail: {
                url: 'https://cdn-icons-png.flaticon.com/512/3062/3062634.png'
            },
            footer: {
                text: 'FiveProjects Anti-Cheat - Formulário de Contato',
                icon_url: 'https://cdn-icons-png.flaticon.com/512/2919/2919906.png'
            },
            timestamp: timestamp
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
        console.log('✅ Contact form sent to Discord');
    } catch (error) {
        console.error('❌ Failed to send contact form to Discord:', error);
    }
}

function getBrowserInfo(userAgent) {
    let browser = '🌐 Unknown';
    
    if (userAgent.indexOf('Firefox') > -1) {
        browser = '🦊 Firefox';
    } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
        browser = '🎭 Opera';
    } else if (userAgent.indexOf('Trident') > -1) {
        browser = '🌐 Internet Explorer';
    } else if (userAgent.indexOf('Edg') > -1) {
        browser = '🔷 Edge';
    } else if (userAgent.indexOf('Chrome') > -1) {
        browser = '🟢 Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
        browser = '🧭 Safari';
    }
    
    return browser;
}

// ========================================
// Navbar Scroll Effect
// ========================================
let lastScroll = 0;
const navbar = document.getElementById('main-nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 30px rgba(0, 123, 255, 0.4)';
    } else {
        navbar.style.boxShadow = '0 2px 20px rgba(0, 123, 255, 0.3)';
    }
    
    lastScroll = currentScroll;
});

// ========================================
// Typewriter Effect for Hero Slogan
// ========================================
function typewriterEffect() {
    const element = document.querySelector('.typewriter');
    if (!element) return;
    
    const text = element.textContent;
    element.textContent = '';
    element.style.borderRight = '3px solid var(--neon-blue)';
    
    let i = 0;
    const speed = 50;
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    setTimeout(type, 500);
}

// Initialize typewriter effect
window.addEventListener('load', () => {
    setTimeout(typewriterEffect, 2500);
});