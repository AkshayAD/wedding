/**
 * Animations - GSAP ScrollTrigger powered animations
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initAnimations() {
    // ===== Reveal Text Animations =====
    const revealTexts = document.querySelectorAll('.reveal-text');

    revealTexts.forEach((text) => {
        // Skip hero elements (handled by preloader)
        if (text.closest('.hero')) return;

        ScrollTrigger.create({
            trigger: text,
            start: 'top 85%',
            once: true,
            onEnter: () => {
                text.classList.add('visible');
            }
        });
    });

    // ===== Day Cards Stagger =====
    const dayCards = document.querySelectorAll('.day-card');

    if (dayCards.length) {
        gsap.from(dayCards, {
            y: 60,
            opacity: 0,
            stagger: 0.15,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '.day-cards',
                start: 'top 80%',
                once: true
            }
        });
    }

    // ===== Fullscreen Event Cards =====
    const eventCards = document.querySelectorAll('.event-card.fullscreen');

    eventCards.forEach((card) => {
        const content = card.querySelector('.event-content');
        const emoji = card.querySelector('.event-emoji');
        const title = card.querySelector('.event-title');
        const elements = card.querySelectorAll('.event-tagline, .event-time-badge, .event-desc');

        // Create timeline for each card
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: card,
                start: 'top 70%',
                once: true
            }
        });

        if (emoji) {
            tl.from(emoji, {
                scale: 0,
                opacity: 0,
                duration: 0.5,
                ease: 'back.out(1.7)'
            });
        }

        if (title) {
            tl.from(title, {
                y: 30,
                opacity: 0,
                duration: 0.6,
                ease: 'power3.out'
            }, '-=0.2');
        }

        if (elements.length) {
            tl.from(elements, {
                y: 20,
                opacity: 0,
                stagger: 0.1,
                duration: 0.5,
                ease: 'power2.out'
            }, '-=0.3');
        }
    });

    // ===== Events Header Animation =====
    const eventsHeaders = document.querySelectorAll('.events-header');

    eventsHeaders.forEach((header) => {
        const label = header.querySelector('.day-label');
        const title = header.querySelector('.events-title');
        const date = header.querySelector('.events-date');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: header,
                start: 'top 80%',
                once: true
            }
        });

        if (label) {
            tl.from(label, {
                scale: 0.8,
                opacity: 0,
                duration: 0.5,
                ease: 'back.out(1.7)'
            });
        }

        if (title) {
            tl.from(title, {
                y: 20,
                opacity: 0,
                duration: 0.6,
                ease: 'power3.out'
            }, '-=0.2');
        }

        if (date) {
            tl.from(date, {
                y: 10,
                opacity: 0,
                duration: 0.4,
                ease: 'power2.out'
            }, '-=0.3');
        }
    });

    // ===== Closing Section =====
    const closingContent = document.querySelector('.closing-content');

    if (closingContent) {
        const elements = closingContent.children;

        gsap.from(elements, {
            y: 40,
            opacity: 0,
            stagger: 0.12,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: closingContent,
                start: 'top 70%',
                once: true
            }
        });
    }

    // ===== Scroll Indicator Animation =====
    const scrollIndicator = document.querySelector('.scroll-indicator');

    if (scrollIndicator) {
        // Add bounce animation class
        scrollIndicator.classList.add('animate');

        // Fade out on scroll
        gsap.to(scrollIndicator, {
            opacity: 0,
            y: 20,
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: '30% top',
                scrub: true
            }
        });
    }

    // ===== Hero Parallax (subtle on mobile) =====
    const heroContent = document.querySelector('.hero-content');

    if (heroContent) {
        gsap.to(heroContent, {
            y: -50,
            opacity: 0.5,
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });
    }

    console.log('✅ GSAP animations initialized');
}

// Utility: Refresh ScrollTrigger (call after DOM changes)
export function refreshAnimations() {
    ScrollTrigger.refresh();
}
