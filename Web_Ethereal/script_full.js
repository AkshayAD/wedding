/* ====================================
   PREMIUM WEDDING INVITATION V3
   Time-of-Day Flow & Smooth Transitions
   ==================================== */

// ====================================
// TIME OF DAY CONFIGURATION
// ====================================
const timeOfDayConfig = {
    'dawn': {
        skyTop: '#FF9A8B',
        skyBottom: '#FFECD2',
        opacity: 0.35,
        label: 'Dawn',
        isNight: false
    },
    'morning': {
        skyTop: '#87CEEB',
        skyBottom: '#FFF8DC',
        opacity: 0.3,
        label: 'Morning',
        isNight: false
    },
    'late-morning': {
        skyTop: '#FFD700',
        skyBottom: '#FFF8E7',
        opacity: 0.35,
        label: 'Late Morning',
        isNight: false
    },
    'afternoon': {
        skyTop: '#87CEEB',
        skyBottom: '#E0F7FA',
        opacity: 0.25,
        label: 'Afternoon',
        isNight: false
    },
    'evening': {
        skyTop: '#FF6B6B',
        skyBottom: '#2E1A47',
        opacity: 0.5,
        label: 'Evening',
        isNight: false
    },
    'night': {
        skyTop: '#0D0221',
        skyBottom: '#2E1A47',
        opacity: 0.6,
        label: 'Night',
        isNight: true
    },
    'dawn-2': {
        skyTop: '#FFECD2',
        skyBottom: '#FF9A8B',
        opacity: 0.4,
        label: 'New Dawn',
        isNight: false
    },
    'morning-2': {
        skyTop: '#87CEEB',
        skyBottom: '#FFE4B5',
        opacity: 0.35,
        label: 'Morning',
        isNight: false
    },
    'golden-hour': {
        skyTop: '#FF6B35',
        skyBottom: '#FFD93D',
        opacity: 0.45,
        label: 'Sacred Hour',
        isNight: false
    },
    'twilight': {
        skyTop: '#2E1A47',
        skyBottom: '#FF6B6B',
        opacity: 0.5,
        label: 'Twilight',
        isNight: true
    }
};

// DOM Elements
const skyGradient = document.getElementById('sky-gradient');
const celestialBody = document.getElementById('celestial-body');
const timeLabel = celestialBody?.querySelector('.time-label');

// ====================================
// SKY TRANSITION BASED ON SCROLL
// ====================================
function initSkyTransition() {
    const sections = document.querySelectorAll('[data-time]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                const timeKey = entry.target.dataset.time;
                const config = timeOfDayConfig[timeKey];

                if (config && skyGradient) {
                    // Update sky gradient
                    skyGradient.style.background = `linear-gradient(180deg, ${config.skyTop}, ${config.skyBottom})`;
                    skyGradient.style.opacity = config.opacity;

                    // Update time label
                    if (timeLabel) {
                        timeLabel.textContent = config.label;
                    }

                    // Toggle night mode for sun/moon
                    if (config.isNight) {
                        document.body.classList.add('night-mode');
                    } else {
                        document.body.classList.remove('night-mode');
                    }
                }
            }
        });
    }, {
        threshold: [0.3, 0.5, 0.7],
        rootMargin: '-20% 0px -20% 0px'
    });

    sections.forEach(section => observer.observe(section));
}

// ====================================
// SCROLL REVEAL ANIMATION
// ====================================
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

// ====================================
// GLOBAL FLOATING PARTICLES
// ====================================
function createGlobalParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;

    const particleCount = 25;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'global-particle';

        const size = Math.random() * 4 + 2;
        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            background: linear-gradient(135deg, #D4AF37, #F5E6B8);
            opacity: 0;
            animation: globalFloat ${Math.random() * 15 + 15}s linear infinite;
            animation-delay: ${Math.random() * 10}s;
        `;

        container.appendChild(particle);
    }

    // Add keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes globalFloat {
            0% { opacity: 0; transform: translateY(100vh) rotate(0deg); }
            10% { opacity: 0.5; }
            90% { opacity: 0.5; }
            100% { opacity: 0; transform: translateY(-100vh) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// ====================================
// HALDI - TURMERIC COLOR SPLASHES
// ====================================
function createHaldiSplashes() {
    const container = document.querySelector('.haldi-splashes');
    if (!container) return;

    const colors = ['#FFD700', '#FFA500', '#FFEB3B', '#FF9800'];

    for (let i = 0; i < 8; i++) {
        const splash = document.createElement('div');
        splash.className = 'haldi-splash';

        const size = Math.random() * 200 + 100;
        splash.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            animation-delay: ${Math.random() * 4}s;
            animation-duration: ${Math.random() * 3 + 3}s;
        `;

        container.appendChild(splash);
    }
}

// ====================================
// SANGEET - DISCO LIGHTS & MUSIC NOTES
// ====================================
function createSangeetLights() {
    const container = document.querySelector('.sangeet-lights');
    if (!container) return;

    const colors = ['#E040FB', '#7C4DFF', '#448AFF', '#FF4081'];

    // Spotlight beams
    for (let i = 0; i < 6; i++) {
        const light = document.createElement('div');
        light.className = 'sangeet-light';

        light.style.cssText = `
            left: ${i * 18}%;
            top: 0;
            background: linear-gradient(180deg, ${colors[i % colors.length]}, transparent);
            animation-delay: ${i * 0.4}s;
            animation-duration: ${Math.random() * 2 + 2}s;
        `;

        container.appendChild(light);
    }

    // Music notes (SVG)
    const notesSVG = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
    `;

    for (let i = 0; i < 10; i++) {
        const note = document.createElement('div');
        note.className = 'sangeet-note';
        note.innerHTML = notesSVG;
        note.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            width: ${Math.random() * 25 + 15}px;
            height: ${Math.random() * 25 + 15}px;
            color: ${colors[Math.floor(Math.random() * colors.length)]};
            opacity: 0;
            animation: noteFloat ${Math.random() * 4 + 4}s ease-in-out infinite;
            animation-delay: ${Math.random() * 4}s;
        `;
        container.appendChild(note);
    }

    // Add keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes noteFloat {
            0%, 100% { opacity: 0; transform: translateY(0) rotate(0deg); }
            50% { opacity: 0.6; transform: translateY(-40px) rotate(15deg); }
        }
    `;
    document.head.appendChild(style);
}

// ====================================
// BARAT - FLOATING FLOWER PETALS (SVG)
// ====================================
function createBaratFlowers() {
    const container = document.querySelector('.barat-flowers');
    if (!container) return;

    // SVG flower petals
    const petalSVG = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <ellipse cx="12" cy="8" rx="5" ry="8"/>
        </svg>
    `;

    const colors = ['#FFB6C1', '#FF69B4', '#FF1493', '#FFA07A', '#FFD700'];

    for (let i = 0; i < 20; i++) {
        const petal = document.createElement('div');
        petal.className = 'barat-flower';
        petal.innerHTML = petalSVG;
        petal.style.cssText = `
            left: ${Math.random() * 100}%;
            width: ${Math.random() * 20 + 15}px;
            height: ${Math.random() * 20 + 15}px;
            color: ${colors[Math.floor(Math.random() * colors.length)]};
            animation-delay: ${Math.random() * 6}s;
            animation-duration: ${Math.random() * 4 + 5}s;
        `;

        container.appendChild(petal);
    }
}

// ====================================
// WEDDING - DIYAS & SPARKLES
// ====================================
function createWeddingDiyas() {
    const container = document.querySelector('.wedding-diyas');
    if (!container) return;

    // Diya lights
    for (let i = 0; i < 20; i++) {
        const diya = document.createElement('div');
        diya.className = 'wedding-diya';

        diya.style.cssText = `
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 2}s;
            animation-duration: ${Math.random() * 1.5 + 1}s;
        `;

        container.appendChild(diya);
    }

    // Star sparkles (SVG)
    const starSVG = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15 9 22 9.5 17 14.5 18 22 12 18 6 22 7 14.5 2 9.5 9 9z"/>
        </svg>
    `;

    for (let i = 0; i < 12; i++) {
        const star = document.createElement('div');
        star.className = 'wedding-sparkle';
        star.innerHTML = starSVG;
        star.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            width: ${Math.random() * 15 + 10}px;
            height: ${Math.random() * 15 + 10}px;
            color: #FFD700;
            opacity: 0;
            animation: sparkle ${Math.random() * 2 + 2}s ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        container.appendChild(star);
    }

    // Add keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
            50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }
    `;
    document.head.appendChild(style);
}

// ====================================
// SMOOTH SCROLL FOR NAVIGATION
// ====================================
function initSmoothScroll() {
    // Scroll CTA
    const scrollCta = document.querySelector('.scroll-cta');
    if (scrollCta) {
        scrollCta.addEventListener('click', () => {
            const firstDay = document.getElementById('day-1');
            if (firstDay) {
                firstDay.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Day links
    const dayLinks = document.querySelectorAll('.day-link');
    dayLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ====================================
// HERO PARALLAX
// ====================================
function initHeroParallax() {
    const hero = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');

    if (!hero || !heroContent) return;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const heroHeight = hero.offsetHeight;

        if (scrollY < heroHeight) {
            const opacity = 1 - (scrollY / (heroHeight * 0.7));
            const translateY = scrollY * 0.4;

            heroContent.style.opacity = Math.max(0, opacity);
            heroContent.style.transform = `translateY(${translateY}px)`;
        }
    });
}

// ====================================
// CARD 3D TILT EFFECT
// ====================================
function initCardEffects() {
    const frames = document.querySelectorAll('.card-frame');

    frames.forEach(frame => {
        frame.addEventListener('mousemove', (e) => {
            const rect = frame.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 25;
            const rotateY = (centerX - x) / 25;

            frame.style.transform = `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        frame.addEventListener('mouseleave', () => {
            frame.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

// ====================================
// INITIALIZE
// ====================================
document.addEventListener('DOMContentLoaded', () => {
    // Core functionality
    initSkyTransition();
    initScrollReveal();
    initSmoothScroll();
    initHeroParallax();
    initCardEffects();

    // Create particles and effects
    createGlobalParticles();
    createHaldiSplashes();
    createSangeetLights();
    createBaratFlowers();
    createWeddingDiyas();

    console.log('✨ Premium Wedding Invitation V3 Loaded');
});

// Add loaded class when ready
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});
