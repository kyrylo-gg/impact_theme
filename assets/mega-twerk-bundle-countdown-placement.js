/**
 * Any product/page with Bundle Builder: move countdown section (#twerk-bundle) directly above
 * the landing card (.bb-card) inside #nass-bundle-builder .bb-container (variant A layout).
 */
(function () {
  if (window.__bundleBuilderCountdownPlaced) return;
  if (!document.querySelector('#nass-bundle-builder')) return;
  window.__bundleBuilderCountdownPlaced = true;

  function getCountdownHost() {
    var anchor = document.querySelector('#twerk-bundle');
    return anchor ? anchor.closest('.shopify-section') : null;
  }

  function place() {
    var host = getCountdownHost();
    var container = document.querySelector('#nass-bundle-builder .bb-container');
    var card = container && container.querySelector('.bb-card');
    if (!host || !container || !card) return false;
    if (card.previousElementSibling === host) {
      document.documentElement.classList.add('ig-ct-var-a');
      return true;
    }
    container.insertBefore(host, card);
    document.documentElement.classList.add('ig-ct-var-a');
    return true;
  }

  function run() {
    if (place()) return;
    var n = 0;
    var id = setInterval(function () {
      if (place() || ++n > 80) clearInterval(id);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
