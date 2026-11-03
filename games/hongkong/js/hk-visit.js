// Street visits: read a place, cross the harbour on the Star Ferry, or ride the Peak Tram.

function smooth(t) {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

function createHkVisit(controllerManager, visits, { mapOpen } = {}) {
  const prompt = document.getElementById('visit-prompt');
  const card = document.getElementById('visit-card');
  const titleEl = document.getElementById('visit-title');
  const textEl = document.getElementById('visit-text');
  const goBtn = document.getElementById('visit-go');
  const closeBtn = document.getElementById('visit-close');
  let nearest = null;
  let openId = '';
  let riding = null;

  function hideCard() {
    openId = '';
    if (card) card.hidden = true;
  }

  function showCard(site) {
    if (!card || !site) return;
    openId = site.id;
    if (titleEl) titleEl.textContent = site.title;
    if (textEl) textEl.textContent = site.text;
    if (goBtn) {
      goBtn.hidden = !site.action;
      goBtn.textContent = site.actionLabel || '';
    }
    card.hidden = false;
  }

  function siteById(id) {
    return visits.find((site) => site.id === id) || null;
  }

  function nearestSite() {
    const ent = controllerManager.getActiveEntity();
    if (!ent || controllerManager.activeMode === 'helicopter') return null;
    let best = null;
    let bestD = Infinity;
    for (const site of visits) {
      const d = Math.hypot(ent.position.x - site.x, ent.position.z - site.z);
      if (d < site.radius && d < bestD) {
        best = site;
        bestD = d;
      }
    }
    return best;
  }

  function startRide(site) {
    const dest = siteById(site.dest);
    if (!dest) return;
    const from = controllerManager.getActiveEntity();
    const ax = from.position.x;
    const az = from.position.z;
    const ay = from.position.y;
    const face = from.heading;
    hideCard();
    controllerManager.setMode('person');
    const ferry = site.action === 'ferry';
    controllerManager.placeScripted(ax, ferry ? 3.2 : ay, az, face);
    riding = {
      ferry,
      ax,
      az,
      ay: ferry ? 3.2 : ay,
      bx: dest.x,
      bz: dest.z,
      by: ferry ? 3.2 : (dest.y > 1 ? dest.y : 0.22),
      duration: ferry ? 16 : 22,
      bow: ferry ? 110 : 40,
      t: 0,
      px: ax,
      pz: az,
      dest
    };
    if (prompt) {
      prompt.hidden = false;
      prompt.textContent = ferry ? '天星小輪 · 維多利亞港' : '山頂纜車';
    }
  }

  function finishRide() {
    if (!riding) return;
    const dest = riding.dest;
    riding = null;
    controllerManager.setMode('person');
    controllerManager.teleportActiveTo(dest.x, dest.z, dest.heading);
    if (prompt) prompt.hidden = true;
  }

  function stepRide(dt) {
    riding.t += dt / riding.duration;
    const t = Math.min(1, riding.t);
    const s = smooth(t);
    const x = riding.ax + (riding.bx - riding.ax) * s;
    const z = riding.az + (riding.bz - riding.az) * s;
    const y = riding.ay + (riding.by - riding.ay) * s;
    const dx = riding.bx - riding.ax;
    const dz = riding.bz - riding.az;
    const len = Math.hypot(dx, dz) || 1;
    const bow = Math.sin(t * Math.PI) * riding.bow;
    const px = x + (dz / len) * bow;
    const pz = z - (dx / len) * bow;
    const heading = Math.atan2(px - riding.px, pz - riding.pz);
    riding.px = px;
    riding.pz = pz;
    controllerManager.placeScripted(px, y, pz, Number.isFinite(heading) ? heading : riding.dest.heading);
    if (t >= 1) finishRide();
  }

  function updatePrompt() {
    if (!prompt || riding) return;
    if (mapOpen?.()) {
      prompt.hidden = true;
      return;
    }
    nearest = nearestSite();
    if (!nearest) {
      prompt.hidden = true;
      if (openId) hideCard();
      return;
    }
    if (openId && openId !== nearest.id) hideCard();
    prompt.hidden = false;
    const verb = nearest.action === 'ferry' ? '乘船' : nearest.action === 'tram' ? '乘纜車' : '查看';
    prompt.textContent = `按 F ${verb} · ${nearest.title}`;
  }

  if (prompt) {
    prompt.addEventListener('click', () => {
      if (nearest && !riding) showCard(nearest);
    });
  }
  closeBtn?.addEventListener('click', hideCard);
  goBtn?.addEventListener('click', () => {
    const site = siteById(openId);
    if (site?.action) startRide(site);
  });

  return {
    get riding() {
      return !!riding;
    },
    update(dt) {
      if (riding) {
        stepRide(dt);
        return true;
      }
      updatePrompt();
      return false;
    },
    onKey(code) {
      if (mapOpen?.()) return false;
      if (code === 'Escape') {
        if (riding) {
          finishRide();
          return true;
        }
        if (openId) {
          hideCard();
          return true;
        }
        return false;
      }
      if (code !== 'KeyF' || riding) return false;
      nearest = nearestSite();
      if (!nearest) return false;
      if (openId === nearest.id) {
        if (nearest.action) startRide(nearest);
        else hideCard();
      } else {
        showCard(nearest);
      }
      return true;
    },
    teleportSite(id) {
      const site = siteById(id);
      if (!site || riding) return false;
      hideCard();
      controllerManager.teleportActiveTo(site.x, site.z, site.heading);
      return true;
    }
  };
}

export { createHkVisit };
