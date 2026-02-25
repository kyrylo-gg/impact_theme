(function () {
  var cards = document.querySelectorAll('.twerk-lessons__card-video');
  if (!cards.length || !('IntersectionObserver' in window)) {
    cards.forEach(function (v) {
      v.setAttribute('preload', 'auto');
      v.setAttribute('autoplay', '');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var video = entry.target;
          video.setAttribute('preload', 'auto');
          video.setAttribute('autoplay', '');
          video.play().catch(function () {});
          observer.unobserve(video);
        }
      });
    },
    { rootMargin: '200px 0px', threshold: 0.01 }
  );

  cards.forEach(function (v) {
    observer.observe(v);
  });
})();
