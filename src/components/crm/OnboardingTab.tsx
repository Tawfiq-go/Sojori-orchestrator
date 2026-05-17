/**
 * OnboardingTab.tsx
 * Onglet "Onboarding" du CRM - Liste des owners en onboarding
 * Migré depuis sojori-dashboard/src/features/onboarding
 */

import { useState, useEffect } from 'react';
import { tokens as T } from '../dashboard/DashboardV2.components';
import { getOnboardings, getOnboardingStats, type OwnerOnboarding, type OnboardingStats } from '../../services/crmService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  not_started: { label: 'Non démarré', color: '#9CA3AF', bgColor: '#F3F4F6' },
  in_progress: { label: 'En cours', color: '#3B82F6', bgColor: '#EFF6FF' },
  blocked: { label: 'Bloqué', color: '#EF4444', bgColor: '#FEF2F2' },
  completed: { label: 'Terminé', color: '#10B981', bgColor: '#ECFDF5' },
  cancelled: { label: 'Annulé', color: '#6B7280', bgColor: '#F9FAFB' },
};

// Step labels (French)
const STEP_LABELS: Record<string, string> = {
  owner_created: 'Owner créé',
  ru_account_created: 'Compte RU créé',
  white_label_token_ok: 'Token white label OK',
  airbnb_import_started: 'Import Airbnb démarré',
  airbnb_import_done: 'Import Airbnb terminé',
  listing_pulled_from_ru: 'Listing récupéré de RU',
  listing_created_in_sojori: 'Listing créé dans Sojori',
  calendar_populated: 'Calendrier peuplé',
  airbnb_connected: 'Airbnb connecté',
  booking_connected: 'Booking connecté',
  first_reservation_received: 'Première réservation',
  onboarding_complete: 'Onboarding terminé',
};

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

export function OnboardingTab() {
  const [onboardings, setOnboardings] = useState<OwnerOnboarding[]>([]);
  const [filteredOnboardings, setFilteredOnboardings] = useState<OwnerOnboarding[]>([]);
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [onboardings, searchText, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    console.log('[OnboardingTab] 🔄 Loading onboardings...');
    try {
      const [onboardingsRes, statsRes] = await Promise.all([
        getOnboardings({ _limit: 100 }),
        getOnboardingStats(),
      ]);

      console.log('[OnboardingTab] 📥 Onboardings:', onboardingsRes);
      console.log('[OnboardingTab] 📊 Stats:', statsRes);

      if (onboardingsRes.success) {
        setOnboardings(onboardingsRes.data || []);
      }

      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('[OnboardingTab] ❌ Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...onboardings];

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // Search filter
    if (searchText) {
      const s = searchText.toLowerCase();
      filtered = filtered.filter((o) => {
        return (
          (o.ownerName || '').toLowerCase().includes(s) ||
          (o.ownerEmail || '').toLowerCase().includes(s) ||
          (o.ownerId || '').toLowerCase().includes(s)
        );
      });
    }

    setFilteredOnboardings(filtered);
  };

  const calculateProgress = (onboarding: OwnerOnboarding): number => {
    const totalSteps = 12; // ONBOARDING_STEPS.length
    const completed = onboarding.completedSteps?.length || 0;
    return Math.round((completed / totalSteps) * 100);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'd MMM, HH:mm', { locale: fr });
    } catch {
      return '—';
    }
  };

  const getStepLabel = (step: string): string => {
    return STEP_LABELS[step] || step;
  };

  return (
    <div>
      {/* KPI Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              background: T.bg2,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, marginBottom: 4 }}>Total</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{stats.total}</div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              background: '#EFF6FF',
              borderRadius: 8,
              border: '1px solid #BFDBFE',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', marginBottom: 4 }}>En cours</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1E40AF' }}>
              {stats.byStatus.in_progress || 0}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              background: '#FEF2F2',
              borderRadius: 8,
              border: '1px solid #FECACA',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#B91C1C', marginBottom: 4 }}>Bloqués</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#B91C1C' }}>
              {stats.byStatus.blocked || 0}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              background: '#ECFDF5',
              borderRadius: 8,
              border: '1px solid #A7F3D0',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>Terminés</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#065F46' }}>
              {stats.byStatus.completed || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          padding: '12px 14px',
          background: T.bg2,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="Rechercher owner..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: T.bg1,
            color: T.text,
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            minWidth: 150,
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: T.bg1,
            color: T.text,
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          <option value="">Statut</option>
          <option value="not_started">Non démarré</option>
          <option value="in_progress">En cours</option>
          <option value="blocked">Bloqué</option>
          <option value="completed">Terminé</option>
          <option value="cancelled">Annulé</option>
        </select>

        {/* Refresh button */}
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 0,
            background: T.primary,
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Chargement...' : '🔄 Actualiser'}
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          overflow: 'auto',
          border: `1px solid ${T.border}`,
          borderRadius: 8,
        }}
      >
        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: T.text3 }}>Chargement...</div>
        )}

        {!loading && filteredOnboardings.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
            {searchText || statusFilter
              ? 'Aucun onboarding trouvé avec ces filtres'
              : 'Aucun onboarding trouvé'}
          </div>
        )}

        {!loading && filteredOnboardings.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg2 }}>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Owner
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Statut
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Étape
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Progression
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Listings
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Dernière MAJ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOnboardings.map((onboarding) => {
                const onboardingId = onboarding._id;
                const progress = calculateProgress(onboarding);
                const statusConfig = STATUS_CONFIG[onboarding.status] || STATUS_CONFIG.not_started;

                return (
                  <tr
                    key={onboardingId}
                    style={{
                      borderBottom: `1px solid ${T.border}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = T.bg2;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Owner column */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>
                        {onboarding.ownerName || '—'}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.text3,
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        {onboarding.ownerEmail || onboarding.ownerId}
                      </div>
                    </td>

                    {/* Status column */}
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          background: statusConfig.bgColor,
                          color: statusConfig.color,
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-block',
                        }}
                      >
                        {statusConfig.label}
                      </span>
                    </td>

                    {/* Current step column */}
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 12,
                        color: T.text2,
                      }}
                    >
                      {getStepLabel(onboarding.currentStep)}
                    </td>

                    {/* Progress column */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            background: T.bg3,
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${progress}%`,
                              height: '100%',
                              background: progress === 100 ? '#10B981' : '#3B82F6',
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.text2,
                            fontFamily: '"Geist Mono", monospace',
                            minWidth: 35,
                          }}
                        >
                          {progress}%
                        </span>
                      </div>
                    </td>

                    {/* Listings count column */}
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        color: T.text,
                        fontFamily: '"Geist Mono", monospace',
                        textAlign: 'center',
                      }}
                    >
                      {onboarding.listings?.length || 0}
                    </td>

                    {/* Last update column */}
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 11,
                        color: T.text3,
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      {formatDate(onboarding.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
