// @ts-nocheck — port JS verbatim from ChannelsHubPage.jsx
/** Calendar RU recap — port from ChannelsHubPage.jsx */

export type CalendarRuRecapRow = Record<string, unknown> & {
  action?: string;
  auditContext?: Record<string, unknown>;
  requestPayload?: unknown;
  propertyId?: string | number;
  listing?: { name?: string; city?: string };
  owner?: { firstName?: string; lastName?: string };
};

const CAL_MOD_TYPE_LABELS = {
  manualPrice: 'Prix manuel',
  setUseDynamicPriceManual: 'Prix (mode dynamique manuel)',
  availability: 'Disponibilité (calendrier)',
  min_stay_arrival: 'Séjour minimum',
  max_stay: 'Séjour maximum',
  stopSell: 'Stop vente',
  stop_sell: 'Stop vente',
  price: 'Prix',
};

export function calendarRuTypeLabelFr(t) {
  const k = String(t || '').trim();
  if (!k) return 'Mise à jour';
  return CAL_MOD_TYPE_LABELS[k] || k.replace(/_/g, ' ');
}

export function formatCalendarDateRangeShort(from, to) {
  const a = from != null ? String(from).slice(0, 10) : '';
  const b = to != null ? String(to).slice(0, 10) : '';
  if (a && b && a !== b) return `${a} → ${b}`;
  if (a) return a;
  return '—';
}

export function shortenRoomTypeId(id) {
  const s = String(id || '');
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…`;
}

/** Dates MuCalendar / PutPrices (From/To ou DateFrom/DateTo). */
export function seasonFromTo(o) {
  if (!o || typeof o !== 'object') return { from: undefined, to: undefined };
  return {
    from: o['@_From'] ?? o['@_DateFrom'],
    to: o['@_To'] ?? o['@_DateTo'],
  };
}

export function normalizeLightUpdateCategory(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('price') || t === 'setusedynamicpricemanual') return 'prix';
  if (t === 'availability') return 'dispo';
  if (t.includes('min_stay') || t.includes('minstay')) return 'minStay';
  if (t.includes('stop') || t === 'stopsell') return 'stopSell';
  if (t.includes('max_stay') || t.includes('maxstay')) return 'maxStay';
  return 'autre';
}

const CAL_MOD_CAT_LABEL_FR = {
  prix: 'Prix',
  dispo: 'Dispo',
  minStay: 'Séjour min',
  maxStay: 'Séjour max',
  stopSell: 'Stop vente',
  autre: 'Autre',
};

export function recapDetailLinesFromLightUpdates(lightUpdates) {
  if (!Array.isArray(lightUpdates) || !lightUpdates.length) return [];
  return lightUpdates.map((u) => {
    const label = calendarRuTypeLabelFr(u?.type);
    const range = formatCalendarDateRangeShort(u?.from, u?.to);
    const rt = u?.roomTypeId ? ` · RT ${shortenRoomTypeId(u.roomTypeId)}` : '';
    return `${label} · ${range}${rt}`;
  });
}

export function isPriceSeasonNode(o) {
  if (!o || typeof o !== 'object') return false;
  const { from, to } = seasonFromTo(o);
  if (from == null || to == null) return false;
  return o.Price !== undefined && typeof o.Price !== 'object';
}

export function isAvailabilityDateNode(o) {
  if (!o || typeof o !== 'object') return false;
  const { from, to } = seasonFromTo(o);
  if (from == null || to == null) return false;
  if (isPriceSeasonNode(o)) return false;
  return o.U !== undefined || o.MS !== undefined || o.MX !== undefined || o.C !== undefined;
}

export function walkPayloadCalendarBlocks(obj, depth, avOut, prOut) {
  if (depth > 20 || obj == null) return;
  if (typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const el of obj) walkPayloadCalendarBlocks(el, depth + 1, avOut, prOut);
    return;
  }
  if (isPriceSeasonNode(obj)) {
    const { from, to } = seasonFromTo(obj);
    prOut.push({
      from,
      to,
      price: obj.Price,
      extra: obj.Extra,
    });
    return;
  }
  if (isAvailabilityDateNode(obj)) {
    const { from, to } = seasonFromTo(obj);
    avOut.push({
      from,
      to,
      U: obj.U,
      MS: obj.MS,
      MX: obj.MX,
      C: obj.C,
    });
    return;
  }
  for (const v of Object.values(obj)) {
    if (typeof v === 'object' && v != null) walkPayloadCalendarBlocks(v, depth + 1, avOut, prOut);
  }
}

export function describeAvailabilityBlock(b) {
  const parts = [];
  if (b.U !== undefined && b.U !== '') {
    const n = Number(b.U);
    if (Number.isFinite(n) && n === 0) parts.push('fermé à la vente (0 unité)');
    else parts.push(`unités affichées ${b.U}`);
  }
  if (b.MS !== undefined && b.MS !== '') parts.push(`séj. min ${b.MS}`);
  if (b.MX !== undefined && b.MX !== '') parts.push(`séj. max ${b.MX}`);
  if (b.C !== undefined && b.C !== '') {
    const cN = Number(b.C);
    if (cN === 3) parts.push('fermé arrivée & départ');
    else if (cN === 2) parts.push('fermé à l’arrivée');
    else if (cN === 1) parts.push('fermé au départ');
    else if (cN === 4) parts.push('ouvert arrivée / départ');
    else parts.push(`code contrainte ${b.C}`);
  }
  const range = formatCalendarDateRangeShort(b.from, b.to);
  return `Calendrier RU · ${range}${parts.length ? ` · ${parts.join(', ')}` : ''}`;
}

export function describePriceSeasonBlock(b) {
  const range = formatCalendarDateRangeShort(b.from, b.to);
  const p = b.price != null ? ` · prix ${b.price}` : '';
  const x = b.extra != null && b.extra !== '' ? ` · extra ${b.extra}` : '';
  return `Saison / prix RU · ${range}${p}${x}`;
}

/** Parse les lignes de récap modal pour affichage compact (date · prix · extra). */
export function classifyRuModificationLine(line) {
  if (line == null || typeof line !== 'string') return { kind: 'text', line: String(line) };
  if (/^… et \d+ autre/.test(line)) return { kind: 'truncated', line };
  const priceM = line.match(/^Saison \/ prix RU · (.*?) · prix (.*?)(?: · extra (.*))?$/);
  if (priceM) {
    return {
      kind: 'price',
      range: priceM[1].trim(),
      price: priceM[2].trim(),
      extra: priceM[3] != null && String(priceM[3]).trim() !== '' ? priceM[3].trim() : '—',
    };
  }
  if (line.startsWith('Calendrier RU ·')) return { kind: 'availability', line };
  return { kind: 'text', line };
}

/** Mois / jours : Map Mongoose sérialisée ou Record → objet clé → nombre pour la grille modale. */
export function plainNumberMapFromUnknown(m) {
  if (m == null) return null;
  if (typeof m !== 'object') return null;
  if (Array.isArray(m)) return null;
  if (m instanceof Map) {
    const o = {};
    for (const [k, v] of m) {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) o[String(k)] = n;
    }
    return Object.keys(o).length ? o : null;
  }
  const o = {};
  for (const [k, v] of Object.entries(m)) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) o[k] = n;
  }
  return Object.keys(o).length ? o : null;
}

export function dynamicPricingMonthWeekdayMaps(dpd) {
  if (!dpd || typeof dpd !== 'object') return { monthRules: null, weekdayRules: null };
  const rules = dpd.rules && typeof dpd.rules === 'object' ? dpd.rules : {};
  const monthRules =
    plainNumberMapFromUnknown(rules.monthRules) ?? plainNumberMapFromUnknown(dpd.monthRules);
  const weekdayRules =
    plainNumberMapFromUnknown(rules.weekdayRules) ?? plainNumberMapFromUnknown(dpd.weekdayRules);
  return { monthRules, weekdayRules };
}

/** Saisons PutPrices quel que soit l’imbrication du JSON (payload parfois nested). */
export function extractPutPriceSeasonNodes(pay, depth = 0) {
  if (!pay || typeof pay !== 'object' || depth > 14) return [];
  const raw = pay.Push_PutPrices_RQ?.Prices?.Season ?? pay.Prices?.Season;
  if (raw != null) return Array.isArray(raw) ? raw : [raw];
  for (const v of Object.values(pay)) {
    if (v && typeof v === 'object') {
      const inner = extractPutPriceSeasonNodes(v, depth + 1);
      if (inner.length) return inner;
    }
  }
  return [];
}

export function recapLinesFromRequestPayload(payload) {
  if (!payload || typeof payload !== 'object') return [];
  const av = [];
  const pr = [];
  walkPayloadCalendarBlocks(payload, 0, av, pr);
  const lines = [];
  const maxEach = 14;
  av.slice(0, maxEach).forEach((b) => lines.push(describeAvailabilityBlock(b)));
  pr.slice(0, maxEach).forEach((b) => lines.push(describePriceSeasonBlock(b)));
  const extra = av.length + pr.length - maxEach * 2;
  if (extra > 0) lines.push(`… et ${extra} autre(s) bloc(s) dans la requête (voir JSON + XML pour le détail complet).`);
  return lines;
}

export function auditRoomTypeHint(audit) {
  if (!audit || typeof audit !== 'object') return '';
  const ru = audit.ruExecution;
  if (ru && ru.roomTypeId != null && String(ru.roomTypeId).trim() !== '') {
    return ` · RT ${shortenRoomTypeId(String(ru.roomTypeId))}`;
  }
  const rts = audit.roomTypeIds;
  if (Array.isArray(rts) && rts.length > 0 && rts[0] != null) {
    const extra = rts.length > 1 ? ` +${rts.length - 1}` : '';
    return ` · RT ${shortenRoomTypeId(String(rts[0]))}${extra}`;
  }
  return '';
}

/** Récap lisible : prix, séjours, dispo, stop vente — depuis audit puis corps requête. */
export function buildCalendarModificationRecap(row) {
  const audit = row.auditContext && typeof row.auditContext === 'object' ? row.auditContext : {};
  const lu = Array.isArray(audit.lightUpdates) ? audit.lightUpdates : [];
  let detailLines = recapDetailLinesFromLightUpdates(lu);
  if (detailLines.length === 0 && row.requestPayload && typeof row.requestPayload === 'object') {
    detailLines = recapLinesFromRequestPayload(row.requestPayload);
  }
  const catCounts = new Map();
  for (const u of lu) {
    const c = normalizeLightUpdateCategory(u?.type);
    catCounts.set(c, (catCounts.get(c) || 0) + 1);
  }
  const shortParts = [];
  for (const [k, n] of catCounts) {
    shortParts.push(`${CAL_MOD_CAT_LABEL_FR[k] || k} ×${n}`);
  }
  let shortLine = shortParts.join(' · ');
  if (!shortLine && detailLines.length) {
    const action = String(row.action || '');
    if (/PutPrices/i.test(action)) {
      const prLines = detailLines.filter((ln) => ln.startsWith('Saison / prix RU ·'));
      const avLines = detailLines.filter((ln) => ln.startsWith('Calendrier RU ·'));
      if (prLines.length && !avLines.length) {
        shortLine =
          prLines.length <= 2
            ? prLines.join(' · ')
            : `${prLines.length} saison(s) prix · ${prLines[0].slice(0, 72)}${prLines[0].length > 72 ? '…' : ''}`;
      } else if (avLines.length && !prLines.length) {
        shortLine =
          avLines.length <= 2
            ? avLines.join(' · ')
            : `${avLines.length} bloc(s) dispo · ${avLines[0].slice(0, 72)}${avLines[0].length > 72 ? '…' : ''}`;
      } else {
        shortLine =
          detailLines.length <= 2
            ? detailLines.join(' · ')
            : `${detailLines.length} modification(s) (voir récap)`;
      }
    } else if (/PutAvbUnits|Avb/i.test(action)) {
      const avLines = detailLines.filter((ln) => ln.startsWith('Calendrier RU ·'));
      shortLine =
        (avLines.length ? avLines : detailLines).length <= 2
          ? (avLines.length ? avLines : detailLines).join(' · ')
          : `${(avLines.length ? avLines : detailLines).length} bloc(s) calendrier (voir récap)`;
    } else {
      shortLine =
        detailLines.length <= 2
          ? detailLines.join(' · ')
          : `${detailLines.length} modification(s) (voir récap)`;
    }
  }
  if (!shortLine || shortLine === '—') {
    const a = String(row.action || '');
    if (/PutPrices/i.test(a)) shortLine = 'Prix RU — ouvrir Récap (corps requête si absent)';
    else if (/PutAvbUnits|Avb/i.test(a)) shortLine = 'Dispo RU — ouvrir Récap (corps requête si absent)';
    else if (!shortLine) shortLine = '—';
  }
  const rtHint = auditRoomTypeHint(audit);
  if (rtHint && shortLine !== '—' && !shortLine.includes('RT ')) {
    shortLine = `${shortLine}${rtHint}`;
  }
  return { detailLines, shortLine, hasDetail: detailLines.length > 0 };
}
