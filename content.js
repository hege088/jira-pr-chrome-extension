(function () {
  'use strict';

  const BUTTON_ID = 'jira-gh-pr-btn';
  const TOAST_ID = 'jira-gh-pr-toast';
  const STYLE_ID = 'jira-gh-pr-styles';

  const SPARKLE_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 1.5L4.9 4.1L7.5 5L4.9 5.9L4 8.5L3.1 5.9L0.5 5L3.1 4.1L4 1.5Z" fill="white" opacity="0.9"/>
    <path d="M10 5L10.6 6.9L12.5 7.5L10.6 8.1L10 10L9.4 8.1L7.5 7.5L9.4 6.9L10 5Z" fill="white"/>
    <path d="M6 10L6.45 11.35L7.8 11.8L6.45 12.25L6 13.6L5.55 12.25L4.2 11.8L5.55 11.35L6 10Z" fill="white" opacity="0.7"/>
  </svg>`;

  const PR_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="3.5" r="2" stroke="white" stroke-width="1.5" fill="none"/>
    <circle cx="5" cy="12.5" r="2" stroke="white" stroke-width="1.5" fill="none"/>
    <circle cx="12" cy="7.5" r="2" stroke="white" stroke-width="1.5" fill="none"/>
    <line x1="5" y1="5.5" x2="5" y2="10.5" stroke="white" stroke-width="1.5"/>
    <path d="M5 5.5C5 7.5 7 7.5 10 7.5" stroke="white" stroke-width="1.5" fill="none"/>
  </svg>`;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes jira-pr-shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes jira-pr-glow {
        0%, 100% { box-shadow: 0 2px 12px rgba(139,92,246,0.3), 0 0 20px rgba(59,130,246,0.15); }
        50% { box-shadow: 0 2px 18px rgba(139,92,246,0.5), 0 0 30px rgba(59,130,246,0.25); }
      }
      @keyframes jira-pr-sparkle-float {
        0%, 100% { opacity: 0.7; transform: translateY(0) scale(1); }
        50% { opacity: 1; transform: translateY(-1px) scale(1.1); }
      }
      #${BUTTON_ID} {
        background: linear-gradient(135deg, #3b82f6 0%, #7c3aed 50%, #8b5cf6 100%) !important;
      }
      #${BUTTON_ID}:hover {
        background: linear-gradient(135deg, #2563eb 0%, #6d28d9 50%, #7c3aed 100%) !important;
      }
      #${BUTTON_ID}::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 12px;
        background: linear-gradient(90deg,
          transparent 0%, rgba(255,255,255,0) 40%,
          rgba(255,255,255,0.15) 50%,
          rgba(255,255,255,0) 60%, transparent 100%);
        background-size: 200% 100%;
        animation: jira-pr-shimmer 3s ease-in-out infinite;
        pointer-events: none;
      }
      #${BUTTON_ID} .sparkle-icon {
        animation: jira-pr-sparkle-float 2s ease-in-out infinite;
        display: flex;
      }
    `;
    document.head.appendChild(style);
  }

  function getIssueKey() {
    const match = window.location.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
    if (match) return match[1];

    const breadcrumb = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]');
    if (breadcrumb) return breadcrumb.textContent.trim();

    return null;
  }

  function getSummary() {
    const heading = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]');
    if (heading) return heading.textContent.trim();

    const h1 = document.querySelector('h1[data-testid]');
    if (h1) return h1.textContent.trim();

    const title = document.title.replace(/\s*-\s*Jira.*$/i, '').trim();
    const cleaned = title.replace(/^\[?[A-Z]+-\d+\]?\s*/, '');
    return cleaned || title;
  }

  function getDescription() {
    const descField = document.querySelector('[data-testid="issue.views.field.rich-text.description"] .ak-renderer-document');
    if (descField) return descField.innerText.trim();

    const descArea = document.querySelector('[data-testid="issue.views.field.rich-text.description"]');
    if (descArea) return descArea.innerText.trim();

    return '';
  }

  function showToast(message, isError) {
    let toast = document.getElementById(TOAST_ID);
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = TOAST_ID;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '130px',
      right: '24px',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#fff',
      background: '#cf222e',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '999999',
      transition: 'opacity 0.3s',
      opacity: '0',
    });
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function showCelebration(message) {
    const CELEBRATION_ID = 'jira-gh-pr-celebration';
    const existing = document.getElementById(CELEBRATION_ID);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = CELEBRATION_ID;
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647',
      pointerEvents: 'none', overflow: 'hidden',
    });

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
    overlay.appendChild(canvas);

    const banner = document.createElement('div');
    Object.assign(banner.style, {
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%) scale(0.3)',
      background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 40%, #ec4899 100%)',
      color: '#fff', padding: '28px 56px', borderRadius: '20px',
      fontSize: '22px', fontWeight: '800',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
      boxShadow: '0 0 80px rgba(124,58,237,0.6), 0 0 120px rgba(236,72,153,0.3), 0 8px 32px rgba(0,0,0,0.3)',
      border: '2px solid rgba(255,255,255,0.3)',
      opacity: '0',
      transition: 'transform 0.6s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.4s ease',
      lineHeight: '1.4', letterSpacing: '0.5px',
      textShadow: '0 2px 10px rgba(0,0,0,0.3)',
    });
    banner.innerHTML = `<div style="font-size:36px;margin-bottom:6px">&#10024; &#127881; &#128640; &#127881; &#10024;</div>${message}<img src="${chrome.runtime.getURL('icons/meme.png')}" style="display:block;max-width:320px;width:100%;border-radius:10px;margin:10px auto 0;box-shadow:0 2px 12px rgba(0,0,0,0.3);" />`;
    overlay.appendChild(banner);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      banner.style.opacity = '1';
      banner.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = window.innerWidth;
    const H = window.innerHeight;

    const COLORS = [
      '#3b82f6','#7c3aed','#8b5cf6','#a78bfa','#60a5fa',
      '#f472b6','#ec4899','#34d399','#fbbf24','#f97316',
      '#e879f9','#c084fc','#fff','#fde68a','#a5f3fc',
      '#fb923c','#f87171','#4ade80','#38bdf8','#818cf8',
    ];

    const particles = [];
    const rockets = [];
    const rings = [];
    const flashes = [];
    let frame = 0;
    const DURATION = 120;

    function rand(a, b) { return Math.random() * (b - a) + a; }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function spawnExplosion(x, y, count, power, palette) {
      const cols = palette || COLORS;
      for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1, power);
        const c = pick(cols);
        particles.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          gravity: rand(0.02, 0.06), drag: rand(0.97, 0.995),
          size: rand(1.5, 4), color: c, opacity: 1,
          life: rand(40, 100), age: 0, type: 'spark',
          trail: [], trailLen: Math.floor(rand(3, 8)),
        });
      }
      rings.push({ x, y, radius: 0, maxRadius: power * 12, color: pick(cols), opacity: 0.6, speed: power * 0.8 });
      flashes.push({ x, y, radius: power * 3, opacity: 0.8, age: 0 });
    }

    function spawnConfettiBurst(x, y, count) {
      for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(2, 10);
        particles.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - rand(1, 5),
          gravity: rand(0.04, 0.1), drag: 0.99,
          size: rand(3, 7), color: pick(COLORS), opacity: 1,
          rotation: rand(0, 360), rotSpeed: rand(-10, 10),
          life: rand(80, 180), age: 0, type: 'confetti',
          shape: pick(['rect', 'circle', 'star']),
        });
      }
    }

    function spawnGlitterRain(count) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: rand(0, W), y: rand(-50, -10),
          vx: rand(-0.5, 0.5), vy: rand(1.5, 4),
          gravity: 0, drag: 1, size: rand(1, 3),
          color: pick(COLORS), opacity: rand(0.3, 1),
          life: rand(80, 200), age: 0, type: 'glitter',
          shimmer: rand(0.05, 0.2),
        });
      }
    }

    function launchRocket() {
      const x = rand(W * 0.1, W * 0.9);
      const palette = [pick(COLORS), pick(COLORS), pick(COLORS)];
      rockets.push({
        x, y: H + 10, vx: rand(-1.5, 1.5), vy: rand(-12, -8),
        fuel: rand(15, 30), age: 0, palette,
        trail: [], trailLen: 12,
        sparkTimer: 0,
      });
    }

    function drawStar4(cx, cy, r, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.3;
        if (i === 0) ctx.moveTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
        else ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Initial massive burst
    spawnConfettiBurst(W / 2, H * 0.4, 150);
    spawnExplosion(W / 2, H * 0.4, 100, 10, null);
    spawnGlitterRain(80);
    for (let i = 0; i < 6; i++) launchRocket();

    // Schedule waves of rockets and explosions
    const scheduled = [];
    for (let t = 6; t < DURATION - 20; t += rand(3, 6)) {
      scheduled.push({ frame: Math.floor(t), action: 'rocket' });
    }
    for (let t = 10; t < DURATION - 25; t += rand(8, 16)) {
      scheduled.push({
        frame: Math.floor(t), action: 'explosion',
        x: rand(W * 0.1, W * 0.9), y: rand(H * 0.15, H * 0.55),
      });
    }
    for (let t = 4; t < DURATION - 15; t += rand(5, 10)) {
      scheduled.push({ frame: Math.floor(t), action: 'confetti',
        x: rand(0, W), y: rand(H * 0.2, H * 0.6),
      });
    }
    for (let t = 0; t < DURATION; t += rand(6, 12)) {
      scheduled.push({ frame: Math.floor(t), action: 'glitter' });
    }

    // Continuous sparkle stars
    const bgStars = [];
    for (let i = 0; i < 60; i++) {
      bgStars.push({
        x: rand(0, W), y: rand(0, H), size: rand(2, 6),
        color: pick(COLORS), phase: rand(0, Math.PI * 2), speed: rand(0.03, 0.12),
      });
    }

    // Screen flash at start
    let screenFlash = 0.5;

    function animate() {
      frame++;
      if (frame > DURATION) {
        overlay.style.transition = 'opacity 1s ease';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 1100);
        return;
      }

      // Fade-to-dark backdrop for first few frames (screen flash)
      ctx.clearRect(0, 0, W, H);

      if (screenFlash > 0) {
        ctx.save();
        ctx.globalAlpha = screenFlash;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        screenFlash -= 0.04;
      }

      // Run scheduled events
      for (const ev of scheduled) {
        if (ev.frame === frame) {
          if (ev.action === 'rocket') launchRocket();
          else if (ev.action === 'explosion') spawnExplosion(ev.x, ev.y, rand(50, 120), rand(6, 14), null);
          else if (ev.action === 'confetti') spawnConfettiBurst(ev.x, ev.y, rand(40, 80));
          else if (ev.action === 'glitter') spawnGlitterRain(rand(20, 50));
        }
      }

      // Update & draw rockets
      for (let r = rockets.length - 1; r >= 0; r--) {
        const rk = rockets[r];
        rk.age++;
        rk.x += rk.vx;
        rk.y += rk.vy;
        rk.vy += 0.06;
        rk.trail.unshift({ x: rk.x, y: rk.y });
        if (rk.trail.length > rk.trailLen) rk.trail.pop();

        const angle = Math.atan2(rk.vy, rk.vx);
        const rLen = 22;
        const rWid = 7;

        // Exhaust flame trail (widens behind the rocket)
        for (let t = 0; t < rk.trail.length; t++) {
          const tp = rk.trail[t];
          const a = 1 - t / rk.trail.length;
          const flameW = (1 - a) * 6 + 2;
          ctx.save();
          ctx.globalAlpha = a * 0.7;
          ctx.fillStyle = t < rk.trail.length * 0.4 ? '#fff' : t < rk.trail.length * 0.7 ? '#fbbf24' : '#f97316';
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, flameW * a, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Rocket body
        ctx.save();
        ctx.translate(rk.x, rk.y);
        ctx.rotate(angle - Math.PI / 2);

        // Nose cone (pointed tip)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, -rLen);
        ctx.lineTo(-rWid * 0.6, -rLen * 0.45);
        ctx.lineTo(rWid * 0.6, -rLen * 0.45);
        ctx.closePath();
        ctx.fill();

        // Main body
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(-rWid * 0.5, -rLen * 0.45, rWid, rLen * 0.7);

        // Body stripe
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(-rWid * 0.5, -rLen * 0.15, rWid, rLen * 0.15);

        // Window (porthole)
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(0, -rLen * 0.28, rWid * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#bfdbfe';
        ctx.beginPath();
        ctx.arc(-rWid * 0.06, -rLen * 0.3, rWid * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Fins (left and right)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-rWid * 0.5, rLen * 0.25);
        ctx.lineTo(-rWid * 1.0, rLen * 0.4);
        ctx.lineTo(-rWid * 0.5, rLen * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(rWid * 0.5, rLen * 0.25);
        ctx.lineTo(rWid * 1.0, rLen * 0.4);
        ctx.lineTo(rWid * 0.5, rLen * 0.1);
        ctx.closePath();
        ctx.fill();

        // Exhaust nozzle
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(-rWid * 0.35, rLen * 0.25, rWid * 0.7, rLen * 0.08);

        // Active flame from nozzle
        const flicker = rand(0.8, 1.2);
        const flameLen = rLen * 0.5 * flicker;
        const flameGrad = ctx.createLinearGradient(0, rLen * 0.33, 0, rLen * 0.33 + flameLen);
        flameGrad.addColorStop(0, '#fff');
        flameGrad.addColorStop(0.2, '#fbbf24');
        flameGrad.addColorStop(0.6, '#f97316');
        flameGrad.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-rWid * 0.35, rLen * 0.33);
        ctx.quadraticCurveTo(-rWid * 0.5 * flicker, rLen * 0.33 + flameLen * 0.6, 0, rLen * 0.33 + flameLen);
        ctx.quadraticCurveTo(rWid * 0.5 * flicker, rLen * 0.33 + flameLen * 0.6, rWid * 0.35, rLen * 0.33);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Emit sparks from exhaust
        rk.sparkTimer++;
        if (rk.sparkTimer % 2 === 0) {
          const tailX = rk.x + Math.cos(angle + Math.PI) * rLen * 0.3;
          const tailY = rk.y + Math.sin(angle + Math.PI) * rLen * 0.3;
          particles.push({
            x: tailX + rand(-3, 3), y: tailY + rand(-2, 2),
            vx: Math.cos(angle + Math.PI) * rand(1, 3) + rand(-1, 1),
            vy: Math.sin(angle + Math.PI) * rand(1, 3) + rand(-0.5, 0.5),
            gravity: 0.02, drag: 0.97, size: rand(1, 3),
            color: pick(['#fbbf24', '#f97316', '#ef4444', '#fff']),
            opacity: 1, life: rand(12, 25), age: 0, type: 'spark', trail: [], trailLen: 3,
          });
        }

        if (rk.age > rk.fuel) {
          spawnExplosion(rk.x, rk.y, Math.floor(rand(80, 200)), rand(6, 14), rk.palette);
          spawnConfettiBurst(rk.x, rk.y, 40);
          rockets.splice(r, 1);
        }
      }

      // Update & draw rings (shockwaves)
      for (let r = rings.length - 1; r >= 0; r--) {
        const ring = rings[r];
        ring.radius += ring.speed;
        ring.opacity -= 0.015;
        if (ring.opacity <= 0) { rings.splice(r, 1); continue; }
        ctx.save();
        ctx.globalAlpha = ring.opacity;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Update & draw flashes
      for (let f = flashes.length - 1; f >= 0; f--) {
        const fl = flashes[f];
        fl.age++;
        fl.opacity -= 0.1;
        if (fl.opacity <= 0) { flashes.splice(f, 1); continue; }
        ctx.save();
        const fGrad = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, fl.radius + fl.age * 4);
        fGrad.addColorStop(0, `rgba(255,255,255,${fl.opacity})`);
        fGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = fGrad;
        ctx.fillRect(fl.x - fl.radius * 3, fl.y - fl.radius * 3, fl.radius * 6, fl.radius * 6);
        ctx.restore();
      }

      // Background sparkle stars
      for (const s of bgStars) {
        const a = 0.3 + 0.7 * Math.abs(Math.sin(frame * s.speed + s.phase));
        drawStar4(s.x, s.y, s.size, s.color, a);
      }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age++;
        if (p.age > p.life) { particles.splice(i, 1); continue; }

        if (p.type === 'spark') {
          p.vx *= p.drag;
          p.vy = (p.vy + p.gravity) * p.drag;
          p.x += p.vx;
          p.y += p.vy;
          if (p.trailLen > 0) {
            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > p.trailLen) p.trail.pop();
          }
          const lifeRatio = 1 - p.age / p.life;
          p.opacity = lifeRatio;

          // Draw trail
          if (p.trail.length > 1) {
            for (let t = 1; t < p.trail.length; t++) {
              const ta = (1 - t / p.trail.length) * p.opacity * 0.5;
              ctx.save();
              ctx.globalAlpha = ta;
              ctx.strokeStyle = p.color;
              ctx.lineWidth = p.size * 0.6;
              ctx.beginPath();
              ctx.moveTo(p.trail[t - 1].x, p.trail[t - 1].y);
              ctx.lineTo(p.trail[t].x, p.trail[t].y);
              ctx.stroke();
              ctx.restore();
            }
          }

          // Draw spark with glow
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (p.type === 'confetti') {
          p.vx *= (p.drag || 0.99);
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotSpeed;
          const fade = p.age > p.life * 0.65 ? Math.max(0, 1 - (p.age - p.life * 0.65) / (p.life * 0.35)) : 1;
          p.opacity = fade;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size * 0.6, p.size, p.size * 1.4);
          } else if (p.shape === 'star') {
            drawStar4(0, 0, p.size, p.color, p.opacity);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        if (p.type === 'glitter') {
          p.x += p.vx + Math.sin(p.age * 0.1) * 0.5;
          p.y += p.vy;
          const shimmerVal = 0.3 + 0.7 * Math.abs(Math.sin(p.age * p.shimmer));
          const fade = p.age > p.life * 0.7 ? Math.max(0, 1 - (p.age - p.life * 0.7) / (p.life * 0.3)) : 1;
          ctx.save();
          ctx.globalAlpha = p.opacity * shimmerVal * fade;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Global fade-out in the last 60 frames
      if (frame > DURATION - 20) {
        const fadeAlpha = (frame - (DURATION - 20)) / 20;
        banner.style.opacity = String(1 - fadeAlpha);
      }

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  async function dispatchWorkflow() {
    const data = await chrome.storage.sync.get(['githubPat', 'githubRepo', 'agent']);
    if (!data.githubPat || !data.githubRepo) {
      showToast('Configure PAT and repo in the extension popup first', true);
      return;
    }

    const key = getIssueKey();
    if (!key) {
      showToast('Could not detect Jira issue key', true);
      return;
    }

    const summary = getSummary();
    const description = getDescription();

    const btn = document.getElementById(BUTTON_ID);
    if (btn) {
      btn.disabled = true;
      btn.querySelector('.btn-label').textContent = 'Dispatching…';
      btn.style.opacity = '0.85';
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${data.githubRepo}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${data.githubPat}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: data.agent === 'copilot' ? 'jira-copilot-pr' : 'jira-jules-pr',
            client_payload: {
              jira_key: key,
              summary: summary,
              description: description,
            },
          }),
        }
      );

      if (response.status === 204) {
        const stored = await chrome.storage.local.get({ dispatches: [] });
        const dispatches = stored.dispatches;
        dispatches.unshift({
          jiraKey: key,
          summary: summary,
          repo: data.githubRepo,
          agent: data.agent || 'jules',
          timestamp: Date.now(),
        });
        if (dispatches.length > 20) dispatches.length = 20;
        await chrome.storage.local.set({ dispatches });

        showCelebration(`PR dispatched for ${key}`);
      } else if (response.status === 404) {
        showToast('GitHub returned 404 — check PAT permissions and repo name', true);
      } else {
        const body = await response.text();
        showToast(`GitHub API error ${response.status}: ${body}`, true);
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`, true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.querySelector('.btn-label').textContent = 'Create PR';
        btn.style.opacity = '1';
      }
    }
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;
    if (!getIssueKey()) return;

    injectStyles();

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;

    const sparkle = document.createElement('span');
    sparkle.className = 'sparkle-icon';
    sparkle.innerHTML = SPARKLE_SVG;

    const icon = document.createElement('span');
    icon.style.display = 'flex';
    icon.innerHTML = PR_ICON_SVG;

    const label = document.createElement('span');
    label.className = 'btn-label';
    label.textContent = 'Create PR';

    btn.append(sparkle, icon, label);

    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '80px',
      right: '24px',
      padding: '10px 18px 10px 14px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#fff',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      zIndex: '999998',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'transform 0.1s, opacity 0.15s',
      overflow: 'hidden',
      animation: 'jira-pr-glow 3s ease-in-out infinite',
    });

    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.96)'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', dispatchWorkflow);

    document.body.appendChild(btn);
  }

  function removeButton() {
    const btn = document.getElementById(BUTTON_ID);
    if (btn) btn.remove();
  }

  function checkAndInject() {
    if (getIssueKey()) {
      injectButton();
    } else {
      removeButton();
    }
  }

  checkAndInject();

  const observer = new MutationObserver(() => {
    checkAndInject();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      removeButton();
      setTimeout(checkAndInject, 500);
    }
  }, 500);
})();
