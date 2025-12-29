/**
 * Wedding Invitation V2 - Premium Main JavaScript
 * Integrates: Three.js, Lenis, GSAP, Custom Cursor, Audio
 */

// Import dependencies
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Import local modules
import { initParticles } from './particles.js';
import { initCustomCursor } from './cursor.js';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ===== DOM Elements =====
const preloader = document.getElementById('preloader');
const skipBtn = document.getElementById('skip-btn');
const progressBar = document.getElementById('progress-bar');
const particlesContainer = document.getElementById('particles');
const musicToggle = document.getElementById('music-toggle');
const calendarBtn = document.getElementById('add-calendar');
const detailsBtn = document.getElementById('details-btn');
const progressDots = document.querySelectorAll('.progress-dot');

// ===== Lenis Smooth Scroll =====
let lenis;

function initSmoothScroll() {
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Smooth anchor scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                lenis.scrollTo(target, { offset: 0, duration: 1.5 });
            }
        });
    });

    console.log('✅ Lenis smooth scroll initialized');
}

// ===== Preloader =====
function hidePreloader() {
    if (!preloader) return;

    preloader.classList.add('hidden');
    document.body.style.overflow = '';

    // Trigger hero animations
    setTimeout(() => {
        document.querySelectorAll('.hero .reveal-text, .hero .char-reveal').forEach(el => {
            el.classList.add('visible');
        });

        // Start countdown
        initFlipCountdown();
    }, 100);
}

function initPreloader() {
    document.body.style.overflow = 'hidden';

    if (skipBtn) {
        skipBtn.addEventListener('click', hidePreloader);
    }

    const minTime = 2000;
    const startTime = Date.now();

    window.addEventListener('load', () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minTime - elapsed);
        setTimeout(hidePreloader, remaining);
    });

    setTimeout(hidePreloader, 5000);
}

// ===== Flip Countdown =====
const WEDDING_DATE = new Date('2026-02-07T12:00:00+05:30');

function initFlipCountdown() {
    const daysTop = document.getElementById('days-top');
    const daysBottom = document.getElementById('days-bottom');
    const hoursTop = document.getElementById('hours-top');
    const hoursBottom = document.getElementById('hours-bottom');
    const minsTop = document.getElementById('mins-top');
    const minsBottom = document.getElementById('mins-bottom');

    if (!daysTop) return;

    function update() {
        const now = new Date();
        const diff = WEDDING_DATE - now;

        if (diff <= 0) {
            daysTop.textContent = daysBottom.textContent = '0';
            hoursTop.textContent = hoursBottom.textContent = '00';
            minsTop.textContent = minsBottom.textContent = '00';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        animateFlip(daysTop, daysBottom, days.toString());
        animateFlip(hoursTop, hoursBottom, hours.toString().padStart(2, '0'));
        animateFlip(minsTop, minsBottom, mins.toString().padStart(2, '0'));
    }

    function animateFlip(topEl, bottomEl, newValue) {
        if (topEl.textContent !== newValue) {
            // Add flip animation class
            topEl.parentElement.classList.add('flipping');

            setTimeout(() => {
                topEl.textContent = newValue;
                bottomEl.textContent = newValue;
                topEl.parentElement.classList.remove('flipping');
            }, 300);
        }
    }

    update();
    setInterval(update, 1000);

    console.log('✅ Flip countdown initialized');
}

// ===== Progress Bar =====
function initProgressBar() {
    if (!progressBar) return;

    ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
            progressBar.style.transform = `scaleX(${self.progress})`;
        }
    });
}

// ===== Progress Dots =====
function initProgressDots() {
    const sections = ['hero', 'summary', 'day1', 'day2', 'closing'];

    sections.forEach((sectionId, index) => {
        const section = document.getElementById(sectionId);
        if (!section) return;

        ScrollTrigger.create({
            trigger: section,
            start: 'top center',
            end: 'bottom center',
            onEnter: () => updateActiveDot(index),
            onEnterBack: () => updateActiveDot(index)
        });
    });

    function updateActiveDot(index) {
        progressDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    // Click to navigate
    progressDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            const section = document.getElementById(sections[index]);
            if (section) lenis.scrollTo(section);
        });
    });
}

// ===== GSAP Animations =====
function initAnimations() {
    // Reveal text animations
    document.querySelectorAll('.reveal-text').forEach((text) => {
        if (text.closest('.hero')) return;

        ScrollTrigger.create({
            trigger: text,
            start: 'top 85%',
            once: true,
            onEnter: () => text.classList.add('visible')
        });
    });

    // Day cards stagger
    const dayCards = document.querySelectorAll('.day-card');
    if (dayCards.length) {
        gsap.from(dayCards, {
            y: 80,
            opacity: 0,
            stagger: 0.2,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '.day-cards',
                start: 'top 80%',
                once: true
            }
        });
    }

    // Event cards
    document.querySelectorAll('.event-card.fullscreen').forEach((card) => {
        const content = card.querySelector('.event-content');
        const icon = card.querySelector('.icon-xl');
        const title = card.querySelector('.event-title');
        const elements = card.querySelectorAll('.event-tagline, .event-time-badge, .event-desc');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: card,
                start: 'top 70%',
                once: true
            }
        });

        if (icon) {
            tl.from(icon, { scale: 0, opacity: 0, duration: 0.6, ease: 'back.out(1.7)' });
        }

        if (title) {
            tl.from(title, { y: 40, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.3');
        }

        if (elements.length) {
            tl.from(elements, { y: 30, opacity: 0, stagger: 0.15, duration: 0.6, ease: 'power2.out' }, '-=0.4');
        }
    });

    // Hero parallax
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        gsap.to(heroContent, {
            y: -80,
            opacity: 0.3,
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });
    }

    // Scroll indicator fade
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        gsap.to(scrollIndicator, {
            opacity: 0,
            y: 30,
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: '20% top',
                scrub: true
            }
        });
    }

    console.log('✅ GSAP animations initialized');
}

// ===== Confetti Burst =====
function createConfetti() {
    const container = document.getElementById('confetti');
    if (!container) return;

    const colors = ['#FFD700', '#8B1538', '#FF8C00', '#006D6F', '#E8D5C4'];
    const pieces = 50;

    for (let i = 0; i < pieces; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 2 + 's';
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(piece);

        // Remove after animation
        setTimeout(() => piece.remove(), 5000);
    }
}

// ===== Add to Calendar =====
function initCalendar() {
    if (!calendarBtn) return;

    calendarBtn.addEventListener('click', () => {
        const event = {
            title: 'Dewalwar-Chachad Wedding',
            start: '2026-02-07T12:00:00',
            end: '2026-02-08T23:00:00',
            location: 'Chillarwar Farms, Chandrapur',
            description: 'Wedding celebration of Dewalwar & Chachad families'
        };

        // Google Calendar URL
        const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=20260207T063000Z/20260208T173000Z&location=${encodeURIComponent(event.location)}&details=${encodeURIComponent(event.description)}`;

        window.open(googleUrl, '_blank');

        // Trigger confetti
        createConfetti();
    });
}

// ===== Share Buttons =====
function initShare() {
    const whatsappBtn = document.getElementById('share-whatsapp');

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            const text = `You're invited to the Dewalwar-Chachad Wedding! 💒\n\n📅 February 7-8, 2026\n📍 Chillarwar Farms, Chandrapur\n\n${window.location.href}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        });
    }
}

// ===== Music Toggle (Placeholder) =====
function initMusic() {
    if (!musicToggle) return;

    let isPlaying = false;

    musicToggle.addEventListener('click', () => {
        isPlaying = !isPlaying;
        musicToggle.classList.toggle('playing', isPlaying);

        // Audio would be implemented here
        console.log(isPlaying ? '🎵 Music playing' : '🔇 Music stopped');
    });
}

// ===== Reduced Motion Check =====
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ===== Initialize Everything =====
function init() {
    console.log('💎 Premium Wedding Invitation - Initializing...');

    if (prefersReducedMotion()) {
        console.log('Reduced motion preferred - disabling animations');
        document.documentElement.classList.add('reduced-motion');
        hidePreloader();
        return;
    }

    // Initialize modules
    initPreloader();
    initSmoothScroll();
    initProgressBar();

    // Initialize Three.js particles
    if (particlesContainer) {
        initParticles(particlesContainer);
    }

    // Initialize custom cursor (desktop only)
    initCustomCursor();

    // Wait for fonts then init animations
    document.fonts.ready.then(() => {
        initAnimations();
        initProgressDots();
    });

    // Interactive features
    initCalendar();
    initShare();
    initMusic();

    // Trigger confetti on CTA hover
    if (detailsBtn) {
        detailsBtn.addEventListener('mouseenter', () => {
            // Subtle sparkle effect could go here
        });
    }

    console.log('✅ Premium initialization complete');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.__wedding = { lenis, gsap, ScrollTrigger, createConfetti };
