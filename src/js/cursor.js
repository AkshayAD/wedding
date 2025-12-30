/**
 * Instant-Follow Sparkle Cursor
 * Wedding-themed diya/sparkle cursor with no lag
 */

let cursor, sparkleContainer;
let mouseX = 0, mouseY = 0;
let sparkles = [];
const maxSparkles = 12;

export function initCustomCursor() {
  // Skip on touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    console.log('Touch device - skipping custom cursor');
    return;
  }
  
  // Create main cursor (diya flame shape)
  cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  cursor.innerHTML = `
    <svg viewBox="0 0 24 32" width="24" height="32">
      <defs>
        <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:#B8860B"/>
          <stop offset="50%" style="stop-color:#FFD700"/>
          <stop offset="100%" style="stop-color:#FFF4E0"/>
        </linearGradient>
      </defs>
      <!-- Flame -->
      <path d="M12 2 Q8 10 10 16 Q12 20 12 20 Q12 20 14 16 Q16 10 12 2" 
            fill="url(#flameGrad)" class="cursor-flame"/>
      <!-- Diya base -->
      <ellipse cx="12" cy="24" rx="8" ry="4" fill="#B8860B"/>
      <ellipse cx="12" cy="22" rx="6" ry="2" fill="#D4A84B"/>
    </svg>
  `;
  document.body.appendChild(cursor);
  
  // Sparkle container
  sparkleContainer = document.createElement('div');
  sparkleContainer.className = 'sparkle-container';
  document.body.appendChild(sparkleContainer);
  
  // Add styles
  addCursorStyles();
  
  // Event listeners
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  
  // Animation loop - INSTANT follow (no easing)
  function update() {
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
    requestAnimationFrame(update);
  }
  update();
  
  console.log('✅ Sparkle cursor initialized');
}

function onMouseMove(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  // Create sparkle trail occasionally
  if (Math.random() < 0.15) {
    createSparkle(e.clientX, e.clientY);
  }
}

function onMouseDown() {
  // Burst of sparkles on click
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      createSparkle(
        mouseX + (Math.random() - 0.5) * 40,
        mouseY + (Math.random() - 0.5) * 40
      );
    }, i * 50);
  }
}

function createSparkle(x, y) {
  const sparkle = document.createElement('div');
  sparkle.className = 'cursor-sparkle';
  sparkle.style.left = `${x}px`;
  sparkle.style.top = `${y}px`;
  
  // Random gold shade
  const colors = ['#FFD700', '#B8860B', '#FFF4E0', '#D4A84B'];
  sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
  
  sparkleContainer.appendChild(sparkle);
  sparkles.push(sparkle);
  
  // Remove after animation
  setTimeout(() => {
    sparkle.remove();
    sparkles = sparkles.filter(s => s !== sparkle);
  }, 800);
  
  // Limit sparkles
  if (sparkles.length > maxSparkles) {
    const oldest = sparkles.shift();
    oldest.remove();
  }
}

function addCursorStyles() {
  if (document.getElementById('cursor-styles-v2')) return;
  
  const style = document.createElement('style');
  style.id = 'cursor-styles-v2';
  style.textContent = `
    /* Hide default cursor on interactive elements */
    body, a, button, [role="button"] {
      cursor: none !important;
    }
    
    .custom-cursor {
      position: fixed;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-12px, -28px);
      filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
    }
    
    .cursor-flame {
      animation: flameFlicker 0.3s ease-in-out infinite alternate;
    }
    
    @keyframes flameFlicker {
      0% { transform: scaleY(1) scaleX(1); }
      100% { transform: scaleY(1.1) scaleX(0.95); }
    }
    
    .sparkle-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 99998;
      overflow: hidden;
    }
    
    .cursor-sparkle {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      pointer-events: none;
      transform: translate(-3px, -3px);
      animation: sparkleFloat 0.8s ease-out forwards;
      box-shadow: 0 0 6px currentColor;
    }
    
    @keyframes sparkleFloat {
      0% {
        opacity: 1;
        transform: translate(-3px, -3px) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-3px, -30px) scale(0);
      }
    }
    
    /* Disable on mobile */
    @media (hover: none), (pointer: coarse) {
      .custom-cursor,
      .sparkle-container {
        display: none !important;
      }
      
      body, a, button, [role="button"] {
        cursor: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function destroyCursor() {
  if (cursor) cursor.remove();
  if (sparkleContainer) sparkleContainer.remove();
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mousedown', onMouseDown);
}
