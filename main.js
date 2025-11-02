// Update current year in footer
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Scroll reveal animation
const scrollElements = document.querySelectorAll('[data-scroll]');

const elementInView = (el, offset = 0) => {
    const elementTop = el.getBoundingClientRect().top;
    return (
        elementTop <= 
        (window.innerHeight || document.documentElement.clientHeight) * (1 - offset)
    );
};

const displayScrollElement = (element) => {
    element.classList.add('is-visible');
};

const hideScrollElement = (element) => {
    element.classList.remove('is-visible');
};

const handleScrollAnimation = () => {
    scrollElements.forEach((el) => {
        if (elementInView(el, 0.25)) {
            displayScrollElement(el);
        } else {
            hideScrollElement(el);
        }
    });
};

// Throttle function for better performance
const throttle = (fn, wait) => {
    let time = Date.now();
    return () => {
        if ((time + wait - Date.now()) < 0) {
            fn();
            time = Date.now();
        }
    };
};

window.addEventListener('scroll', throttle(handleScrollAnimation, 250));

// Contact form handling with Discord webhook
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const message = document.getElementById('message').value;
    const discord = document.getElementById('discord').value;
    const timestamp = new Date().toLocaleString();
    
    // Replace WEBHOOK_URL with your actual Discord webhook URL
    const webhookUrl = 'https://discord.com/api/webhooks/1434621471707107378/u-JzEqQ5D22kWKyJeP_qv0MgOZaKMK3jcB96ocH8EPOoSv2PFEORm1bbb8Jr8b_R2WsR';
    
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: `📢 Novo ticket de suporte recebido\nNome: ${name}\nMensagem: ${message}\nDiscord: ${discord}\nHorário: ${timestamp}`
            })
        });
        
        alert('Mensagem enviada com sucesso!');
        e.target.reset();
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem. Tente novamente mais tarde.');
    }
});

// Track button clicks
document.querySelectorAll('[data-tracking]').forEach(element => {
    element.addEventListener('click', () => {
        const action = element.getAttribute('data-tracking');
        const timestamp = new Date().toLocaleString();
        
        // Send anonymous tracking event
        fetch('YOUR_WEBHOOK_URL', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: `📢 Novo evento: ${action} clicado às ${timestamp}`
            })
        }).catch(console.error);
    });
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
