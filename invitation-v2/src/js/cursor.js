/**
 * Custom Cursor with Gold Trail
 * Premium cursor effect with trailing sparkles
 */

let cursor, cursorTrail, cursorDot;
let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;
let isHovering = false;
let trails = [];
const trailLength = 8;

export function initCustomCursor() {
    // Check for touch device - disable custom cursor
    if ('ontouchstart' in window) {
        console.log('Touch device detected - skipping custom cursor');
        return;
    }

    // Create cursor elements
    cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.innerHTML = `
    <div class="cursor-ring"></div>
    <div class="cursor-dot"></div>
  `;
    document.body.appendChild(cursor);

    // Create trail container
    cursorTrail = document.createElement('div');
    cursorTrail.className = 'cursor-trail-container';
    document.body.appendChild(cursorTrail);

    // Create trail dots
    for (let i = 0; i < trailLength; i++) {
        const dot = document.createElement('div');
        dot.className = 'cursor-trail-dot';
        dot.style.opacity = 1 - (i / trailLength);
        dot.style.transform = `scale(${1 - (i / trailLength) * 0.5})`;
        cursorTrail.appendChild(dot);
        trails.push({ element: dot, x: 0, y: 0 });
    }

    // Add CSS
    addCursorStyles();

    // Event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseenter', onMouseEnter);
    document.addEventListener('mouseleave', onMouseLeave);

    // Add hover detection for interactive elements
    const interactives = document.querySelectorAll('a, button, .day-card, .event-card');
    interactives.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hovering');
            isHovering = true;
        });
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hovering');
            isHovering = false;
        });
    });

    // Start animation
    animateCursor();

    console.log('✅ Custom cursor initialized');
}

function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
}

function onMouseEnter() {
    cursor.style.opacity = '1';
}

function onMouseLeave() {
    cursor.style.opacity = '0';
}

function animateCursor() {
    // Smooth follow with easing
    const ease = 0.15;
    cursorX += (mouseX - cursorX) * ease;
    cursorY += (mouseY - cursorY) * ease;

    // Update main cursor position
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    // Update trail positions with delay
    for (let i = trails.length - 1; i > 0; i--) {
        trails[i].x = trails[i - 1].x;
        trails[i].y = trails[i - 1].y;
    }
    trails[0].x = cursorX;
    trails[0].y = cursorY;

    // Apply trail positions
    trails.forEach((trail, i) => {
        trail.element.style.left = `${trail.x}px`;
        trail.element.style.top = `${trail.y}px`;
    });

    requestAnimationFrame(animateCursor);
}

function addCursorStyles() {
    if (document.getElementById('cursor-styles')) return;

    const style = document.createElement('style');
    style.id = 'cursor-styles';
    style.textContent = `
    /* Hide default cursor */
    * {
      cursor: none !important;
    }
    
    .custom-cursor {
      position: fixed;
      pointer-events: none;
      z-index: 99999;
      mix-blend-mode: difference;
      transition: opacity 0.3s ease;
    }
    
    .cursor-ring {
      position: absolute;
      width: 40px;
      height: 40px;
      border: 2px solid #FFD700;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    
    .cursor-dot {
      position: absolute;
      width: 8px;
      height: 8px;
      background: #FFD700;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease;
    }
    
    .custom-cursor.hovering .cursor-ring {
      transform: translate(-50%, -50%) scale(1.5);
      border-color: #8B1538;
    }
    
    .custom-cursor.hovering .cursor-dot {
      transform: translate(-50%, -50%) scale(1.5);
      background: #8B1538;
    }
    
    .cursor-trail-container {
      position: fixed;
      pointer-events: none;
      z-index: 99998;
    }
    
    .cursor-trail-dot {
      position: absolute;
      width: 6px;
      height: 6px;
      background: radial-gradient(circle, #FFD700 0%, transparent 70%);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    
    /* Disable on mobile */
    @media (hover: none) {
      .custom-cursor,
      .cursor-trail-container {
        display: none !important;
      }
      
      * {
        cursor: auto !important;
      }
    }
  `;
    document.head.appendChild(style);
}

export function destroyCursor() {
    if (cursor) cursor.remove();
    if (cursorTrail) cursorTrail.remove();
    document.removeEventListener('mousemove', onMouseMove);
}
