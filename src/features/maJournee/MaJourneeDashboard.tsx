/**
 * Ma journée — écran d’atterrissage owner.
 * Design : Downloads/Sojori Ma Journee (standalone).html
 * Données : useMaJourneeData (résas + listing + WA/OTA + tasks).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMaJourneeData, type MaJourneeDay } from './useMaJourneeData';
import './maJournee.css';

function frDateParts(iso: string): { weekday: string; dayMonth: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString('fr-FR', { weekday: 'long' });
  const dayMonth = dt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    dayMonth,
  };
}

function greetingFirstName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null | undefined): string {
  const first = (user?.firstName || '').trim();
  if (first) return first.charAt(0).toUpperCase() + first.slice(1);
  const email = (user?.email || '').trim();
  if (email.includes('@')) {
    const local = email.split('@')[0] || '';
    const token = local.split(/[._-]/)[0] || local;
    if (token) return token.charAt(0).toUpperCase() + token.slice(1);
  }
  return '';
}

export function MaJourneeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [day, setDay] = useState<MaJourneeDay>('today');
  const { loading, model } = useMaJourneeData(day);
  const { weekday, dayMonth } = useMemo(() => frDateParts(model.date), [model.date]);
  const firstName = useMemo(() => greetingFirstName(user), [user]);
  const unreadMsg = model.messages.filter((m) => m.unread).length;
  const isTomorrow = day === 'tomorrow';
  const checkInFilter = isTomorrow ? 'CHECKIN_TOMORROW' : 'CHECKIN_TODAY';
  const checkOutFilter = isTomorrow ? 'CHECKOUT_TOMORROW' : 'CHECKOUT_TODAY';

  if (loading && model.arrivals.length === 0 && model.departures.length === 0) {
    return (
      <div className="mj">
        <div className="loading">Chargement de votre journée…</div>
      </div>
    );
  }

  return (
    <div className="mj">
      <div className="wrap">
        <div className="hdr">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" style={{ alignSelf: 'center' }} aria-hidden>
            <defs>
              <linearGradient id="mj-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F4CF5E" />
                <stop offset="52%" stopColor="#E6B022" />
                <stop offset="100%" stopColor="#B8881A" />
              </linearGradient>
            </defs>
            <circle cx="20" cy="20" r="17" stroke="url(#mj-g)" strokeWidth="2" fill="none" strokeDasharray="3 4" opacity=".5" />
            <circle cx="20" cy="20" r="11" stroke="url(#mj-g)" strokeWidth="1.5" fill="none" opacity=".6" />
            <path d="M 12 26 Q 20 26 20 20 Q 20 14 28 14" stroke="url(#mj-g)" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="20" r="2.5" fill="#E6B022" />
          </svg>
          <span className="wm">sojori</span>
          <span className="sep" />
          <div className="greet">
            <h1>{firstName ? `Bonjour ${firstName}` : 'Bonjour'}</h1>
            <span className="greet-sub">
              {isTomorrow ? 'Voici demain' : 'Voici votre journée'}
            </span>
          </div>
          <div className="day-tabs" role="tablist" aria-label="Jour">
            <button
              type="button"
              role="tab"
              aria-selected={!isTomorrow}
              className={`day-tab${!isTomorrow ? ' on' : ''}`}
              onClick={() => setDay('today')}
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isTomorrow}
              className={`day-tab${isTomorrow ? ' on' : ''}`}
              onClick={() => setDay('tomorrow')}
            >
              Demain
            </button>
          </div>
          <span className="date">
            {weekday} <b>{dayMonth}</b>
            {model.listingCount
              ? ` · ${model.listingCount} annonce${model.listingCount > 1 ? 's' : ''}`
              : ''}
          </span>
        </div>

        <div className="nums">
          <button
            type="button"
            className="num hot clickable"
            onClick={() => navigate(`/reservations?filter=${checkInFilter}`)}
          >
            <span className="n">{model.arrivals.length}</span>
            <span className="t">Arrivées</span>
            <span className="d">{model.arrivalDetail}</span>
          </button>
          <button
            type="button"
            className="num clickable"
            onClick={() => navigate(`/reservations?filter=${checkOutFilter}`)}
          >
            <span className="n">{model.departures.length}</span>
            <span className="t">Départs</span>
            <span className="d">{model.departureDetail}</span>
          </button>
          <button
            type="button"
            className="num clickable"
            onClick={() =>
              navigate(
                isTomorrow
                  ? `/reservations?created=today&startDate=${model.date}&endDate=${model.date}&dateType=creation`
                  : '/reservations?created=today&dateType=creation',
              )
            }
          >
            <span className="n">{model.createdCount}</span>
            <span className="t">Résas créées</span>
            <span className="d">{model.createdChannels}</span>
          </button>
          <button
            type="button"
            className={`num clickable${model.cancelledCount ? ' bad' : ''}`}
            onClick={() => navigate('/reservations?status=cancelled')}
          >
            <span className="n">{model.cancelledCount}</span>
            <span className="t">Résa annulée</span>
            <span className="d">{model.cancelledDetail}</span>
          </button>
          <button
            type="button"
            className="num clickable"
            onClick={() =>
              navigate(
                isTomorrow
                  ? '/tasks?due=tomorrow'
                  : '/tasks?due=today',
              )
            }
          >
            <span className="n">{model.experiences.length}</span>
            <span className="t">{isTomorrow ? 'Expériences demain' : 'Expériences ce jour'}</span>
            <span className="d">
              {model.experiences.length
                ? model.experiences
                    .slice(0, 2)
                    .map((e) => e.title.split('·')[0].trim().slice(0, 22))
                    .join(' · ')
                : 'Aucune'}
            </span>
          </button>
          <button
            type="button"
            className="num clickable"
            onClick={() =>
              navigate('/communications?section=guest&tab=whatsapp&view=unreplied')
            }
          >
            <span className="n">{unreadMsg}</span>
            <span className="t">Messages sans réponse</span>
            <span className="d">WhatsApp + OTA · inbox</span>
          </button>
        </div>

        <div className="cols">
          <div style={{ display: 'grid', gap: 18 }}>
            <section className="panel">
              <header>
                <span className="bar" />
                <h2>Arrivées</h2>
                <span className="cnt">{model.arrivals.length}</span>
                <span className="hint">
                  Arrivé = déclaré · Attendu = pas encore · prête = heure + enregistré + propre
                </span>
              </header>
              {model.arrivals.length === 0 ? (
                <div className="empty">
                  {isTomorrow ? 'Aucune arrivée demain.' : 'Aucune arrivée aujourd’hui.'}
                </div>
              ) : (
                model.arrivals.map((s) => (
                  <div
                    key={s.id}
                    className="stay row-link"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/reservations/${s.reservationId}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/reservations/${s.reservationId}`)}
                  >
                    <span className={`h${s.timeTbd ? ' tbd' : ''}`}>{s.time}</span>
                    <span className="who">
                      <b>{s.guestName}</b>
                      <span>{s.meta}</span>
                    </span>
                    <span className="checks">
                      {s.checks.map((c) => (
                        <span key={c.text} className={`ck ${c.cls}`}>
                          {c.text}
                        </span>
                      ))}
                    </span>
                    <div className="assign">
                      <span className={`as${s.staffName === 'Non assigné' ? ' miss' : ''}`}>
                        Staff · {s.staffName}
                      </span>
                      <span className={`as${s.cleanerName === 'Non assigné' ? ' miss' : ''}`}>
                        Ménage · {s.cleanerName}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </section>

            <section className="panel">
              <header>
                <span className="bar" style={{ background: 'var(--manual)' }} />
                <h2>Départs</h2>
                <span className="cnt" style={{ color: 'var(--manual)' }}>
                  {model.departures.length}
                </span>
              </header>
              {model.departures.length === 0 ? (
                <div className="empty">
                  {isTomorrow ? 'Aucun départ demain.' : 'Aucun départ aujourd’hui.'}
                </div>
              ) : (
                model.departures.map((s) => (
                  <div
                    key={s.id}
                    className="stay row-link"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/reservations/${s.reservationId}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/reservations/${s.reservationId}`)}
                  >
                    <span className="h">{s.time}</span>
                    <span className="who">
                      <b>{s.guestName}</b>
                      <span>{s.meta}</span>
                    </span>
                    <span className="checks">
                      {s.checks.map((c) => (
                        <span key={c.text} className={`ck ${c.cls}`}>
                          {c.text}
                        </span>
                      ))}
                    </span>
                    <div className="assign">
                      <span className={`as${s.staffName === 'Non assigné' ? ' miss' : ''}`}>
                        Staff · {s.staffName}
                      </span>
                      <span className={`as${s.cleanerName === 'Non assigné' ? ' miss' : ''}`}>
                        Ménage · {s.cleanerName}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </section>

            <section className="panel">
              <header>
                <span className="bar" />
                <h2>{isTomorrow ? 'Expériences demain' : 'Expériences aujourd’hui'}</h2>
                <span className="cnt">{model.experiences.length}</span>
              </header>
              {model.experiences.length === 0 ? (
                <div className="empty">
                  {isTomorrow
                    ? 'Aucune expérience planifiée demain.'
                    : 'Aucune expérience planifiée aujourd’hui.'}
                </div>
              ) : (
                model.experiences.map((s) => (
                  <div
                    key={s.id}
                    className="exp row-link"
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      s.taskId
                        ? navigate(`/tasks?taskId=${encodeURIComponent(s.taskId)}`)
                        : navigate('/tasks')
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        s.taskId
                          ? navigate(`/tasks?taskId=${encodeURIComponent(s.taskId)}`)
                          : navigate('/tasks');
                      }
                    }}
                  >
                    <span className="h">{s.time}</span>
                    <span className="who">
                      <b>{s.title}</b>
                      <span>{s.sub}</span>
                    </span>
                    <span className={`tagn${s.tagCrit ? ' crit' : s.tagOk ? ' ok' : ''}`}>{s.tag}</span>
                  </div>
                ))
              )}
            </section>
          </div>

          <section className="panel">
            <header>
              <span className="bar" style={{ background: 'var(--crit)' }} />
              <h2>Messages d&apos;aujourd&apos;hui</h2>
              <span className="cnt" style={{ color: 'var(--crit)' }}>
                {unreadMsg ? `${unreadMsg} sans réponse` : model.messages.length || 0}
              </span>
              <span className="hint">WhatsApp + OTA</span>
            </header>
            {model.messages.length === 0 ? (
              <div className="empty">Aucun message prioritaire pour l’instant.</div>
            ) : (
              model.messages.map((m) => (
                <div
                  key={m.id}
                  className={`msg row-link${m.unread ? ' unread' : ''}`}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(m.href)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(m.href)}
                >
                  <span className={`chan ${m.channel}`}>{m.channel === 'wa' ? 'WA' : 'OTA'}</span>
                  <span className="tx">
                    <b>
                      {m.guestName} <span className="li">{m.listingHint}</span>
                    </b>
                    <p>{m.preview}</p>
                  </span>
                  <span className="st">
                    <span className={`pill ${m.unread ? 'todo' : 'done'}`}>
                      {m.unread ? 'À répondre' : 'Vu'}
                    </span>
                    {m.when ? <span className="when">{m.when}</span> : null}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>

        <p className="foot">
          <b>Ma journée</b> lit les réservations (arrivées / départs), la propreté listing, les tâches
          expériences et les conversations WhatsApp + OTA — sans dépendre de l’orchestration complète.
        </p>
      </div>
    </div>
  );
}

export default MaJourneeDashboard;
