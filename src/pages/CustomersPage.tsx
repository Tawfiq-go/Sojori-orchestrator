import { useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';

/** Fiche client CRM — miroir de `customers` (srv-user). */
type Customer = {
  _id: string;
  fullName?: string;
  email?: string;
  emailIsRelay?: boolean;
  phone?: string;
  phoneWhatsApp?: string;
  whatsappActive?: 'yes' | 'no' | 'unknown';
  country?: string;
  language?: string;
  travelProfile?: string;
  lastChannel?: string;
  firstChannel?: string;
  reservationsCount?: number;
  completedCount?: number;
  nightsTotal?: number;
  revenueMadTotal?: number;
  lastStayAt?: string;
};

type Stats = {
  customers?: number;
  stayed?: number;
  repeat?: number;
  repeatRate?: number;
  contactable?: number;
  whatsapp?: number;
  revenueMad?: number;
  nights?: number;
  byChannel?: Array<{ _id: string; customers: number; revenueMad: number }>;
  byCountry?: Array<{ _id: string; customers: number }>;
};

const CHANNEL_LABEL: Record<string, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking',
  mews: 'MEWS',
  direct: 'Direct',
  sojori_marketplace: 'Marketplace',
  sojori_dashboard: 'Dashboard',
  whatsapp: 'WhatsApp',
  other: 'Autre',
};

const PROFILE_LABEL: Record<string, string> = {
  solo: 'Solo',
  couple: 'Couple',
  family: 'Famille',
  group: 'Groupe',
  unknown: '—',
};

const mad = (n?: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} MAD`;

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [contactableOnly, setContactableOnly] = useState(false);
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [sort, setSort] = useState('lastStayAt');
  /** Vue ranking : top 20 séjours / top 10 CA. `null` = liste paginée 50. */
  const [ranking, setRanking] = useState<null | 'stays20' | 'ca10'>(null);
  const limit = ranking === 'stays20' ? 20 : ranking === 'ca10' ? 10 : 50;

  const params = useMemo(
    () => ({
      page: ranking ? 0 : page,
      limit,
      sort,
      ...(search ? { search } : {}),
      ...(channel ? { channel } : {}),
      ...(contactableOnly ? { contactable: 'true' } : {}),
      ...(repeatOnly ? { minReservations: 2 } : {}),
    }),
    [page, sort, search, channel, contactableOnly, repeatOnly, ranking, limit],
  );

  const applySort = (next: string, nextRanking: typeof ranking = null) => {
    setPage(0);
    setSort(next);
    setRanking(nextRanking);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/api/v1/user/customers', { params })
      .then(({ data }) => {
        if (cancelled) return;
        setRows(data?.data || []);
        setTotal(data?.total || 0);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    apiClient
      .get('/api/v1/user/customers/stats')
      .then(({ data }) => setStats(data?.data || {}))
      .catch(() => setStats({}));
  }, []);

  const pages = Math.ceil(total / limit);

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, marginBottom: 2 }}>👤 Fiches clients</h1>
      <p style={{ color: '#6b6558', fontSize: 12.5, marginBottom: 16 }}>
        Clients dédupliqués depuis les réservations (email, repli téléphone). Comptes
        internes Sojori et emails de test exclus.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        {[
          ['Clients', String(stats.customers ?? '—')],
          ['Ont séjourné', String(stats.stayed ?? '—')],
          ['Récurrents', `${stats.repeat ?? '—'} (${stats.repeatRate ?? 0}%)`],
          ['Contactables', String(stats.contactable ?? '—')],
          ['WhatsApp actif', String(stats.whatsapp ?? '—')],
          ['CA cumulé', mad(stats.revenueMad)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: '#fff',
              border: '1px solid #e5e2da',
              borderRadius: 10,
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: 19, fontWeight: 800 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#7a756c' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          placeholder="Nom, email, téléphone…"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          style={{ padding: '7px 10px', border: '1px solid #e5e2da', borderRadius: 8, minWidth: 220 }}
        />
        <select
          value={channel}
          onChange={(e) => {
            setPage(0);
            setChannel(e.target.value);
          }}
          style={{ padding: '7px 10px', border: '1px solid #e5e2da', borderRadius: 8 }}
        >
          <option value="">Tous les canaux</option>
          {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={ranking ? `__${ranking}` : sort}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__stays20') applySort('reservationsCount', 'stays20');
            else if (v === '__ca10') applySort('revenueMadTotal', 'ca10');
            else applySort(v, null);
          }}
          style={{ padding: '7px 10px', border: '1px solid #e5e2da', borderRadius: 8 }}
        >
          <option value="lastStayAt">Dernier séjour</option>
          <option value="reservationsCount">Nb séjours (tous)</option>
          <option value="revenueMadTotal">CA (tous)</option>
          <option value="nightsTotal">Nuits</option>
          <option value="__stays20">Top 20 — plus de séjours</option>
          <option value="__ca10">Top 10 — chiffre d’affaires</option>
        </select>
        <button
          type="button"
          onClick={() => applySort('reservationsCount', 'stays20')}
          style={{
            padding: '7px 10px',
            borderRadius: 8,
            border: ranking === 'stays20' ? '1px solid #B8881A' : '1px solid #e5e2da',
            background: ranking === 'stays20' ? 'rgba(230,176,34,0.16)' : '#fff',
            fontWeight: 700,
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          Top 20 séjours
        </button>
        <button
          type="button"
          onClick={() => applySort('revenueMadTotal', 'ca10')}
          style={{
            padding: '7px 10px',
            borderRadius: 8,
            border: ranking === 'ca10' ? '1px solid #B8881A' : '1px solid #e5e2da',
            background: ranking === 'ca10' ? 'rgba(230,176,34,0.16)' : '#fff',
            fontWeight: 700,
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          Top 10 CA
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={contactableOnly}
            onChange={(e) => {
              setPage(0);
              setContactableOnly(e.target.checked);
            }}
          />
          Contactables uniquement
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={repeatOnly}
            onChange={(e) => {
              setPage(0);
              setRepeatOnly(e.target.checked);
            }}
          />
          Récurrents
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#7a756c' }}>
          {loading
            ? 'Chargement…'
            : ranking === 'stays20'
              ? 'Top 20 — plus de séjours'
              : ranking === 'ca10'
                ? 'Top 10 — chiffre d’affaires'
                : `${total} client${total > 1 ? 's' : ''}`}
        </span>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e2da', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#faf9f6', textAlign: 'left' }}>
              {(
                [
                  ranking ? ['#', null] : null,
                  ['Client', null],
                  ['Contact', null],
                  ['Pays', null],
                  ['Profil', null],
                  ['Canal', null],
                  ['Séjours', 'reservationsCount'],
                  ['Nuits', 'nightsTotal'],
                  ['CA', 'revenueMadTotal'],
                  ['Dernier', 'lastStayAt'],
                ] as Array<[string, string | null] | null>
              )
                .filter((c): c is [string, string | null] => Boolean(c))
                .map(([h, key]) => (
                  <th
                    key={h}
                    onClick={key ? () => applySort(key, null) : undefined}
                    style={{
                      padding: '8px 10px',
                      fontSize: 11,
                      color: sort === key ? '#B8881A' : '#7a756c',
                      cursor: key ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                    title={key ? 'Trier par cette colonne' : undefined}
                  >
                    {h}
                    {key && sort === key ? ' ↓' : ''}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c._id} style={{ borderTop: '1px solid #eeebe3' }}>
                {ranking ? (
                  <td style={{ padding: '8px 10px', fontWeight: 800, color: '#B8881A' }}>{i + 1}</td>
                ) : null}
                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{c.fullName || '—'}</td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ color: c.emailIsRelay ? '#b45309' : undefined }}>
                    {c.email || '—'}
                    {c.emailIsRelay ? ' (relais OTA)' : ''}
                  </div>
                  <div style={{ color: '#7a756c', fontSize: 11 }}>
                    {c.phone || '—'}
                    {c.whatsappActive === 'yes' ? ' · WhatsApp ✓' : ''}
                  </div>
                </td>
                <td style={{ padding: '8px 10px' }}>{c.country || '—'}</td>
                <td style={{ padding: '8px 10px' }}>
                  {PROFILE_LABEL[c.travelProfile || 'unknown'] || '—'}
                </td>
                <td style={{ padding: '8px 10px' }}>
                  {CHANNEL_LABEL[c.lastChannel || ''] || c.lastChannel || '—'}
                </td>
                <td style={{ padding: '8px 10px' }}>{c.reservationsCount ?? 0}</td>
                <td style={{ padding: '8px 10px' }}>{c.nightsTotal ?? 0}</td>
                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{mad(c.revenueMadTotal)}</td>
                <td style={{ padding: '8px 10px', color: '#7a756c' }}>
                  {c.lastStayAt ? new Date(c.lastStayAt).toLocaleDateString('fr-FR') : '—'}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={ranking ? 10 : 9} style={{ padding: 24, textAlign: 'center', color: '#7a756c' }}>
                  Aucun client. Lancez le rebuild CRM si la collection est vide.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!ranking && pages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ‹ Précédent
          </button>
          <span style={{ fontSize: 12.5 }}>
            Page {page + 1} / {pages}
          </span>
          <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Suivant ›
          </button>
        </div>
      )}
    </div>
  );
}
