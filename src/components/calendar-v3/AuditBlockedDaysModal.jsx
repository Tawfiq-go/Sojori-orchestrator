// ════════════════════════════════════════════════════════════════════
// AuditBlockedDaysModal.jsx — revue calendrier post-import
// Design : Sojori Audit Calendrier (standalone).html
// Logique métier inchangée (corrections locales, Terminer = push 365 j.)
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { ModalPortal } from '../ModalPortal';
import { CLASSIFICATION_LABEL, formatBlockedDayRange } from './auditBlockedDays';
import './auditReviewModal.css';

const IP = {
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M4.5 12.5l5 5L20 6',
  alert: 'M12 9.5v4m0 3.5h.01M10.6 4.6L3.2 17.8A1.8 1.8 0 004.8 20.5h14.4a1.8 1.8 0 001.6-2.7L13.4 4.6a1.6 1.6 0 00-2.8 0Z',
  shield: 'M12 3.5l7.5 3v5c0 4.4-3.1 8-7.5 9.5-4.4-1.5-7.5-5.1-7.5-9.5v-5l7.5-3Zm-2.5 8.5l2 2 4-4',
  arrow: 'M4.5 12h14m-5-5.5l5.5 5.5-5.5 5.5',
  retry: 'M20 12a8 8 0 11-3.2-6.4M20 4v5h-5',
  lock: 'M6.5 11h11v8.5h-11zM9.5 11V8a2.5 2.5 0 015 0v3M12 14.5v2',
};

function Ic({ n, s = 17, w = 1.85, style }) {
  const d = IP[n] || '';
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {d.split('M').filter(Boolean).map((p, i) => (
        <path key={i} d={`M${p}`} />
      ))}
    </svg>
  );
}

function mad(n) {
  return `${Number(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ')} MAD`;
}

function channelKey(name) {
  const s = String(name || '').toLowerCase();
  if (s.includes('airbnb')) return 'airbnb';
  if (s.includes('booking')) return 'booking';
  return 'direct';
}

function Chan({ name }) {
  const k = channelKey(name);
  const label = k === 'airbnb' ? 'Airbnb' : k === 'booking' ? 'Booking' : (name || 'Direct');
  const color = k === 'airbnb' ? 'var(--abnb)' : k === 'booking' ? 'var(--bkg)' : 'var(--direct)';
  return (
    <span className="ch">
      <span className="chd" style={{ background: color }} />
      {label}
    </span>
  );
}

function RowAction({ st, onFix, label = 'Modifier' }) {
  if (st === 'done') {
    return (
      <div className="act">
        <span className="donetxt">
          <Ic n="check" s={14} w={2.6} />
          <span>Corrigé localement ✓</span>
        </span>
      </div>
    );
  }
  if (st === 'busy' || st === 'saving') {
    return (
      <div className="act">
        <button type="button" className="b b-o" disabled>
          <span className="spin" />
          Correction…
        </button>
        <span className="loc">Correction locale — aucun envoi vers les canaux</span>
      </div>
    );
  }
  if (st && st !== 'idle') {
    return (
      <div className="act">
        <button type="button" className="b b-d" onClick={onFix}>
          <Ic n="retry" s={14} />
          Réessayer
        </button>
        <span className="errtxt">
          <Ic n="alert" s={12} style={{ marginTop: 1 }} />
          {String(st)}
        </span>
      </div>
    );
  }
  return (
    <div className="act">
      <button type="button" className="b b-o" onClick={onFix}>
        {label}
      </button>
      <span className="loc">Correction locale — aucun envoi vers les canaux</span>
    </div>
  );
}

function SecHead({ tone, title, n, unit }) {
  const color =
    tone === 'crit' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : tone === 'ok' ? 'var(--ok)' : 'var(--ink3)';
  const cls = tone === 'crit' ? 'tag-crit' : tone === 'warn' ? 'tag-warn' : tone === 'ok' ? 'tag-ok' : 'tag-n';
  return (
    <div className="sechd">
      <span className="sdot" style={{ background: color }} />
      <h3>{title}</h3>
      <span className={`count ${cls}`} style={{ marginLeft: 'auto' }}>
        {`${n} ${unit}`}
      </span>
    </div>
  );
}

function AllClear({ children }) {
  return (
    <div className="clear">
      <div className="ic">
        <Ic n="check" s={19} w={2.8} />
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--ink)' }}>{children}</div>
    </div>
  );
}

function PriceRow({ row, st, draft, onDraft, onFix, min, max }) {
  const suggestion = row.bound === 'min' && min != null ? min : row.bound === 'max' && max != null ? max : row.currentPrice;
  const value = draft != null ? draft : String(suggestion);
  const applied = st === 'done';

  return (
    <div className={`r r-pr${applied ? ' isdone' : ''}`}>
      <div className="c dt" data-l="Date">
        {row.date}
      </div>
      <div className="c rt" data-l="Room type">
        <b style={{ fontSize: 12.5 }}>{row.roomTypeName || '—'}</b>
      </div>
      <div className="c" data-l="Prix importé">
        {applied ? (
          <div className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ok)' }}>
            {mad(value)}
            <br />
            <s style={{ color: 'var(--ink4)', fontWeight: 500, fontSize: 11.5 }}>{mad(row.currentPrice)}</s>
          </div>
        ) : (
          <>
            <div className="old">{mad(row.currentPrice)}</div>
            <span className="tag tag-warn" style={{ marginTop: 4 }}>
              {row.bound === 'min' ? 'Sous le minimum' : 'Au-dessus du maximum'}
            </span>
          </>
        )}
      </div>
      <div className="c bounds" data-l="Bornes">
        {min != null || max != null ? `min ${min ?? '…'} · max ${max ?? '…'}` : '—'}
      </div>
      <div className="c" data-l="Nouveau prix">
        {applied ? (
          <div className="act">
            <span className="donetxt">
              <Ic n="check" s={14} w={2.6} />
              <span>Corrigé localement ✓</span>
            </span>
          </div>
        ) : st === 'busy' ? (
          <div className="act">
            <button type="button" className="b b-o" disabled>
              <span className="spin" />
              Correction…
            </button>
            <span className="loc">Correction locale — aucun envoi vers les canaux</span>
          </div>
        ) : (
          <div>
            <div className="pin">
              <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => onDraft(e.target.value.replace(/[^\d]/g, ''))}
                aria-label={`Nouveau prix pour le ${row.date}`}
              />
              <span>MAD</span>
            </div>
            <div className="sug">
              Suggestion : <b>{mad(suggestion)}</b> ({row.bound === 'min' ? 'minimum' : 'maximum'})
            </div>
            <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
              <button
                type="button"
                className={`b ${st && st !== 'idle' && st !== 'done' && st !== 'busy' ? 'b-d' : 'b-o'}`}
                onClick={onFix}
              >
                {st && st !== 'idle' && st !== 'done' && st !== 'busy' ? (
                  <>
                    <Ic n="retry" s={14} />
                    Réessayer
                  </>
                ) : (
                  'Modifier'
                )}
              </button>
              {st && st !== 'idle' && st !== 'done' && st !== 'busy' ? (
                <span className="errtxt" style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                  <Ic n="alert" s={12} style={{ marginTop: 1 }} />
                  {String(st)}
                </span>
              ) : (
                <span className="loc">Correction locale — aucun envoi vers les canaux</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditBlockedDaysModal({
  open,
  onClose,
  listingName,
  roomTypeName,
  loading,
  error,
  roomTypes = [],
  postImportAudit = null,
  calendarReviewActive = false,
  onRelease,
  onBlockForReservation,
  onFixPrice,
  onFinishCalendarImport,
  finishingCalendarImport = false,
}) {
  const [releaseState, setReleaseState] = React.useState({});
  const [blockState, setBlockState] = React.useState({});
  const [priceFixState, setPriceFixState] = React.useState({});
  const [priceDrafts, setPriceDrafts] = React.useState({});
  const [confirmFinish, setConfirmFinish] = React.useState(false);
  const [minInput, setMinInput] = React.useState('');
  const [maxInput, setMaxInput] = React.useState('');
  const [priceCheck, setPriceCheck] = React.useState(null);
  const bodyRef = React.useRef(null);
  const refs = {
    ob: React.useRef(null),
    bl: React.useRef(null),
    pr: React.useRef(null),
    rs: React.useRef(null),
  };

  React.useEffect(() => {
    if (!open) {
      setReleaseState({});
      setBlockState({});
      setPriceFixState({});
      setPriceDrafts({});
      setConfirmFinish(false);
      setPriceCheck(null);
      setMinInput('');
      setMaxInput('');
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || loading) return;
    const suggested = postImportAudit?.suggestedBasePrice;
    if (suggested == null || !(Number(suggested) > 0)) return;
    const base = Number(suggested);
    setMinInput((prev) => (prev === '' ? String(Math.round(base * 0.8)) : prev));
    setMaxInput((prev) => (prev === '' ? String(Math.round(base * 1.2)) : prev));
  }, [open, loading, postImportAudit?.suggestedBasePrice]);

  // Auto-vérifie min/max dès que les bornes + jours prix sont prêts
  React.useEffect(() => {
    if (!open || loading || priceCheck?.checked) return;
    const min = minInput.trim() === '' ? null : Number(minInput);
    const max = maxInput.trim() === '' ? null : Number(maxInput);
    const days = postImportAudit?.priceDays || [];
    if (days.length === 0) return;
    if ((min == null || Number.isNaN(min)) && (max == null || Number.isNaN(max))) return;
    if (min != null && max != null && min > max) return;

    const outOfRange = [];
    for (const day of days) {
      const price = Number(day.currentPrice);
      if (!(price > 0)) continue;
      if (min != null && !Number.isNaN(min) && price < min) {
        outOfRange.push({ ...day, reason: `sous le min (${min})`, bound: 'min' });
      } else if (max != null && !Number.isNaN(max) && price > max) {
        outOfRange.push({ ...day, reason: `au-dessus du max (${max})`, bound: 'max' });
      }
    }
    setPriceCheck({ min, max, outOfRange, checked: true });
  }, [open, loading, minInput, maxInput, postImportAudit?.priceDays, priceCheck?.checked]);

  if (!open) return null;

  const summary = postImportAudit?.summary || null;
  const overbookingRisks = postImportAudit?.overbookingRisks || [];
  const reservations = postImportAudit?.reservations || [];
  const unmappedReservations = postImportAudit?.unmappedReservations || [];
  const referenceBase =
    postImportAudit?.suggestedBasePrice != null && Number(postImportAudit.suggestedBasePrice) > 0
      ? Number(postImportAudit.suggestedBasePrice)
      : null;

  const allRanges = roomTypes.flatMap((rt) =>
    (rt.ranges || []).map((range) => ({
      ...range,
      roomTypeName: rt.roomTypeName,
      roomTypeId: rt.roomTypeId,
      roomNumber: rt.roomNumber,
    })),
  );

  const rangeKey = (r) => `${r.roomTypeId}:${r.from}:${r.to}`;
  const priceRowKey = (r) => `${r.roomTypeId}:${r.date}`;

  const openOverbooking = overbookingRisks.length;
  const openBlocked = allRanges.filter((r) => {
    const key = rangeKey(r);
    const st = r.classification === 'missing_reservation_block' ? blockState[key] : releaseState[key];
    return st !== 'done';
  }).length;
  const outOfRange = priceCheck?.outOfRange || [];
  const openPrices = outOfRange.filter((r) => priceFixState[priceRowKey(r)] !== 'done').length;
  const critOpen = openOverbooking + allRanges.filter((r) => r.classification === 'missing_reservation_block' && blockState[rangeKey(r)] !== 'done').length;
  const warnOpen = openBlocked + openPrices;
  const fixedCount =
    Object.values(releaseState).filter((v) => v === 'done').length +
    Object.values(blockState).filter((v) => v === 'done').length +
    Object.values(priceFixState).filter((v) => v === 'done').length;
  const totalActions = allRanges.length + outOfRange.length + overbookingRisks.length;
  const noAnomaly = !loading && !error && openOverbooking === 0 && openBlocked === 0 && openPrices === 0;

  const jump = (k) => {
    const el = refs[k]?.current;
    const body = bodyRef.current;
    if (!el || !body) return;
    body.scrollTop += el.getBoundingClientRect().top - body.getBoundingClientRect().top - 12;
  };

  const handleRelease = async (range) => {
    if (!onRelease) return;
    const key = rangeKey(range);
    setReleaseState((s) => ({ ...s, [key]: 'busy' }));
    try {
      await onRelease(range);
      setReleaseState((s) => ({ ...s, [key]: 'done' }));
    } catch (err) {
      setReleaseState((s) => ({ ...s, [key]: err?.message || 'Échec de la libération' }));
    }
  };

  const handleBlock = async (range) => {
    if (!onBlockForReservation) return;
    const key = rangeKey(range);
    setBlockState((s) => ({ ...s, [key]: 'busy' }));
    try {
      await onBlockForReservation(range);
      setBlockState((s) => ({ ...s, [key]: 'done' }));
    } catch (err) {
      setBlockState((s) => ({ ...s, [key]: err?.message || 'Échec du blocage' }));
    }
  };

  const handleFixPrice = async (row) => {
    if (!onFixPrice) return;
    const key = priceRowKey(row);
    const draft = priceDrafts[key];
    const suggestion =
      row.bound === 'min' && priceCheck?.min != null
        ? priceCheck.min
        : row.bound === 'max' && priceCheck?.max != null
          ? priceCheck.max
          : row.currentPrice;
    const price = draft != null && draft !== '' ? Number(draft) : Number(suggestion);
    if (!(price > 0) || Number.isNaN(price)) {
      window.alert('Prix invalide');
      return;
    }
    setPriceFixState((s) => ({ ...s, [key]: 'busy' }));
    try {
      await onFixPrice({ ...row, newPrice: price });
      setPriceFixState((s) => ({ ...s, [key]: 'done' }));
      setPriceCheck((prev) => {
        if (!prev?.checked) return prev;
        return {
          ...prev,
          outOfRange: (prev.outOfRange || []).filter(
            (d) => !(d.date === row.date && String(d.roomTypeId) === String(row.roomTypeId)),
          ),
        };
      });
    } catch (err) {
      setPriceFixState((s) => ({ ...s, [key]: err?.message || 'Échec correction prix' }));
    }
  };

  const runFinish = async () => {
    console.log('[AuditModal] clic « Oui, publier 365 jours »', {
      hasHandler: Boolean(onFinishCalendarImport),
      finishingCalendarImport,
    });
    if (!onFinishCalendarImport) return;
    await onFinishCalendarImport();
    console.log('[AuditModal] onFinishCalendarImport terminé');
  };

  return (
    <ModalPortal>
      <div className="arm">
        <div
          className="scrim"
          role="dialog"
          aria-modal="true"
          aria-label="Revue calendrier post-import"
          onClick={onClose}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '.14em',
                      textTransform: 'uppercase',
                      color: 'var(--goldDeep)',
                      marginBottom: 7,
                    }}
                  >
                    {calendarReviewActive ? 'Mode import · avant publication' : 'Audit calendrier'}
                  </div>
                  <h1 style={{ fontSize: 21, marginBottom: 5 }}>
                    {listingName || 'Revue calendrier post-import'}
                  </h1>
                  <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5, maxWidth: 620 }}>
                    {roomTypeName ? `${roomTypeName} · ` : ''}
                    Contrôlez ce que l’import a produit, corrigez ce qui doit l’être, puis publiez quand vous êtes prêt.
                  </p>
                </div>
                <button type="button" className="xbtn" onClick={onClose} aria-label="Fermer et rester en mode Import">
                  <Ic n="x" s={17} />
                </button>
              </div>

              {calendarReviewActive ? (
                <div className="promise">
                  <span style={{ color: 'var(--goldDeep)', marginTop: 1 }}>
                    <Ic n="shield" s={18} />
                  </span>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink2)' }}>
                    <b style={{ color: 'var(--ink)' }}>Rien ne quitte Sojori pendant cette revue.</b> Chaque correction
                    reste locale. L’envoi vers les canaux n’a lieu qu’au moment où vous cliquez sur{' '}
                    <b style={{ color: 'var(--ink)' }}>Terminer import</b>.
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '14px 0 15px' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    color: 'var(--ink3)',
                  }}
                >
                  Résumé
                </span>
                {loading ? (
                  <span className="tag tag-n">Analyse en cours…</span>
                ) : error ? (
                  <span className="tag tag-crit">
                    <Ic n="alert" s={12} />
                    Erreur
                  </span>
                ) : (
                  <>
                    {critOpen > 0 ? (
                      <span className="tag tag-crit">
                        <Ic n="alert" s={12} />
                        <span>{`${critOpen} risque${critOpen > 1 ? 's' : ''} critique${critOpen > 1 ? 's' : ''}`}</span>
                      </span>
                    ) : (
                      <span className="tag tag-ok">
                        <Ic n="check" s={12} w={2.6} />
                        <span>Aucun risque critique</span>
                      </span>
                    )}
                    {warnOpen > 0 ? (
                      <span className="tag tag-warn">{`${warnOpen} avertissement${warnOpen > 1 ? 's' : ''}`}</span>
                    ) : (
                      <span className="tag tag-ok">Aucun avertissement</span>
                    )}
                    <span className="tag tag-n">{`${reservations.length} réservations importées`}</span>
                    {fixedCount > 0 ? (
                      <span className="tag tag-ok">{`${fixedCount} / ${totalActions || fixedCount} corrigé${fixedCount > 1 ? 's' : ''} localement`}</span>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="mbody" ref={bodyRef}>
              {loading ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink3)', fontSize: 13.5 }}>
                  Analyse calendrier · réservations · overbooking · prix…
                </div>
              ) : null}

              {!loading && error ? (
                <div className="sec">
                  <div style={{ padding: 18, color: 'var(--danger)', fontSize: 13.5 }}>Erreur : {error}</div>
                </div>
              ) : null}

              {!loading && !error ? (
                <>
                  <div className="triage">
                    <button type="button" className={`tcard ${openOverbooking ? 'crit' : 'done'}`} onClick={() => jump('ob')}>
                      <span className="tnum" style={{ color: openOverbooking ? 'var(--danger)' : 'var(--ok)' }}>
                        {openOverbooking}
                      </span>
                      <span className="tlab">Overbooking</span>
                      <span className="tmeta">{openOverbooking ? 'À trancher' : 'Résolu'}</span>
                    </button>
                    <button type="button" className={`tcard ${openBlocked ? 'warn' : 'done'}`} onClick={() => jump('bl')}>
                      <span className="tnum" style={{ color: openBlocked ? 'var(--warn)' : 'var(--ok)' }}>
                        {openBlocked}
                      </span>
                      <span className="tlab">Jours bloqués ou incohérents</span>
                      <span className="tmeta">{openBlocked ? 'À vérifier' : 'Résolu'}</span>
                    </button>
                    <button type="button" className={`tcard ${openPrices ? 'warn' : 'done'}`} onClick={() => jump('pr')}>
                      <span className="tnum" style={{ color: openPrices ? 'var(--warn)' : 'var(--ok)' }}>
                        {openPrices}
                      </span>
                      <span className="tlab">Prix hors min/max</span>
                      <span className="tmeta">{openPrices ? 'À corriger' : 'Résolu'}</span>
                    </button>
                    <button type="button" className="tcard" onClick={() => jump('rs')}>
                      <span className="tnum">{reservations.length}</span>
                      <span className="tlab">Réservations importées</span>
                      <span className="tmeta">Inventaire</span>
                    </button>
                  </div>

                  {noAnomaly ? (
                    <div className="sec">
                      <div style={{ padding: '40px 26px', textAlign: 'center' }}>
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: 'var(--okWash)',
                            border: '1px solid var(--okLine)',
                            color: 'var(--ok)',
                            display: 'grid',
                            placeItems: 'center',
                            margin: '0 auto 16px',
                          }}
                        >
                          <Ic n="check" s={26} w={2.6} />
                        </div>
                        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Aucune anomalie détectée</h3>
                        <p style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.55, maxWidth: 400, margin: '0 auto' }}>
                          Les 365 prochains jours sont cohérents. Vous pouvez terminer l’import.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div ref={refs.ob}>
                    <div className="sec">
                      <SecHead
                        tone={openOverbooking ? 'crit' : 'ok'}
                        title="Overbooking"
                        n={openOverbooking || overbookingRisks.length}
                        unit={openOverbooking ? (openOverbooking > 1 ? 'conflits' : 'conflit') : 'résolu'}
                      />
                      <div className="secsub">
                        Capacité dépassée sur une nuit. À trancher avant publication — aucune action auto ici.
                      </div>
                      {overbookingRisks.length === 0 ? (
                        <AllClear>Aucun overbooking. Rien n’a encore été envoyé vers les canaux.</AllClear>
                      ) : (
                        <>
                          <div className="hd r-ob">
                            <span>Date</span>
                            <span>Room type</span>
                            <span>Réservations</span>
                            <span style={{ textAlign: 'right' }}>Capacité</span>
                          </div>
                          {overbookingRisks.map((r) => (
                            <div key={`${r.date}-${r.roomTypeId}`} className="r r-ob">
                              <div className="c dt" data-l="Date">
                                {r.date}
                              </div>
                              <div className="c rt" data-l="Room type">
                                <b>{r.roomTypeName || '—'}</b>
                              </div>
                              <div className="c cause" data-l="Réservations">
                                <b>{(r.reservationNumbers || []).join(', ') || '—'}</b>
                                <div style={{ color: 'var(--ink3)', marginTop: 2 }}>
                                  {r.reservationCount} résa · capacité {r.capacity}
                                </div>
                              </div>
                              <div className="c" data-l="Sévérité" style={{ textAlign: 'right' }}>
                                <span className="tag tag-crit">Critique</span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div ref={refs.bl}>
                    <div className="sec">
                      <SecHead
                        tone={openBlocked ? 'warn' : 'ok'}
                        title="Jours bloqués ou disponibilités incohérentes"
                        n={openBlocked || allRanges.length}
                        unit={openBlocked ? (openBlocked > 1 ? 'jours' : 'jour') : 'résolu'}
                      />
                      <div className="secsub">
                        Jours fermés sans réservation, ou ouverts alors qu’un séjour les couvre. « Modifier » aligne la
                        disponibilité localement — sans envoi vers les canaux.
                      </div>
                      {allRanges.length === 0 ? (
                        <AllClear>Toutes les disponibilités sont cohérentes. Rien n’a encore été envoyé vers les canaux.</AllClear>
                      ) : (
                        <>
                          <div className="hd r-bl">
                            <span>Période</span>
                            <span>Room type</span>
                            <span>Cause &amp; réservation</span>
                            <span style={{ textAlign: 'right' }}>Action</span>
                          </div>
                          {allRanges.map((range) => {
                            const key = rangeKey(range);
                            const needsBlock = range.classification === 'missing_reservation_block';
                            const st = needsBlock ? blockState[key] : releaseState[key];
                            return (
                              <div key={key} className={`r r-bl${st === 'done' ? ' isdone' : ''}`}>
                                <div className="c dt" data-l="Période">
                                  {formatBlockedDayRange(range)}
                                </div>
                                <div className="c rt" data-l="Room type">
                                  <b>{range.roomTypeName || '—'}</b>
                                </div>
                                <div className="c cause" data-l="Cause et réservation">
                                  <b>{CLASSIFICATION_LABEL[range.classification] || range.classification}</b>
                                  {(range.reservationNumbers || []).length > 0 ? (
                                    <div style={{ marginTop: 5, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      {(range.reservationNumbers || []).map((code) => (
                                        <span key={code} className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>
                                          {code}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ marginTop: 5 }}>
                                      <span className="tag tag-n">Aucune réservation</span>
                                    </div>
                                  )}
                                </div>
                                <div className="c" data-l="Action">
                                  {needsBlock ? (
                                    onBlockForReservation ? (
                                      <RowAction
                                        st={st || 'idle'}
                                        onFix={() => void handleBlock(range)}
                                        label="Modifier · bloquer"
                                      />
                                    ) : (
                                      <span className="tag tag-n">À rebloquer</span>
                                    )
                                  ) : onRelease ? (
                                    <RowAction
                                      st={st || 'idle'}
                                      onFix={() => void handleRelease(range)}
                                      label="Modifier · libérer"
                                    />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>

                  <div ref={refs.pr}>
                    <div className="sec">
                      <SecHead
                        tone={openPrices ? 'warn' : 'ok'}
                        title="Vérification des prix min/max"
                        n={openPrices || outOfRange.length}
                        unit={openPrices ? (openPrices > 1 ? 'jours' : 'jour') : 'résolu'}
                      />
                      <div className="secsub">
                        Seuls les jours <b>hors des bornes min/max</b> sont listés. Le prix de base est un repère, non
                        une règle de comparaison.
                      </div>
                      <div className="baseref">
                        <span
                          className="mono"
                          style={{
                            fontSize: 9.5,
                            fontWeight: 600,
                            letterSpacing: '.11em',
                            textTransform: 'uppercase',
                            color: 'var(--ink3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                          }}
                        >
                          <Ic n="lock" s={13} />
                          Prix de base — repère, non modifiable ici
                        </span>
                        <span className="rl">
                          <b>{referenceBase != null ? mad(referenceBase) : '—'}</b>
                          <span>{roomTypeName || listingName || 'Listing'}</span>
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span className="mono" style={{ fontSize: 9, color: 'var(--ink3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                              Min
                            </span>
                            <input
                              className="pin"
                              style={{ padding: '6px 10px', maxWidth: 100, border: '1px solid var(--line)', borderRadius: 8 }}
                              type="number"
                              value={minInput}
                              onChange={(e) => {
                                setMinInput(e.target.value);
                                setPriceCheck(null);
                              }}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span className="mono" style={{ fontSize: 9, color: 'var(--ink3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                              Max
                            </span>
                            <input
                              style={{ padding: '6px 10px', maxWidth: 100, border: '1px solid var(--line)', borderRadius: 8 }}
                              type="number"
                              value={maxInput}
                              onChange={(e) => {
                                setMaxInput(e.target.value);
                                setPriceCheck(null);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      {outOfRange.length === 0 ? (
                        <AllClear>Tous les prix sont dans les bornes. Rien n’a encore été envoyé vers les canaux.</AllClear>
                      ) : (
                        <>
                          <div className="hd r-pr">
                            <span>Date</span>
                            <span>Room type</span>
                            <span>Prix importé</span>
                            <span>Bornes</span>
                            <span>Nouveau prix</span>
                          </div>
                          {outOfRange.slice(0, 50).map((row) => {
                            const key = priceRowKey(row);
                            return (
                              <PriceRow
                                key={key}
                                row={row}
                                st={priceFixState[key] || 'idle'}
                                draft={priceDrafts[key]}
                                onDraft={(v) => setPriceDrafts((s) => ({ ...s, [key]: v }))}
                                onFix={() => void handleFixPrice(row)}
                                min={priceCheck?.min}
                                max={priceCheck?.max}
                              />
                            );
                          })}
                          {outOfRange.length > 50 ? (
                            <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--ink3)' }}>
                              + {outOfRange.length - 50} autre(s) jour(s)
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>

                  <div ref={refs.rs}>
                    <div className="sec">
                      <SecHead tone="none" title="Réservations importées" n={reservations.length} unit="réservations" />
                      <div className="secsub">
                        Inventaire de ce que l’import a créé. Aucune action ici : les conflits se traitent dans Overbooking /
                        Jours bloqués.
                      </div>
                      {reservations.length === 0 ? (
                        <AllClear>Aucune réservation active sur la période.</AllClear>
                      ) : (
                        <>
                          <div className="hd r-rs">
                            <span>Client</span>
                            <span>Canal</span>
                            <span>Séjour</span>
                            <span>Room type</span>
                            <span style={{ textAlign: 'right' }}>État</span>
                          </div>
                          {reservations.slice(0, 40).map((r, i) => (
                            <div key={`${r.reservationNumber}-${i}`} className="r r-rs">
                              <div className="c" data-l="Client">
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.guestName || '—'}</div>
                                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 1 }}>
                                  {r.reservationNumber || '—'}
                                </div>
                              </div>
                              <div className="c" data-l="Canal">
                                <Chan name={r.channelName} />
                              </div>
                              <div className="c" data-l="Séjour" style={{ fontSize: 12.5, color: 'var(--ink2)' }}>
                                {r.from} → {r.to}
                              </div>
                              <div className="c" data-l="Room type" style={{ fontSize: 12.5, color: 'var(--ink2)' }}>
                                {r.roomTypeId
                                  ? roomTypes.find((rt) => String(rt.roomTypeId) === String(r.roomTypeId))?.roomTypeName ||
                                    String(r.roomTypeId).slice(-6)
                                  : '—'}
                              </div>
                              <div className="c" data-l="État" style={{ textAlign: 'right' }}>
                                <span className="tag tag-ok">{r.status || 'Importée'}</span>
                              </div>
                            </div>
                          ))}
                          <div
                            style={{
                              padding: '11px 16px',
                              borderTop: '1px solid var(--line2)',
                              background: 'var(--paper2)',
                              fontSize: 12,
                              color: 'var(--ink2)',
                              display: 'flex',
                              gap: 16,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span>
                              <b style={{ color: 'var(--ink)' }}>{reservations.length}</b> réservations
                            </span>
                            <span>
                              <b style={{ color: 'var(--ink)' }}>{summary?.reservedNights || 0}</b> nuits
                            </span>
                            {unmappedReservations.length > 0 ? (
                              <span>
                                <b style={{ color: 'var(--danger)' }}>{unmappedReservations.length}</b> sans room type
                              </span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mfoot">
              {!confirmFinish ? (
                <div className="footrow">
                  <button type="button" className="b b-lg b-o" onClick={onClose}>
                    Fermer — rester en mode Import
                  </button>
                  <p className="footnote">
                    {critOpen > 0 ? (
                      <>
                        Il reste <b>{critOpen} risque{critOpen > 1 ? 's' : ''} critique{critOpen > 1 ? 's' : ''}</b> non
                        corrigé{critOpen > 1 ? 's' : ''}.
                      </>
                    ) : (
                      <>
                        Prêt à publier. <b>365 jours</b> seront envoyés.
                      </>
                    )}
                  </p>
                  {calendarReviewActive && onFinishCalendarImport ? (
                    <button type="button" className="b b-lg b-gold" onClick={() => setConfirmFinish(true)}>
                      Terminer import
                      <Ic n="arrow" s={17} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="confirm">
                  <h3>Publier vers les canaux ?</h3>
                  <p>
                    Cette action publiera les prix et disponibilités des 365 prochains jours vers les canaux.
                  </p>
                  {critOpen > 0 ? (
                    <div className="warnline">
                      <Ic n="alert" s={15} style={{ marginTop: 1 }} />
                      <span>
                        <b>
                          {critOpen} risque{critOpen > 1 ? 's' : ''} critique{critOpen > 1 ? 's' : ''}
                        </b>{' '}
                        non corrigé{critOpen > 1 ? 's' : ''}. Publier maintenant enverra le calendrier en l’état.
                      </span>
                    </div>
                  ) : null}
                  <div className="footrow" style={{ marginTop: 13 }}>
                    <button type="button" className="b b-lg b-o" onClick={() => setConfirmFinish(false)}>
                      Non, rester en Import
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                      type="button"
                      className="b b-lg b-gold"
                      disabled={finishingCalendarImport}
                      onClick={() => void runFinish()}
                    >
                      {finishingCalendarImport ? (
                        <>
                          <span className="spin" style={{ borderTopColor: 'var(--goldDeep)' }} />
                          Publication 365 j.…
                        </>
                      ) : (
                        'Oui, publier 365 jours'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
