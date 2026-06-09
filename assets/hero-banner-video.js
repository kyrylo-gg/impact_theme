(function () {
  function initHeroBanner(section) {
    if (!section) return;

    var videos = section.querySelectorAll('.hero-banner__video');
    var poster = section.querySelector('.hero-banner__poster');
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      section.classList.add('is-reduced-motion');
      videos.forEach(function (video) {
        video.removeAttribute('autoplay');
        video.pause();
        video.setAttribute('aria-hidden', 'true');
      });
      return;
    }

    videos.forEach(function (video) {
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    });
  }

  function isBundleBuilderAnchor(href) {
    if (!href) return false;
    href = href.trim();
    if (href === '#nass-bundle-builder') return true;
    try {
      return new URL(href, window.location.href).hash === '#nass-bundle-builder';
    } catch (e) {
      return false;
    }
  }

  function scrollToBundleBuilder() {
    var target = document.getElementById('nass-bundle-builder');
    if (!target) return;
    var behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    target.scrollIntoView({ block: 'start', behavior: behavior });
  }

  function bindCta(section) {
    section.addEventListener('click', function (event) {
      var cta = event.target.closest('.hero-banner__cta');
      if (!cta) return;

      var href = (cta.getAttribute('href') || '').trim();
      if (isBundleBuilderAnchor(href)) {
        event.preventDefault();
        scrollToBundleBuilder();
      }
    });
  }

  function initSection(section) {
    initHeroBanner(section);
    bindCta(section);
  }

  function initAll() {
    document.querySelectorAll('.hero-banner[data-section-id]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector('.hero-banner[data-section-id]');
    if (section) initSection(section);
  });
})();
