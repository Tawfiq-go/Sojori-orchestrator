import React from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SOJORI_ORANGE = { primary: '#E6B022', dark: '#B8881A' };

const tabBtnCompact = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 12,
  transition: 'all 0.2s',
};

/** Keep in sync with DashboardNavbar SECTION_TABS_CONFIG (Team & Roles) + owner registration route. */
const TEAM_NAV_ITEMS = [
  { id: 'property-manager', kind: 'path', path: '/admin/User/owner?tab=list', labelKey: 'Property manager' },
  { id: 'staff-dashboard', kind: 'tab', tab: 'staff-dashboard', labelKey: 'Dashboard Staff' },
  { id: 'admin-whatsapp', kind: 'tab', tab: 'admin-whatsapp', labelKey: 'WhatsApp Admin' },
  { id: 'worker', kind: 'tab', tab: 'worker', labelKey: 'Roles & Permissions' },
  { id: 'groups', kind: 'tab', tab: 'groups', labelKey: 'Groups' },
];

/**
 * Répète la navigation Équipe / sous-pages en bas d’écran (complément des onglets du header).
 */
export default function TeamRolesFooterNav() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const path = location.pathname;
  const tab = searchParams.get('tab') || (path.includes('/admin/User/owner') ? 'list' : 'staff-dashboard');

  return (
    <nav
      aria-label={t('Team & Roles')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '10px 12px',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#9ca3af',
          marginRight: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {t('Team & Roles')}
      </span>
      <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
      {TEAM_NAV_ITEMS.map((item) => {
        const isActive =
          item.kind === 'path'
            ? path === '/admin/User/owner' ||
              path.endsWith('/admin/User/owner')
            : tab === item.tab;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.kind === 'path') navigate(item.path);
              else navigate(`/admin/User/team?tab=${item.tab}`);
            }}
            style={{
              ...tabBtnCompact,
              background: isActive
                ? `linear-gradient(135deg, ${SOJORI_ORANGE.primary} 0%, ${SOJORI_ORANGE.dark} 100%)`
                : 'transparent',
              color: isActive ? '#fff' : '#6b7280',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            {t(item.labelKey) || item.labelKey}
          </button>
        );
      })}
    </nav>
  );
}
