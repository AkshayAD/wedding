/**
 * Wedding Invitation V2 - Main JavaScript
 * Handles preloader, navigation, scroll reveals, and accessibility
 */

(function() {
    'use strict';

    // ===== Constants =====
    const PRELOADER_MIN_TIME = 1500;
    const REVEAL_THRESHOLD = 0.15;
    const NAV_SHOW_OFFSET = 100;

    // ===== DOM Elements =====
    const preloader = document.getElementById('preloader');
    const skipButton = document.getElementById('skip-preloader');
    const nav = document.getElementById('nav');
    const reveals = document.querySelectorAll('.reveal');

    // ===== Preloader =====
    function hidePreloader() {
        if (preloader) {
            preloader.classList.add('hidden');
            // Remove from DOM after transition
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 600);
        }
    }

    function initPreloader() {
        const startTime = Date.now();
        
        // Skip button
        if (skipButton) {
            skipButton.addEventListener('click', hidePreloader);
            skipButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    hidePreloader();
                }
            });
        }

        // Auto-hide after minimum time + assets loaded
        window.addEventListener('load', () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, PRELOADER_MIN_TIME - elapsed);
            setTimeout(hidePreloader, remaining);
        });

        // Fallback: hide after 4 seconds regardless
        setTimeout(hidePreloader, 4000);
    }

    // ===== Navigation =====
    function initNavigation() {
        if (!nav) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        function updateNav() {
            const scrollY = window.scrollY;
            
            // Show nav after scrolling past hero
            if (scrollY > NAV_SHOW_OFFSET) {
                nav.classList.add('visible');
            } else {
                nav.classList.remove('visible');
            }

            lastScrollY = scrollY;
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNav);
                ticking = true;
            }
        }, { passive: true });
    }

    // ===== Scroll Reveals =====
    function initScrollReveals() {
        if (!reveals.length) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            // Show all elements immediately
            reveals.forEach(el => el.classList.add('visible'));
            return;
        }

        // Intersection Observer for reveals
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Optionally unobserve after revealing
                    // observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: REVEAL_THRESHOLD,
            rootMargin: '0px 0px -50px 0px'
        });

        reveals.forEach(el => observer.observe(el));
    }

    // ===== Smooth Scroll for Anchor Links =====
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    
                    // Check for reduced motion
                    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    
                    target.scrollIntoView({
                        behavior: prefersReducedMotion ? 'auto' : 'smooth',
                        block: 'start'
                    });

                    // Update URL without triggering scroll
                    history.pushState(null, null, href);
                    
                    // Focus the target for accessibility
                    target.setAttribute('tabindex', '-1');
                    target.focus({ preventScroll: true });
                }
            });
        });
    }

    // ===== Drawing Line Animation =====
    function initDrawingLines() {
        const drawingLines = document.querySelectorAll('.drawing-line');
        if (!drawingLines.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                }
            });
        }, { threshold: 0.5 });

        drawingLines.forEach(line => observer.observe(line));
    }

    // ===== Rangoli Expansion =====
    function initRangoliExpand() {
        const rangolis = document.querySelectorAll('.rangoli-expand');
        if (!rangolis.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.3 });

        rangolis.forEach(el => observer.observe(el));
    }

    // ===== Keyboard Navigation =====
    function initKeyboardNav() {
        // Add keyboard support for day chips
        document.querySelectorAll('.day-chip').forEach(chip => {
            chip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    chip.click();
                }
            });
        });
    }

    // ===== Focus Management =====
    function initFocusManagement() {
        // Ensure focus is visible
        document.body.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-nav');
            }
        });

        document.body.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-nav');
        });
    }

    // ===== Initialize =====
    function init() {
        initPreloader();
        initNavigation();
        initScrollReveals();
        initSmoothScroll();
        initDrawingLines();
        initRangoliExpand();
        initKeyboardNav();
        initFocusManagement();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
