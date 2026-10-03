const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.06 });
  document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
}
document.querySelectorAll('[data-copy-feed]').forEach(button => {
  button.addEventListener('click', async () => {
    const status = button.parentElement.querySelector('[role="status"]');
    try {
      await navigator.clipboard.writeText(button.dataset.copyFeed);
      status.textContent = 'Feed link copied. Paste it into your podcast app’s Add by URL option.';
    } catch {
      status.textContent = 'Copy is unavailable here. Use the feed link below and copy its address.';
    }
  });
});
