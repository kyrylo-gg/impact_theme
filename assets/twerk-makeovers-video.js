/**
 * Twerk Makeovers — video play/pause on play button click.
 * Only one video plays at a time.
 */
(function() {
  var currentlyPlaying = null;

  function pauseOtherVideos(exceptVideo) {
    document.querySelectorAll('.twerk-makeovers__video').forEach(function(v) {
      if (v !== exceptVideo && !v.paused) {
        v.pause();
      }
    });
    document.querySelectorAll('.twerk-makeovers__play-btn').forEach(function(btn) {
      var card = btn.closest('.twerk-makeovers__card');
      var v = card ? card.querySelector('.twerk-makeovers__video') : null;
      if (v && v !== exceptVideo) {
        btn.setAttribute('data-state', 'paused');
      }
    });
  }

  function init() {
    document.querySelectorAll('.twerk-makeovers__card').forEach(function(card) {
      var playBtn = card.querySelector('.twerk-makeovers__play-btn');
      var video = card.querySelector('.twerk-makeovers__video');
      if (!playBtn || !video) return;

      if (!video.paused) {
        playBtn.setAttribute('data-state', 'playing');
        currentlyPlaying = video;
      }

      playBtn.addEventListener('click', function() {
        if (video.paused) {
          pauseOtherVideos(video);
          video.muted = false;
          var muteBtn = card.querySelector('.twerk-makeovers__mute-btn');
          if (muteBtn) muteBtn.setAttribute('data-muted', 'false');
          video.play().then(function() {
            playBtn.setAttribute('data-state', 'playing');
            currentlyPlaying = video;
          }).catch(function() {});
        } else {
          video.pause();
          playBtn.setAttribute('data-state', 'paused');
          if (currentlyPlaying === video) currentlyPlaying = null;
        }
      });

      video.addEventListener('pause', function() {
        playBtn.setAttribute('data-state', 'paused');
        if (currentlyPlaying === video) currentlyPlaying = null;
      });
      video.addEventListener('playing', function() {
        playBtn.setAttribute('data-state', 'playing');
      });
      video.addEventListener('ended', function() {
        playBtn.setAttribute('data-state', 'paused');
        if (currentlyPlaying === video) currentlyPlaying = null;
      });
    });

    document.querySelectorAll('.twerk-makeovers__mute-btn').forEach(function(muteBtn) {
      muteBtn.addEventListener('click', function() {
        var card = muteBtn.closest('.twerk-makeovers__card');
        var video = card ? card.querySelector('.twerk-makeovers__video') : null;
        if (!video) return;
        var muted = muteBtn.getAttribute('data-muted') === 'true';
        video.muted = !muted;
        muteBtn.setAttribute('data-muted', muted ? 'false' : 'true');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
