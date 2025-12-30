/**
 * PWA Module - Install Prompt, Notifications, Reminders
 */

// ===== Service Worker Registration =====
export async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/wedding/sw.js');
            console.log('✅ Service Worker registered');
            return registration;
        } catch (error) {
            console.log('Service Worker registration failed:', error);
            return null;
        }
    }
    return null;
}

// ===== PWA Install Prompt =====
let deferredPrompt = null;

export function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'flex';
            installBtn.addEventListener('click', promptInstall);
        }
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.style.display = 'none';
        console.log('🎉 PWA installed');
    });
}

async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    console.log('Install prompt result:', result.outcome);
    deferredPrompt = null;
}

// ===== Notification Permission =====
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

// ===== Schedule Reminder =====
export async function scheduleReminder(id, title, body, scheduledTime) {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
        alert('Please allow notifications to set reminders.');
        return false;
    }

    // Store in localStorage for persistence
    const reminders = JSON.parse(localStorage.getItem('wedding-reminders') || '[]');
    reminders.push({ id, title, body, scheduledTime });
    localStorage.setItem('wedding-reminders', JSON.stringify(reminders));

    // Schedule notification using setTimeout (works for short timeframes)
    const delay = scheduledTime - Date.now();
    if (delay > 0 && delay < 2147483647) { // Max setTimeout delay
        setTimeout(() => {
            new Notification(title, { body, icon: '/wedding/src/assets/icons/logo.svg' });
        }, delay);
    }

    console.log(`🔔 Reminder scheduled: ${title} at ${new Date(scheduledTime).toLocaleString()}`);
    return true;
}

// ===== Reminder Modal =====
export function initReminderModal() {
    const modal = document.getElementById('reminder-modal');
    const backdrop = document.getElementById('reminder-backdrop');
    const closeBtn = modal?.querySelector('.modal-close');
    const form = document.getElementById('reminder-form');
    const openBtns = document.querySelectorAll('[data-open-reminder]');
    const dateInput = form?.querySelector('[name="reminder-date"]');
    const timeInput = form?.querySelector('[name="reminder-time"]');

    if (!modal) return;

    // Set default date (tomorrow) and time (current time)
    function setDefaults() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        if (dateInput) dateInput.value = dateStr;

        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 5);
        if (timeInput) timeInput.value = timeStr;
    }

    // Open modal
    openBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setDefaults();
            modal.classList.add('active');
            backdrop.classList.add('active');
        });
    });

    // Close modal
    const closeModal = () => {
        modal.classList.remove('active');
        backdrop.classList.remove('active');
    };

    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    // Show visual confirmation
    function showConfirmation(dateTime) {
        const formattedDate = new Date(dateTime).toLocaleString('en-IN', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });

        // Replace form content with confirmation
        form.innerHTML = `
            <div style="text-align: center; padding: 20px 0;">
                <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
                <h4 style="color: #4A0A1E; margin-bottom: 10px;">Reminder Set!</h4>
                <p style="color: #666; font-size: 0.9rem;">
                    You'll be notified on<br><strong>${formattedDate}</strong>
                </p>
            </div>
        `;

        // Close after 2.5 seconds
        setTimeout(() => {
            closeModal();
            setTimeout(() => location.reload(), 300);
        }, 2500);
    }

    // Form submit
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const reminderType = form.querySelector('[name="reminder-type"]').value;
        const reminderDate = form.querySelector('[name="reminder-date"]').value;
        const reminderTime = form.querySelector('[name="reminder-time"]').value;

        if (!reminderDate || !reminderTime) {
            alert('Please select date and time');
            return;
        }

        const scheduledTime = new Date(`${reminderDate}T${reminderTime}`).getTime();

        const messages = {
            'flights': { title: '✈️ Book Your Flights!', body: 'Reminder to book flights for the wedding - Feb 6-7, 2026' },
            'travel': { title: '🚆 Book Your Travel!', body: 'Reminder to book train/bus for the wedding' },
            'tadoba': { title: '🐯 Book Tadoba Safari!', body: 'Reminder to book Tadoba Tiger Reserve safari tickets' }
        };

        const msg = messages[reminderType] || messages['flights'];
        const success = await scheduleReminder(
            `reminder-${Date.now()}`,
            msg.title,
            msg.body,
            scheduledTime
        );

        if (success) {
            showConfirmation(scheduledTime);
        }
    });
}

// ===== Shooting Stars =====
export function initShootingStars() {
    const container = document.getElementById('shooting-stars');
    if (!container) return;

    function createStar() {
        const star = document.createElement('div');
        star.className = 'shooting-star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 50}%`;
        star.style.animationDuration = `${1 + Math.random() * 2}s`;
        container.appendChild(star);

        setTimeout(() => star.remove(), 3000);
    }

    // Create star every 3-8 seconds
    setInterval(() => {
        if (Math.random() > 0.5) createStar();
    }, 3000);

    // Initial stars
    setTimeout(createStar, 1000);
    setTimeout(createStar, 2000);
}

// ===== Confetti =====
let confettiLoaded = false;

export async function triggerConfetti() {
    if (!confettiLoaded) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
        confettiLoaded = true;
    }

    const colors = ['#FFD700', '#B8860B', '#4A0A1E', '#FF7518'];

    window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors
    });

    setTimeout(() => {
        window.confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors
        });
        window.confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors
        });
    }, 250);
}
