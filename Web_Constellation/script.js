const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const introText = document.getElementById('intro-text');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-image');
const closeModalBtn = document.getElementById('close-modal');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Configuration ---
// Added 'color' for dynamic ambient lighting
const EVENTS = [
    { label: "Welcome", image: "assets/Invitation Cover.png", x: 0.5, y: 0.2, color: "#d4af37" }, // Gold
    { label: "Haldi", image: "assets/Haldi Final.png", x: 0.2, y: 0.5, color: "#FFD700" }, // Bright Yellow
    { label: "Sangeet", image: "assets/Sangeet Final.png", x: 0.8, y: 0.5, color: "#a020f0" }, // Purple/Pink vibe
    { label: "Barat", image: "assets/Barat.png", x: 0.35, y: 0.8, color: "#ff4500" }, // Red/Orange
    { label: "Ceremony", image: "assets/Wedding Ceremony.png", x: 0.65, y: 0.8, color: "#ff0000" } // Deep Red
];

const STAR_RADIUS = 15;
const HOVER_RADIUS = 30;
const PARTICLE_COUNT = 150;
const CONNECTION_DISTANCE = 150;

// --- State ---
let particles = [];
let stars = [];
let mouse = { x: -1000, y: -1000 };
let isExplored = false;
let currentThemeColor = { r: 255, g: 255, b: 255 }; // Default White
let targetThemeColor = { r: 255, g: 255, b: 255 };

// Helper to convert hex to rgb
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

// Lerp function for smooth color transition
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// --- Classes ---
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2;
        this.alpha = Math.random() * 0.5 + 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        // Use current theme color
        ctx.fillStyle = `rgba(${currentThemeColor.r}, ${currentThemeColor.g}, ${currentThemeColor.b}, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Star {
    constructor(config) {
        this.config = config;
        this.x = config.x * canvas.width;
        this.y = config.y * canvas.height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.radius = STAR_RADIUS;
        this.hovered = false;
        this.pulse = 0;
    }

    update() {
        // Recalculate position on resize
        this.x = this.config.x * canvas.width;
        this.y = this.config.y * canvas.height;

        // Mouse interaction
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
            this.hovered = true;
            document.body.style.cursor = 'pointer';
        } else {
            this.hovered = false;
        }

        // Pulse effect
        this.pulse += 0.05;
    }

    draw() {
        const currentRadius = this.hovered ? HOVER_RADIUS : this.radius + Math.sin(this.pulse) * 2;

        // Glow (Use config color)
        const rgb = hexToRgb(this.config.color);
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentRadius * 2);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Label
        if (this.hovered || !isExplored) {
            ctx.fillStyle = this.config.color;
            ctx.font = '20px "Cinzel"';
            ctx.textAlign = 'center';
            ctx.fillText(this.config.label, this.x, this.y + 50);
        }
    }
}

// --- Initialization ---
function init() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }

    EVENTS.forEach(evt => {
        stars.push(new Star(evt));
    });

    // Animate Intro
    setTimeout(() => {
        introText.classList.add('visible');
    }, 500);

    setTimeout(() => {
        isExplored = true; // Stop showing titles by default after a while
        introText.classList.add('fade-out');
        canvas.style.pointerEvents = 'auto'; // Enable interaction
    }, 4000);
}

// --- Animation Loop ---
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Smoothly transition theme color
    currentThemeColor.r = lerp(currentThemeColor.r, targetThemeColor.r, 0.05);
    currentThemeColor.g = lerp(currentThemeColor.g, targetThemeColor.g, 0.05);
    currentThemeColor.b = lerp(currentThemeColor.b, targetThemeColor.b, 0.05);

    // Update Tint Overlay (Background Layer)
    const bgLayer = document.getElementById('background-layer');
    // More subtle background tint
    bgLayer.style.backgroundColor = `rgba(${currentThemeColor.r}, ${currentThemeColor.g}, ${currentThemeColor.b}, 0.15)`;


    // Update Particles
    particles.forEach(p => {
        p.update();
        p.draw();

        // Draw lines between close particles
        particles.forEach(p2 => {
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 50) {
                ctx.strokeStyle = `rgba(${currentThemeColor.r}, ${currentThemeColor.g}, ${currentThemeColor.b}, ${0.1 * (1 - dist / 50)})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });
    });

    // Draw Constellation Lines (Connecting Stars)
    ctx.strokeStyle = `rgba(${currentThemeColor.r}, ${currentThemeColor.g}, ${currentThemeColor.b}, 0.2)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Simple path: Cover -> Haldi -> Barat -> Ceremony -> Sangeet (Loop roughly)
    const connections = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]];
    connections.forEach(pair => {
        const s1 = stars[pair[0]];
        const s2 = stars[pair[1]];
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
    });
    ctx.stroke();

    // Update Stars
    let cursorReset = true;
    stars.forEach(s => {
        s.update();
        s.draw();
        if (s.hovered) cursorReset = false;
    });

    if (cursorReset) document.body.style.cursor = 'default';

    requestAnimationFrame(animate);
}

// --- Interaction ---
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('click', (e) => {
    // Check if clicked on a star
    stars.forEach(s => {
        const dx = mouse.x - s.x;
        const dy = mouse.y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
            openModal(s.config);
        }
    });
});

function openModal(config) {
    modalImg.src = config.image;

    // Set dynamic glow for CSS
    document.documentElement.style.setProperty('--glow-color', config.color);

    // Set target theme color for JS particles
    const rgb = hexToRgb(config.color);
    targetThemeColor = rgb;

    modal.classList.remove('hidden');
    // Force reflow
    void modal.offsetWidth;
    modal.classList.add('visible');
}

function closeModal() {
    modal.classList.remove('visible');

    // Reset to default theme
    targetThemeColor = { r: 255, g: 255, b: 255 };
    document.documentElement.style.setProperty('--glow-color', 'rgba(212, 175, 55, 0.5)'); // Reset glow

    setTimeout(() => {
        modal.classList.add('hidden');
        modalImg.src = '';
    }, 500);
}

closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Start
init();
animate();
