/*
MIT License

Copyright (c) 2026 Timo Heimonen <timo.heimonen@proton.me>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function () {
  function setAppHeight() {
    document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
  }
  window.addEventListener('resize', setAppHeight);
  setAppHeight();

  const ticksGroup = document.getElementById('ticks');
  const numbersGroup = document.getElementById('numbers');
  const hourHand = document.getElementById('hourHand');
  const minuteHand = document.getElementById('minuteHand');
  const secondHand = document.getElementById('secondHand');
  const hourHandShadow = document.getElementById('hourHandShadow');
  const minuteHandShadow = document.getElementById('minuteHandShadow');
  const secondHandShadow = document.getElementById('secondHandShadow');
  const centerDotShadow = document.getElementById('centerDotShadow');
  const themeToggle = document.getElementById('themeToggle');
  const saveSettingsToggle = document.getElementById('saveSettingsToggle');
  const saveSettingsLabel = document.getElementById('saveSettingsLabel');

  const CX = 100, CY = 100, R = 85;

  let savedSettings = null;
  try {
    savedSettings = JSON.parse(localStorage.getItem('clocksimulator-user-settings'));
  } catch (e) {}
  if (savedSettings) {
    saveSettingsToggle.checked = true;
  }

  if (savedSettings && savedSettings.theme === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.checked = true;
  }

  function getTime() {
    var now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes(),
             seconds: now.getSeconds(), millis: now.getMilliseconds() };
  }

  function addTick(degrees, length, width) {
    const angle = (degrees - 90) * Math.PI / 180;
    const x1 = CX + Math.cos(angle) * (R - length);
    const y1 = CY + Math.sin(angle) * (R - length);
    const x2 = CX + Math.cos(angle) * R;
    const y2 = CY + Math.sin(angle) * R;
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick.setAttribute('x1', x1);
    tick.setAttribute('y1', y1);
    tick.setAttribute('x2', x2);
    tick.setAttribute('y2', y2);
    tick.setAttribute('stroke', 'var(--tick)');
    tick.setAttribute('stroke-width', width);
    tick.setAttribute('stroke-linecap', 'round');
    ticksGroup.appendChild(tick);
  }

  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) {
      addTick(i * 6, 10, '2');
    } else {
      addTick(i * 6, 5, '1');
    }
  }

  for (let h = 1; h <= 12; h++) {
    const angle = (h * 30 - 90) * Math.PI / 180;
    const x = CX + Math.cos(angle) * (R - 20);
    const y = CY + Math.sin(angle) * (R - 20);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', 'var(--number)');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif');
    text.setAttribute('font-weight', '500');
    text.textContent = h;
    numbersGroup.appendChild(text);
  }

  let secondModeTick = true;
  const secondModeToggle = document.getElementById('secondModeToggle');
  secondModeToggle.checked = true;

  if (savedSettings) {
    secondModeTick = savedSettings.secondModeTick !== false;
    secondModeToggle.checked = secondModeTick;
  }

  function saveSettings() {
    if (!saveSettingsToggle.checked) return;
    localStorage.setItem('clocksimulator-user-settings', JSON.stringify({
      theme: document.body.classList.contains('light-mode') ? 'light' : 'dark',
      wakeLock: document.getElementById('wakeLockToggle').checked,
      secondModeTick: secondModeTick
    }));
  }

  secondModeToggle.addEventListener('change', function () {
    secondModeTick = this.checked;
    saveSettings();
  });

  function updateClock() {
    const t = getTime();
    const hours = t.hours % 12;
    const minutes = t.minutes;
    const seconds = t.seconds;
    const millis = t.millis;

    const minuteAngle = (minutes + seconds / 60) * 6;
    const hourAngle = (hours + minutes / 60) * 30;

    let secondAngle;
    if (secondModeTick) {
      secondAngle = seconds * 6;
      if (millis < 100) {
        secondAngle += 0.5 * Math.exp(-millis / 25);
      }
    } else {
      secondAngle = (seconds + millis / 1000) * 6;
    }
    secondHand.setAttribute('transform', 'rotate(' + secondAngle + ' 100 100)');

    hourHand.setAttribute('transform', 'rotate(' + hourAngle + ' 100 100)');
    minuteHand.setAttribute('transform', 'rotate(' + minuteAngle + ' 100 100)');

    const lightRad = hourAngle * Math.PI / 180;
    const sdx = -Math.sin(lightRad);
    const sdy = Math.cos(lightRad);
    hourHandShadow.setAttribute('transform',
      'translate(' + (0.8 * sdx) + ',' + (0.8 * sdy) + ') rotate(' + hourAngle + ' 100 100)');
    minuteHandShadow.setAttribute('transform',
      'translate(' + (1.2 * sdx) + ',' + (1.2 * sdy) + ') rotate(' + minuteAngle + ' 100 100)');
    secondHandShadow.setAttribute('transform',
      'translate(' + (1.8 * sdx) + ',' + (1.8 * sdy) + ') rotate(' + secondAngle + ' 100 100)');
    centerDotShadow.setAttribute('transform',
      'translate(' + (1.8 * sdx) + ',' + (1.8 * sdy) + ')');

    if (!document.hidden) {
      requestAnimationFrame(updateClock);
    } else {
      document.addEventListener('visibilitychange', function resume() {
        document.removeEventListener('visibilitychange', resume);
        requestAnimationFrame(updateClock);
      });
    }
  }

  requestAnimationFrame(updateClock);

  themeToggle.addEventListener('change', function () {
    document.body.classList.remove('transparent-mode');
    document.body.classList.toggle('light-mode', this.checked);
    saveSettings();
  });

  saveSettingsToggle.addEventListener('change', function () {
    if (this.checked) {
      saveSettings();
    } else {
      localStorage.removeItem('clocksimulator-user-settings');
    }
  });

  const toggleWrapper = document.querySelector('.toggle-wrapper');
  const aboutBtn = document.getElementById('aboutBtn');
  const aboutBubble = document.getElementById('aboutBubble');
  let hideTimer;

  const helpOverlay = document.getElementById('helpOverlay');
  let previousFocus = null;
  let activeTrapHandler = null;
  let overlayMouseDownTarget = null;
  document.addEventListener('mousedown', function (e) { overlayMouseDownTarget = e.target; });

  function trapFocus(overlay) {
    const focusable = overlay.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    activeTrapHandler = function (e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    overlay.addEventListener('keydown', activeTrapHandler);
  }

  function releaseTrap(overlay) {
    if (activeTrapHandler) {
      overlay.removeEventListener('keydown', activeTrapHandler);
      activeTrapHandler = null;
    }
    if (previousFocus) {
      previousFocus.focus();
      previousFocus = null;
    }
  }

  function closeAboutBubble() {
    aboutBubble.classList.remove('visible');
    document.body.classList.remove('about-bubble-open');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (helpOverlay.classList.contains('visible')) {
        helpOverlay.classList.remove('visible');
        releaseTrap(helpOverlay);
      } else {
        closeAboutBubble();
      }
    }
  });

  function showToggle() {
    document.body.classList.remove('cursor-hidden');
    toggleWrapper.classList.add('visible');
    clearTimeout(hideTimer);
    if (aboutBubble.classList.contains('visible') || helpOverlay.classList.contains('visible')) return;
    hideTimer = setTimeout(function () {
      toggleWrapper.classList.remove('visible');
      document.body.classList.add('cursor-hidden');
      closeAboutBubble();
    }, 1000);
  }

  aboutBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    aboutBubble.classList.toggle('visible');
    document.body.classList.toggle('about-bubble-open', aboutBubble.classList.contains('visible'));
    clearTimeout(hideTimer);
  });

  document.addEventListener('click', function (e) {
    if (!aboutBubble.contains(e.target) && e.target !== aboutBtn && !aboutBtn.contains(e.target)) {
      closeAboutBubble();
    }
  });

  let lastMoveTime = 0;
  document.addEventListener('mousemove', function () {
    const now = Date.now();
    if (now - lastMoveTime < 150) return;
    lastMoveTime = now;
    showToggle();
  });
  document.addEventListener('touchstart', showToggle, { passive: true });
  window.addEventListener('focus', showToggle);
  window.addEventListener('blur', function () {
    clearTimeout(hideTimer);
    toggleWrapper.classList.remove('visible');
    closeAboutBubble();
  });

  const faviconCanvas = document.createElement('canvas');
  faviconCanvas.width = 32;
  faviconCanvas.height = 32;
  const faviconLink = document.getElementById('favicon');

  function updateFavicon() {
    const ctx = faviconCanvas.getContext('2d');
    const size = 32;
    const cx = size / 2;
    const cy = size / 2;
    const r = 14;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333333';
    ctx.stroke();

    const t = getTime();
    const h = t.hours % 12;
    const m = t.minutes;

    const hourAngle = ((h + m / 60) * 30 - 90) * Math.PI / 180;
    const minuteAngle = (m * 6 - 90) * Math.PI / 180;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourAngle) * 7, cy + Math.sin(hourAngle) * 7);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#222222';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minuteAngle) * 10, cy + Math.sin(minuteAngle) * 10);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#444444';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#222222';
    ctx.fill();

    faviconLink.href = faviconCanvas.toDataURL('image/png');
  }

  updateFavicon();
  const msToNextMinute = 60000 - (Date.now() % 60000);
  setTimeout(function () {
    updateFavicon();
    setInterval(updateFavicon, 60000);
  }, msToNextMinute);

  if ('wakeLock' in navigator) {
    let wakeLockSentinel = null;
    let wakeLockEnabled = false;
    const wakeLockToggle = document.getElementById('wakeLockToggle');
    const wakeLockLabel = document.getElementById('wakeLockLabel');

    wakeLockLabel.removeAttribute('hidden');
    wakeLockToggle.checked = false;

    function requestWakeLock() {
      if (!wakeLockEnabled) return;
      navigator.wakeLock.request('screen').then(function (sentinel) {
        wakeLockSentinel = sentinel;
        wakeLockToggle.checked = true;
        sentinel.addEventListener('release', function () {
          wakeLockSentinel = null;
        });
      }).catch(function () {
        if (document.visibilityState === 'visible') {
          wakeLockToggle.checked = false;
          wakeLockEnabled = false;
          saveSettings();
        }
      });
    }

    if (savedSettings && savedSettings.wakeLock) {
      wakeLockEnabled = true;
      requestWakeLock();
    }

    wakeLockToggle.addEventListener('change', function () {
      wakeLockEnabled = this.checked;
      if (wakeLockEnabled) {
        requestWakeLock();
      } else if (wakeLockSentinel) {
        wakeLockSentinel.release();
        wakeLockSentinel = null;
      }
      saveSettings();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && wakeLockEnabled) {
        requestWakeLock();
      }
    });
  }

  const container = document.querySelector('.clock-container');
  let burnInStep = 0;
  const burnInRadius = 6;
  const burnInPositions = 8;

  function applyBurnInShift() {
    const angle = (burnInStep % burnInPositions) * (2 * Math.PI / burnInPositions);
    const dx = Math.round(Math.cos(angle) * burnInRadius * 10) / 10;
    const dy = Math.round(Math.sin(angle) * burnInRadius * 10) / 10;
    container.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    burnInStep++;
  }

  setInterval(applyBurnInShift, 600000);

  const helpLink = document.getElementById('helpLink');
  const helpCloseBtn = document.getElementById('helpCloseBtn');

  function openHelpPanel(e) {
    if (e) e.preventDefault();
    closeAboutBubble();
    clearTimeout(hideTimer);
    previousFocus = document.activeElement;
    helpOverlay.classList.add('visible');
    trapFocus(helpOverlay);
  }

  function closeHelpPanel() {
    helpOverlay.classList.remove('visible');
    releaseTrap(helpOverlay);
  }

  helpLink.addEventListener('click', openHelpPanel);
  helpCloseBtn.addEventListener('click', closeHelpPanel);
  helpOverlay.addEventListener('click', function (e) {
    if (e.target === helpOverlay && overlayMouseDownTarget === helpOverlay) closeHelpPanel();
  });
})();
