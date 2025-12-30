/**
 * Countdown Timer
 * Live countdown to February 7, 2026
 */

// Wedding date: February 7, 2026 at 12:00 PM IST
const WEDDING_DATE = new Date('2026-02-07T12:00:00+05:30');

let countdownInterval = null;

export function initCountdown() {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');

    if (!daysEl || !hoursEl || !minutesEl) {
        console.warn('Countdown elements not found');
        return;
    }

    function updateCountdown() {
        const now = new Date();
        const diff = WEDDING_DATE - now;

        if (diff <= 0) {
            // Wedding day or past
            daysEl.textContent = '0';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';

            // Stop interval
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        // Update with animation
        updateNumber(daysEl, days);
        updateNumber(hoursEl, hours.toString().padStart(2, '0'));
        updateNumber(minutesEl, minutes.toString().padStart(2, '0'));
    }

    function updateNumber(el, newValue) {
        const currentValue = el.textContent;
        if (currentValue !== newValue.toString()) {
            // Add pulse animation
            el.classList.add('pulse');
            el.textContent = newValue;

            // Remove animation class after it completes
            setTimeout(() => {
                el.classList.remove('pulse');
            }, 300);
        }
    }

    // Initial update
    updateCountdown();

    // Update every second
    countdownInterval = setInterval(updateCountdown, 1000);

    console.log('✅ Countdown initialized - Wedding: Feb 7, 2026');

    return countdownInterval;
}

// Calculate days until wedding
export function getDaysUntilWedding() {
    const now = new Date();
    const diff = WEDDING_DATE - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
