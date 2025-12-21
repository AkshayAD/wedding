/* ====================================
   COMPACT WEDDING INVITATION - JS
   ==================================== */

// Scroll Reveal
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.15 });

    reveals.forEach(el => observer.observe(el));
}

// Smooth scroll navigation
function initNavigation() {
    const dayChips = document.querySelectorAll('.day-chip');

    dayChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = chip.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Sky gradient based on scroll
function initSkyTransition() {
    const sky = document.getElementById('sky-gradient');
    const sections = document.querySelectorAll('.day-section');

    const gradients = {
        '1': { top: '#FFD700', bottom: '#2E1A47', opacity: 0.25 }, // Day 1: Afternoon to Evening
        '2': { top: '#FF6B35', bottom: '#FFD93D', opacity: 0.3 }   // Day 2: Afternoon to Sunset
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                const day = entry.target.dataset.day;
                const gradient = gradients[day];
                if (gradient && sky) {
                    sky.style.background = `linear-gradient(180deg, ${gradient.top}, ${gradient.bottom})`;
                    sky.style.opacity = gradient.opacity;
                }
            }
        });
    }, { threshold: [0.3, 0.5] });

    sections.forEach(section => observer.observe(section));
}

// Floating particles
function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 4 + 2;

        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            background: linear-gradient(135deg, #D4AF37, #F5E6B8);
            border-radius: 50%;
            opacity: 0;
            animation: floatUp ${Math.random() * 15 + 10}s linear infinite;
            animation-delay: ${Math.random() * 10}s;
        `;

        container.appendChild(particle);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatUp {
            0% { opacity: 0; transform: translateY(100vh) rotate(0deg); }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { opacity: 0; transform: translateY(-100vh) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// 3D card tilt
function initCardTilt() {
    const cards = document.querySelectorAll('.event-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 30;
            const rotateY = (centerX - x) / 30;

            card.style.transform = `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initNavigation();
    initSkyTransition();
    createParticles();
    initCardTilt();

    console.log('✨ Compact Wedding Invitation Loaded');
});
