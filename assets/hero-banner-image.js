(function () {
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

  function initSection(section) {
    if (!section) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      section.classList.add('is-reduced-motion');
    }

    section.addEventListener('click', function (event) {
      var cta = event.target.closest('.hbi__cta');
      if (!cta) return;

      var href = (cta.getAttribute('href') || '').trim();
      if (isBundleBuilderAnchor(href)) {
        event.preventDefault();
        scrollToBundleBuilder();
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
