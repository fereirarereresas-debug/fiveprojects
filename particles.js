// ========================================
// PARTICLES BACKGROUND ANIMATION
// ========================================

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 80;
        this.connectionDistance = 150;
        
        this.resize();
        this.init();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    init() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1
            });
        }
    }
    
    update() {
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
            
            // Keep in bounds
            particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
        });
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw connections
        this.ctx.strokeStyle = 'rgba(14, 165, 233, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.connectionDistance) {
                    const opacity = (1 - distance / this.connectionDistance) * 0.3;
                    this.ctx.strokeStyle = `rgba(14, 165, 233, ${opacity})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }
        
        // Draw particles
        this.particles.forEach(particle => {
            this.ctx.fillStyle = 'rgba(14, 165, 233, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Glow effect
            this.ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius * 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize particles when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('particles-bg');
    if (canvas) {
        const particleSystem = new ParticleSystem(canvas);
        particleSystem.animate();
    }
});