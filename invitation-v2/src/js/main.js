/**
 * Wedding Invitation - Immersive Scroll Story
 * Preloader, Audio, Countdown, Parallax
 */

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initCustomCursor } from './cursor.js';

gsap.registerPlugin(ScrollTrigger);

// ===== Elements =====
const preloader = document.getElementById('preloader');
const progressBar = document.getElementById('progress');
const timerEl = document.getElementById('timer');
const daysEl = document.getElementById('days');
const musicToggle = document.getElementById('music-toggle');
const bgMusic = document.getElementById('bg-music');
const calendarBtn = document.getElementById('add-calendar');
const shareBtn = document.getElementById('share-btn');

// ===== Wedding Date =====
const WEDDING_DATE = new Date('2026-02-07T12:00:00+05:30');

// ===== Lenis Smooth Scroll =====
let lenis;

function initLenis() {
    lenis = new Lenis({
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.8,
        touchMultiplier: 1.5,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

// ===== Preloader =====
function initPreloader() {
    if (!preloader) return;

    document.body.style.overflow = 'hidden';

    const openInvitation = () => {
        preloader.classList.add('hidden');
        document.body.style.overflow = '';

        // Start music on interaction
        if (bgMusic) {
            bgMusic.volume = 0.3;
            bgMusic.play().catch(() => {
                console.log('Audio autoplay blocked');
            });
        }

        // Start countdown
        updateCountdown();
        setInterval(updateCountdown, 60000); // Update every minute

        // Init scroll animations
        initScrollAnimations();
    };

    preloader.addEventListener('click', openInvitation);
    preloader.addEventListener('touchstart', openInvitation, { passive: true });

    // Also allow keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            openInvitation();
        }
    }, { once: true });
}

// ===== Countdown =====
function updateCountdown() {
    if (!daysEl) return;

    const now = new Date();
    const diff = WEDDING_DATE - now;

    if (diff <= 0) {
        daysEl.textContent = '0';
        return;
    }

    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    daysEl.textContent = days;
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

// ===== Music Toggle =====
function initMusic() {
    if (!musicToggle || !bgMusic) return;

    musicToggle.addEventListener('click', () => {
        if (bgMusic.paused) {
            bgMusic.play();
            musicToggle.classList.add('playing');
        } else {
            bgMusic.pause();
            musicToggle.classList.remove('playing');
        }
    });

    // Update button state when music plays/pauses
    bgMusic.addEventListener('play', () => musicToggle.classList.add('playing'));
    bgMusic.addEventListener('pause', () => musicToggle.classList.remove('playing'));
}

// ===== Scroll Animations =====
function initScrollAnimations() {
    // Fade in sections as they appear
    gsap.utils.toArray('.story-opening, .story-hero, .story-date, .story-day, .story-venue, .story-travel, .story-closing').forEach((section) => {
        gsap.from(section.querySelectorAll('h2, h3, p, .event-moment, .couple-figure, .date-display'), {
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: section,
                start: 'top 80%',
                once: true
            }
        });
    });

    // Parallax for floating elements
    gsap.utils.toArray('.floating-diya, .floating-lantern').forEach((el, i) => {
        gsap.to(el, {
            y: `-${100 + i * 50}vh`,
            ease: 'none',
            scrollTrigger: {
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1
            }
        });
    });

    // Hero couple entrance
    const coupleFigures = document.querySelectorAll('.couple-figure');
    if (coupleFigures.length) {
        gsap.from('.groom-figure', {
            x: -50,
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '.story-hero',
                start: 'top 60%',
                once: true
            }
        });

        gsap.from('.bride-figure', {
            x: 50,
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '.story-hero',
                start: 'top 60%',
                once: true
            }
        });

        gsap.from('.couple-heart', {
            scale: 0,
            opacity: 0,
            duration: 0.6,
            delay: 0.5,
            ease: 'back.out(1.7)',
            scrollTrigger: {
                trigger: '.story-hero',
                start: 'top 60%',
                once: true
            }
        });
    }

    // Event cards
    gsap.utils.toArray('.event-moment').forEach((card) => {
        gsap.from(card, {
            y: 60,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                once: true
            }
        });
    });
}

// ===== Calendar =====
function initCalendar() {
    if (!calendarBtn) return;

    calendarBtn.addEventListener('click', () => {
        const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Dewalwar-Chachad Wedding')}&dates=20260207T063000Z/20260208T173000Z&location=${encodeURIComponent('Chillarwar Farms, Chandrapur')}&details=${encodeURIComponent('Wedding celebration - February 7-8, 2026')}`;
        window.open(googleUrl, '_blank');
    });
}

// ===== Share =====
function initShare() {
    if (!shareBtn) return;

    shareBtn.addEventListener('click', async () => {
        const shareData = {
            title: 'Dewalwar-Chachad Wedding',
            text: "You're invited to our wedding celebration! February 7-8, 2026 at Chillarwar Farms, Chandrapur",
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback to WhatsApp
            const waUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + '\n' + shareData.url)}`;
            window.open(waUrl, '_blank');
        }
    });
}

// ===== Init =====
function init() {
    console.log('🪔 Wedding Invitation Loading...');

    // Check reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('reduced-motion');
        if (preloader) preloader.classList.add('hidden');
        document.body.style.overflow = '';
        updateCountdown();
        return;
    }

    initLenis();
    initPreloader();
    initProgressBar();
    initMusic();
    initCalendar();
    initShare();
    initCustomCursor();

    console.log('✅ Invitation ready');
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
