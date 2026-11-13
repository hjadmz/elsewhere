/* The section links remain usable as ordinary anchors without this enhancement. */
(() => {
  const disclosure = document.querySelector('.section-navigation');
  const summary = disclosure.querySelector('summary');
  const currentLabel = summary.querySelector('.current-group');
  const links = new Map([...disclosure.querySelectorAll('a')].map(link => [link.hash.slice(1), link]));
  const groups = [...document.querySelectorAll('.destinations .link-group')];
  let currentLink;
  let framePending = false;

  function updateCurrentGroup() {
    framePending = false;
    const viewport = document.documentElement;
    const readingLine = Math.min(128, window.innerHeight * .25);
    const atEnd = window.scrollY > 0 && window.scrollY + viewport.clientHeight >= viewport.scrollHeight - 1;
    let currentGroup;
    for (const group of groups) {
      if (!atEnd && group.getBoundingClientRect().top > readingLine) break;
      currentGroup = group;
    }

    const nextLink = links.get(currentGroup?.getAttribute('aria-labelledby'));
    if (nextLink === currentLink) return;
    currentLink?.removeAttribute('aria-current');
    nextLink?.setAttribute('aria-current', 'location');
    currentLabel.textContent = nextLink?.textContent ?? '';
    currentLabel.hidden = !nextLink;
    currentLink = nextLink;
  }

  function requestUpdate() {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateCurrentGroup);
  }

  disclosure.addEventListener('click', event => {
    if (event.target.closest('a') && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      disclosure.open = false;
    }
  });
  disclosure.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !disclosure.open) return;
    event.preventDefault();
    disclosure.open = false;
    summary.focus();
  });
  disclosure.addEventListener('focusout', event => {
    if (!disclosure.contains(event.relatedTarget)) disclosure.open = false;
  });

  disclosure.dataset.tracking = '';
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('load', requestUpdate, { once: true });
  updateCurrentGroup();
})();
