(function () {
  var sectionIntervals = new Map();

  function pad(n) {
    return String(Math.max(0, n)).padStart(2, '0');
  }

  function teardownSection(section) {
    if (!section) return;
    var sectionId = section.getAttribute('data-section-id');
    if (!sectionId) return;
    var timerId = sectionIntervals.get(sectionId);
    if (timerId) {
      clearInterval(timerId);
      sectionIntervals.delete(sectionId);
    }
  }

  function initSection(section) {
    if (!section) return;
    teardownSection(section);

    var mode = String(section.dataset.mode || '').toLowerCase();
    var endRaw = section.dataset.end;

    var expiredText = section.dataset.expiredText || '';
    var slots = {
      days: section.querySelector('[data-unit="days"]'),
      hours: section.querySelector('[data-unit="hours"]'),
      minutes: section.querySelector('[data-unit="minutes"]'),
      seconds: section.querySelector('[data-unit="seconds"]')
    };
    var timerEl = section.querySelector('.nass-timer');

    function getSecondsUntilNext10amKyiv() {
      var now = new Date();
      var formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Kyiv',
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        second: '2-digit'
      });
      var parts = formatter.formatToParts(now);
      var hour = 0;
      var minute = 0;
      var second = 0;
      parts.forEach(function (p) {
        if (p.type === 'hour') hour = parseInt(p.value, 10);
        if (p.type === 'minute') minute = parseInt(p.value, 10);
        if (p.type === 'second') second = parseInt(p.value, 10);
      });
      var secSinceMidnight = hour * 3600 + minute * 60 + second;
      var tenAmSec = 10 * 3600;
      if (secSinceMidnight < tenAmSec) return tenAmSec - secSinceMidnight;
      return (24 * 3600 - secSinceMidnight) + tenAmSec;
    }

    function getSecondsUntilNext11amKyiv() {
      return getSecondsUntilNext10amKyiv() + 3600;
    }

    function getEndTimestamp() {
      // Match bundle builder daily timer behavior.
      if (mode === 'daily_kyiv_10am') {
        return Date.now() + getSecondsUntilNext11amKyiv() * 1000;
      }
      if (mode === 'daily') {
        var dayEnd = new Date();
        dayEnd.setHours(23, 59, 59, 999);
        return dayEnd.getTime();
      }
      if (!endRaw) return NaN;
      return new Date(endRaw).getTime();
    }

    function tick() {
      var end = getEndTimestamp();
      if (Number.isNaN(end)) return;
      var diff = end - Date.now();
      if (diff <= 0) {
        Object.values(slots).forEach(function (el) {
          if (el) el.textContent = '00';
        });
        if (timerEl && expiredText) timerEl.setAttribute('aria-label', expiredText);
        teardownSection(section);
        return;
      }

      if (slots.days) slots.days.textContent = pad(Math.floor(diff / 86400000));
      if (slots.hours) slots.hours.textContent = pad(Math.floor((diff / 3600000) % 24));
      if (slots.minutes) slots.minutes.textContent = pad(Math.floor((diff / 60000) % 60));
      if (slots.seconds) slots.seconds.textContent = pad(Math.floor((diff / 1000) % 60));
    }

    tick();
    var intervalId = setInterval(tick, 1000);
    var sectionId = section.getAttribute('data-section-id');
    if (sectionId) sectionIntervals.set(sectionId, intervalId);
  }

  function initAll() {
    var sections = document.querySelectorAll('.nass-countdown');
    if (!sections.length) return;
    sections.forEach(initSection);
  }

  document.addEventListener('shopify:section:load', function (event) {
    var target = event && event.target;
    if (!target) return;
    var section = target.matches('.nass-countdown') ? target : target.querySelector('.nass-countdown');
    if (section) initSection(section);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var target = event && event.target;
    if (!target) return;
    var section = target.matches('.nass-countdown') ? target : target.querySelector('.nass-countdown');
    if (section) teardownSection(section);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
