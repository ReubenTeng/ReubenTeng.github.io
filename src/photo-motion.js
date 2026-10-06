const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function photoMotion(dialog) {
  let panelAnimation;
  function reset() {
    panelAnimation?.cancel();
    panelAnimation = null;
    dialog.classList.remove('viewer-entering', 'viewer-leaving');
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      for (const animation of dialog.getAnimations({ subtree: true })) animation.finish();
    }
  });
  return {
    reset,
    open(backdrop) {
      if (reducedMotion.matches) return;
      if (backdrop) dialog.classList.add('viewer-entering');
      const animation = dialog.animate([
        { opacity: 0, transform: 'scale(.97)' },
        { opacity: 1, transform: 'scale(1)' }
      ], { duration: 200, easing: 'ease-out' });
      panelAnimation = animation;
      animation.finished.then(() => {
        if (panelAnimation === animation) reset();
      }).catch(() => {});
    },
    async leave(backdrop) {
      reset();
      if (reducedMotion.matches) return;
      if (backdrop) dialog.classList.add('viewer-leaving');
      panelAnimation = dialog.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 120, easing: 'ease-out', fill: 'forwards'
      });
      await panelAnimation.finished.catch(() => {});
    },
    previousPhoto() {
      if (reducedMotion.matches || !dialog.open || !dialog.classList.contains('viewer')) return null;
      const current = dialog.querySelector('#full-photo[data-ready]') || dialog.querySelector('.photo-outgoing');
      if (!current) return null;
      const copy = current.cloneNode();
      copy.removeAttribute('id');
      copy.removeAttribute('data-ready');
      copy.classList.add('photo-outgoing');
      copy.setAttribute('aria-hidden', 'true');
      copy.alt = '';
      copy.style.opacity = '1';
      return copy;
    },
    reveal(image, previous) {
      if (previous) {
        image.before(previous);
        image.style.opacity = '0';
      }
      let settled = false;
      async function loaded() {
        if (settled) return;
        settled = true;
        try { await image.decode(); } catch { /* The error handler covers failed requests. */ }
        if (!image.isConnected || !image.naturalWidth) return;
        image.dataset.ready = 'true';
        image.style.opacity = '';
        if (previous && !reducedMotion.matches) {
          const animation = image.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
          await animation.finished.catch(() => {});
        }
        previous?.remove();
      }
      function failed() {
        if (!image.isConnected) return;
        previous?.remove();
        const note = document.createElement('p');
        note.className = 'photo-error';
        note.textContent = 'This photograph couldn’t load. Try reopening it, or continue to the next one.';
        image.replaceWith(note);
      }
      image.addEventListener('load', loaded, { once: true });
      image.addEventListener('error', failed, { once: true });
      if (image.complete) image.naturalWidth ? loaded() : failed();
    }
  };
}
