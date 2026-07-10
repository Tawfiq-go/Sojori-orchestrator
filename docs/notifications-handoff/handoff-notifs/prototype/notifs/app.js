// ═══════════════════════════════════════════════════════════════════
// Sojori · Centre de notifications — logique prototype
// Miroir 1:1 des composants React cibles :
//   NotificationBell · NotificationPanel · NotificationRow ·
//   NotificationFacetChips · NotificationPreferencesSection
// ═══════════════════════════════════════════════════════════════════
(function () {
  const FACETS = window.NOTIF_FACETS, FACET_ORDER = window.FACET_ORDER;
  const PRIO = window.NOTIF_PRIORITY, CATALOG = window.EVENT_CATALOG;
  const PAGES = window.DASH_PAGES;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // événement → facette (pour construire linkPath, labels…)
  const EVENT_LABEL = {};
  CATALOG.forEach(g => g.events.forEach(e => EVENT_LABEL[e.key] = e.label));

  // ── state (miroir React Query + provider) ──
  let notifs = window.NOTIFICATIONS.map(n => ({ ...n }));
  let liveQueue = window.INCOMING_FEED.map(n => ({ ...n }));
  let prefs = {};   // eventKey → {dashboard, whatsapp}
  CATALOG.forEach(g => g.events.forEach(e => prefs[e.key] = { dashboard: e.dashboard, whatsapp: e.whatsapp }));

  let state = {
    page: 'overview', panelOpen: false, tab: 'action', facet: '',
    loading: false, prefCollapsed: {},
  };

  // ═══════════ Dérivés (== unread-count API) ═══════════
  const isUnread = (n) => n.readAt === null;
  const isActionRequired = (n) => (n.priority === 'critical' || n.priority === 'high') && (n.status === 'created' || n.status === 'pending');
  function unreadCount() {
    const visible = notifs.filter(n => n.status !== 'dismissed' && n.status !== 'expired');
    const total = visible.filter(isUnread).length;
    const actionRequired = visible.filter(n => isActionRequired(n) && isUnread(n)).length;
    const byFacet = {};
    FACET_ORDER.forEach(f => { byFacet[f] = visible.filter(n => n.facet === f && isUnread(n)).length; });
    return { total, actionRequired, byFacet };
  }

  function relTime(minAgo) {
    if (minAgo < 1) return "à l'instant";
    if (minAgo < 60) return `il y a ${Math.round(minAgo)} min`;
    if (minAgo < 1440) return `il y a ${Math.round(minAgo / 60)} h`;
    return `il y a ${Math.round(minAgo / 1440)} j`;
  }

  // ═══════════ Sidebar ═══════════
  function renderSidebar() {
    const uc = unreadCount();
    const groups = {};
    PAGES.forEach(p => { (groups[p.group] = groups[p.group] || []).push(p); });
    let html = `<div class="sb-brand"><div class="mk">S</div><div class="nm">Sojori<small>Orchestrator</small></div></div>`;
    Object.keys(groups).forEach(g => {
      html += `<div class="sb-sec">${g}</div>`;
      groups[g].forEach(p => {
        // badge facette sur les entrées liées
        let fb = '';
        if (p.id === 'orchestration') { const c = uc.byFacet.orchestration + uc.byFacet.guest_journey; if (c) fb = `<span class="fbadge">${c}</span>`; }
        if (p.id === 'inbox') { const c = uc.byFacet.message + uc.byFacet.review + uc.byFacet.lead; if (c) fb = `<span class="fbadge">${c}</span>`; }
        if (p.id === 'tasks') { const c = uc.byFacet.task + uc.byFacet.concierge; if (c) fb = `<span class="fbadge">${c}</span>`; }
        if (p.id === 'reservations') { const c = uc.byFacet.reservation; if (c) fb = `<span class="fbadge">${c}</span>`; }
        html += `<button class="sb-item ${state.page === p.id ? 'on' : ''}" data-page="${p.id}"><span class="ic">${p.icon}</span>${p.label}${fb}</button>`;
      });
    });
    $('#sidebar').innerHTML = html;
    $$('#sidebar .sb-item').forEach(b => b.onclick = () => goPage(b.dataset.page));
  }

  // ═══════════ Bell + badge ═══════════
  function renderBell(pop) {
    const uc = unreadCount();
    const badge = $('#bellBadge');
    const n = uc.actionRequired;           // ← badge = actionRequired (pas total)
    if (n > 0) {
      badge.classList.remove('hidden');
      badge.textContent = n > 99 ? '99+' : n;
      badge.classList.toggle('warn', uc.actionRequired === 0);
    } else {
      badge.classList.add('hidden');
    }
    $('#bell').classList.toggle('open', state.panelOpen);
    if (pop) { const b = $('#bell'); b.classList.add('ring'); setTimeout(() => b.classList.remove('ring'), 850); }
  }

  // ═══════════ Panel ═══════════
  function filteredForPanel() {
    let list = notifs.filter(n => n.status !== 'dismissed' && n.status !== 'expired');
    if (state.tab === 'action') list = list.filter(isActionRequired);
    if (state.facet) list = list.filter(n => n.facet === state.facet);
    return list.sort((a, b) => a.minAgo - b.minAgo);
  }

  function renderPanel() {
    const uc = unreadCount();
    const p = $('#panel');
    let html = `
      <div class="pnl-h">
        <div class="top">
          <span class="t">Notifications</span>
          <button class="allread" id="allRead" title="Tout marquer comme lu">✓ Tout marquer lu</button>
          <button class="gear" id="goPrefs" title="Préférences">⚙️</button>
        </div>
        <div class="tabs">
          <button class="tab ${state.tab === 'action' ? 'on' : ''}" data-tab="action">Action requise ${uc.actionRequired ? `<span class="n">${uc.actionRequired}</span>` : ''}</button>
          <button class="tab ${state.tab === 'all' ? 'on' : ''}" data-tab="all">Tout ${uc.total ? `<span class="n" style="background:var(--bg3);color:var(--text3)">${uc.total}</span>` : ''}</button>
        </div>
      </div>`;

    // chips
    html += `<div class="chips" id="chips"><button class="chip ${state.facet === '' ? 'on' : ''}" data-facet="">Toutes</button>`;
    FACET_ORDER.forEach(f => {
      const cnt = uc.byFacet[f];
      html += `<button class="chip ${state.facet === f ? 'on' : ''}" data-facet="${f}">
        <span class="cd" style="background:${FACETS[f].color}"></span>${FACETS[f].label}${cnt ? `<span class="cc">${cnt}</span>` : ''}
      </button>`;
    });
    html += `</div>`;

    // list
    html += `<div class="pnl-list" id="pnlList">`;
    if (state.loading) {
      html += Array(4).fill('<div class="skelrow"><div class="skel" style="width:34px;height:34px;border-radius:9px"></div><div style="flex:1"><div class="skel" style="height:12px;width:70%"></div><div class="skel" style="height:10px;width:45%;margin-top:7px"></div><div class="skel" style="height:11px;width:90%;margin-top:7px"></div></div></div>').join('');
    } else {
      const list = filteredForPanel();
      if (!list.length) {
        html += `<div class="empty"><div class="em">${state.tab === 'action' ? '✅' : '🔔'}</div><div class="t">${state.tab === 'action' ? 'Rien à traiter' : 'Rien à signaler'}</div><div class="d">${state.tab === 'action' ? 'Aucune action requise pour le moment.' : 'Vous êtes à jour.'}</div></div>`;
      } else {
        html += list.map(rowHtml).join('');
      }
    }
    html += `</div>`;
    html += `<div class="pnl-f"><a id="seeAll">Voir l’historique complet →</a></div>`;
    p.innerHTML = html;
    bindPanel();
  }

  function rowHtml(n) {
    const f = FACETS[n.facet], pr = PRIO[n.priority];
    const done = n.status === 'done' || n.status === 'handled';
    return `<div class="nrow ${isUnread(n) ? 'unread' : ''}" data-id="${n._id}">
      <div class="nfacet" style="background:${f.color}1a">${f.icon}<span class="pdot" style="background:${pr.color}"></span></div>
      <div class="nbody">
        <div class="r1"><span class="title">${esc(n.title)}</span><span class="time">${relTime(n.minAgo)}</span></div>
        <div class="ctx">${n.ctx.res && n.ctx.res !== '—' ? `<b>${esc(n.ctx.res)}</b> · ` : ''}${n.ctx.listing && n.ctx.listing !== '—' ? esc(n.ctx.listing) : ''}${n.ctx.who && n.ctx.who !== '—' ? ' · ' + esc(n.ctx.who) : ''}</div>
        <div class="msg">${esc(n.body)}</div>
        <div class="r3">
          <span class="pbadge" style="background:${pr.tint};color:${pr.color}"><span class="dot"></span>${pr.label}</span>
          ${n.aggregatedCount > 1 ? `<span class="agg">×${n.aggregatedCount}</span>` : ''}
          ${done ? `<span class="statusdone">✓ ${n.status === 'done' ? 'Terminé' : 'Pris en charge'}</span>` : ''}
          <div class="nactions">
            ${!done ? `<button class="nact done" data-act="done" data-id="${n._id}">Terminer</button>` : ''}
            <button class="nact dismiss" data-act="dismiss" data-id="${n._id}">Ignorer</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function bindPanel() {
    $$('#panel .tab').forEach(t => t.onclick = () => { state.tab = t.dataset.tab; renderPanel(); });
    $$('#panel .chip').forEach(c => c.onclick = () => { state.facet = c.dataset.facet; renderPanel(); });
    $('#allRead').onclick = markAllRead;
    $('#goPrefs').onclick = () => { closePanel(); goPage('settings'); };
    $('#seeAll').onclick = () => { closePanel(); goPage('settings'); };
    $$('#panel .nrow').forEach(r => r.onclick = (e) => {
      if (e.target.closest('.nact')) return;
      openNotification(r.dataset.id);
    });
    $$('#panel .nact').forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      if (b.dataset.act === 'done') setStatus(b.dataset.id, 'done');
      else dismiss(b.dataset.id);
    });
  }

  function openPanel() {
    state.panelOpen = true; state.loading = true;
    $('#panel').classList.add('on'); $('#scrim').classList.add('on');
    renderBell(); renderPanel();
    // simulate fetch latency (React Query)
    setTimeout(() => { state.loading = false; renderPanel(); }, 480);
  }
  function closePanel() {
    state.panelOpen = false;
    $('#panel').classList.remove('on'); $('#scrim').classList.remove('on');
    renderBell();
  }

  // ═══════════ Mutations (== PUT …/read, /status, /read-all) ═══════════
  function markRead(id) { const n = notifs.find(x => x._id === id); if (n && n.readAt === null) n.readAt = new Date().toISOString(); }
  function markAllRead() {
    // read-all ?facet=state.facet
    notifs.forEach(n => { if (!state.facet || n.facet === state.facet) if (n.readAt === null) n.readAt = new Date().toISOString(); });
    renderBell(); renderPanel(); renderSidebar();
  }
  function setStatus(id, status) {
    const n = notifs.find(x => x._id === id); if (!n) return;
    n.status = status; markRead(id);
    animateOut(id, () => { renderBell(); renderPanel(); renderSidebar(); });
  }
  function dismiss(id) {
    const n = notifs.find(x => x._id === id); if (!n) return;
    n.status = 'dismissed';
    animateOut(id, () => { renderBell(); renderPanel(); renderSidebar(); });
  }
  function animateOut(id, cb) {
    const row = $(`#panel .nrow[data-id="${id}"]`);
    if (row) { row.classList.add('removing'); setTimeout(cb, 300); } else cb();
  }

  // clic ligne → PUT read + navigate(linkPath)
  function openNotification(id) {
    const n = notifs.find(x => x._id === id); if (!n) return;
    markRead(id);
    renderBell(); renderSidebar();
    // deep link → route dashboard correspondante
    const target = routeForLink(n.linkPath);
    closePanel();
    goPage(target, n);
  }
  function routeForLink(linkPath) {
    if (linkPath.startsWith('/reservations')) return 'reservations';
    if (linkPath.startsWith('/orch')) return 'orchestration';
    if (linkPath.startsWith('/comms')) return 'inbox';
    if (linkPath.startsWith('/tasks')) return 'tasks';
    if (linkPath.startsWith('/finances')) return 'finances';
    return 'overview';
  }

  // ═══════════ Socket simulé : NEW_NOTIFICATION ═══════════
  function pushLive(n) {
    // prepend (React: invalidateQueries + prepend si panneau ouvert)
    n = { ...n, _id: n._id + '-' + Date.now(), minAgo: 0 };
    notifs.unshift(n);
    renderBell(true);       // pop + ring
    renderSidebar();
    if (state.panelOpen) {
      renderPanel();
      const row = $(`#panel .nrow[data-id="${n._id}"]`);
      if (row) row.classList.add('enter');
    }
    // toast sur critical/high
    if (n.priority === 'critical' || n.priority === 'high') showToast(n);
  }

  let liveIdx = 0;
  function triggerLive() {
    const n = liveQueue[liveIdx % liveQueue.length]; liveIdx++;
    pushLive(n);
  }

  // ═══════════ Toast ═══════════
  function showToast(n) {
    const f = FACETS[n.facet], pr = PRIO[n.priority];
    const el = document.createElement('div');
    el.className = `toast ${n.priority}`;
    el.innerHTML = `
      <button class="tclose">✕</button>
      <div class="toast-b">
        <div class="tf" style="background:${f.color}1a">${f.icon}</div>
        <div class="ti">
          <div class="tt">${esc(n.title)}</div>
          <div class="tm">${esc(n.body)}</div>
          <div class="tacts"><button class="tsee">Voir</button><button class="tlater" style="color:var(--text3)">Plus tard</button></div>
        </div>
      </div>
      <div class="tprog"></div>`;
    $('#toaster').appendChild(el);
    const kill = () => { el.style.transition = 'opacity .25s,transform .25s'; el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; setTimeout(() => el.remove(), 250); };
    const timer = setTimeout(kill, 6000);
    el.querySelector('.tclose').onclick = () => { clearTimeout(timer); kill(); };
    el.querySelector('.tlater').onclick = () => { clearTimeout(timer); kill(); };
    el.querySelector('.tsee').onclick = () => { clearTimeout(timer); kill(); openNotification(n._id); };
  }

  // ═══════════ Pages (démo shell) ═══════════
  function goPage(id, ctx) {
    state.page = id;
    const p = PAGES.find(x => x.id === id) || PAGES[0];
    $('#pageTitle').textContent = p.label;
    $('#pageCrumb').textContent = 'app.sojori.com / ' + (id === 'overview' ? 'dashboard' : id);
    renderSidebar();
    if (id === 'settings') renderPrefs();
    else renderPageContent(id, ctx);
    window.scrollTo({ top: 0 });
  }

  function renderPageContent(id, ctx) {
    const titles = {
      overview:['Vue d’ensemble','Pilotage temps réel de votre portefeuille — la cloche est disponible sur chaque page.'],
      reservations:['Réservations','Toutes vos réservations, tous canaux confondus.'],
      orchestration:['Orchestration','Plans automatiques : ménages, check-in, codes d’accès.'],
      inbox:['Inbox Guest','Conversations WhatsApp, OTA et avis. (≠ cloche : ici ce sont les fils, pas les alertes.)'],
      tasks:['Tâches','Tâches terrain assignées au staff.'],
      finances:['Finances','Revenus, dépenses et rapports propriétaires.'],
    };
    const [t, d] = titles[id] || titles.overview;
    let deep = '';
    if (ctx) deep = `<div class="demo-note"><span class="ic">🔗</span><div>Ouvert depuis une notification — <b>deep link</b> <code style="font-family:var(--mono)">${esc(ctx.linkPath)}</code> · marquée comme lue. En React : <code style="font-family:var(--mono)">navigate(linkPath)</code>.</div></div>`;

    let extra = '';
    if (id === 'overview') {
      const uc = unreadCount();
      extra = `<div class="tiles">
        <div class="tile"><div class="tl">Notifications non lues</div><div class="tv">${uc.total}</div><div class="tk">total actif</div></div>
        <div class="tile"><div class="tl">Action requise</div><div class="tv" style="color:var(--warning)">${uc.actionRequired}</div><div class="tk">badge cloche</div></div>
        <div class="tile"><div class="tl">Réservations · unread</div><div class="tv" style="color:var(--info)">${uc.byFacet.reservation}</div><div class="tk">facette</div></div>
        <div class="tile"><div class="tl">Orchestration · unread</div><div class="tv" style="color:var(--primaryDeep)">${uc.byFacet.orchestration}</div><div class="tk">facette</div></div>
      </div>`;
    }

    $('#content').innerHTML = `
      ${deep}
      <div class="page-hero">
        <h2>${t}</h2><p>${d}</p>
        <div class="demo-actions">
          <button class="dbtn prim" id="simLive">⚡ Simuler une notification (socket)</button>
          <button class="dbtn" id="openBell">🔔 Ouvrir le panneau</button>
          <button class="dbtn" id="simCrit">⛔ Simuler une alerte critique</button>
        </div>
      </div>
      ${extra}`;
    $('#simLive').onclick = triggerLive;
    $('#openBell').onclick = openPanel;
    $('#simCrit').onclick = () => pushLive(window.INCOMING_FEED.find(x => x.priority === 'critical'));
  }

  // ═══════════ Préférences ═══════════
  function renderPrefs() {
    let html = `<div class="prefwrap">
      <div class="page-hero" style="margin-bottom:16px"><h2>Préférences de notifications</h2>
        <p>Choisissez les événements qui vous alertent, par canal. Les alertes <b>critiques</b> restent toujours actives sur le dashboard (sécurité opérationnelle).</p></div>`;
    CATALOG.forEach(g => {
      const f = FACETS[g.facet];
      const collapsed = state.prefCollapsed[g.facet];
      html += `<div class="prefgroup ${collapsed ? 'collapsed' : ''}" data-facet="${g.facet}">
        <div class="prefgroup-h" data-toggle="${g.facet}">
          <div class="fic" style="background:${f.color}1a">${f.icon}</div>
          <span class="fnm">${f.label}</span><span class="fct">${g.events.length} événement${g.events.length > 1 ? 's' : ''}</span>
          <span class="chev">▾</span>
        </div>
        <div class="prefgroup-b">
          <div class="pref-cols"><span>Événement</span><span class="c">Dashboard</span><span class="c">WhatsApp staff</span></div>
          ${g.events.map(e => prefRow(e)).join('')}
        </div>
      </div>`;
    });
    html += `</div>`;
    $('#content').innerHTML = html;
    $$('#content .prefgroup-h').forEach(h => h.onclick = () => {
      const fc = h.dataset.toggle; state.prefCollapsed[fc] = !state.prefCollapsed[fc];
      h.closest('.prefgroup').classList.toggle('collapsed');
    });
    $$('#content .tg').forEach(t => t.onclick = () => {
      if (t.classList.contains('locked')) return;
      const { key, chan } = t.dataset;
      prefs[key][chan] = !prefs[key][chan];
      t.classList.toggle('on', prefs[key][chan]);
      // (React) PUT /notification/preferences { events: { [key]: { [chan]: value } } }
    });
  }
  function prefRow(e) {
    const pr = PRIO[e.priority];
    const locked = e.lockedDashboard;
    return `<div class="pref-row">
      <div class="ev">${esc(e.label)}<span class="pb" style="background:${pr.tint};color:${pr.color}">${pr.label}</span></div>
      <div>
        <div class="pref-cell"><div class="tg ${prefs[e.key].dashboard ? 'on' : ''} ${locked ? 'locked' : ''}" data-key="${e.key}" data-chan="dashboard" ${locked ? 'title="Alerte critique — toujours active"' : ''}></div></div>
        ${locked ? '<div class="lockhint">obligatoire</div>' : ''}
      </div>
      <div class="pref-cell"><div class="tg ${prefs[e.key].whatsapp ? 'on' : ''}" data-key="${e.key}" data-chan="whatsapp"></div></div>
    </div>`;
  }

  // ═══════════ Boot ═══════════
  $('#bell').onclick = () => state.panelOpen ? closePanel() : openPanel();
  $('#scrim').onclick = closePanel;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.panelOpen) closePanel(); });

  renderSidebar(); renderBell(); goPage('overview');

  // socket "ambiant" : une notif arrive automatiquement après 5s (démo)
  setTimeout(() => { if (!state.panelOpen) triggerLive(); }, 5200);
})();
