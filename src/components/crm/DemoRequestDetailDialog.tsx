/**
 * Détail d'une demande démo (funnel site → RDV → qualification).
 * Porté depuis sojori-dashboard DemoRequestDetailDialog.
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { tokens as T } from '../dashboard/DashboardV2.components';
import {
  deleteAppointment,
  deleteDemoRequest,
  updateDemoRequestStatus,
  type DemoRequest,
} from '../../services/crmService';

const STATUS_CONFIG: Record<
  DemoRequest['status'],
  { label: string; color: string; bgColor: string; icon: string }
> = {
  pending: { label: 'En attente', color: '#F59E0B', bgColor: '#FFF3E0', icon: '⏳' },
  contacted: { label: 'Contacté', color: '#3B82F6', bgColor: '#E3F2FD', icon: '📧' },
  qualified: { label: 'Qualifié', color: '#9C27B0', bgColor: '#F3E5F5', icon: '✅' },
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

export function DemoRequestDetailDialog({
  open,
  request,
  onClose,
  onStatusChange,
  onRequestDeleted,
  onAppointmentDeleted,
  onNotify,
}: {
  open: boolean;
  request: DemoRequest | null;
  onClose: () => void;
  onStatusChange?: (requestId: string, status: DemoRequest['status']) => void;
  onRequestDeleted?: (requestId: string) => void;
  onAppointmentDeleted?: (requestId: string) => void;
  onNotify?: (message: string) => void;
}) {
  const [currentStatus, setCurrentStatus] = useState<DemoRequest['status']>('pending');
  const [updating, setUpdating] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<'request' | 'appointment' | null>(null);

  useEffect(() => {
    if (request?.status) setCurrentStatus(request.status);
  }, [request]);

  if (!open || !request) return null;

  const requestId = String(request.id || request._id || '');
  const linked = request.linkedDemoAppointment;
  const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), "dd MMMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return '—';
    }
  };

  const notify = (message: string) => {
    if (onNotify) onNotify(message);
    else window.alert(message);
  };

  const handleStatusChange = async (newStatus: DemoRequest['status']) => {
    if (newStatus === currentStatus || !requestId) return;
    setUpdating(true);
    try {
      const data = await updateDemoRequestStatus(requestId, newStatus);
      if (data.success) {
        setCurrentStatus(newStatus);
        onStatusChange?.(requestId, newStatus);
      }
    } catch (error) {
      console.error('[DemoRequestDetailDialog] status update failed', error);
      notify('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdating(false);
    }
  };

  const runDeleteAppointment = async () => {
    if (!linked?.id) return;
    setDeleteBusy(true);
    try {
      const data = await deleteAppointment(linked.id);
      if (data.success) {
        notify('Rendez-vous supprimé — la demande est conservée.');
        onAppointmentDeleted?.(requestId);
        setConfirmDelete(null);
        onClose();
      } else {
        notify('Suppression impossible');
      }
    } catch (e) {
      console.error(e);
      notify('Erreur lors de la suppression du RDV');
    } finally {
      setDeleteBusy(false);
    }
  };

  const runDeleteRequest = async () => {
    setDeleteBusy(true);
    try {
      const data = await deleteDemoRequest(requestId);
      if (data.success) {
        notify('Demande et rendez-vous associés supprimés.');
        onRequestDeleted?.(requestId);
        setConfirmDelete(null);
        onClose();
      } else {
        notify('Suppression impossible');
      }
    } catch (e) {
      console.error(e);
      notify('Erreur lors de la suppression');
    } finally {
      setDeleteBusy(false);
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
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Demande démo / contact</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{request.email}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 0,
              background: 'transparent',
              color: '#fff',
              fontSize: 22,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {/* Parcours client */}
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: T.bg2,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              fontSize: 12,
              color: T.text2,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: T.text }}>Parcours client :</strong> formulaire simple (email, tél, entreprise)
            → prise de rendez-vous → formulaire qualification complet (PMS, channel, pricing, défis…).
            {!request.qualificationCompleted && (
              <span style={{ display: 'block', marginTop: 6, color: T.warning, fontWeight: 700 }}>
                Étape 1 seulement — qualification pas encore complétée.
              </span>
            )}
          </div>

          {!request.qualificationCompleted && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: '#FFF3E0',
                border: '1px solid #FF9800',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: '#E65100',
              }}
            >
              ⚠️ Demande non qualifiée — informations limitées (étape 1 du funnel)
            </div>
          )}

          <Section title="Contact">
            <DetailRow label="Email" value={request.email} />
            <DetailRow
              label="Téléphone"
              value={[request.countryCode, request.phone].filter(Boolean).join(' ') || '—'}
            />
            <DetailRow label="Nom" value={request.fullName} />
            <DetailRow label="Entreprise" value={request.company} />
            <DetailRow label="Source" value={request.source || 'website'} />
          </Section>

          <Section title="Projet">
            <DetailRow label="Nombre de biens" value={request.numberOfProperties} />
            <DetailRow label="Timeline" value={request.timeline} />
            <DetailRow label="Type demande" value={request.requestType} />
            <DetailRow
              label="Qualification"
              value={request.qualificationCompleted ? '✅ Complétée' : '⏳ Non complétée'}
            />
          </Section>

          <Section title="Statut CRM">
            <DetailRow
              label="Statut actuel"
              value={
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
                    background: statusConfig.bgColor,
                    color: statusConfig.color,
                  }}
                >
                  {statusConfig.icon} {statusConfig.label}
                </span>
              }
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {(Object.keys(STATUS_CONFIG) as DemoRequest['status'][]).map((status) => {
                const cfg = STATUS_CONFIG[status];
                const active = currentStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={updating || active}
                    onClick={() => void handleStatusChange(status)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: `1px solid ${cfg.color}`,
                      background: active ? cfg.color : 'transparent',
                      color: active ? '#fff' : cfg.color,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: updating || active ? 'default' : 'pointer',
                      opacity: updating ? 0.6 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {request.qualificationCompleted && (
            <Section title="Qualification (étape 2)">
              <DetailRow label="PMS actuel" value={request.currentPMS} />
              <DetailRow label="Channel manager" value={request.currentChannelManager} />
              <DetailRow label="Tarification dynamique" value={request.currentDynamicPricing} />
              <DetailRow label="WhatsApp actuel" value={request.currentWhatsApp} />
              {request.biggestChallenges && (
                <DetailRow label="Défis" value={request.biggestChallenges} />
              )}
              {request.expectations && <DetailRow label="Attentes" value={request.expectations} />}
            </Section>
          )}

          {linked?.id && (
            <Section title="Rendez-vous">
              <DetailRow
                label="Date / horaire"
                value={`${format(new Date(linked.date), 'EEEE d MMMM yyyy', { locale: fr })} · ${linked.startTime} – ${linked.endTime}`}
              />
              <DetailRow label="Statut RDV" value={linked.status} />
            </Section>
          )}

          <Section title="Métadonnées">
            <DetailRow label="Créé le" value={formatDate(request.createdAt)} />
            {request.updatedAt && request.updatedAt !== request.createdAt && (
              <DetailRow label="Mis à jour" value={formatDate(request.updatedAt)} />
            )}
            {request.calendarVisitedAt && (
              <DetailRow label="Calendrier visité" value={formatDate(request.calendarVisitedAt)} />
            )}
          </Section>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${T.border}`,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {linked?.id && (
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => setConfirmDelete('appointment')}
              style={{
                marginRight: 'auto',
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${T.warning}`,
                background: 'transparent',
                color: T.warning,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Supprimer le RDV uniquement
            </button>
          )}
          <button
            type="button"
            disabled={deleteBusy}
            onClick={() => setConfirmDelete('request')}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${T.error}`,
              background: 'transparent',
              color: T.error,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Supprimer la demande
          </button>
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

      {confirmDelete && (
        <>
          <div
            onClick={() => !deleteBusy && setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 8100, background: 'rgba(0,0,0,0.4)' }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 8101,
              background: T.bg1,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 20,
              maxWidth: 420,
              width: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
              {confirmDelete === 'appointment' ? 'Supprimer le rendez-vous ?' : 'Supprimer la demande ?'}
            </div>
            <p style={{ fontSize: 13, color: T.text2, margin: '0 0 16px', lineHeight: 1.5 }}>
              {confirmDelete === 'appointment'
                ? 'Le créneau sera libéré. La fiche demande reste dans la liste.'
                : 'Action irréversible : demande + rendez-vous lié supprimés.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: `1px solid ${T.border}`,
                  background: T.bg2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() =>
                  void (confirmDelete === 'appointment' ? runDeleteAppointment() : runDeleteRequest())
                }
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: 0,
                  background: T.error,
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
