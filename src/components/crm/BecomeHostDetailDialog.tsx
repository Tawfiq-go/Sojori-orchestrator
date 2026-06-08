/**
 * BecomeHostDetailDialog — détail demande site booking (/become-host)
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { tokens as T } from '../dashboard/DashboardV2.components';
import {
  deleteBecomeHostRequest,
  updateBecomeHostStatus,
  type BecomeHostRequest,
  type BecomeHostStatus,
} from '../../services/crmService';

const STATUS_CONFIG: Record<
  BecomeHostStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  pending: { label: 'En attente', color: '#F59E0B', bgColor: '#FFF3E0', icon: '⏳' },
  contacted: { label: 'Contacté', color: '#3B82F6', bgColor: '#E3F2FD', icon: '📧' },
  qualified: { label: 'Qualifié', color: '#9C27B0', bgColor: '#F3E5F5', icon: '✅' },
  matched: { label: 'Matché', color: '#0EA5E9', bgColor: '#E0F2FE', icon: '🤝' },
  converted: { label: 'Converti', color: '#10B981', bgColor: '#E8F5E9', icon: '✅' },
  rejected: { label: 'Rejeté', color: '#EF4444', bgColor: '#FFEBEE', icon: '❌' },
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: T.text3, minWidth: 140 }}>{label}</span>
      <span style={{ color: T.text, flex: 1 }}>{value ?? '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
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

export function BecomeHostDetailDialog({
  open,
  request,
  onClose,
  onStatusChange,
  onDeleted,
}: {
  open: boolean;
  request: BecomeHostRequest | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: BecomeHostStatus) => void;
  onDeleted?: (id: string) => void;
}) {
  const [status, setStatus] = useState<BecomeHostStatus>('pending');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (request?.status) setStatus(request.status);
  }, [request]);

  if (!open || !request) return null;

  const id = String(request.id || request._id);
  const isPm = request.userType === 'professional_pm';

  const handleStatus = async (next: BecomeHostStatus) => {
    setBusy(true);
    try {
      const res = await updateBecomeHostStatus(id, next);
      if (res.success) {
        setStatus(next);
        onStatusChange?.(id, next);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette demande Become Host ?')) return;
    setBusy(true);
    try {
      const res = await deleteBecomeHostRequest(id);
      if (res.success) {
        onDeleted?.(id);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const fmt = (d?: string) => {
    if (!d) return '—';
    try {
      return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch {
      return d;
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100 }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(560px, 94vw)',
          maxHeight: '88vh',
          overflow: 'auto',
          background: T.bg1,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          zIndex: 1101,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>
              {isPm ? '💼 Property Manager' : '🏠 Propriétaire'} · {request.source || 'become-host-page'}
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text }}>{request.fullName}</h2>
            <div style={{ fontSize: 13, color: T.text3, marginTop: 4 }}>{request.email}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 0,
              background: T.bg2,
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <select
            value={status}
            disabled={busy}
            onChange={(e) => handleStatus(e.target.value as BecomeHostStatus)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: STATUS_CONFIG[status]?.bgColor,
              color: STATUS_CONFIG[status]?.color,
              fontWeight: 700,
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>
        </div>

        <Section title="Contact">
          <DetailRow label="Téléphone" value={`${request.countryCode || ''} ${request.phone}`} />
          <DetailRow label="Créé le" value={fmt(request.createdAt)} />
          <DetailRow
            label="Qualification"
            value={request.qualificationCompleted ? '✅ Complète' : '— Incomplète'}
          />
        </Section>

        {isPm ? (
          <Section title="Profil PM">
            <DetailRow label="Société" value={request.company} />
            <DetailRow label="Biens gérés" value={request.numberOfPropertiesManaged} />
            <DetailRow label="Région" value={request.cityRegion} />
            <DetailRow label="PMS" value={request.currentPMS} />
            <DetailRow label="Channel manager" value={request.currentChannelManager} />
          </Section>
        ) : (
          <Section title="Biens">
            <DetailRow label="Nb biens" value={request.numberOfPropertiesOwned} />
            <DetailRow label="Types" value={request.propertyTypes?.join(', ')} />
            <DetailRow label="Villes" value={request.propertyLocations?.join(', ')} />
            <DetailRow label="Gestion" value={request.currentManagementStatus} />
          </Section>
        )}

        <Section title="Objectifs">
          <DetailRow label="Recherche" value={request.lookingFor} />
          <DetailRow label="Horizon" value={request.timeline} />
          <DetailRow label="Source" value={request.hearAboutUs} />
        </Section>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: `1px solid ${T.error}`,
              background: 'transparent',
              color: T.error,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Supprimer
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              padding: '10px 20px',
              borderRadius: 8,
              border: 0,
              background: T.primary,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
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
