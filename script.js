// ========================================
// FIVE SPOOFER - MAIN JAVASCRIPT
// ========================================

// Configuration
const CONFIG = {
    API_URL: 'http://localhost:3000', // Change to your backend URL in production
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Send anonymous log to backend
 */
async function sendLog(event, data = {}) {
    try {
        await fetch(`${CONFIG.API_URL}/webhook/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ event, data })
        });
    } catch (error) {
        console.error('Error sending log:', error);
    }
}

/**
 * Get URL parameters
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return Object.fromEntries(params.entries());
}

// ========================================
// NAVBAR FUNCTIONALITY
// ========================================

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

// Smooth scroll and active link
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
            
            // Close mobile menu
            if (navToggle && navMenu) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        }
    });
});

// Update active link on scroll
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('.section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').substring(1) === current) {
            link.classList.add('active');
        }
    });
});

// ========================================
// DISCORD OAUTH2 LOGIN
// ========================================

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userProfile = document.getElementById('userProfile');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');

/**
 * Check if user is logged in
 */
async function checkAuth() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/user`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            displayUser(data.user);
        } else {
            displayLoginButton();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        displayLoginButton();
    }
}

/**
 * Display user profile
 */
function displayUser(user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userProfile) userProfile.classList.remove('hidden');
    if (userAvatar) userAvatar.src = user.avatar_url;
    if (userName) userName.textContent = `${user.username}#${user.discriminator}`;
}

/**
 * Display login button
 */
function displayLoginButton() {
    if (loginBtn) loginBtn.style.display = 'flex';
    if (userProfile) userProfile.classList.add('hidden');
}

/**
 * Handle login
 */
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        try {
            // Get auth URL from backend
            const response = await fetch(`${CONFIG.API_URL}/auth/discord`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Send log
                await sendLog('Login Iniciado');
                
                // Redirect to Discord
                window.location.href = data.authUrl;
            } else {
                alert('Erro ao iniciar login. Tente novamente.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Erro ao conectar com o servidor.');
        }
    });
}

/**
 * Handle logout
 */
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${CONFIG.API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                displayLoginButton();
                alert('Logout realizado com sucesso!');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Erro ao fazer logout.');
        }
    });
}

// Check login status on page load
checkAuth();

// Handle OAuth callback
const urlParams = getUrlParams();
if (urlParams.login === 'success') {
    // Remove query params
    window.history.replaceState({}, document.title, window.location.pathname);
    checkAuth();
} else if (urlParams.login === 'error') {
    alert('Erro ao fazer login com Discord. Tente novamente.');
    window.history.replaceState({}, document.title, window.location.pathname);
}

// ========================================
// BUTTON EVENT LOGGING
// ========================================

// Discord button
const discordBtn = document.getElementById('discordBtn');
if (discordBtn) {
    discordBtn.addEventListener('click', () => {
        sendLog('Botão Discord Clicado');
    });
}

// Download button
const downloadBtn = document.getElementById('downloadBtn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        sendLog('Botão Download Clicado');
    });
}

// Support button
const supportBtn = document.getElementById('supportBtn');
if (supportBtn) {
    supportBtn.addEventListener('click', () => {
        sendLog('Botão Suporte Clicado');
    });
}

// ========================================
// CONTACT FORM
// ========================================

const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            message: document.getElementById('message').value
        };
        
        const consent = document.getElementById('consent').checked;
        
        if (!consent) {
            alert('Você precisa autorizar o envio da mensagem.');
            return;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
                contactForm.reset();
                
                // Send log
                await sendLog('Formulário de Contato Enviado');
            } else {
                const error = await response.json();
                alert(`Erro: ${error.error || 'Falha ao enviar mensagem'}`);
            }
        } catch (error) {
            console.error('Contact form error:', error);
            alert('Erro ao enviar mensagem. Tente novamente.');
        }
    });
}

// ========================================
// PROGRESS BAR ANIMATION
// ========================================

const progressFill = document.querySelector('.progress-fill');
if (progressFill) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progress = progressFill.getAttribute('data-progress');
                progressFill.style.width = `${progress}%`;
            }
        });
    }, { threshold: 0.5 });
    
    observer.observe(progressFill);
}

// ========================================
// FADE-IN ANIMATIONS
// ========================================

const fadeElements = document.querySelectorAll('.fade-in');

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

fadeElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    fadeObserver.observe(el);
});

// ========================================
// FOOTER YEAR
// ========================================

const currentYearEl = document.getElementById('currentYear');
if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
}

// ========================================
// CONSOLE MESSAGE
// ========================================

console.log('%c🚀 Five Spoofer', 'font-size: 24px; font-weight: bold; color: #0ea5e9;');
console.log('%cVirtualização em Nível de Kernel', 'font-size: 14px; color: #94a3b8;');
console.log('%c\nDesenvolvido por Five Projects', 'font-size: 12px; color: #64748b;');