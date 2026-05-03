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
  const SHADOW_THROTTLE_MS = 100;
  const BURN_IN_INTERVAL_MS = 600000;
  const FAVICON_UPDATE_MS = 60000;

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
  const hourDS = document.getElementById('hourDS');
  const minuteDS = document.getElementById('minuteDS');
  const secondDS = document.getElementById('secondDS');
  const dotDS = document.getElementById('dotDS');
  const themeToggle = document.getElementById('themeToggle');
  const saveSettingsToggle = document.getElementById('saveSettingsToggle');

  const CX = 100, CY = 100, R = 85;
  let lastShadowUpdate = 0;

  let savedSettings = null;
  try {
    savedSettings = JSON.parse(localStorage.getItem('clocksimulator-user-settings'));
  } catch (e) {
    savedSettings = null;
  }
  if (savedSettings) {
    saveSettingsToggle.checked = true;
  }

  if (savedSettings && savedSettings.theme === 'dark') {
    document.documentElement.classList.add('dark-mode');
  } else if (savedSettings && savedSettings.theme === 'light') {
    document.documentElement.classList.remove('dark-mode');
  } else if (!savedSettings && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark-mode');
  }
  themeToggle.checked = document.documentElement.classList.contains('dark-mode');

  function getTime() {
    const now = new Date();
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
    try {
      localStorage.setItem('clocksimulator-user-settings', JSON.stringify({
        theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
        wakeLock: document.getElementById('wakeLockToggle').checked,
        secondModeTick: secondModeTick
      }));
    } catch (e) {}
  }

  secondModeToggle.addEventListener('change', function () {
    secondModeTick = this.checked;
    saveSettings();
  });

  function updateClock() {
    const now = new Date();
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
    document.documentElement.style.setProperty('--second-angle', secondAngle + 'deg');

    hourHand.style.transform = 'rotate(' + hourAngle + 'deg)';
    minuteHand.style.transform = 'rotate(' + minuteAngle + 'deg)';

    const nowMs = Date.now();
    if (nowMs - lastShadowUpdate > SHADOW_THROTTLE_MS) {
      lastShadowUpdate = nowMs;
      const localHour = now.getHours() + now.getMinutes() / 60;
      const sunAngle = 90 + (localHour - 6) * 15;
      const sunRad = sunAngle * Math.PI / 180;

      const hourShadowRad = (hourAngle - sunAngle) * Math.PI / 180;
      hourDS.setAttribute('dx', -0.8 * Math.cos(hourShadowRad));
      hourDS.setAttribute('dy', -0.8 * Math.sin(hourShadowRad));

      const minuteShadowRad = (minuteAngle - sunAngle) * Math.PI / 180;
      minuteDS.setAttribute('dx', -1.2 * Math.cos(minuteShadowRad));
      minuteDS.setAttribute('dy', -1.2 * Math.sin(minuteShadowRad));

      const secondHandAngle = secondModeTick ? t.seconds * 6 : (t.seconds + millis / 1000) * 6;
      const secondShadowRad = (secondHandAngle - sunAngle) * Math.PI / 180;
      secondDS.setAttribute('dx', -1.8 * Math.cos(secondShadowRad));
      secondDS.setAttribute('dy', -1.8 * Math.sin(secondShadowRad));

      dotDS.setAttribute('dx', -1.8 * Math.cos(sunRad));
      dotDS.setAttribute('dy', -1.8 * Math.sin(sunRad));
    }

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
    document.documentElement.classList.remove('transparent-mode');
    document.documentElement.classList.toggle('dark-mode', this.checked);
    saveSettings();
  });

  saveSettingsToggle.addEventListener('change', function () {
    if (this.checked) {
      saveSettings();
    } else {
      try {
        localStorage.removeItem('clocksimulator-user-settings');
      } catch (e) {}
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
      previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }
  }

  function closeAboutBubble() {
    aboutBubble.classList.remove('visible');
    aboutBubble.setAttribute('aria-hidden', 'true');
    aboutBubble.setAttribute('inert', '');
    document.body.classList.remove('about-bubble-open');
    aboutBtn.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (helpOverlay.classList.contains('visible')) {
        closeHelpPanel();
      } else {
        closeAboutBubble();
      }
    }
  });

  function showToggle() {
    if (helpOverlay.classList.contains('visible')) return;
    document.body.classList.remove('cursor-hidden');
    toggleWrapper.removeAttribute('inert');
    toggleWrapper.classList.add('visible');
    toggleWrapper.setAttribute('aria-hidden', 'false');
    clearTimeout(hideTimer);
    if (aboutBubble.classList.contains('visible')) return;
    hideTimer = setTimeout(function () {
      if (toggleWrapper.contains(document.activeElement)) return;
      toggleWrapper.classList.remove('visible');
      toggleWrapper.setAttribute('inert', '');
      toggleWrapper.setAttribute('aria-hidden', 'true');
      document.body.classList.add('cursor-hidden');
      closeAboutBubble();
    }, 1000);
  }

  aboutBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = aboutBubble.classList.contains('visible');
    if (isOpen) {
      closeAboutBubble();
    } else {
      aboutBubble.removeAttribute('inert');
      aboutBubble.classList.add('visible');
      aboutBubble.setAttribute('aria-hidden', 'false');
      document.body.classList.add('about-bubble-open');
      aboutBtn.setAttribute('aria-expanded', 'true');
    }
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
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') showToggle();
  });
  toggleWrapper.addEventListener('focusin', function () {
    clearTimeout(hideTimer);
    toggleWrapper.removeAttribute('inert');
    toggleWrapper.classList.add('visible');
    toggleWrapper.setAttribute('aria-hidden', 'false');
    document.body.classList.remove('cursor-hidden');
  });
  toggleWrapper.addEventListener('focusout', function (e) {
    if (!toggleWrapper.contains(e.relatedTarget)) {
      showToggle();
    }
  });
  window.addEventListener('focus', showToggle);
  window.addEventListener('blur', function () {
    clearTimeout(hideTimer);
    toggleWrapper.classList.remove('visible');
    toggleWrapper.setAttribute('inert', '');
    toggleWrapper.setAttribute('aria-hidden', 'true');
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
  const msToNextMinute = FAVICON_UPDATE_MS - (Date.now() % FAVICON_UPDATE_MS);
  setTimeout(function () {
    updateFavicon();
    setInterval(updateFavicon, FAVICON_UPDATE_MS);
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

  let burnInInterval = null;

  function startBurnIn() {
    if (!burnInInterval) {
      burnInInterval = setInterval(applyBurnInShift, BURN_IN_INTERVAL_MS);
    }
  }

  function stopBurnIn() {
    clearInterval(burnInInterval);
    burnInInterval = null;
  }

  if (!document.hidden) startBurnIn();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopBurnIn();
    } else {
      startBurnIn();
    }
  });

  const helpLink = document.getElementById('helpLink');
  const helpCloseBtn = document.getElementById('helpCloseBtn');

  function openHelpPanel(e) {
    if (e) e.preventDefault();
    previousFocus = document.activeElement;
    if (aboutBubble.contains(previousFocus)) {
      previousFocus = aboutBtn;
    }
    closeAboutBubble();
    clearTimeout(hideTimer);
    helpOverlay.removeAttribute('inert');
    helpOverlay.classList.add('visible');
    helpOverlay.setAttribute('aria-hidden', 'false');
    trapFocus(helpOverlay);
  }

  function closeHelpPanel() {
    helpOverlay.classList.remove('visible');
    helpOverlay.setAttribute('aria-hidden', 'true');
    helpOverlay.setAttribute('inert', '');
    releaseTrap(helpOverlay);
  }

  helpLink.addEventListener('click', openHelpPanel);
  helpCloseBtn.addEventListener('click', closeHelpPanel);
  helpOverlay.addEventListener('click', function (e) {
    if (e.target === helpOverlay && overlayMouseDownTarget === helpOverlay) closeHelpPanel();
  });
})();
