/**
 * Wedding Invitation V2 - Main JavaScript Entry
 * Modern stack: Lenis, GSAP, SplitType
 */

// Import dependencies
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Import local modules
import { initSmoothScroll, lenis } from './smooth-scroll.js';
import { initCountdown } from './countdown.js';
import { initAnimations } from './animations.js';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ===== DOM Elements =====
const preloader = document.getElementById('preloader');
const skipBtn = document.getElementById('skip-btn');
const progressBar = document.getElementById('progress-bar');

// ===== Preloader =====
function hidePreloader() {
    if (!preloader) return;

    preloader.classList.add('hidden');

    // Enable smooth scroll after preloader
    document.body.style.overflow = '';

    // Trigger initial animations
    setTimeout(() => {
        document.querySelectorAll('.hero .reveal-text').forEach(el => {
            el.classList.add('visible');
        });
    }, 100);
}

function initPreloader() {
    // Prevent scroll during preloader
    document.body.style.overflow = 'hidden';

    // Skip button
    if (skipBtn) {
        skipBtn.addEventListener('click', hidePreloader);
    }

    // Auto-hide after content loaded + minimum display time
    const minTime = 1500;
    const startTime = Date.now();

    window.addEventListener('load', () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minTime - elapsed);
        setTimeout(hidePreloader, remaining);
    });

    // Fallback: hide after 4 seconds
    setTimeout(hidePreloader, 4000);
}

// ===== Progress Bar =====
function initProgressBar() {
    if (!progressBar) return;

    // Update on scroll
    ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
            progressBar.style.transform = `scaleX(${self.progress})`;
        }
    });
}

// ===== Reduced Motion Check =====
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ===== Initialize Everything =====
function init() {
    console.log('🎊 Wedding Invitation V2 - Initializing...');

    // Check for reduced motion preference
    if (prefersReducedMotion()) {
        console.log('Reduced motion preferred - disabling animations');
        document.documentElement.classList.add('reduced-motion');
        hidePreloader();
        return;
    }

    // Initialize modules
    initPreloader();
    initSmoothScroll();
    initCountdown();
    initProgressBar();

    // Wait for fonts to load before animations
    document.fonts.ready.then(() => {
        initAnimations();
    });

    console.log('✅ Initialization complete');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.__wedding = { lenis, gsap, ScrollTrigger };
