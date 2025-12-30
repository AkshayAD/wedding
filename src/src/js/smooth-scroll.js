/**
 * Smooth Scroll - Lenis Integration
 * Buttery 60fps scrolling with GSAP sync
 */

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Lenis instance (exported for global access)
export let lenis = null;

export function initSmoothScroll() {
    // Create Lenis instance
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
    });

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Add Lenis's RAF to GSAP's ticker
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    // Disable GSAP's lag smoothing for better sync
    gsap.ticker.lagSmoothing(0);

    // Handle anchor links for smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                lenis.scrollTo(target, {
                    offset: 0,
                    duration: 1.5,
                    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                });

                // Update URL
                history.pushState(null, null, href);
            }
        });
    });

    // Stop Lenis when modal/overlay is open
    // lenis.stop() / lenis.start()

    console.log('✅ Lenis smooth scroll initialized');

    return lenis;
}

// Utility: Scroll to element
export function scrollTo(target, options = {}) {
    if (!lenis) return;
    lenis.scrollTo(target, options);
}
