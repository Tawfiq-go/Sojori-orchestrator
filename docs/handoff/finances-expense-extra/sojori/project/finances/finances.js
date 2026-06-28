// ════════ Sojori Finances · interactions ════════
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ─── Routing ───
function nav(page) {
  $$('.page').forEach(p => p.classList.toggle('on', p.dataset.page === page));
  const navKey = page === 'report-detail' ? 'reports' : page;
  $$('.sb-item[data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === navKey));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$$('.sb-item[data-nav]').forEach(b => b.addEventListener('click', () => nav(b.dataset.nav)));

// ─── Role switch (PM vs Landlord) ───
$$('#roleSwitch button').forEach(b => b.addEventListener('click', () => {
  $$('#roleSwitch button').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  const role = b.dataset.role;
  document.body.dataset.role = role;
  $('#tbAv').textContent = role === 'landlord' ? 'M' : 'K';
  // landlord can't see Propriétaires screen — bounce to ledger if currently there
  if (role === 'landlord' && $('.page[data-page="landlords"]').classList.contains('on')) nav('reports');
}));

// ─── Drawer / modal open-close ───
function openDrawer(id) { $('#scrim').classList.add('on'); $(id).classList.add('on'); }
function closeAll() {
  $('#scrim').classList.remove('on');
  $$('.drawer').forEach(d => d.classList.remove('on'));
  $$('.modal').forEach(m => m.classList.remove('on'));
}
function openModal(id) { $('#scrim').classList.add('on'); $(id).classList.add('on'); }
window.closeAll = closeAll;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

window.openLandlord = function (name) {
  $('#llTitle').textContent = name ? 'Modifier — ' + name : 'Inviter un propriétaire';
  openDrawer('#drLandlord');
};
window.openExpense = () => openDrawer('#drExpense');
window.openBundle = () => openDrawer('#drBundle');
window.openRecurring = () => openDrawer('#drRecurring');
window.openWizard = () => openModal('#mdWizard');

window.openReport = function (status) {
  const draft = status === 'draft';
  const st = document.querySelector('#rpStatus');
  st.className = 'bdg ' + (draft ? 'gold' : 'green') + ' lg';
  st.innerHTML = '<span class="dot"></span>' + (draft ? 'Brouillon' : 'Publié');
  document.querySelector('#rpBanner').style.display = draft ? 'none' : 'flex';
  document.querySelector('#rpPublishBtn').style.display = draft ? 'inline-flex' : 'none';
  if (draft) {
    document.querySelector('#rpTitle').textContent = 'Mars 2026 — Portefeuille Tazi';
    document.querySelector('#rpMeta').textContent = 'Karim Tazi · 01–31 mars 2026 · 8 listings · MAD';
    document.querySelector('#rpId').textContent = 'tazi-2026-03';
  } else {
    document.querySelector('#rpTitle').textContent = 'Mars 2026 — Villa Majorelle';
    document.querySelector('#rpMeta').textContent = 'Mehdi Alaoui · 01–31 mars 2026 · 1 listing · MAD';
    document.querySelector('#rpId').textContent = 'vm-2026-03';
  }
  nav('report-detail');
};

// ─── Generic interactions ───
// segmented controls
$$('.seg').forEach(seg => seg.addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn) return;
  $$('button', seg).forEach(x => x.classList.remove('on'));
  btn.classList.add('on');
  // expense type → show "encaissé par" only for extra
  if (btn.dataset.xt) {
    const ex = $('[data-extraonly]');
    if (ex) ex.style.display = btn.dataset.xt === 'extra' ? 'block' : 'none';
  }
  // scope listings/cities
  if (btn.dataset.scope) {
    $$('[data-scopegrp]').forEach(g => g.style.display = g.dataset.scopegrp === btn.dataset.scope ? 'flex' : 'none');
  }
}));

// radio cards (contract type)
$$('[data-radio]').forEach(rc => rc.addEventListener('click', () => {
  const grp = rc.dataset.radio;
  $$(`[data-radio="${grp}"]`).forEach(x => x.classList.remove('on'));
  rc.classList.add('on');
  if (grp === 'contract') {
    const ct = rc.dataset.ct;
    $('[data-ctcfg="fixed"]').style.display = ct === 'fixed' ? 'block' : 'none';
    $('[data-ctcfg="percent"]').style.display = ct.startsWith('percent') ? 'block' : 'none';
    if (ct.startsWith('percent')) $('#pctBase').textContent = ct === 'percent_ota' ? 'Net après OTA' : 'Brut';
  }
}));

// toggles
$$('.toggle').forEach(t => t.addEventListener('click', e => { e.stopPropagation(); t.classList.toggle('on'); }));

// chips
$$('.chip').forEach(c => c.addEventListener('click', () => { if (!c.textContent.includes('+')) c.classList.toggle('on'); }));

// filter sel toggle highlight
$$('.filter-sel').forEach(f => f.addEventListener('click', () => f.classList.toggle('act')));

// ─── Bundle margin live calc ───
function recalcMargin() {
  const inc = parseFloat(($('#bndIn').value || '0').replace(/\s/g, '')) || 0;
  const out = parseFloat(($('#bndOut').value || '0').replace(/\s/g, '')) || 0;
  const m = inc - out;
  const box = $('.margin-box');
  box.querySelector('.leg:nth-child(1) .v').textContent = '+' + inc.toLocaleString('fr-FR') + ' MAD';
  box.querySelector('.leg:nth-child(3) .v').textContent = out.toLocaleString('fr-FR') + ' MAD';
  const res = $('#bndMargin');
  res.textContent = (m >= 0 ? '+' : '') + m.toLocaleString('fr-FR') + ' MAD';
  res.style.color = m >= 0 ? 'var(--su)' : 'var(--rose)';
}
['#bndIn', '#bndOut'].forEach(s => $(s) && $(s).addEventListener('input', recalcMargin));

// ─── Wizard step nav (clickable) ───
$$('.wiz-step').forEach((st, i) => st.addEventListener('click', () => {
  $$('.wiz-step').forEach((x, j) => {
    x.classList.toggle('active', j === i);
    x.classList.toggle('done', j < i);
  });
}));
