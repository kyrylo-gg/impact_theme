/**
 * Student Progress — Lazy load videos when cards enter viewport
 */
(function () {
  var videos = document.querySelectorAll('.student-progress__video');
  if (!videos.length || !('IntersectionObserver' in window)) {
    videos.forEach(function (v) {
      v.setAttribute('preload', 'auto');
      v.setAttribute('autoplay', '');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var v = entry.target;
          v.setAttribute('preload', 'auto');
          v.setAttribute('autoplay', '');
          v.play().catch(function () {});
          observer.unobserve(v);
        }
      });
    },
    { rootMargin: '200px 0px', threshold: 0.01 }
  );

  videos.forEach(function (v) {
    observer.observe(v);
  });
})();
