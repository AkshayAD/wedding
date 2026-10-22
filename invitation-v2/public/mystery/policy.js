// Give a TV remote a reading mode without jumping between distant links.
document.addEventListener('keydown', function (event) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    window.scrollBy(0, (event.key === 'ArrowDown' ? 1 : -1) * Math.round(window.innerHeight * 0.45));
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    var links = Array.prototype.slice.call(document.querySelectorAll('a[href]'));
    var index = links.indexOf(document.activeElement);
    index = index < 0 ? 0 : Math.max(0, Math.min(links.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)));
    if (links[index]) { event.preventDefault(); links[index].focus(); links[index].scrollIntoView({block:'nearest'}); }
  }
});
