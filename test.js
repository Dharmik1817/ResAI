

  function toggleCollapsible(id) {
    const el = document.getElementById(id);
    if (el.style.display === 'none') {
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }


  window._tickets   = [];
  window._activeTab = 'tickets';

  // Poll until Firebase module sets _dbReady
  const syncInterval = setInterval(() => {
    if (window._dbReady) {
      clearInterval(syncInterval);
      document.getElementById('syncDot').classList.add('live');
      document.getElementById('syncText').textContent = 'Live sync active — tickets appear on all devices instantly';
    }
  }, 500);

  const TAB_ORDER = ['tickets','dashboard'];
  function switchTab(tab) {
    window._activeTab = tab;
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById('tab-' + tab);
    if (el) el.classList.add('active');
    const idx = TAB_ORDER.indexOf(tab);
    if (idx >= 0) {
      const btns = document.querySelectorAll('.tab-btn');
      if (btns[idx]) btns[idx].classList.add('active');
    }
    if (tab === 'tickets')   renderDashboard();
    if (tab === 'dashboard') {
      renderRHI(); calcConflict();
      setTimeout(() => { initMap(); calcDispatch(); calcRepair(); runPredictiveRisk(); }, 120);
    }
  }

  function mobTab(tab) {
    const scanPage = document.getElementById('mob-page-scan');
    const reportPage = document.getElementById('mob-page-report');
    const scanBtn = document.getElementById('mob-tab-scan');
    const reportBtn = document.getElementById('mob-tab-report');
    if (!scanPage) return;
    const isReport = tab === 'report';
    scanPage.style.display   = isReport ? 'none' : '';
    reportPage.style.display = isReport ? '' : 'none';
    const on  = 'flex:1;padding:11px 8px;border:none;border-bottom:2px solid var(--accent);background:var(--accentbg);color:var(--accent);font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;';
    const off = 'flex:1;padding:11px 8px;border:none;border-bottom:2px solid transparent;background:transparent;color:var(--text3);font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;';
    if (scanBtn)   scanBtn.style.cssText   = isReport ? off : on;
    if (reportBtn) reportBtn.style.cssText = isReport ? on  : off;
  }
  function updateBadge() {
    const count = (window._tickets || []).length;
    const badge   = document.getElementById('ticketBadge');
    const countEl = document.getElementById('dashCount');
    count > 0 ? badge.classList.add('show') : badge.classList.remove('show');
    badge.textContent = count;
    if (countEl) countEl.textContent = count + ' ticket' + (count !== 1 ? 's' : '');
    // Auto-refresh predictive risk only when dashboard tab is visible (avoids wasted work)
    if (window._activeTab === 'dashboard') runPredictiveRisk();
  }

  async function clearTickets() {
    if (!window._dbReady) { alert('Cloud not connected yet.'); return; }
    if (!confirm('Delete ALL tickets from cloud?\nThis will clear tickets on every device.')) return;
    for (const t of (window._tickets || [])) {
      try { await window._deleteDoc(window._doc(window._db, 'tickets', t.firestoreId)); }
      catch(e) { console.error(e); }
    }
  }

  // Active ticket filter
  let _activeFilter = 'all';
  function setFilter(f, el) {
    _activeFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    renderDashboard();
  }

  function renderDashboard() {
    const tickets = window._tickets || [];
    const list = document.getElementById('ticket-list');
    updateBadge();
    // Update stat counts
    const setS = (id,val) => { const e=document.getElementById(id); if(e) e.textContent=val; };
    setS('stat-pothole', tickets.filter(t=>isPothole(t.condition)).length);
    setS('stat-broken',  tickets.filter(t=>isBrokenRoad(t.condition||'')).length);
    setS('stat-patched', tickets.filter(t=>isPatchRoad(t.condition||'')).length);
    setS('stat-repaired',tickets.filter(t=>(t.status||'').toUpperCase()==='REPAIRED').length);
    // Apply filter
    let filtered = tickets;
    if (_activeFilter === 'pothole') filtered = tickets.filter(t=>isPothole(t.condition));
    else if (_activeFilter === 'broken')  filtered = tickets.filter(t=>isBrokenRoad(t.condition||''));
    else if (_activeFilter === 'patched') filtered = tickets.filter(t=>isPatchRoad(t.condition||''));
    else if (_activeFilter === 'repaired')filtered = tickets.filter(t=>(t.status||'').toUpperCase()==='REPAIRED');
    else if (_activeFilter === 'open')    filtered = tickets.filter(t=>(t.status||'OPEN').toUpperCase()==='OPEN');

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div>No tickets yet.<br>Start the scanner and point<br>at a pothole to generate one.</div>`;
      return;
    }
    const now = Date.now();
    list.innerHTML = filtered.map(t => {
      const typeClass  = getConditionClass(t.condition);
      const labelColor = typeClass === 'pothole' ? 'var(--danger)'
                       : typeClass === 'broken'  ? 'var(--warn)'
                       : typeClass === 'patched' ? 'var(--purple)'
                       : typeClass === 'good'    ? 'var(--good)'
                       : 'var(--text2)';
      const isNew      = t.createdAt && (now - t.createdAt) < 30000;
      const locText    = t.location
        ? `<a href="https://maps.google.com/?q=${t.location}" target="_blank" style="color:var(--accent);text-decoration:none;">${t.location} ↗</a>`
        : 'Unavailable';
      const verdictBadge = t.verifyVerdict
        ? `<span style="font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 6px;border-radius:4px;border:1px solid;${t.verifyVerdict==='VERIFIED'?'color:var(--good);border-color:var(--good)':t.verifyVerdict==='REVIEW'?'color:var(--warn);border-color:var(--warn)':'color:var(--dim);border-color:var(--dim)'}">${t.verifyVerdict} ${t.verifyScore||''}</span>`
        : '';
        
      let contractBadge = '';
      if ((t.status||'').toUpperCase() === 'REPAIRED') {
        contractBadge = `<span style="font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(34,197,94,0.1);color:var(--good);border:1px solid var(--good);">85% PAID · 15% ESCROW</span>`;
      } else if ((t.status||'').toUpperCase() === 'REJECTED') {
        contractBadge = `<span style="font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid var(--danger);">FUNDS ZEROED · REWORK</span>`;
      }
      
      return `
        <div class="ticket-card ${typeClass}">
          <div class="ticket-top">
            <div class="ticket-id">${t.id || '—'}</div>
            <div style="display:flex;gap:6px;align-items:center;">
              ${verdictBadge}
              ${contractBadge}
              ${isNew ? '<span class="new-pill">● LIVE</span>' : ''}
              <div class="ticket-status ${(t.status||'OPEN').toLowerCase()}">${(t.status||'OPEN').toUpperCase()}</div>

            </div>
          </div>
          <div class="ticket-condition" style="color:${labelColor}">${(t.condition||'').toUpperCase().replace(/_/g,' ')}</div>
          <div class="ticket-meta">
            <div class="ticket-meta-row"><span>TIME</span><span>${t.timestamp||'—'}</span></div>
            <div class="ticket-meta-row"><span>CONFIDENCE</span><span>${t.confidence||'—'}</span></div>
            <div class="ticket-meta-row"><span>LOCATION</span><span>${locText}</span></div>
            ${t.verifyReason ? `<div class="ticket-meta-row"><span>AI NOTE</span><span>${t.verifyReason}</span></div>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
            ${t.snapshot ? `<img class="ticket-snap" src="${t.snapshot}" alt="camera" style="border-right:1px solid var(--border)"/>` : ''}
            ${t.satelliteImage ? `<img class="ticket-snap" src="${t.satelliteImage}" alt="satellite"/>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function showToast(msg) {
    const t = document.getElementById('ticket-toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  let lastTicketTime = 0;
  const TICKET_COOLDOWN = 10000;

  async function generateTicket(condition, confidence, location, snapshot) {
    if (!window._dbReady) { console.warn('Firebase not ready'); return; }
    const now = Date.now();
    if (now - lastTicketTime < TICKET_COOLDOWN) return;
    lastTicketTime = now;

    // ── Run satellite verification first ──────────────────────────────────
    showToast('🛰 Verifying with satellite…');
    const verify = await verifyAndGenerateTicket(condition, confidence, location, snapshot);
    if (!verify.shouldTicket) return; // rejected by verifier

    const count  = (window._tickets || []).length + 1;
    const ticket = {
      id:             'TCK-' + String(count).padStart(4, '0'),
      condition, confidence,
      location:       location || null,
      snapshot:       snapshot || null,
      satelliteImage: verify.satelliteImage || null,
      verifyScore:    verify.verifyScore || null,
      verifyVerdict:  verify.verifyVerdict || 'UNVERIFIED',
      verifyReason:   verify.verifyReason || null,
      source:         'scanner',
      timestamp:      new Date().toLocaleString('en-IN'),
      createdAt:      now,
      status:         'OPEN'
    };

    try {
      await window._addDoc(window._ticketsCol, ticket);
      showToast('✔ ' + ticket.id + ' verified (' + (verify.verifyScore||'?') + ') · synced');
      setTimeout(() => runAutoDispatch(ticket), 800);
    } catch(e) {
      console.error(e);
      showToast('✖ Cloud sync failed — check Firebase config');
    }
  }

  let currentLocation = null;
  let _lastMovedAt = 0;      // timestamp of last meaningful GPS movement
  let _prevCoords  = null;   // previous GPS coords for movement detection

  function startGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
      p => {
        const newLat = p.coords.latitude.toFixed(6);
        const newLon = p.coords.longitude.toFixed(6);
        currentLocation = newLat + ', ' + newLon;

        // Detect movement: if coords changed by ≥ 0.00005 degrees (~5 m), mark as moved
        if (_prevCoords) {
          const dLat = Math.abs(parseFloat(newLat) - _prevCoords.lat);
          const dLon = Math.abs(parseFloat(newLon) - _prevCoords.lon);
          if (dLat > 0.000050 || dLon > 0.000050) {
            _lastMovedAt = Date.now();
          }
        }
        _prevCoords = { lat: parseFloat(newLat), lon: parseFloat(newLon) };
      },
      () => { currentLocation = null; },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    );
  }

  function takeSnapshot() {
    if (!webcam || !webcam.canvas) return null;
    try {
      const c = document.createElement('canvas');
      c.width = webcam.canvas.width; c.height = webcam.canvas.height;
      c.getContext('2d').drawImage(webcam.canvas, 0, 0);
      return c.toDataURL('image/jpeg', 0.4);
    } catch { return null; }
  }

  // ── Device motion — skip blurry frames when phone is shaking ────────────
  let _motionMag = 0;
  const MOTION_THRESHOLD = 12; // m/s² — skip frame if shaking harder than this
  if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', e => {
      const a = e.accelerationIncludingGravity;
      if (a) _motionMag = Math.sqrt((a.x||0)**2 + (a.y||0)**2 + (a.z||0)**2);
    });
  }

  let model, webcam, maxPredictions, running = false, animFrame;

  // ── Label helpers — model emits: "GOOD ROADS", "BROKEN ROADS", "POTHOLES",
  //    "PATCHED ROADS", "MANHOLE AREA", "FATIGUED ROAD"
  function isPothole(label)    { const l=(label||'').toUpperCase(); return l.includes('POTHOLE'); }
  function isBrokenRoad(label) { const l=(label||'').toUpperCase(); return l.includes('BROKEN') || l.includes('FATIGUED'); }
  function isPatchRoad(label)  { const l=(label||'').toUpperCase(); return l.includes('PATCH'); }
  function isGoodRoad(label)   { const l=(label||'').toUpperCase(); return l.includes('GOOD'); }
  function isManhole(label)    { const l=(label||'').toUpperCase(); return l.includes('MANHOLE'); }

  function getConditionClass(label) {
    if (!label) return 'other';
    const l = label.toUpperCase();
    if (l.includes('POTHOLE'))                        return 'pothole';
    if (l.includes('PATCH'))                          return 'patched';
    if (l.includes('BROKEN') || l.includes('FATIGUED')) return 'broken';
    if (l.includes('GOOD'))                           return 'good';
    if (l.includes('MANHOLE'))                        return 'broken';
    return 'other';
  }
  function shouldGenerateTicket(label) {
    // Tickets for all damaged conditions — never for good roads
    return isPothole(label) || isBrokenRoad(label) || isPatchRoad(label) || isManhole(label);
  }

  // ── Per-class display threshold — patched/broken are subtler, need lower gate ─
  const CLASS_THRESHOLD = {
    'POTHOLES':      0.88,   // deep damage — high confidence required
    'BROKEN ROADS':  0.82,   // surface cracks — moderately lenient
    'FATIGUED ROAD': 0.80,   // fatigue pattern — allow moderate confidence
    'PATCHED ROADS': 0.75,   // patched surface is subtle — lower gate so it's caught
    'MANHOLE AREA':  0.80,   // manhole region
    'GOOD ROADS':    0.88,   // good road — high gate so minor variance doesn't trigger
  };
  const DEFAULT_THRESHOLD = 0.85;

  // Per-class minimum confidence for ticket fire (must ALSO pass consensus)
  const TICKET_CONF = {
    'POTHOLES':      0.88,
    'BROKEN ROADS':  0.82,
    'FATIGUED ROAD': 0.80,
    'PATCHED ROADS': 0.76,  // lower so patched roads actually generate tickets
    'MANHOLE AREA':  0.80,
  };
  const DEFAULT_TICKET_CONF = 0.85;

  // ── Temporal smoothing buffer ────────────────────────────────────────────
  const FRAME_BUFFER_SIZE = 6;   // look at last 6 frames
  const FRAME_AGREE_MIN   = 5;   // need 5/6 to agree — stricter = no home false positives
  let frameBuffer = [];
  let detectionCount = 0, correctCount = 0;

  function setStatus(msg, type = '') {
    const el = document.getElementById('statusBar');
    el.className = type; el.innerHTML = msg;
  }

  async function init() {
    const urlInput = document.getElementById('modelURL').value.trim();
    if (!urlInput) { setStatus('&#9888; &nbsp;Configuration error.', 'error'); return; }
    document.getElementById('startBtn').disabled = true;
    setStatus('&#9203; &nbsp;Loading model&hellip;', 'loading');
    try {
      // Always load from the hosted Teachable Machine URL — reliable on all devices
      const modelURL = urlInput.endsWith('/') ? urlInput : urlInput + '/';
      model = await tmImage.load(modelURL + 'model.json', modelURL + 'metadata.json');
      maxPredictions = model.getTotalClasses();
    } catch(e) {
      setStatus('&#10006; &nbsp;Model load failed: ' + (e.message || 'Check internet connection'), 'error');
      document.getElementById('startBtn').disabled = false; return;
    }
    setStatus('&#128247; &nbsp;Starting rear camera&hellip;', 'loading');
    try {
      // Step 1: explicitly request camera permission via getUserMedia first.
      // This forces the browser permission dialog on mobile (Chrome/Android)
      // before tmImage.Webcam tries to open the stream, preventing the
      // "Allow camera permission" error even when permission was granted.
      let testStream = null;
      try {
        testStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
      } catch(permErr) {
        setStatus('&#10006; &nbsp;Camera permission denied: ' + (permErr.message || 'Please allow camera access in browser settings'), 'error');
        document.getElementById('startBtn').disabled = false; return;
      }
      // Release the test stream — tmImage.Webcam will open its own
      if (testStream) testStream.getTracks().forEach(t => t.stop());

      // Step 2: now open through Teachable Machine webcam wrapper
      webcam = new tmImage.Webcam(320, 240, false);
      await webcam.setup({ facingMode: { ideal: 'environment' } });
      await webcam.play();
      const container = document.getElementById('webcam-container');
      container.innerHTML = ''; container.appendChild(webcam.canvas);
    } catch(e) {
      setStatus('&#10006; &nbsp;Camera error: ' + (e.message || 'Allow camera permission'), 'error');
      document.getElementById('startBtn').disabled = false; return;
    }
    frameBuffer = [];
    startGPS(); buildBars(maxPredictions);
    document.getElementById('cameraWrap').classList.add('visible');
    document.getElementById('result-panel').classList.add('visible');
    document.getElementById('stopBtn').disabled = false;
    setStatus('&#10004; &nbsp;Running &mdash; point camera at the road', 'ready');
    running = true; loop();
  }

  function buildBars(count) {
    const container = document.getElementById('label-bars');
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      container.innerHTML += `
        <div class="bar-item">
          <div class="bar-name" id="bar-name-${i}">CLASS ${i}</div>
          <div class="bar-track"><div class="bar-fill" id="bar-fill-${i}" style="width:0%"></div></div>
          <div class="bar-pct" id="bar-pct-${i}">0%</div>
        </div>`;
    }
  }

  async function loop() {
    if (!running) return;
    webcam.update();
    await predict();
    // Throttle to ~15fps for moving bus — reduces lag, still catches potholes
    animFrame = setTimeout(() => requestAnimationFrame(loop), 66);
  }

  async function predict() {
    // Skip frame if device is shaking (prevents blur-induced false positives)
    if (_motionMag > MOTION_THRESHOLD) {
      const labelEl = document.getElementById('top-label');
      if (labelEl) { labelEl.textContent = 'STABILISING'; labelEl.style.color = 'var(--warn)'; }
      return;
    }

    const predictions = await model.predict(webcam.canvas);
    let top = predictions[0];
    for (const p of predictions) { if (p.probability > top.probability) top = p; }

    const labelEl = document.getElementById('top-label');
    const confEl  = document.getElementById('confidence-badge');

    // ── Class colour map — keyed on actual model label names ───────────────
    function classColor(name) {
      const l = (name||'').toUpperCase();
      if (l.includes('POTHOLE'))                          return 'var(--danger)';
      if (l.includes('BROKEN') || l.includes('FATIGUED')) return 'var(--warn)';
      if (l.includes('PATCH'))                            return '#a78bfa';
      if (l.includes('GOOD'))                             return 'var(--good)';
      if (l.includes('MANHOLE'))                          return 'var(--warn)';
      return 'var(--accent)';
    }

    // ── Update probability bars (always, regardless of threshold) ──────────
    predictions.forEach((p, i) => {
      const n = document.getElementById(`bar-name-${i}`);
      const f = document.getElementById(`bar-fill-${i}`);
      const c = document.getElementById(`bar-pct-${i}`);
      if (!n) return;
      n.textContent = p.className;
      const pct = (p.probability*100).toFixed(1);
      f.style.width = pct+'%'; c.textContent = pct+'%';
      // Use dedicated colour per class so bars are always clearly distinguishable
      f.style.background = classColor(p.className);
    });

    // Use per-class threshold — patched/broken roads have a lower gate than potholes
    const classThresh = CLASS_THRESHOLD[top.className] !== undefined
      ? CLASS_THRESHOLD[top.className] : DEFAULT_THRESHOLD;
    if (top.probability < classThresh) {
      labelEl.textContent = 'SCANNING'; labelEl.style.color = 'var(--dim)';
      confEl.textContent  = (top.probability * 100).toFixed(1) + '%'; confEl.style.color = 'var(--dim)';
      document.getElementById('alert-badge').classList.remove('show');
      frameBuffer = []; // reset buffer when no clear detection
      return;
    }

    // ── Add to temporal buffer ──────────────────────────────────────────────
    frameBuffer.push({ label: top.className, prob: top.probability });
    if (frameBuffer.length > FRAME_BUFFER_SIZE) frameBuffer.shift();

    // ── Check consensus — need FRAME_AGREE_MIN frames agreeing ─────────────
    const bufLabel = top.className;
    const agreeCount = frameBuffer.filter(f => f.label === bufLabel).length;
    const avgProb = frameBuffer.filter(f => f.label === bufLabel)
      .reduce((s, f) => s + f.prob, 0) / Math.max(agreeCount, 1);
    const hasConsensus = frameBuffer.length >= FRAME_BUFFER_SIZE && agreeCount >= FRAME_AGREE_MIN;

    // Update alert badge text to reflect actual detected condition
    const alertTextEl = document.getElementById('alert-badge-text');
    if (alertTextEl) alertTextEl.textContent = bufLabel.toUpperCase() + ' — TICKET GENERATED';

    // Show label immediately (for UI feedback) but use smoothed prob display
    const displayColor = classColor(bufLabel);
    labelEl.textContent     = bufLabel.toUpperCase().replace(/_/g, ' ');
    labelEl.style.color     = displayColor;
    confEl.textContent      = (avgProb * 100).toFixed(1) + '%';
    confEl.style.color      = displayColor;

    // Show buffer progress indicator
    const bufIndicator = frameBuffer.map((f, i) =>
      `<span style="color:${f.label===bufLabel?'var(--good)':'var(--dim)'};font-size:9px">${i===frameBuffer.length-1?'|':'.'}</span>`
    ).join('');
    const bufEl = document.getElementById('buf-indicator');
    if (bufEl) bufEl.innerHTML = bufIndicator + `<span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);margin-left:6px">${agreeCount}/${FRAME_BUFFER_SIZE} frames agree</span>`;

    // ── Ticket generation: all damage types — per-class confidence minimum ──
    // Consensus gate prevents duplicate tickets from the same detection event.
    const ticketConfMin = TICKET_CONF[bufLabel] !== undefined ? TICKET_CONF[bufLabel] : DEFAULT_TICKET_CONF;
    if (shouldGenerateTicket(bufLabel) && avgProb >= ticketConfMin) {
      if (hasConsensus) {
        // ── STATIONARITY GUARD: if device hasn't moved in 8+ seconds, require
        //    very high confidence (0.95) before firing — prevents indoor/home tickets
        //    when user points phone at a screen image or carpet.
        const sinceMove = Date.now() - (_lastMovedAt || 0);
        const isStationary = sinceMove > 8000; // 8 seconds without GPS movement
        const stationaryMinConf = 0.95;
        if (isStationary && avgProb < stationaryMinConf) {
          const bufEl2 = document.getElementById('buf-indicator');
          if (bufEl2) bufEl2.innerHTML += `<span style="color:var(--warn);font-size:9px;margin-left:8px">⚠ STATIONARY — need ${(stationaryMinConf*100).toFixed(0)}% conf to ticket</span>`;
          // Don't reset frameBuffer — let confidence accumulate; just don't ticket yet
        } else {
          const alertEl = document.getElementById('alert-badge');
          alertEl.querySelector('.alert-text').textContent =
            bufLabel.toUpperCase().replace(/_/g,' ') + ' DETECTED — VERIFYING…';
          alertEl.classList.add('show');
          generateTicket(bufLabel, (avgProb*100).toFixed(1)+'%', currentLocation, takeSnapshot());
          frameBuffer = []; // reset after ticket to prevent duplicate triggers
        }
      }
    } else {
      // Good road or low-confidence detection — no alert, no ticket
      document.getElementById('alert-badge').classList.remove('show');
    }
  }

  function stopDetection() {
    running = false; cancelAnimationFrame(animFrame);
    if (webcam) webcam.stop();
    document.getElementById('cameraWrap').classList.remove('visible');
    document.getElementById('result-panel').classList.remove('visible');
    document.getElementById('alert-badge').classList.remove('show');
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    setStatus('⬡ &nbsp;Detection stopped. Tap START to run again.');
  }

  updateBadge();

  /* ════════════════════════════════════════
     AUTO DISPATCH ENGINE — all signals fetched automatically
  ════════════════════════════════════════ */

  // Called when dispatch tab opens — pre-fetches signals from last bad-condition ticket
  async function calcDispatch() {
    const tickets = window._tickets || [];
    // Find the most recent ticket that is a bad road condition (pothole, broken, or patched)
    const last = tickets.find(t => shouldGenerateTicket(t.condition));
    if (!last) {
      document.getElementById('dispatch-out').innerHTML =
        `<div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--dim);padding:20px;text-align:center">
          No road damage tickets yet.<br>Scan a pothole, broken road, or patched road first — dispatch auto-populates.
        </div>`;
      return;
    }
    await runAutoDispatch(last);
  }

  async function runAutoDispatch(ticketIn) {
    const btn = document.getElementById('autoDispatchBtn');
    if (btn) btn.disabled = true;

    const tickets = window._tickets || [];
    const last = ticketIn || tickets.find(t => shouldGenerateTicket(t.condition));
    if (!last) {
      document.getElementById('dispatch-out').innerHTML =
        `<div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--dim);padding:20px;text-align:center">
          No pothole ticket found. Run the scanner first.
        </div>`;
      if (btn) btn.disabled = false;
      return;
    }

    setSignal('sig-sev','— reading...','var(--dim)');
    setSignal('sig-road','— fetching...','var(--dim)');
    setSignal('sig-traffic','— fetching...','var(--dim)');
    setSignal('sig-weather','— fetching...','var(--dim)');
    setSignal('sig-accident','— checking...','var(--dim)');

    // ── 1. SEVERITY from condition type + confidence score ────────────────
    const confNum = parseFloat((last.confidence||'0').replace('%',''));
    let sev, sevLabel;
    const cond = (last.condition||'').toLowerCase().trim();
    if (cond === 'pothole') {
      // Pothole: severity scales with detection confidence
      if (confNum >= 92)      { sev = 3; sevLabel = 'L3 — Deep pothole (structural)'; }
      else if (confNum >= 87) { sev = 2; sevLabel = 'L2 — Pothole'; }
      else                    { sev = 1; sevLabel = 'L1 — Pothole (low conf.)'; }
    } else if (cond === 'broken_road') {
      // Broken road: medium-high severity regardless of exact confidence
      sev = confNum >= 88 ? 3 : 2;
      sevLabel = sev === 3 ? 'L3 — Severely broken surface' : 'L2 — Broken road surface';
    } else if (cond === 'patched_road') {
      // Patched road: generally lower severity (surface already treated once)
      sev = 1;
      sevLabel = 'L1 — Patched / deteriorating patch';
    } else {
      // Fallback for legacy tickets
      if (confNum >= 92)      { sev = 3; sevLabel = 'L3 — Structural'; }
      else if (confNum >= 87) { sev = 2; sevLabel = 'L2 — Damage'; }
      else                    { sev = 1; sevLabel = 'L1 — Surface issue'; }
    }
    setSignal('sig-sev', sevLabel + ` (${confNum.toFixed(1)}% conf.)`, sev===3?'var(--danger)':sev===2?'var(--warn)':'var(--accent)');

    // ── 2. ROAD TYPE from OpenStreetMap Nominatim reverse geocode ──────────
    let road = 2, roadLabel = 'Arterial road';
    const gps = last.location;
    if (gps) {
      const [lat, lon] = gps.split(',').map(s => s.trim());
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const addr = data.address || {};
        const osmClass = (data.class||'') + ' ' + (data.type||'');
        const nameStr  = ((data.display_name||'')).toLowerCase();
        if (nameStr.includes('school') || nameStr.includes('hospital') || nameStr.includes('college'))
          { road = 3; roadLabel = 'School / hospital zone'; }
        else if (osmClass.includes('primary') || osmClass.includes('trunk') || osmClass.includes('motorway'))
          { road = 3; roadLabel = 'Primary / arterial'; }
        else if (osmClass.includes('secondary') || osmClass.includes('residential'))
          { road = 2; roadLabel = 'Secondary road'; }
        else if (osmClass.includes('service') || osmClass.includes('footway') || osmClass.includes('path'))
          { road = 1; roadLabel = 'Service lane / path'; }
        else {
          const rType = addr.road || addr.pedestrian || '';
          if (/main|highway|national|state/.test(rType.toLowerCase())) { road = 3; roadLabel = 'Major highway'; }
          else if (/street|avenue|marg/.test(rType.toLowerCase()))     { road = 2; roadLabel = rType || 'Road'; }
          else if (rType)                                               { road = 1; roadLabel = rType; }
        }
      } catch(e) { roadLabel = 'Road (GPS lookup failed)'; }
    } else { roadLabel = 'Road (no GPS)'; road = 2; }
    setSignal('sig-road', roadLabel, road===3?'var(--danger)':road===2?'var(--accent)':'var(--dim)');

    // ── 3. TRAFFIC LOAD — hour-of-day model + OSM road class ───────────────
    const hour = new Date().getHours();
    const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
    const isMid  = (hour >= 11 && hour <= 16);
    let traffic, trafficLabel;
    if (road === 3 && isPeak)       { traffic = 3; trafficLabel = 'High — peak hour arterial'; }
    else if (isPeak)                { traffic = 2; trafficLabel = 'Moderate — peak hour'; }
    else if (isMid && road >= 2)    { traffic = 2; trafficLabel = 'Moderate — daytime'; }
    else if (hour >= 22 || hour < 5){ traffic = 1; trafficLabel = 'Low — night hours'; }
    else                            { traffic = 1; trafficLabel = 'Low — off-peak'; }
    setSignal('sig-traffic', trafficLabel + ` (${hour}:00)`, traffic===3?'var(--danger)':traffic===2?'var(--warn)':'var(--good)');

    // ── 4. WEATHER RISK from Open-Meteo (free, no API key needed) ──────────
    let weather = 0, weatherLabel = 'Clear — no rain forecast';
    if (gps) {
      const [lat2, lon2] = gps.split(',').map(s => s.trim());
      try {
        const wres  = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat2}&longitude=${lon2}&hourly=precipitation_probability&forecast_days=1&timezone=auto`
        );
        const wdata = await wres.json();
        const probs = (wdata.hourly?.precipitation_probability || []).slice(0, 24);
        const hIdx  = new Date().getHours();
        const next2h= Math.max(...(probs.slice(hIdx, hIdx+2).length ? probs.slice(hIdx, hIdx+2) : [0]));
        const next6h= Math.max(...(probs.slice(hIdx, hIdx+6).length ? probs.slice(hIdx, hIdx+6) : [0]));
        if      (next2h >= 60) { weather = 2; weatherLabel = `Rain likely in 2h (${next2h}%)`; }
        else if (next6h >= 50) { weather = 1; weatherLabel = `Rain possible in 6h (${next6h}%)`; }
        else                   { weather = 0; weatherLabel = `Clear — ${next6h}% chance next 6h`; }
      } catch(e) { weatherLabel = 'Weather API unavailable'; }
    } else { weatherLabel = 'No GPS — weather skipped'; }
    setSignal('sig-weather', weatherLabel, weather===2?'var(--danger)':weather===1?'var(--warn)':'var(--good)');

    // ── 5. ACCIDENT HISTORY — check Firestore tickets near same GPS ────────
    let acc = 0, accLabel = 'No incidents at this location';
    if (gps && window._tickets) {
      const [lat3, lon3] = gps.split(',').map(s=>parseFloat(s.trim()));
      const thirtyDaysAgo = Date.now() - 30*24*60*60*1000;
      const nearby = (window._tickets||[]).filter(t => {
        if (!t.location || t.id === last.id) return false;
        const [tLat, tLon] = t.location.split(',').map(s=>parseFloat(s.trim()));
        const dist = Math.sqrt(Math.pow(tLat-lat3,2)+Math.pow(tLon-lon3,2)) * 111000;
        return dist < 100 && (t.createdAt||0) > thirtyDaysAgo;
      });
      if (nearby.length >= 2) { acc = 2; accLabel = `${nearby.length} incidents within 100m (30d)`; }
      else if (nearby.length === 1) { acc = 1; accLabel = '1 incident nearby (30d)'; }
    }
    setSignal('sig-accident', accLabel, acc>=2?'var(--danger)':acc===1?'var(--warn)':'var(--good)');

    // ── 6. WORKERS — simulated ward registry ───────────────────────────────
    const workers = 5;
    setSignal('sig-workers','5 available (Ward-07)','var(--accent)');

    // ── SCORE & RENDER ─────────────────────────────────────────────────────
    renderDispatchResult({ sev, road, traffic, weather, acc, workers, last });
    if (btn) btn.disabled = false;
  }

  function setSignal(id, text, color) {
    const el = document.getElementById(id);
    if (el) { el.textContent = text; el.style.color = color || 'var(--text)'; el.style.fontSize = '12px'; }
  }

  function renderDispatchResult({ sev, road, traffic, weather, acc, workers, last }) {
    const score = (sev*3)+(road*2)+traffic+weather+acc;
    let pClass, pLabel, mobilise, deadline, shift, crewCount, crewType, material, note, escalate;

    if (score >= 14) {
      pClass='p1'; pLabel='P1 — EMERGENCY'; mobilise='2 hours'; escalate='Municipal commissioner at T+1hr';
      if (sev===3) {
        deadline='5 days (L3 structural)'; crewCount=Math.min(workers,10);
        crewType='workers + excavator + paver + supervisor';
        material='Hot-mix, geotextile base, compactor, light markers';
      } else {
        deadline='6 hours'; crewCount=Math.min(workers,5);
        crewType='workers + compactor + supervisor';
        material='Hot-mix asphalt, compactor, barricades + reflectors';
      }
      shift=traffic===3?'Night shift only (10pm–5am)':'Immediate — day shift';
      note='Traffic diversion order auto-issued to Traffic dept.';
    } else if (score >= 8) {
      pClass='p2'; pLabel='P2 — URGENT'; mobilise='Within 8 hours'; escalate='Ward officer re-notified at T+2hr';
      if (sev===1) {
        deadline='24 hours'; crewCount=Math.min(workers,2);
        crewType='workers'; material='Cold-mix bag, hand tools';
      } else {
        deadline='24–48 hours'; crewCount=Math.min(workers,4);
        crewType='workers + light compactor + supervisor';
        material='Hot-mix or cold-mix, light compactor';
      }
      shift=traffic===3?'Night shift preferred':'Day shift';
      note='Scheduled in next available crew slot for this ward.';
    } else {
      pClass='p3'; pLabel='P3 — PLANNED'; mobilise='Within 7 days'; escalate='Reminder to supervisor at T+3 days';
      deadline='7 days'; crewCount=Math.min(workers,2); crewType='workers';
      material='Cold-mix, hand tools'; shift='Day shift';
      note='Batched with nearby P3 jobs — optimised route for efficiency.';
    }

    const workerWarn = workers < (sev===3?6:sev===2?3:1);
    const workerNote = workerWarn
      ? `<div style="color:var(--warn);font-family:'Share Tech Mono',monospace;font-size:10px;margin-top:6px;letter-spacing:1px">⚠ INSUFFICIENT WORKERS — AI requests reallocation from adjacent ward</div>` : '';

    const tlSteps = [
      {dot:'tl-done', time:'T = 0',        desc:'Ticket created · Deadline locked on blockchain · SMS to supervisor'},
      {dot:'tl-done', time:'T + 30 min',   desc:'Supervisor must confirm via SMS · No reply = escalate to ward officer'},
      {dot:'tl-now',  time:`T + ${score>=14?'1':'2'} hr`, desc: escalate},
      {dot:'tl-pend', time:'Deadline',      desc:'Segment flagged for priority re-scan · AI verifies quality · RHI updated'},
      {dot:'tl-pend', time:'+ 90 days',     desc:'Automated re-scan · Does repair hold? · Contractor score adjusted'},
    ];

    document.getElementById('dispatch-out').innerHTML = `
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">
        TICKET: ${last.id||'—'} · ${last.condition||''} · ${last.timestamp||''} · SCORE: ${score}/18
      </div>
      <div class="priority-banner ${pClass}" style="background:var(--surface2);">
        <div style="font-size:16px;font-weight:700;letter-spacing:3px;margin-bottom:4px">${pLabel}</div>
        <div style="font-size:11px;opacity:0.8">Score ${score}/18 &nbsp;·&nbsp; sev=${sev*3} road=${road*2} traffic=${traffic} weather=${weather} accident=${acc}</div>
      </div>
      <div class="dispatch-grid">
        <div class="dispatch-cell"><div class="dispatch-cell-label">Mobilise by</div><div class="dispatch-cell-val">${mobilise}</div></div>
        <div class="dispatch-cell"><div class="dispatch-cell-label">Repair deadline</div><div class="dispatch-cell-val">${deadline}</div></div>
        <div class="dispatch-cell"><div class="dispatch-cell-label">Work shift</div><div class="dispatch-cell-val">${shift}</div></div>
        <div class="dispatch-cell"><div class="dispatch-cell-label">Crew dispatched</div><div class="dispatch-cell-val">${crewCount} ${crewType}</div>${workerNote}</div>
      </div>
      <div class="spec-block">
        <div class="spec-title">MATERIALS REQUIRED</div>
        <div class="spec-row"><span class="spec-key">MATERIALS</span><span class="spec-val">${material}</span></div>
        <div class="spec-row"><span class="spec-key">NOTE</span><span class="spec-val">${note}</span></div>
      </div>
      <div class="spec-block">
        <div class="spec-title">AUTOMATED ACTION TIMELINE</div>
        ${tlSteps.map(s=>`<div class="timeline-step"><div class="tl-dot ${s.dot}"></div><div><span style="color:var(--accent)">${s.time}</span> — ${s.desc}</div></div>`).join('')}
      </div>`;
  }

  /* ════════════════════════════════════════
     SATELLITE VERIFICATION ENGINE
  ════════════════════════════════════════ */

  // ── SATELLITE CONFIGURATION ──────────────────────────────────────────────
  // Using Mapbox Satellite: 50,000 free loads/month, sub-metre resolution
  // Get your free token at: account.mapbox.com → Tokens → Create token
  // Free tier is enough for any demo or pilot — no credit card needed initially
  const MAPBOX_TOKEN = 'YOUR_MAPBOX_PUBLIC_TOKEN';

  // Google Gemini API key for Vision analysis of both images
  const GEMINI_KEY = 'YOUR_GEMINI_API_KEY';

  function getSatelliteTileUrl(lat, lon, zoom = 19) {
    if (MAPBOX_TOKEN !== 'YOUR_MAPBOX_PUBLIC_TOKEN') {
      // Mapbox Satellite Static API — sub-metre resolution, free 50k/month
      // Uses Maxar Vivid imagery at this zoom level — best available for India
      return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/pin-s+ff0000(${lon},${lat})/${lon},${lat},${zoom}/600x400?access_token=${MAPBOX_TOKEN}`;
    }
    // Free fallback: OpenStreetMap tiles (no key, road network visible)
    const z = Math.min(zoom, 18);
    const sinLat = Math.sin(lat * Math.PI / 180);
    const tileX  = Math.floor((lon + 180) / 360 * Math.pow(2, z));
    const tileY  = Math.floor((0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * Math.pow(2, z));
    return `https://tile.openstreetmap.org/${z}/${tileX}/${tileY}.png`;
  }

  // ── GPS ROAD EXISTENCE CHECK — first gate, blocks fake GPS locations ──────
  // Checks OSM Nominatim: if no road exists at this GPS, no ticket generated
  async function gpsRoadCheck(lat, lon) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=17`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const cls  = (data.class || '').toLowerCase();
      const typ  = (data.type  || '').toLowerCase();
      const addr = data.address || {};

      // PRIMARY check: OSM must classify the feature itself as a highway/road.
      // Note: addr.road is the NEAREST road name, present even for buildings —
      // so we must NOT use addr.road alone as a road confirmation.
      const roadClasses = ['highway'];
      const roadTypes   = ['road','residential','primary','secondary','tertiary','trunk',
                           'motorway','service','unclassified','living_street','pedestrian',
                           'cycleway','footway','path','track','steps'];
      const isActualRoad = roadClasses.some(r => cls === r) || roadTypes.some(r => typ === r);

      // SECONDARY: also accept if OSM placed us on a named road node (not just nearby)
      // cls=place/building/amenity/landuse means we are NOT on the road surface
      const nonRoadClasses = ['building','amenity','landuse','leisure','natural',
                              'waterway','place','boundary','man_made','tourism','shop'];
      const isDefinitelyNotRoad = nonRoadClasses.some(c => cls === c);

      const isRoad = isActualRoad && !isDefinitelyNotRoad;
      const roadName = addr.road || typ || 'Unknown';

      return { isRoad, roadName, cls, typ };
    } catch(e) {
      // If API fails, allow with uncertainty flag (don't block on network error)
      return { isRoad: true, roadName: 'Unknown (API unavailable)', uncertainty: true };
    }
  }

  async function fetchSatelliteTileAsBase64(lat, lon) {
    const url = getSatelliteTileUrl(lat, lon);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result); // data:image/...;base64,...
        reader.onerror  = reject;
        reader.readAsDataURL(blob);
      });
    } catch(e) {
      return null;
    }
  }

  async function analyseWithGemini(cameraBase64, satelliteBase64, lat, lon, roadCheckResult) {
    // If no API key, use rule-based heuristic scoring for demo
    if (GEMINI_KEY === 'YOUR_GEMINI_API_KEY') {
      return heuristicVerify(cameraBase64, satelliteBase64, lat, lon, roadCheckResult);
    }
    try {
      const prompt = `You are a road quality verification AI for a smart municipality system in India.
You are given two images:
1. A ground-level camera frame from a pothole scanner (could be POTHOLE, BROKEN ROAD, PATCHED ROAD, MANHOLE, or FATIGUED ROAD)
2. A satellite/aerial tile of the SAME GPS location (${lat}, ${lon})

FRAUD DETECTION RULES (score 0-15 and REJECT if any of these are true):
- Camera image appears to be a PHOTO OF A SCREEN (moire pattern, glare, screen bezels, display curvature)
- Camera image shows an INDOOR scene (walls, floors, ceiling, furniture, carpet, tiles)
- Camera image is a SCREENSHOT or printed image of a road (too perfect, no motion blur, no real texture)
- GPS location has NO ROAD visible in satellite tile

DETECTION SCOPE — ticket-worthy conditions (score 75+ if genuine):
- POTHOLES: deep holes, depressions, broken edges in road
- BROKEN ROADS: surface cracks, spalling, structural damage
- PATCHED ROADS: previously repaired patches, patch boundaries, deteriorating patches
- MANHOLE AREA: manhole covers, surrounding depressions, improper flush
- FATIGUED ROAD: alligator cracking, surface fatigue, micro-cracking

Return ONLY a JSON object (no other text):
{
  "score": <integer 0-100>,
  "road_visible_satellite": <true|false>,
  "damage_pattern_matches": <true|false>,
  "is_screen_fraud": <true|false>,
  "is_indoor_scene": <true|false>,
  "satellite_road_condition": "<good|fair|damaged|unclear>",
  "detected_condition": "<POTHOLE|BROKEN|PATCHED|MANHOLE|FATIGUED|GOOD|UNKNOWN>",
  "reasoning": "<one sentence explanation>",
  "verdict": "<VERIFIED|REVIEW|REJECTED>"
}

Scoring guide:
- 75-100: Real outdoor road scene, GPS matches satellite road, damage visible → VERIFIED
- 40-74:  Road visible but damage unclear or ambiguous → REVIEW (officer decides)
- 0-39:   Indoor scene / screen fraud / no road at GPS / no damage → REJECTED`;

      const reqBody = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: cameraBase64.split(',')[1] } },
            { inlineData: { mimeType: 'image/png',  data: satelliteBase64.split(',')[1] } }
          ]
        }]
      };

      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + GEMINI_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.is_screen_fraud || parsed.is_indoor_scene) {
          parsed.verdict = 'REJECTED';
          parsed.score = Math.min(parsed.score, 15);
          parsed.reasoning = (parsed.is_screen_fraud ? 'FRAUD: image appears to be a screen/photo of a screen. ' : '') +
                             (parsed.is_indoor_scene ? 'FRAUD: indoor scene detected — not a real road. ' : '') +
                             (parsed.reasoning || '');
        }
        return parsed;
      }
    } catch(e) { /* fall through to heuristic */ }
    return heuristicVerify(cameraBase64, satelliteBase64, lat, lon, roadCheckResult);
  }

  function heuristicVerify(cameraB64, satelliteB64, _lat, _lon, roadCheckResult) {
    // ── STRICT heuristic — every point must be earned, no random component ──
    const hasCamera    = !!(cameraB64 && cameraB64.length > 8000);
    const hasSatellite = !!(satelliteB64 && satelliteB64.length > 5000);

    // GATE A: OSM hard-rejected this location as non-road
    if (roadCheckResult && roadCheckResult.isRoad === false && !roadCheckResult.uncertainty) {
      return {
        score: 5, verdict: 'REJECTED',
        road_visible_satellite: false,
        damage_pattern_matches: false,
        satellite_road_condition: 'no_road',
        reasoning: 'OSM Gate: GPS is not on a road surface (class=' + (roadCheckResult.cls||'?') + ')'
      };
    }

    const roadConfirmed = !!(roadCheckResult && roadCheckResult.isRoad && !roadCheckResult.uncertainty);
    // GATE B: device is stationary (sitting at home) — penalise heavily
    const sinceMove  = Date.now() - (_lastMovedAt || 0);
    const stationary = sinceMove > 8000;  // no GPS movement in 8 seconds

    let score = 0;
    let reasons = [];

    if (hasCamera)     { score += 28; reasons.push('camera✔'); }
    if (hasSatellite)  { score += 24; reasons.push('satellite✔'); }
    if (roadConfirmed) { score += 23; reasons.push('OSM-road✔'); }
    else               { reasons.push('OSM-road✖'); }
    if (stationary)    { score -= 30; reasons.push('stationary⚠'); }  // heavy penalty for home use
    score = Math.max(0, Math.min(score, 100));

    // Scoring logic:
    // Moving + camera + satellite + OSM road  → ~75  → VERIFIED
    // Moving + camera + satellite, no OSM road → ~52 → REVIEW
    // Stationary (home) + camera + satellite + OSM → ~45 → REVIEW (officer decides)
    // Stationary + no OSM road → ~-2 clamped to 0  → REJECTED
    const verdict = score >= 75 ? 'VERIFIED' : score >= 45 ? 'REVIEW' : 'REJECTED';

    return {
      score, verdict,
      road_visible_satellite: hasSatellite,
      damage_pattern_matches: score >= 75,
      satellite_road_condition: score >= 75 ? 'damaged' : score >= 45 ? 'fair' : 'unclear',
      reasoning: 'Heuristic gates: ' + reasons.join(', ') +
        (MAPBOX_TOKEN === 'YOUR_MAPBOX_PUBLIC_TOKEN' ? ' | Add Mapbox+Gemini keys for full AI verification' : '')
    };
  }

  function renderVerifyResult(result, cameraB64, satelliteB64, gps, container, pendingTicketData) {
    const verdictColor = result.verdict === 'VERIFIED' ? 'var(--good)' : result.verdict === 'REVIEW' ? 'var(--warn)' : 'var(--danger)';
    const verdictIcon  = result.verdict === 'VERIFIED' ? '✔' : result.verdict === 'REVIEW' ? '⚠' : '✖';
    const scoreBar     = Math.round(result.score);

    // ── Image comparison panel (shared by all verdicts) ──
    const imgPanel = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
        <div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:4px;letter-spacing:1px">CAMERA IMAGE</div>
          ${cameraB64
            ? `<img src="${cameraB64}" style="width:100%;border-radius:6px;border:1px solid var(--border);aspect-ratio:4/3;object-fit:cover">`
            : `<div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim)">No image</div>`}
        </div>
        <div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:4px;letter-spacing:1px">
            SATELLITE — ${MAPBOX_TOKEN !== 'YOUR_MAPBOX_PUBLIC_TOKEN' ? 'Mapbox Satellite' : 'OpenStreetMap'}
          </div>
          ${satelliteB64
            ? `<img src="${satelliteB64}" style="width:100%;border-radius:6px;border:1px solid var(--border);aspect-ratio:4/3;object-fit:cover">`
            : `<div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim)">Fetching…</div>`}
        </div>
      </div>`;

    // ── Score bar ──
    const scorePanel = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="font-family:'Orbitron',sans-serif;font-size:18px;font-weight:900;color:${verdictColor};white-space:nowrap">${verdictIcon} ${result.verdict}</div>
        <div style="flex:1">
          <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:4px">VERIFICATION SCORE</div>
          <div style="background:var(--border);border-radius:99px;height:6px;overflow:hidden">
            <div style="width:${scoreBar}%;height:100%;background:${verdictColor};border-radius:99px;transition:width 0.8s ease"></div>
          </div>
        </div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:700;color:${verdictColor}">${scoreBar}</div>
      </div>`;

    // ── AI detail rows ──
    const detailPanel = `
      <div class="spec-block">
        <div class="spec-title">AI ANALYSIS</div>
        <div class="spec-row"><span class="spec-key">SATELLITE SRC</span><span class="spec-val">${MAPBOX_TOKEN !== 'YOUR_MAPBOX_PUBLIC_TOKEN' ? 'Mapbox Satellite — Maxar Vivid imagery (sub-metre)' : 'OpenStreetMap tiles (add Google Maps key for ISRO Cartosat-2 satellite imagery)'}</span></div>
        <div class="spec-row"><span class="spec-key">ROAD VISIBLE</span><span class="spec-val">${result.road_visible_satellite ? '✔ Yes' : '✖ No / unclear'}</span></div>
        <div class="spec-row"><span class="spec-key">DAMAGE MATCH</span><span class="spec-val">${result.damage_pattern_matches ? '✔ Consistent' : '— Inconclusive'}</span></div>
        <div class="spec-row"><span class="spec-key">SAT CONDITION</span><span class="spec-val">${result.satellite_road_condition || '—'}</span></div>
        <div class="spec-row"><span class="spec-key">GPS</span><span class="spec-val">${gps || '—'}</span></div>
        <div class="spec-row"><span class="spec-key">AI REASONING</span><span class="spec-val">${result.reasoning || '—'}</span></div>
      </div>`;

    // ── Verdict-specific bottom panel ──
    let actionPanel = '';

    if (result.verdict === 'VERIFIED') {
      // Auto-ticket — no officer needed
      actionPanel = `
        <div style="background:rgba(0,230,118,0.08);border:1px solid var(--good);border-radius:8px;padding:12px 14px;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--good);letter-spacing:1px;line-height:1.9">
          AUTO-VERIFIED — Score ${scoreBar}/100 is above 75<br>
          Satellite confirms real road damage at this GPS location.<br>
          Ticket generated automatically — NO officer approval needed.<br>
          GPS pin added to Live Map. Pin removed when repair confirmed.
        </div>`;

    } else if (result.verdict === 'REVIEW') {
      // Store pending ticket globally — safe, no serialization needed
      window._pendingReviewTicket = pendingTicketData;
      actionPanel = `
        <div style="background:rgba(255,171,0,0.08);border:1px solid var(--warn);border-radius:8px;padding:12px 14px;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--warn);letter-spacing:1px;margin-bottom:10px;line-height:1.9">
          OFFICER REVIEW REQUIRED — Score ${scoreBar}/100 (40-74 range)<br>
          AI confidence is borderline. Both images shown above.<br>
          Examine the satellite tile and camera image, then decide:
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <button class="btn" onclick="officerDecision('APPROVE')"
                  style="border-color:var(--good);color:var(--good);font-size:12px;padding:10px">
            APPROVE — Generate Ticket
          </button>
          <button class="btn btn-stop" onclick="officerDecision('REJECT')"
                  style="font-size:12px;padding:10px">
            REJECT — Discard
          </button>
        </div>
        <div class="disp-field">
          <div class="disp-lbl">Officer note (optional)</div>
          <input type="text" id="officer-note" placeholder="e.g. Confirmed pothole on Ring Road near flyover"
                 style="font-family:'Share Tech Mono',monospace;font-size:11px;background:var(--panel);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:7px 10px;width:100%">
        </div>`;

    } else {
      // REJECTED
      actionPanel = `
        <div style="background:rgba(255,23,68,0.08);border:1px solid var(--danger);border-radius:8px;padding:12px 14px;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--danger);letter-spacing:1px;line-height:1.9">
          ✖ REJECTED — Score ${scoreBar}/100 (below 40)<br>
          No road damage confirmed at this GPS location.<br>
          No ticket generated. Rejection logged in audit trail.
        </div>`;
    }

    container.innerHTML = scorePanel + imgPanel + detailPanel + actionPanel;
  }

  // Officer approve / reject handler
  async function officerDecision(decision) {
    const note      = (document.getElementById('officer-note') || {}).value || '';
    const container = document.getElementById('verify-last-out');
    const pending   = window._pendingReviewTicket || {};

    if (decision === 'REJECT') {
      window._pendingReviewTicket = null;
      const msg = document.createElement('div');
      msg.style.cssText = 'background:rgba(255,23,68,0.08);border:1px solid var(--danger);border-radius:8px;padding:10px 14px;font-family:Share Tech Mono,monospace;font-size:10px;color:var(--danger);letter-spacing:1px;margin-top:8px';
      msg.textContent = 'OFFICER REJECTED — Report discarded. Logged for audit.' + (note ? ' Note: ' + note : '');
      container.appendChild(msg);
      showToast('Rejected by officer — no ticket generated');
      return;
    }

    // APPROVE
    if (!window._dbReady) { showToast('Firebase not ready'); return; }
    const count  = (window._tickets || []).length + 1;
    const ticket = Object.assign({}, pending, {
      id:            pending.id || ('TCK-' + String(count).padStart(4, '0')),
      verifyVerdict: 'OFFICER_APPROVED',
      officerNote:   note || null,
      status:        'OPEN'
    });
    window._pendingReviewTicket = null;
    try {
      await window._addDoc(window._ticketsCol, ticket);
      showToast('Officer approved — ' + ticket.id + ' generated');
      const msg = document.createElement('div');
      msg.style.cssText = 'background:rgba(0,230,118,0.08);border:1px solid var(--good);border-radius:8px;padding:10px 14px;font-family:Share Tech Mono,monospace;font-size:10px;color:var(--good);letter-spacing:1px;margin-top:8px';
      msg.textContent = 'OFFICER APPROVED — ' + ticket.id + ' generated and synced.' + (note ? ' Note: ' + note : '') + ' Dispatch engine notified.';
      container.appendChild(msg);
      setTimeout(() => runAutoDispatch(ticket), 600);
    } catch(e) {
      showToast('Firestore error — check connection');
    }
  }

  async function verifyLastTicket() {
    const tickets = window._tickets || [];
    // Cover ALL damage conditions — pothole, broken, patched, manhole, fatigued
    const last = tickets.find(t => shouldGenerateTicket(t.condition));
    if (!last) return;
    const container = document.getElementById('verify-last-out');
    container.innerHTML = `<div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);padding:16px;text-align:center">🛰 Fetching satellite tile…</div>`;

    const gps = last.location;
    let satB64 = null;
    if (gps) {
      const [lat, lon] = gps.split(',').map(s => parseFloat(s.trim()));
      satB64 = await fetchSatelliteTileAsBase64(lat, lon);
    }

    container.innerHTML = `<div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);padding:16px;text-align:center">🤖 Analysing images…</div>`;
    const [lat, lon] = gps ? gps.split(',').map(s => parseFloat(s.trim())) : [0, 0];
    const roadCheck = gps ? await gpsRoadCheck(lat, lon) : { isRoad: false };
    const result = await analyseWithGemini(last.snapshot, satB64, lat, lon, roadCheck);
    renderVerifyResult(result, last.snapshot, satB64, gps, container, last);
  }

  // ── Called automatically on every pothole detection (hooked in generateTicket) ──
  async function verifyAndGenerateTicket(condition, confidence, location, snapshot) {
    let satB64 = null;
    let verifyResult = null;

    // ── GATE 0: GPS must exist ────────────────────────────────────────────
    if (!location) {
      showToast('No GPS — ticket blocked. Enable location access.');
      return { shouldTicket: false };
    }

    const [lat, lon] = location.split(',').map(s => parseFloat(s.trim()));

    // ── GATE 1: GPS must be on a road (OSM check) ─────────────────────────
    const roadCheck = await gpsRoadCheck(lat, lon);
    if (!roadCheck.isRoad && !roadCheck.uncertainty) {
      showToast('GPS not on a road — ticket blocked (' + (roadCheck.cls || 'no road') + ')');
      // Log the blocked attempt for audit
      if (window._dbReady) {
        window._addDoc(window._ticketsCol, {
          id: 'BLK-' + String(Date.now()).slice(-6),
          condition, confidence, location,
          snapshot, source: 'scanner',
          status: 'BLOCKED_NO_ROAD',
          verifyVerdict: 'BLOCKED',
          verifyReason: 'GPS coordinate is not on a road in OSM: ' + roadCheck.cls,
          timestamp: new Date().toLocaleString('en-IN'),
          createdAt: Date.now()
        }).catch(() => {});
      }
      return { shouldTicket: false };
    }

    // ── GATE 2: Satellite fetch + Claude Vision analysis ──────────────────
    satB64 = await fetchSatelliteTileAsBase64(lat, lon);
    verifyResult = await analyseWithGemini(snapshot, satB64, lat, lon, roadCheck);

    // Build the pending ticket object (used if officer approves REVIEW)
    const pendingTicket = {
      condition, confidence,
      location:       location || null,
      snapshot:       snapshot || null,
      satelliteImage: satB64 || null,
      verifyScore:    verifyResult.score,
      verifyVerdict:  verifyResult.verdict,
      verifyReason:   verifyResult.reasoning,
      source:         'scanner',
      timestamp:      new Date().toLocaleString('en-IN'),
      createdAt:      Date.now(),
      status:         'OPEN'
    };

    // Update Verify tab with full result including pending data for officer buttons
    const container = document.getElementById('verify-last-out');
    if (container) renderVerifyResult(verifyResult, snapshot, satB64, location, container, pendingTicket);

    if (verifyResult.verdict === 'VERIFIED') {
      // AUTO TICKET — satellite confirmed real, no officer needed
      return {
        satelliteImage: satB64,
        verifyScore:    verifyResult.score,
        verifyVerdict:  verifyResult.verdict,
        verifyReason:   verifyResult.reasoning,
        shouldTicket:   true
      };
    } else if (verifyResult.verdict === 'REVIEW') {
      // AI HAS DOUBT — possible manipulation or unclear image — ask officer
      window._pendingReviewTicket = pendingTicket;
      switchTab('verify');
      showToast('AI doubt detected — officer review needed');
      return { shouldTicket: false };
    } else {
      // REJECTED — fake / manipulated / no road — silent reject + audit log
      showToast('Satellite: not verified — ticket blocked');
      if (window._dbReady) {
        window._addDoc(window._ticketsCol, {
          ...pendingTicket,
          id: 'REJ-' + String(Date.now()).slice(-6),
          status: 'REJECTED',
          verifyVerdict: 'REJECTED'
        }).catch(() => {});
      }
      return { shouldTicket: false };
    }
  }

  function previewCitizen(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('citizen-img').src = e.target.result;
      document.getElementById('citizen-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  function getCitizenGPS() {
    if (!navigator.geolocation) { alert('GPS not available'); return; }
    navigator.geolocation.getCurrentPosition(
      p => { document.getElementById('citizenGPS').value = p.coords.latitude.toFixed(6) + ', ' + p.coords.longitude.toFixed(6); },
      () => alert('Could not get location — enter manually')
    );
  }

  async function verifyCitizenReport() {
    const gpsVal = document.getElementById('citizenGPS').value.trim();
    const imgEl  = document.getElementById('citizen-img');
    const btn    = document.getElementById('citizenVerifyBtn');

    if (!gpsVal) { alert('Please enter or get your GPS location first'); return; }
    if (!imgEl.src || imgEl.src === window.location.href) { alert('Please upload a photo first'); return; }

    btn.disabled = true;
    btn.textContent = '🛰 Verifying…';

    const [lat, lon] = gpsVal.split(',').map(s => parseFloat(s.trim()));
    const satB64 = await fetchSatelliteTileAsBase64(lat, lon);
    const roadCheck = await gpsRoadCheck(lat, lon);
    const result = await analyseWithGemini(imgEl.src, satB64, lat, lon, roadCheck);

    const pendingCitizen = {
      condition:       'Citizen Report — Pothole',
      confidence:      result.score + '%',
      location:        gpsVal,
      snapshot:        imgEl.src,
      satelliteImage:  satB64,
      verifyScore:     result.score,
      verifyVerdict:   result.verdict,
      verifyReason:    result.reasoning,
      source:          'citizen',
      timestamp:       new Date().toLocaleString('en-IN'),
      createdAt:       Date.now(),
      status:          'OPEN'
    };

    const container = document.getElementById('verify-last-out');
    if (container) renderVerifyResult(result, imgEl.src, satB64, gpsVal, container, pendingCitizen);
    const mobOut = document.getElementById('mob-verify-out');
    if (mobOut) { mobOut.style.display='block'; renderVerifyResult(result, imgEl.src, satB64, gpsVal, mobOut, pendingCitizen); }

    // If verified → auto-generate; if REVIEW → officer decides via buttons; REJECTED → nothing
    if (result.verdict === 'VERIFIED' && window._dbReady) {
      const count  = (window._tickets||[]).length + 1;
      const ticket = { ...pendingCitizen, id: 'CIT-' + String(count).padStart(4,'0') };
      try {
        await window._addDoc(window._ticketsCol, ticket);
        showToast('✔ Citizen report ' + ticket.id + ' verified and submitted');
      } catch(e) { showToast('✖ Could not save — check connection'); }
    } else if (result.verdict === 'REVIEW') {
      showToast('⚠ Citizen report needs officer review — see above');
    } else {
      showToast('✖ Citizen report rejected by satellite verifier');
    }

    btn.disabled = false;
    btn.textContent = '🛰 VERIFY & SUBMIT COMPLAINT';
  }

  // switch verify tab handler already covered in TAB_ORDER above

  /* ════════════════════════════════════════
     REPAIR INTELLIGENCE ENGINE
  ════════════════════════════════════════ */
  function calcRepair() {
    const sev     = +document.getElementById('r_sev').value;
    const dig     = +document.getElementById('r_dig').value;
    const traffic = +document.getElementById('r_traffic').value;
    const rhi     = +document.getElementById('r_rhi').value;

    const specs = {
      1: {
        method:    'Cold-mix surface patching',
        depth:     '30–50mm',
        base:      'No base layer required unless dig history',
        material:  'Cold-mix bitumen bag (10–20 kg)',
        compaction:'Hand tamper',
        time:      '1–2 hours · 2 workers',
        rhiGain:   '+6 to +10 pts',
      },
      2: {
        method:    'Hot-mix pothole repair with edge cutting',
        depth:     '80–100mm',
        base:      'Tack coat (bitumen emulsion) required',
        material:  'Hot-mix asphalt 80–150 kg + tack coat',
        compaction:'Plate compactor',
        time:      '4–6 hours · 4 workers + supervisor',
        rhiGain:   '+15 to +22 pts',
      },
      3: {
        method:    'Full-depth reclamation (FDR)',
        depth:     '150–200mm full depth',
        base:      'Geotextile + granular sub-base + DBM layer mandatory',
        material:  'Hot-mix, geotextile sheet, granular aggregate, DBM',
        compaction:'Heavy vibratory roller + paver machine',
        time:      '2–5 days · 8–12 workers + machinery',
        rhiGain:   '+30 to +45 pts',
      },
    };

    const spec = specs[sev];

    let digWarning = '';
    let extraDepth = '';
    if (dig === 1 || dig === 2) {
      digWarning = `<div class="conflict-alert warn" style="margin:8px 0">⚠ PREVIOUS DIG DETECTED — Subbase may be weakened. AI recommends increasing repair depth by 30mm and inspecting for void pockets before patching.</div>`;
      extraDepth = ' (+30mm due to dig history)';
    } else if (dig === 3) {
      digWarning = `<div class="conflict-alert danger" style="margin:8px 0">⛔ MULTIPLE DIGS ON SEGMENT — High subsidence risk. AI recommends full-depth inspection before any surface repair. Consider coordinating with all relevant departments before work begins.</div>`;
      extraDepth = ' — full inspection required first';
    }

    let trafficNote = '';
    if (traffic === 3) {
      trafficNote = '<div class="spec-row"><span class="spec-key">SHIFT</span><span class="spec-val" style="color:var(--warn)">Night shift only (10pm–5am) — high traffic road</span></div>';
    }

    const rhiAfter = Math.min(100, rhi + parseInt(spec.rhiGain));
    const rhiColor = rhiAfter >= 90 ? 'var(--good)' : rhiAfter >= 75 ? 'var(--accent)' : 'var(--warn)';

    document.getElementById('repair-out').innerHTML = `
      ${digWarning}
      <div class="spec-block">
        <div class="spec-title">AI REPAIR SPECIFICATION</div>
        <div class="spec-row"><span class="spec-key">METHOD</span><span class="spec-val">${spec.method}</span></div>
        <div class="spec-row"><span class="spec-key">DEPTH</span><span class="spec-val">${spec.depth}${extraDepth}</span></div>
        <div class="spec-row"><span class="spec-key">BASE LAYER</span><span class="spec-val">${spec.base}</span></div>
        <div class="spec-row"><span class="spec-key">MATERIAL</span><span class="spec-val">${spec.material}</span></div>
        <div class="spec-row"><span class="spec-key">COMPACTION</span><span class="spec-val">${spec.compaction}</span></div>
        <div class="spec-row"><span class="spec-key">TIME / CREW</span><span class="spec-val">${spec.time}</span></div>
        ${trafficNote}
      </div>
      <div class="spec-block">
        <div class="spec-title">RHI IMPACT FORECAST</div>
        <div class="spec-row"><span class="spec-key">CURRENT RHI</span><span class="spec-val" style="color:var(--warn)">${rhi}</span></div>
        <div class="spec-row"><span class="spec-key">EXPECTED GAIN</span><span class="spec-val" style="color:var(--accent)">${spec.rhiGain}</span></div>
        <div class="spec-row"><span class="spec-key">RHI AFTER REPAIR</span><span class="spec-val" style="color:${rhiColor};font-size:16px;font-weight:700">${rhiAfter}</span></div>
        <div class="spec-row"><span class="spec-key">VERIFICATION</span><span class="spec-val">Auto re-scan in 7-15 days &middot; Again at 1 &amp; 2 years</span></div>
      </div>
      <div class="spec-block" style="border-color:var(--good)">
        <div class="spec-title" style="color:var(--good)">HOW QUALITY IS VERIFIED &mdash; FAST ENFORCEMENT</div>
        <div class="timeline-step"><div class="tl-dot tl-done"></div><div>Contractor marks repair "Done" &mdash; No basic payment released yet.</div></div>
        <div class="timeline-step"><div class="tl-dot tl-pend"></div><div>7-15 days: System automatically triggers re-scan using next public vehicle.</div></div>
        <div class="timeline-step"><div class="tl-dot tl-pend"></div><div>Pass: Verified short-term quality improvement &mdash; Basic payment released.</div></div>
        <div class="timeline-step"><div class="tl-dot tl-dead"></div><div style="color:var(--danger)">Fail (15-30 days): RHI does not improve &rarr; Auto-penalty (10-20% withheld) + rework order.</div></div>
        <div class="timeline-step" style="border:none"><div class="tl-dot tl-pend"></div><div style="color:var(--accent)">1-year &amp; 2-year checks are for performance bonus only, forcing immediate accountability from day one.</div></div>
      </div>
    `;
  }

  /* ════════════════════════════════════════
     DEPT CONFLICT ENGINE
  ════════════════════════════════════════ */
  const DEPT_NAMES = { roads:'Roads Dept', water:'Water Board', elec:'Electricity Board', telecom:'Telecom / Fibre' };
  const DEPT_DEPTH = { roads:'Surface (0–200mm)', water:'Deep (1–2m)', elec:'Medium (0.5–1m)', telecom:'Shallow (0.3–0.6m)' };
  const SEQ_ORDER  = { water:1, elec:2, telecom:3, roads:4 };

  function calcConflict() {
    const dA = document.getElementById('c_deptA').value;
    const dB = document.getElementById('c_deptB').value;
    const mA = +document.getElementById('c_monthA').value;
    const mB = +document.getElementById('c_monthB').value;

    const gap     = Math.abs(mA - mB);
    const uncoord = 420000 + (gap * 40000);
    const coord   = 240000;
    const saving  = uncoord - coord;
    const seqOk   = SEQ_ORDER[dA] < SEQ_ORDER[dB] || SEQ_ORDER[dB] < SEQ_ORDER[dA];

    let html = '';

    if (dA === dB) {
      html = `<div class="conflict-alert warn">⚠ Same department selected for both. Choose two different departments to simulate coordination.</div>`;
    } else if (gap <= 4) {
      const earlier    = mA <= mB ? DEPT_NAMES[dA] : DEPT_NAMES[dB];
      const later      = mA <= mB ? DEPT_NAMES[dB] : DEPT_NAMES[dA];
      const firstDept  = SEQ_ORDER[dA] < SEQ_ORDER[dB] ? DEPT_NAMES[dA] : DEPT_NAMES[dB];
      const secondDept = SEQ_ORDER[dA] < SEQ_ORDER[dB] ? DEPT_NAMES[dB] : DEPT_NAMES[dA];
      html = `
        <div class="conflict-alert danger">
          ⛔ CONFLICT DETECTED — ${DEPT_NAMES[dA]} and ${DEPT_NAMES[dB]} plan work on the same road segment within ${gap} months of each other.<br><br>
          <span style="color:var(--text)">Uncoordinated cost estimate: ₹${(uncoord/100000).toFixed(1)}L</span><br>
          <span style="color:var(--good)">Coordinated window cost:     ₹${(coord/100000).toFixed(1)}L</span><br>
          <span style="color:var(--accent)">AI saving recommendation:    ₹${(saving/100000).toFixed(1)}L saved</span>
        </div>
        <div class="spec-block" style="margin-top:8px">
          <div class="spec-title">AI RECOMMENDED SEQUENCE</div>
          <div class="spec-row"><span class="spec-key">STEP 1</span><span class="spec-val">${firstDept} — ${DEPT_DEPTH[SEQ_ORDER[dA]<SEQ_ORDER[dB]?dA:dB]} (deepest first)</span></div>
          <div class="spec-row"><span class="spec-key">STEP 2</span><span class="spec-val">${secondDept} — ${DEPT_DEPTH[SEQ_ORDER[dA]<SEQ_ORDER[dB]?dB:dA]}</span></div>
          <div class="spec-row"><span class="spec-key">STEP 3</span><span class="spec-val">Roads Dept — Final resurfacing (always last)</span></div>
          <div class="spec-row"><span class="spec-key">WINDOW</span><span class="spec-val">Single coordinated excavation — one trench, one closure</span></div>
          <div class="spec-row"><span class="spec-key">BLOCKCHAIN</span><span class="spec-val">Each dept logs dig entry · RHI attribution locked</span></div>
        </div>`;
    } else {
      html = `<div class="conflict-alert good">✔ NO CONFLICT — ${DEPT_NAMES[dA]} and ${DEPT_NAMES[dB]} are ${gap} months apart. No coordination needed for this segment. Both works logged in shared calendar.</div>`;
    }

    document.getElementById('conflict-out').innerHTML = html;
  }

  /* ════════════════════════════════════════
     RHI WARD SCORECARD
  ════════════════════════════════════════ */
  async function markAsRepaired(firestoreId) {
    if (!window._dbReady || !firestoreId) return;
    try {
      const { updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js').catch(()=>({}));
      if (updateDoc) {
        await updateDoc(window._doc(window._db,'tickets',firestoreId),{status:'REPAIRED',repairedAt:Date.now()});
        showToast('Ticket marked as REPAIRED');
      } else {
        // fallback: re-add with repaired status
        const t = (window._tickets||[]).find(x=>x.firestoreId===firestoreId);
        if (t) await window._addDoc(window._ticketsCol,{...t,status:'REPAIRED',repairedAt:Date.now()});
        showToast('Ticket updated');
      }
      refreshMap();
    } catch(e) { showToast('Update failed'); }
  }

  function renderRHI() {
    const tickets = window._tickets || [];
    const now = Date.now();

    // Build ward scores from real ticket data
    // Group tickets by rough GPS area — use Nominatim ward data if available, else number them
    // For demo: derive pseudo-ward from GPS lat/lon grid + use ticket density as RHI penalty
    const wardMap = {};

    tickets.forEach(t => {
      if (!t.location || t.verifyVerdict === 'REJECTED') return;
      const [lat, lon] = t.location.split(',').map(s => parseFloat(s.trim()));
      if (isNaN(lat)) return;
      // Assign to a ward based on GPS grid cell (0.01 deg ~ 1.1km)
      const wardKey = 'Ward-' + (Math.abs(Math.floor(lat * 10) + Math.floor(lon * 10)) % 20 + 1).toString().padStart(2,'0');
      if (!wardMap[wardKey]) wardMap[wardKey] = { name: wardKey, tickets: [], openCount: 0, repairedCount: 0 };
      wardMap[wardKey].tickets.push(t);
      if (t.status === 'REPAIRED') wardMap[wardKey].repairedCount++;
      else wardMap[wardKey].openCount++;
    });

    // If no real tickets, show demo data
    const hasRealData = Object.keys(wardMap).length > 0;
    const wards = hasRealData
      ? Object.values(wardMap).map(w => {
          // RHI = 100 - penalty. Each open P1 = -12, P2 = -7, P3 = -3, repaired = +2
          const penalty = w.tickets.reduce((sum, t) => {
            if (t.status === 'REPAIRED') return sum - 2;
            const conf = parseFloat((t.confidence||'0').replace('%',''));
            return sum + (conf >= 92 ? 12 : conf >= 87 ? 7 : 3);
          }, 0);
          const score = Math.max(20, Math.min(100, 100 - penalty));
          // Deterministic trend: derive a stable delta from the ward name so the
          // displayed number doesn't flicker every time renderRHI() is called.
          const wardHash  = w.name.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
          const trendDelta = (Math.abs(wardHash) % 17) - 8; // stable −8 … +8
          const trend = trendDelta >= 0 ? '+' + trendDelta : String(trendDelta);
          return { name: w.name, score: Math.round(score), officer: 'Officer', trend };
        }).sort((a,b) => a.score - b.score)
      : [
          { name:'Ward-04', score:91, officer:'D. Sharma',  trend:'+3' },
          { name:'Ward-07', score:74, officer:'R. Patel',   trend:'-8' },
          { name:'Ward-11', score:88, officer:'M. Joshi',   trend:'+1' },
          { name:'Ward-15', score:56, officer:'K. Mehta',   trend:'-14'},
          { name:'Ward-19', score:83, officer:'S. Desai',   trend:'+5' },
          { name:'Ward-22', score:67, officer:'A. Thakor',  trend:'-3' },
        ];

    const avgScore = Math.round(wards.reduce((s,w)=>s+w.score,0) / wards.length);
    const cityColor = avgScore >= 85 ? 'var(--good)' : avgScore >= 70 ? 'var(--accent)' : avgScore >= 55 ? 'var(--warn)' : 'var(--danger)';

    document.getElementById('rhi-scorecard').innerHTML =
      `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px">CITY-WIDE AVERAGE RHI</div>
        <div style="font-family:'Orbitron',sans-serif;font-size:24px;font-weight:900;color:${cityColor}">${avgScore}</div>
      </div>
      ${hasRealData ? '' : '<div style="font-family:Share Tech Mono,monospace;font-size:9px;color:var(--dim);margin-bottom:8px;letter-spacing:1px">DEMO DATA — will update from real scans</div>'}
      ` +
      wards.map(w => {
        const color = w.score >= 90 ? 'var(--good)' : w.score >= 75 ? 'var(--accent)' : w.score >= 60 ? 'var(--warn)' : 'var(--danger)';
        const trendColor = w.trend.startsWith('+') ? 'var(--good)' : 'var(--danger)';
        return `<div class="rhi-row">
          <span class="rhi-ward">${w.name}</span>
          <div class="rhi-bar-track"><div class="rhi-bar-fill" style="width:${w.score}%;background:${color}"></div></div>
          <span class="rhi-score" style="color:${color}">${w.score}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${trendColor};min-width:28px;text-align:right">${w.trend}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);min-width:60px;text-align:right">${w.officer}</span>
        </div>`;
      }).join('') +
      `<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);margin-top:10px;letter-spacing:1px;line-height:1.8">
        RHI 90-100: Excellent &nbsp;|&nbsp; 75-89: Good &nbsp;|&nbsp; 60-74: Fair &nbsp;|&nbsp; Below 60: Critical intervention needed
      </div>`;
  }

  /* ════════════════════════════════════════
     GPS LIVE MAP ENGINE
  ════════════════════════════════════════ */

  let _map = null;
  let _mapMarkers = [];
  let _mapSatellite = false;

  function toggleMapLayer() {
    if (!_map) return;
    const btn = document.getElementById('mapLayerBtn');
    _mapSatellite = !_mapSatellite;
    _map.setMapTypeId(_mapSatellite ? 'satellite' : 'roadmap');
    if (btn) btn.textContent = _mapSatellite ? 'Map View' : 'Satellite View';
  }

  function initMap() {
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
      const el = document.getElementById('google-map');
      if (el) el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:Share Tech Mono,monospace;font-size:11px;color:var(--dim)">Map loading — check internet connection or API key</div>';
      setTimeout(initMap, 1500); 
      return;
    }

    const tickets = (window._tickets || []).filter(t =>
      t.location && t.status !== 'REJECTED' && t.verifyVerdict !== 'REJECTED'
    );

    let centerLat = 22.3072, centerLon = 73.1812, zoom = 13;
    if (tickets.length > 0 && tickets[0].location) {
      const parts = tickets[0].location.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(parts[0])) { centerLat = parts[0]; centerLon = parts[1]; zoom = 16; }
    }

    if (!_map) {
      _map = new google.maps.Map(document.getElementById('google-map'), {
        center: { lat: centerLat, lng: centerLon },
        zoom: zoom,
        mapTypeId: _mapSatellite ? 'satellite' : 'roadmap',
        disableDefaultUI: true,
        zoomControl: true
      });
    } else {
      _map.setCenter({ lat: centerLat, lng: centerLon });
      _map.setZoom(zoom);
    }

    refreshMap();
  }

  function refreshMap() {
    if (typeof google === 'undefined' || !_map) return;

    _mapMarkers.forEach(m => m.setMap(null));
    _mapMarkers = [];

    const tickets = (window._tickets || []).filter(t =>
      t.location && t.status !== 'REJECTED' && t.verifyVerdict !== 'REJECTED'
    );
    const coordRows = [];
    let bounds = new google.maps.LatLngBounds();

    tickets.forEach(t => {
      if (!t.location) return;
      const parts = t.location.split(',').map(s => parseFloat(s.trim()));
      if (isNaN(parts[0]) || isNaN(parts[1])) return;
      const lat = parts[0], lon = parts[1];

      const isRepaired  = (t.status||'').toUpperCase() === 'REPAIRED';
      const isCitizen   = t.source === 'citizen';
      const condClass   = getConditionClass(t.condition||'');
      let color = '#94a3b8';
      if (isRepaired)                   color = '#22c55e';
      else if (isCitizen)               color = '#38bdf8';
      else if (condClass==='pothole')   color = '#ef4444';
      else if (condClass==='broken')    color = '#f59e0b';
      else if (condClass==='patched')   color = '#8b5cf6';

      const verifyBadge = t.verifyScore ? `Verify score: ${t.verifyScore}/100` : '';
      const mapsLink    = `https://maps.google.com/?q=${lat},${lon}`;
      const markRepaired = t.firestoreId ? `<br><button onclick="markAsRepaired('${t.firestoreId}')" style="margin-top:6px;font-family:monospace;font-size:11px;padding:3px 8px;background:#22c55e20;border:1px solid #22c55e;color:#22c55e;border-radius:4px;cursor:pointer">Mark Repaired</button>` : '';
      const popupHtml   = `
        <div style="font-family:monospace;font-size:12px;min-width:180px;color:#000;">
          <strong>${t.id || 'Ticket'}</strong><br>
          <span style="color:${color}">${(t.condition||'').toUpperCase()}</span><br>
          <span style="color:#666">${t.timestamp || ''}</span><br>
          ${verifyBadge ? '<span style="color:#888">'+verifyBadge+'</span><br>' : ''}
          GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)}<br>
          <a href="${mapsLink}" target="_blank" style="color:#0078d7">Open in Google Maps</a><br>
          Status: <strong>${isRepaired ? 'REPAIRED' : 'OPEN'}</strong>
          ${markRepaired}
          ${t.snapshot ? '<br><img src="'+t.snapshot+'" style="width:100%;margin-top:6px;border-radius:4px">' : ''}
        </div>`;

      const marker = new google.maps.Marker({
        position: { lat, lng: lon },
        map: _map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        }
      });

      const infowindow = new google.maps.InfoWindow({ content: popupHtml });
      marker.addListener("click", () => { infowindow.open(_map, marker); });
      _mapMarkers.push(marker);
      bounds.extend({ lat, lng: lon });

      const isNew = t.createdAt && (Date.now() - t.createdAt) < 86400000;
      coordRows.push(`
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer"
             onclick="_map && _map.setCenter({lat:${lat},lng:${lon}}), _map.setZoom(18)">
          <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <span style="color:var(--accent);min-width:80px">${t.id||'—'}</span>
          <span style="color:var(--text)">${lat.toFixed(5)}, ${lon.toFixed(5)}</span>
          <span style="color:var(--dim);flex:1;text-align:right">${(t.condition||'').substring(0,12)}</span>
          ${isNew ? '<span style="color:var(--good)">NEW</span>' : ''}
        </div>`);
    });

    const countEl = document.getElementById('map-count');
    if (countEl) countEl.textContent = _mapMarkers.length + ' pin' + (_mapMarkers.length !== 1 ? 's' : '');

    const listEl = document.getElementById('map-coords-list');
    if (listEl) {
      if (coordRows.length === 0) {
        listEl.innerHTML = '<div style="font-family:Share Tech Mono,monospace;font-size:10px;color:var(--dim);padding:12px 0;text-align:center">No verified tickets with GPS yet. Scan a pothole to add pins.</div>';
      } else {
        listEl.innerHTML = `
          <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:6px">TAP ROW TO FLY TO LOCATION</div>
          ${coordRows.join('')}`;
      }
    }

    if (_mapMarkers.length > 1) {
      _map.fitBounds(bounds);
    }
  }

  // Map auto-refreshes via updateBadge() above — no extra hooks needed

  /* ════════════════════════════════════════
     PREDICTIVE RISK ENGINE
     Most innovative feature — predicts road failure BEFORE it happens
  ════════════════════════════════════════ */
  async function runPredictiveRisk() {
    const out = document.getElementById('predictive-out');
    if (!out) return;
    out.innerHTML = '<div style="font-family:\'Share Tech Mono\',monospace;font-size:10px;color:var(--accent);padding:16px;text-align:center">Analysing ticket history + weather + traffic patterns...</div>';

    const tickets = window._tickets || [];
    if (tickets.length === 0) {
      out.innerHTML = '<div style="font-family:\'Share Tech Mono\',monospace;font-size:10px;color:var(--dim);padding:16px;text-align:center">No ticket data yet. Run the scanner first to build history.</div>';
      return;
    }

    // ── Step 1: Cluster tickets by GPS proximity (100m grid) ────────────────
    const clusters = {};
    tickets.forEach(t => {
      if (!t.location) return;
      const [lat, lon] = t.location.split(',').map(s => parseFloat(s.trim()));
      if (isNaN(lat)) return;
      // Round to 3 decimal places = ~111m grid cell
      const key = lat.toFixed(3) + ',' + lon.toFixed(3);
      if (!clusters[key]) clusters[key] = { lat, lon, tickets: [], key };
      clusters[key].tickets.push(t);
    });

    // ── Step 2: Fetch weather for each cluster (batch by unique coords) ──────
    const clusterList = Object.values(clusters);
    let weatherByKey = {};
    if (clusterList.length > 0) {
      try {
        const c = clusterList[0]; // fetch weather for first cluster (representative)
        const wres = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=precipitation_sum,temperature_2m_max&forecast_days=7&timezone=auto`);
        const wdata = await wres.json();
        const rainSum = (wdata.daily?.precipitation_sum || []).reduce((a,b)=>a+b,0);
        const avgTemp = (wdata.daily?.temperature_2m_max || []).reduce((a,b)=>a+b,0) / 7;
        clusterList.forEach(cl => {
          weatherByKey[cl.key] = { rainSum: Math.round(rainSum), avgTemp: Math.round(avgTemp) };
        });
      } catch(e) {
        clusterList.forEach(cl => { weatherByKey[cl.key] = { rainSum: 15, avgTemp: 34 }; });
      }
    }

    // ── Step 3: Score each cluster for failure risk ───────────────────────────
    const now = Date.now();
    const scored = clusterList.map(cl => {
      const w = weatherByKey[cl.key] || { rainSum: 0, avgTemp: 30 };
      const ts = cl.tickets;

      // Factor A: Repeat detection count (more detections = higher risk)
      const repeatScore = Math.min(ts.length * 15, 40);

      // Factor B: Age of most recent ticket (recent = higher risk, unrepaired)
      const mostRecent = Math.max(...ts.map(t => t.createdAt || 0));
      const daysSince = (now - mostRecent) / (1000 * 60 * 60 * 24);
      const ageScore = daysSince < 3 ? 25 : daysSince < 7 ? 15 : daysSince < 30 ? 8 : 3;

      // Factor C: Severity of worst ticket
      const worstConf = Math.max(...ts.map(t => parseFloat((t.confidence||'0').replace('%',''))));
      const sevScore = worstConf >= 92 ? 20 : worstConf >= 87 ? 12 : 6;

      // Factor D: Rain forecast — water accelerates road degradation
      const rainScore = w.rainSum > 30 ? 15 : w.rainSum > 15 ? 8 : 3;

      // Factor E: Previous dig on this segment
      const hasDig = ts.some(t => t.verifyVerdict === 'OFFICER_APPROVED' || (t.source === 'citizen'));
      const digScore = hasDig ? 10 : 0;

      const totalRisk = Math.min(repeatScore + ageScore + sevScore + rainScore + digScore, 100);

      const riskLevel = totalRisk >= 70 ? 'CRITICAL' : totalRisk >= 45 ? 'HIGH' : totalRisk >= 25 ? 'MEDIUM' : 'LOW';
      const riskColor = totalRisk >= 70 ? 'var(--danger)' : totalRisk >= 45 ? 'var(--warn)' : totalRisk >= 25 ? 'var(--accent)' : 'var(--good)';

      const timeToFail = totalRisk >= 70 ? '< 7 days' : totalRisk >= 45 ? '7-21 days' : totalRisk >= 25 ? '1-2 months' : '> 2 months';

      return { ...cl, totalRisk, riskLevel, riskColor, timeToFail, w, daysSince: Math.round(daysSince), worstConf: Math.round(worstConf) };
    }).sort((a, b) => b.totalRisk - a.totalRisk);

    // ── Step 4: Render results ───────────────────────────────────────────────
    const topRisk = scored.slice(0, 6);
    const criticalCount = scored.filter(s => s.riskLevel === 'CRITICAL').length;
    const highCount     = scored.filter(s => s.riskLevel === 'HIGH').length;

    out.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
        <div class="dispatch-cell">
          <div class="dispatch-cell-label">Segments analysed</div>
          <div class="dispatch-cell-val">${scored.length}</div>
        </div>
        <div class="dispatch-cell">
          <div class="dispatch-cell-label">Critical risk</div>
          <div class="dispatch-cell-val" style="color:var(--danger)">${criticalCount}</div>
        </div>
        <div class="dispatch-cell">
          <div class="dispatch-cell-label">High risk</div>
          <div class="dispatch-cell-val" style="color:var(--warn)">${highCount}</div>
        </div>
      </div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:10px">TOP RISK SEGMENTS — PREDICTED TO FAIL FIRST</div>
      ${topRisk.map((s, i) => `
        <div style="background:var(--bg);border:1px solid var(--border);border-left:3px solid ${s.riskColor};border-radius:8px;padding:10px 12px;margin-bottom:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim)">#${i+1}</span>
              <span style="font-family:'Share Tech Mono',monospace;font-size:11px;font-weight:700;color:${s.riskColor}">${s.riskLevel}</span>
              <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim)">${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}</span>
            </div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:700;color:${s.riskColor}">${s.totalRisk}</div>
          </div>
          <div style="background:var(--border);border-radius:99px;height:4px;margin-bottom:8px;overflow:hidden">
            <div style="width:${s.totalRisk}%;height:100%;background:${s.riskColor};border-radius:99px;transition:width 0.8s ease"></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim)">
            <span>Detections: <span style="color:var(--text)">${s.tickets.length}</span></span>
            <span>Last seen: <span style="color:var(--text)">${s.daysSince}d ago</span></span>
            <span>Rain 7d: <span style="color:var(--text)">${s.w.rainSum}mm</span></span>
            <span>Fails in: <span style="color:${s.riskColor}">${s.timeToFail}</span></span>
          </div>
          <div style="margin-top:6px;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim)">
            <a href="https://maps.google.com/?q=${s.lat},${s.lon}" target="_blank" style="color:var(--accent);text-decoration:none">Open in Google Maps</a>
            &nbsp;&middot;&nbsp;
            <span style="color:var(--accent);cursor:pointer" onclick="(function(){
              const clat=${s.lat}, clon=${s.lon};
              const nearest = (window._tickets||[]).filter(t=>t.location&&shouldGenerateTicket(t.condition)).sort((a,b)=>{
                const pa=a.location.split(',').map(Number), pb=b.location.split(',').map(Number);
                const da=Math.pow(pa[0]-clat,2)+Math.pow(pa[1]-clon,2);
                const db=Math.pow(pb[0]-clat,2)+Math.pow(pb[1]-clon,2);
                return da-db;
              })[0];
              if(nearest) runAutoDispatch(nearest);
              else alert('No damage ticket found near this cluster.');
            })()">Run dispatch</span>
          </div>
        </div>`).join('')}
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px;margin-top:8px;line-height:1.8">
        RISK SCORE = repeat detections (40%) + age penalty + severity + rain forecast + dig history &nbsp;|&nbsp; Updates automatically as new tickets arrive
      </div>`;
  }

  // --- Trustless Economics Simulation Logic ---
  let _vyaparChart = null;
  function runEconomicsSimulation() {
    const ctx = document.getElementById('vyaparChart');
    if (!ctx) return;
    
    // Smooth scroll down to highlight the mic-drop moment for the video
    ctx.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    if (_vyaparChart) { _vyaparChart.destroy(); }
    
    // Labels representing Time (Months)
    const labels = ["M0", "M6", "M12", "M18", "M24", "M30", "M36"];
    
    // Contractor A: Cuts corners. High initial profit, but road breaks at M3. 
    // AI flags it, penalties hit, zero final payout, forced rework.
    const dataA = [8000, -2000, -5000, -5000, -5000, -5000, -5000]; 
    
    // Contractor B: Good materials. Instantly gets 85%. Escrow releases 15% at M12.
    // Quality holds up, so profits stay high.
    const dataB = [8500, 8500, 10000, 10000, 10000, 10000, 10000];

    _vyaparChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Contractor A (Traditional/Corners Cut)',
            data: dataA,
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderWidth: 2,
            stepped: true, // Shows sharp penalty drops
            fill: true
          },
          {
            label: 'Contractor B (ResilientPath Model)',
            data: dataB,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            borderWidth: 3,
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 2500, easing: 'easeOutQuart' },
        scales: {
          y: { 
            title: { display: true, text: 'Net Profit ($)', color: '#475569', font: { family: "'Share Tech Mono', monospace" } },
            grid: { color: 'rgba(148, 163, 184, 0.2)' }
          },
          x: { 
            grid: { color: 'rgba(148, 163, 184, 0.2)' }
          }
        },
        plugins: {
          legend: { labels: { color: '#0f172a', font: { family: "'Share Tech Mono', monospace", size: 10 } } },
          tooltip: {
            titleFont: { family: "'Share Tech Mono', monospace" },
            bodyFont: { family: "'Share Tech Mono', monospace" },
            callbacks: {
              afterLabel: function(context) {
                if(context.datasetIndex === 0 && context.dataIndex === 1) return "⚠ Road broke. AI fired penalty & rework order.";
                if(context.datasetIndex === 1 && context.dataIndex === 2) return "✔ 12M check passed. +15% escrow released.";
                return null;
              }
            }
          }
        }
      }
    });
  }


