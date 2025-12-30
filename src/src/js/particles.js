/**
 * Three.js Gold Particle System
 * Creates floating gold dust/sparkle effect in 3D space
 */

import * as THREE from 'three';

let scene, camera, renderer, particles, animationId;
let mouseX = 0, mouseY = 0;
const particleCount = 150;

export function initParticles(container) {
    if (!container) return;

    // Scene setup
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 50;

    // Renderer
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Create particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);

    // Gold color variations
    const goldColors = [
        { r: 1.0, g: 0.84, b: 0.0 },    // Pure gold
        { r: 0.85, g: 0.65, b: 0.12 },  // Darker gold
        { r: 1.0, g: 0.93, b: 0.55 },   // Light gold
        { r: 0.80, g: 0.50, b: 0.20 },  // Bronze gold
    ];

    for (let i = 0; i < particleCount; i++) {
        // Random position in 3D space
        positions[i * 3] = (Math.random() - 0.5) * 100;     // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100; // y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;  // z

        // Random gold color variation
        const color = goldColors[Math.floor(Math.random() * goldColors.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        // Random size (smaller = more distant feel)
        sizes[i] = Math.random() * 2 + 0.5;

        // Random float speed
        speeds[i] = Math.random() * 0.02 + 0.005;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Store speeds for animation
    geometry.userData.speeds = speeds;
    geometry.userData.originalPositions = positions.slice();

    // Shader material for glowing particles
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vOpacity;
      uniform float time;
      
      void main() {
        vColor = color;
        
        // Subtle floating animation
        vec3 pos = position;
        pos.y += sin(time * 0.5 + position.x * 0.1) * 2.0;
        pos.x += cos(time * 0.3 + position.y * 0.1) * 1.0;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        
        // Size attenuation
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        
        // Fade based on depth
        vOpacity = smoothstep(-80.0, -20.0, mvPosition.z);
      }
    `,
        fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      
      void main() {
        // Circular particle with soft edge (glow effect)
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha *= vOpacity * 0.8;
        
        // Add subtle glow
        vec3 glow = vColor * (1.0 + (0.5 - dist) * 0.5);
        
        gl_FragColor = vec4(glow, alpha);
      }
    `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Event listeners
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);

    // Start animation
    animate();

    console.log('✅ Three.js particle system initialized');
}

function animate() {
    animationId = requestAnimationFrame(animate);

    const time = performance.now() * 0.001;

    // Update shader time uniform
    particles.material.uniforms.time.value = time;

    // Subtle rotation based on mouse
    particles.rotation.y += (mouseX * 0.00005 - particles.rotation.y) * 0.05;
    particles.rotation.x += (mouseY * 0.00005 - particles.rotation.x) * 0.05;

    // Very slow continuous rotation
    particles.rotation.z += 0.0002;

    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    mouseX = event.clientX - window.innerWidth / 2;
    mouseY = event.clientY - window.innerHeight / 2;
}

export function destroyParticles() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
    }

    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMouseMove);
}
