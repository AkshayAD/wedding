/**
 * Wedding Invitation - Immersive Scroll Story
 * Flip Clock, Overlays, Audio, Parallax
 */

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initCustomCursor } from './cursor.js';
import { initReminderModal, initShootingStars } from './pwa.js';

gsap.registerPlugin(ScrollTrigger);

// ===== Elements =====
const preloader = document.getElementById('preloader');
const progressBar = document.getElementById('progress');
const musicToggle = document.getElementById('music-toggle');
const bgMusic = document.getElementById('bg-music');
const calendarBtn = document.getElementById('add-calendar');
const shareBtn = document.getElementById('share-btn');
const overlayBackdrop = document.getElementById('overlay-backdrop');

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
        updateFlipClock();
        setInterval(updateFlipClock, 1000);

        // Init scroll animations
        initScrollAnimations();
    };

    preloader.addEventListener('click', openInvitation);
    preloader.addEventListener('touchstart', openInvitation, { passive: true });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            openInvitation();
        }
    }, { once: true });
}

// ===== FLIP CLOCK COUNTDOWN =====
function updateFlipClock() {
    const now = new Date();
    const diff = WEDDING_DATE - now;

    if (diff <= 0) {
        // Wedding day!
        setFlipValue('days', 0);
        setFlipValue('hours', 0);
        setFlipValue('mins', 0);
        setFlipValue('secs', 0);
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    setFlipValue('days', days);
    setFlipValue('hours', hours);
    setFlipValue('mins', mins);
    setFlipValue('secs', secs);
}

function setFlipValue(unit, value) {
    const tens = Math.floor(value / 10) % 10;
    const ones = value % 10;

    const tensEl = document.getElementById(`${unit}-tens`);
    const onesEl = document.getElementById(`${unit}-ones`);

    if (tensEl) tensEl.textContent = tens;
    if (onesEl) onesEl.textContent = ones;
}

// ===== EVENT OVERLAYS (iOS Compatible) =====
let savedScrollY = 0;

// Scroll blocking function - only blocks scrolling outside the overlay
// For scrollable overlays, allow scroll inside
function blockBodyScroll(e) {
    const activeOverlay = document.querySelector('.event-overlay.active');
    if (!activeOverlay) return;

    // Check if the target is inside the overlay
    if (activeOverlay.contains(e.target)) {
        // If it's a scrollable overlay, allow scrolling
        if (activeOverlay.classList.contains('scrollable-overlay')) {
            // Allow wheel/trackpad scroll - don't prevent default
            return;
        }
    }

    // Block scroll for everything outside the overlay 
    // or inside non-scrollable overlays
    e.preventDefault();
}

function initOverlays() {
    // Handle ALL elements with data-overlay attribute (event chips + btn-secondary)
    const overlayTriggers = document.querySelectorAll('[data-overlay]');
    const closeButtons = document.querySelectorAll('.overlay-close');

    // Open overlay - handle both click and touch for iOS
    overlayTriggers.forEach(trigger => {
        const openHandler = (e) => {
            e.preventDefault();
            const overlayId = trigger.dataset.overlay;
            const overlay = document.getElementById(`overlay-${overlayId}`);

            if (overlay && overlayBackdrop) {
                // Save scroll position and lock body
                savedScrollY = window.scrollY;
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.top = `-${savedScrollY}px`;
                document.body.style.width = '100%';
                document.body.classList.add('overlay-open');

                overlayBackdrop.classList.add('active');
                overlay.classList.add('active');

                // Allow touch scroll inside scrollable overlays
                if (overlay.classList.contains('scrollable-overlay')) {
                    enableOverlayScroll(overlay);
                }
            }
        };

        trigger.addEventListener('click', openHandler);
        trigger.addEventListener('touchend', openHandler, { passive: false });
    });

    // Close overlay - close button
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeAllOverlays);
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            closeAllOverlays();
        }, { passive: false });
    });

    // Close overlay - backdrop click
    if (overlayBackdrop) {
        overlayBackdrop.addEventListener('click', (e) => {
            if (e.target === overlayBackdrop) {
                closeAllOverlays();
            }
        });
        overlayBackdrop.addEventListener('touchend', (e) => {
            if (e.target === overlayBackdrop) {
                e.preventDefault();
                closeAllOverlays();
            }
        }, { passive: false });
    }

    // Close overlay - Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllOverlays();
        }
    });
}

function enableOverlayScroll(overlay) {
    // Allow touch scrolling within the overlay content
    overlay.addEventListener('touchmove', (e) => {
        e.stopPropagation();
    }, { passive: true });
}

function closeAllOverlays() {
    const overlays = document.querySelectorAll('.event-overlay');
    overlays.forEach(o => o.classList.remove('active'));
    if (overlayBackdrop) overlayBackdrop.classList.remove('active');

    // Restore scroll position
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.classList.remove('overlay-open');
    window.scrollTo(0, savedScrollY);
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

    bgMusic.addEventListener('play', () => musicToggle.classList.add('playing'));
    bgMusic.addEventListener('pause', () => musicToggle.classList.remove('playing'));
}

// ===== Scroll Animations =====
function initScrollAnimations() {
    // Fade in sections
    gsap.utils.toArray('.story-opening, .story-hero, .story-days-overview, .story-venue, .story-travel, .story-closing').forEach((section) => {
        gsap.from(section.querySelectorAll('h1, h2, h3, p, .day-chip, .couple-figure'), {
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

    // Hero couple entrance
    gsap.from('.groom-figure', {
        x: -50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        clearProps: 'all',
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
        clearProps: 'all',
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

    // Flip countdown
    gsap.from('.flip-countdown', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        scrollTrigger: {
            trigger: '.flip-countdown',
            start: 'top 85%',
            once: true
        }
    });

    // Day chips
    gsap.from('.day-chip', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.2,
        scrollTrigger: {
            trigger: '.day-chips-container',
            start: 'top 80%',
            once: true
        }
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
            text: "You're invited to our wedding! February 7-8, 2026 at Chillarwar Farms, Chandrapur",
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
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
        updateFlipClock();
        setInterval(updateFlipClock, 1000);
        return;
    }

    initLenis();
    initPreloader();
    initProgressBar();
    initMusic();
    initOverlays();
    initCalendar();
    initShare();
    initCustomCursor();
    initReminderModal();
    initShootingStars();

    console.log('✅ Invitation ready');
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
