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

  function openBundleBuilderWithRetry() {
    var attempts = 0;
    function tryOpen() {
      if (window.NassBundleBuilder && typeof window.NassBundleBuilder.openWizard === 'function') {
        window.NassBundleBuilder.openWizard();
        return;
      }
      attempts += 1;
      if (attempts < 30) setTimeout(tryOpen, 100);
    }
    tryOpen();
  }

  function bindCta(section) {
    section.addEventListener('click', function (event) {
      var cta = event.target.closest('.hero-banner__cta');
      if (!cta) return;

      var href = (cta.getAttribute('href') || '').trim();
      if (href === '#nass-bundle-builder') {
        event.preventDefault();
        openBundleBuilderWithRetry();
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
