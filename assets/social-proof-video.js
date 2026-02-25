/**
 * Social Proof — video play/pause on play button click
 */
(function() {
  function init() {
    document.querySelectorAll('.social-proof__video-wrap').forEach(function(wrap) {
      var playBtn = wrap.querySelector('.social-proof__play-btn');
      var video = wrap.querySelector('.social-proof__video');
      if (!playBtn || !video) return;

      playBtn.addEventListener('click', function() {
        if (video.paused) {
          video.muted = false;
          var mBtn = document.querySelector('.social-proof__mute-btn');
          if (mBtn) mBtn.setAttribute('data-muted', 'false');
          video.play().then(function() {
            playBtn.setAttribute('data-state', 'playing');
          }).catch(function() {});
        } else {
          video.pause();
          playBtn.setAttribute('data-state', 'paused');
        }
      });

      video.addEventListener('pause', function() {
        playBtn.setAttribute('data-state', 'paused');
      });
      video.addEventListener('playing', function() {
        playBtn.setAttribute('data-state', 'playing');
      });
      video.addEventListener('ended', function() {
        playBtn.setAttribute('data-state', 'paused');
      });
    });

    var muteBtn = document.querySelector('.social-proof__mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', function() {
        var muted = muteBtn.getAttribute('data-muted') === 'true';
        document.querySelectorAll('.social-proof__video').forEach(function(v) {
          v.muted = !muted;
        });
        muteBtn.setAttribute('data-muted', muted ? 'false' : 'true');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
