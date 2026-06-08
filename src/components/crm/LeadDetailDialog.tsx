import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { tokens as T } from '../dashboard/DashboardV2.components';
import type { LeadDetail } from '../../services/crmService';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: T.text3, minWidth: 150 }}>{label}</span>
      <span style={{ color: T.text, flex: 1 }}>{value ?? '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: T.primaryDeep,
          borderBottom: `2px solid ${T.primary}`,
          paddingBottom: 4,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export function LeadDetailDialog({
  open,
  row,
  onClose,
}: {
  open: boolean;
  row: Record<string, unknown> | null;
  onClose: () => void;
}) {
  if (!open || !row) return null;

  const r = row as LeadDetail & Record<string, unknown>;
  const lead = (r.lead as Record<string, unknown> | undefined) || {};
  const hasDetail = r.has_detail !== false && Boolean(r.id || r._id);
  const solutions = Array.isArray(r.current_solutions) ? (r.current_solutions as string[]) : [];

  const formatDate = (raw?: unknown) => {
    if (!raw) return '—';
    try {
      return format(new Date(String(raw)), "dd MMMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return '—';
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.35)' }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(520px, 100vw)',
          zIndex: 8001,
          background: T.bg1,
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            background: T.primary,
            color: '#fff',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              {hasDetail ? 'Fiche qualification' : 'Demande simple'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {String(lead.email || r.email || '')}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 0, background: 'transparent', color: '#fff', fontSize: 22, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          <Section title="Contact">
            <Row label="Nom" value={String(lead.name || r.fullName || `${r.firstName || ''} ${r.lastName || ''}`.trim() || '—')} />
            <Row label="Email" value={String(lead.email || r.email || '—')} />
            <Row label="Téléphone" value={String(lead.phone_number || r.phone || '—')} />
          </Section>

          <Section title="Entreprise">
            <Row label="Société" value={String(r.company_name || r.companyName || '—')} />
            <Row label="Rôle" value={String(r.role_in_company || r.roleInCompany || '—')} />
            <Row label="Nb biens" value={String(r.number_of_properties ?? r.numberOfProperties ?? '—')} />
            <Row label="Timeline" value={String(r.timeline || '—')} />
          </Section>

          {hasDetail && (
            <Section title="Qualification (étape 3)">
              <Row label="PMS" value={String(r.current_pms || r.currentPMS || '—')} />
              <Row label="Channel manager" value={String(r.current_channel_manager || r.currentChannelManager || '—')} />
              <Row
                label="Solutions actuelles"
                value={
                  solutions.length ? (
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {solutions.map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: T.bg3,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <Row label="Croissance prévue" value={r.planned_growth != null ? `${r.planned_growth} propriétés` : '—'} />
              <Row label="Type client" value={String(r.client_type || '—')} />
              <Row label="Secteur" value={String(r.industry || '—')} />
              {r.notes ? <Row label="Notes" value={String(r.notes)} /> : null}
            </Section>
          )}

          <Section title="Dates">
            <Row label="Créé le" value={formatDate(r.created_at || r.createdAt || lead.created_at)} />
          </Section>
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, textAlign: 'right' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.bg2,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}
