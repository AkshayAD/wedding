/* ====================================
   PREMIUM WEDDING INVITATION V2
   JavaScript - GSAP Powered
   ==================================== */

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ====================================
// PRELOADER
// ====================================
function initPreloader() {
    const preloader = document.getElementById('preloader');

    window.addEventListener('load', () => {
        gsap.to(preloader, {
            opacity: 0,
            duration: 0.8,
            delay: 1,
            onComplete: () => {
                preloader.classList.add('hidden');
                initAnimations();
            }
        });
    });
}

// ====================================
// CURSOR GLOW EFFECT
// ====================================
function initCursorGlow() {
    const cursorGlow = document.getElementById('cursor-glow');
    if (!cursorGlow || window.innerWidth < 768) return;

    document.addEventListener('mousemove', (e) => {
        gsap.to(cursorGlow, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.5,
            ease: 'power2.out'
        });
    });
}

// ====================================
// PROGRESS BAR
// ====================================
function initProgressBar() {
    const progressFill = document.querySelector('.progress-fill');

    ScrollTrigger.create({
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
            gsap.to(progressFill, {
                width: `${self.progress * 100}%`,
                duration: 0.1
            });
        }
    });

    // Toggle top class for progress markers
    ScrollTrigger.create({
        trigger: 'body',
        start: 'top -100',
        onEnter: () => document.body.classList.remove('at-top'),
        onLeaveBack: () => document.body.classList.add('at-top')
    });

    document.body.classList.add('at-top');
}

// ====================================
// PARTICLES CANVAS
// ====================================
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 10;
            this.size = Math.random() * 3 + 1;
            this.speedY = Math.random() * 0.5 + 0.2;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.color = Math.random() > 0.5 ? '#D4AF37' : '#F5E6B8';
        }

        update() {
            this.y -= this.speedY;
            this.x += this.speedX;

            if (this.y < -10) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    function init() {
        particles = [];
        const count = Math.min(50, Math.floor(window.innerWidth / 30));
        for (let i = 0; i < count; i++) {
            const p = new Particle();
            p.y = Math.random() * canvas.height; // Spread initially
            particles.push(p);
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }

    resize();
    init();
    animate();

    window.addEventListener('resize', () => {
        resize();
        init();
    });
}

// ====================================
// HERO ANIMATIONS
// ====================================
function initHeroAnimations() {
    const heroElements = document.querySelectorAll('.hero-section .reveal-up');

    gsap.fromTo(heroElements,
        { opacity: 0, y: 40 },
        {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.15,
            ease: 'power3.out',
            delay: 1.5
        }
    );

    // Parallax on hero orbs
    gsap.to('.orb-1', {
        y: -100,
        scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: 'bottom top',
            scrub: 1
        }
    });

    gsap.to('.orb-2', {
        y: -150,
        scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: 'bottom top',
            scrub: 1
        }
    });
}

// ====================================
// HORIZONTAL SCROLL (DAY 1)
// ====================================
function initHorizontalScroll() {
    const horizontalSection = document.querySelector('.horizontal-section');
    const horizontalWrapper = document.querySelector('.horizontal-wrapper');

    if (!horizontalSection || !horizontalWrapper) return;

    const panels = gsap.utils.toArray('.h-panel');

    gsap.to(panels, {
        xPercent: -100 * (panels.length - 1),
        ease: 'none',
        scrollTrigger: {
            trigger: horizontalSection,
            pin: true,
            scrub: 1,
            snap: 1 / (panels.length - 1),
            end: () => "+=" + horizontalWrapper.offsetWidth
        }
    });

    // Animate content in each panel
    panels.forEach((panel, index) => {
        const content = panel.querySelector('.panel-content');
        if (!content) return;

        gsap.from(content.children, {
            opacity: 0,
            y: 50,
            stagger: 0.1,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: panel,
                containerAnimation: gsap.getById ? undefined : undefined,
                start: 'left 80%',
                toggleActions: 'play none none reverse',
                horizontal: true
            }
        });
    });
}

// ====================================
// VERTICAL PANELS (DAY 2)
// ====================================
function initVerticalPanels() {
    const vPanels = gsap.utils.toArray('.v-panel');

    vPanels.forEach(panel => {
        const content = panel.querySelector('.panel-content');
        if (!content) return;

        gsap.from(content.children, {
            opacity: 0,
            y: 60,
            stagger: 0.1,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: panel,
                start: 'top 70%',
                toggleActions: 'play none none reverse'
            }
        });

        // Image frame parallax
        const imageFrame = panel.querySelector('.image-frame');
        if (imageFrame) {
            gsap.to(imageFrame, {
                y: -30,
                scrollTrigger: {
                    trigger: panel,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1
                }
            });
        }
    });
}

// ====================================
// TRANSITION SECTION
// ====================================
function initTransition() {
    const transitionSection = document.querySelector('.transition-section');
    if (!transitionSection) return;

    gsap.from('.moon-sun-transition', {
        scale: 0.8,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
            trigger: transitionSection,
            start: 'top 70%',
            toggleActions: 'play none none reverse'
        }
    });

    gsap.from('.transition-text', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.3,
        scrollTrigger: {
            trigger: transitionSection,
            start: 'top 70%',
            toggleActions: 'play none none reverse'
        }
    });
}

// ====================================
// FINALE ANIMATIONS
// ====================================
function initFinaleAnimations() {
    const finaleSection = document.querySelector('.finale-section');
    if (!finaleSection) return;

    const finaleElements = finaleSection.querySelectorAll('.reveal-up');

    gsap.from(finaleElements, {
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
            trigger: finaleSection,
            start: 'top 60%',
            toggleActions: 'play none none reverse'
        }
    });
}

// ====================================
// IMAGE FRAME HOVER EFFECTS
// ====================================
function initImageHoverEffects() {
    const frames = document.querySelectorAll('.image-frame');

    frames.forEach(frame => {
        frame.addEventListener('mouseenter', () => {
            gsap.to(frame, {
                scale: 1.02,
                duration: 0.4,
                ease: 'power2.out'
            });
        });

        frame.addEventListener('mouseleave', () => {
            gsap.to(frame, {
                scale: 1,
                duration: 0.4,
                ease: 'power2.out'
            });
        });
    });
}

// ====================================
// SMOOTH ANCHOR SCROLL
// ====================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                gsap.to(window, {
                    duration: 1.5,
                    scrollTo: { y: target, offsetY: 0 },
                    ease: 'power3.inOut'
                });
            }
        });
    });
}

// ====================================
// INITIALIZE ALL ANIMATIONS
// ====================================
function initAnimations() {
    initHeroAnimations();
    initHorizontalScroll();
    initVerticalPanels();
    initTransition();
    initFinaleAnimations();
    initImageHoverEffects();

    console.log('✨ Premium Wedding V2 Animations Initialized');
}

// ====================================
// STARTUP
// ====================================
document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initCursorGlow();
    initProgressBar();
    initParticles();
    initSmoothScroll();

    console.log('🎊 Premium Wedding Invitation V2 Loaded');
});
