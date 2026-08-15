/**
 * Smart detail calendrier — extras / montants (Mews Items + To be paid).
 */

export function moneyMad(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v).toLocaleString('fr-FR')} MAD`;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pushItem(out, name, amount, qty) {
  const label = String(name || '').trim();
  const a = num(amount);
  if (!label || a === 0) return;
  out.push({
    name: label,
    amount: a,
    qty: Math.max(1, Math.trunc(num(qty) || 1)),
  });
}

/** Extra consommé / facturé — ignore le catalogue listing (options pickup). */
export function collectReservationExtraItems(reservation) {
  const out = [];
  if (!reservation || typeof reservation !== 'object') return out;

  const bags = [
    reservation.extras,
    reservation.extraItems,
    reservation.products,
    reservation.orderItems,
    reservation.minibarLines,
  ];
  for (const bag of bags) {
    if (!Array.isArray(bag)) continue;
    for (const x of bag) {
      if (!x || typeof x !== 'object') continue;
      pushItem(
        out,
        x.name || x.label || x.productName || x.title,
        x.amount ?? x.total ?? x.price ?? x.unitPrice,
        x.qty ?? x.quantity,
      );
    }
  }

  const nb = reservation.reservationBreakdown?.normalizedBreakdown;
  const other = Array.isArray(nb?.other) ? nb.other : [];
  for (const row of other) {
    pushItem(out, row?.name || row?.label, row?.amount ?? row?.price, row?.qty);
  }

  for (const s of Array.isArray(reservation.services) ? reservation.services : []) {
    if (!s || typeof s !== 'object') continue;
    const opts = Array.isArray(s.options) ? s.options : [];
    if (opts.some((o) => o && (o.pickup || o.city))) continue;
    const selected = opts.filter((o) => o && (o.selected || o.consumed || num(o.qty) > 0));
    if (selected.length) {
      for (const o of selected) {
        pushItem(out, o.name || o.label || s.type || s.name, o.price ?? o.amount, o.qty);
      }
      continue;
    }
    if (s.selected || s.consumed || num(s.qty) > 0 || num(s.quantity) > 0) {
      pushItem(out, s.type || s.name || s.label, s.price ?? s.amount, s.qty ?? s.quantity);
    }
  }

  return out;
}

export function mapLedgerExtrasToItems(entries) {
  return (entries || [])
    .filter((e) => e && String(e.type || '') === 'extra')
    .filter((e) => String(e.status || '') !== 'cancelled')
    .map((e) => ({
      name: String(e.name || e.categoryLabel || 'Extra').trim() || 'Extra',
      amount: num(e.amount),
      qty: 1,
      paidBy: e.paidBy,
      status: e.status,
    }))
    .filter((e) => e.amount !== 0);
}

export function mergeExtraItems(fromReservation, fromLedger) {
  const out = [];
  const seen = new Set();
  for (const row of [...(fromReservation || []), ...(fromLedger || [])]) {
    const key = `${String(row.name || '').toLowerCase()}|${Number(row.amount)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function rateLinesFromReservation(reservation) {
  const r = reservation || {};
  const nb = r.reservationBreakdown?.normalizedBreakdown;
  const lines = [];
  const acc = num(nb?.accommodation?.amount);
  if (acc > 0) lines.push({ name: 'Séjour', amount: acc });
  const fees = Array.isArray(nb?.fees) ? nb.fees : [];
  for (const f of fees) {
    const name = String(f?.name || f?.label || 'Frais').trim();
    const amount = num(f?.amount);
    if (!name || amount <= 0) continue;
    if (/tourist|taxe de séjour|city.?tax/i.test(name)) {
      lines.push({ name: 'Taxe de séjour', amount });
    } else if (/clean|ménage|menage/i.test(name)) {
      lines.push({ name: 'Ménage', amount });
    } else {
      lines.push({ name, amount });
    }
  }
  const taxes = Array.isArray(nb?.taxes) ? nb.taxes : [];
  for (const t of taxes) {
    const amount = num(t?.amount);
    if (amount > 0) lines.push({ name: String(t?.name || 'Taxe'), amount });
  }
  return lines;
}

export function stayTotalsFromReservation(reservation, paidAmount) {
  const r = reservation || {};
  const fromNotes = parseTotalEstFromNotes(r.notes || r.comments);
  const stayTotal =
    (Number.isFinite(Number(paidAmount)) && Number(paidAmount) > 0 ? Number(paidAmount) : 0) ||
    num(r.sojoriTotal) ||
    num(r.totalPrice) ||
    fromNotes;
  const alreadyPaid = num(r.alreadyPaid);
  const paymentPaid =
    String(r.paymentStatus || '').toLowerCase() === 'paid' ||
    (alreadyPaid > 0 && stayTotal > 0 && alreadyPaid >= stayTotal * 0.95);
  const stayDue = paymentPaid ? 0 : Math.max(0, stayTotal - alreadyPaid);
  return {
    stayTotal,
    alreadyPaid: paymentPaid && alreadyPaid <= 0 ? stayTotal : alreadyPaid,
    stayDue,
    paid: paymentPaid,
  };
}

function parseTotalEstFromNotes(notes) {
  const m = String(notes || '').match(/totalEst\s*:\s*(\d+(?:\.\d+)?)/i);
  return m ? num(m[1]) : 0;
}

/** Notes invité — masque le dump technique calendrier (source:mews | roomId | totalEst). */
export function guestFacingNotes(notes) {
  const s = String(notes || '').trim();
  if (!s) return '';
  const keys = (s.match(/\b(source|origin|channel|room|roomType|roomId|totalEst)\s*:/gi) || [])
    .length;
  if (keys >= 3) return '';
  return s;
}
