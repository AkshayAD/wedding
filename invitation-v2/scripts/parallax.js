/**
 * Wedding Invitation V2 - Parallax & Motion Effects
 * Uses GSAP + ScrollTrigger for smooth, performant animations
 */

(function () {
    'use strict';

    // ===== Check for reduced motion preference =====
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        console.log('Parallax disabled: User prefers reduced motion');
        return;
    }

    // ===== Wait for GSAP to load =====
    function waitForGSAP() {
        return new Promise((resolve) => {
            if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 5000);
            }
        });
    }

    // ===== Floating Particles System =====
    class ParticleSystem {
        constructor(container, options = {}) {
            this.container = container;
            this.particles = [];
            this.options = {
                count: options.count || 15,
                types: options.types || ['diya', 'flower', 'sparkle'],
                speed: options.speed || 1,
                ...options
            };

            this.init();
        }

        createParticle(type) {
            const particle = document.createElement('div');
            particle.className = `particle particle-${type}`;

            // Random starting position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.bottom = `-50px`;

            // Random size variation
            const scale = 0.5 + Math.random() * 0.5;
            particle.style.transform = `scale(${scale})`;

            // Add SVG content for diya
            if (type === 'diya') {
                particle.innerHTML = this.createDiyaSVG();
            }

            this.container.appendChild(particle);
            return particle;
        }

        createDiyaSVG() {
            return `
                <svg viewBox="0 0 40 50" width="30" height="40" xmlns="http://www.w3.org/2000/svg">
                    <!-- Flame -->
                    <ellipse class="diya-flame" cx="20" cy="8" rx="6" ry="10" fill="url(#flameGrad)"/>
                    <!-- Diya body -->
                    <ellipse cx="20" cy="35" rx="16" ry="10" fill="#D4AF37"/>
                    <ellipse cx="20" cy="32" rx="12" ry="6" fill="#B8952E"/>
                    <ellipse cx="20" cy="30" rx="8" ry="4" fill="#E8A435"/>
                    <!-- Wick -->
                    <rect x="18" y="18" width="4" height="12" fill="#4A3830" rx="2"/>
                    <defs>
                        <radialGradient id="flameGrad" cx="50%" cy="70%" r="50%">
                            <stop offset="0%" stop-color="#FFFF00"/>
                            <stop offset="40%" stop-color="#FFA500"/>
                            <stop offset="100%" stop-color="#FF4500"/>
                        </radialGradient>
                    </defs>
                </svg>
            `;
        }

        animateParticle(particle) {
            const duration = 8 + Math.random() * 6; // 8-14 seconds
            const xDrift = -30 + Math.random() * 60; // -30 to 30px drift

            gsap.to(particle, {
                y: -(window.innerHeight + 100),
                x: xDrift,
                rotation: -10 + Math.random() * 20,
                opacity: 0,
                duration: duration / this.options.speed,
                ease: 'none',
                onComplete: () => {
                    particle.remove();
                    // Create new particle
                    setTimeout(() => {
                        const type = this.options.types[Math.floor(Math.random() * this.options.types.length)];
                        const newParticle = this.createParticle(type);
                        this.animateParticle(newParticle);
                    }, Math.random() * 2000);
                }
            });
        }

        init() {
            for (let i = 0; i < this.options.count; i++) {
                setTimeout(() => {
                    const type = this.options.types[Math.floor(Math.random() * this.options.types.length)];
                    const particle = this.createParticle(type);
                    // Start at random heights
                    particle.style.bottom = `${Math.random() * 30}%`;
                    this.animateParticle(particle);
                }, i * 500);
            }
        }
    }

    // ===== Initialize GSAP Parallax =====
    async function initParallax() {
        await waitForGSAP();

        if (typeof gsap === 'undefined') {
            console.warn('GSAP not loaded, parallax effects disabled');
            return;
        }

        // Register ScrollTrigger
        gsap.registerPlugin(ScrollTrigger);

        // ===== Bokeh Parallax (slow, background) =====
        gsap.utils.toArray('.bokeh').forEach((bokeh, i) => {
            gsap.to(bokeh, {
                y: -100 - (i * 30),
                scrollTrigger: {
                    trigger: document.body,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: 0.5
                }
            });
        });

        // ===== Paithani Border Parallax =====
        gsap.utils.toArray('.paithani-border').forEach((border) => {
            gsap.to(border, {
                y: -150,
                scrollTrigger: {
                    trigger: '.hero-parallax',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.3
                }
            });
        });

        // ===== Toran Subtle Sway =====
        gsap.to('.toran', {
            x: 15,
            scrollTrigger: {
                trigger: '.hero-parallax',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });

        // ===== Hero Content Fade Out on Scroll =====
        gsap.to('.hero-content', {
            opacity: 0,
            y: -50,
            scrollTrigger: {
                trigger: '.hero-parallax',
                start: '60% top',
                end: 'bottom top',
                scrub: true
            }
        });

        // ===== Day Section Reveals =====
        gsap.utils.toArray('.day-section').forEach((section) => {
            gsap.from(section.querySelector('.day-header'), {
                y: 60,
                opacity: 0,
                scrollTrigger: {
                    trigger: section,
                    start: 'top 80%',
                    end: 'top 50%',
                    scrub: 1
                }
            });
        });

        // ===== Event Cards Staggered Entry =====
        gsap.utils.toArray('.events-grid').forEach((grid) => {
            const cards = grid.querySelectorAll('.event-card');
            gsap.from(cards, {
                y: 80,
                opacity: 0,
                stagger: 0.2,
                scrollTrigger: {
                    trigger: grid,
                    start: 'top 75%',
                    end: 'top 40%',
                    scrub: 1
                }
            });
        });

        // ===== Drawing Line Animation =====
        gsap.utils.toArray('.drawing-line').forEach((line) => {
            gsap.to(line, {
                strokeDashoffset: 0,
                scrollTrigger: {
                    trigger: line,
                    start: 'top 80%',
                    end: 'top 50%',
                    scrub: true
                }
            });
        });

        // ===== Closing Section Heart Pulse =====
        gsap.from('.closing-heart', {
            scale: 0.8,
            opacity: 0,
            scrollTrigger: {
                trigger: '.closing-section',
                start: 'top 70%',
                end: 'top 40%',
                scrub: 1
            }
        });

        // ===== Closing Content Stagger =====
        gsap.from('.closing-content > *', {
            y: 30,
            opacity: 0,
            stagger: 0.1,
            scrollTrigger: {
                trigger: '.closing-section',
                start: 'top 60%',
                toggleActions: 'play none none reverse'
            }
        });

        console.log('Parallax effects initialized');
    }

    // ===== Initialize Particle System =====
    function initParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        // Wait for GSAP
        waitForGSAP().then(() => {
            if (typeof gsap !== 'undefined') {
                new ParticleSystem(particlesContainer, {
                    count: 12,
                    types: ['diya', 'flower', 'sparkle'],
                    speed: 0.8
                });
            }
        });
    }

    // ===== Initialize =====
    function init() {
        initParallax();
        initParticles();
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
