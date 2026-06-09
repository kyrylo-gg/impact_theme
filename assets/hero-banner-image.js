(function () {
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

  function initSection(section) {
    if (!section) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      section.classList.add('is-reduced-motion');
    }

    section.addEventListener('click', function (event) {
      var cta = event.target.closest('.hbi__cta');
      if (!cta) return;

      var href = (cta.getAttribute('href') || '').trim();
      if (href === '#nass-bundle-builder') {
        event.preventDefault();
        openBundleBuilderWithRetry();
      }
    });
  }

  function initAll() {
    document.querySelectorAll('.hbi[data-section-id]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector('.hbi[data-section-id]');
    if (section) initSection(section);
  });
})();
