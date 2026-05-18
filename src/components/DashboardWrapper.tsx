import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from './dashboard/DashboardV2.components';
import { useAuth } from '../hooks/useAuth';
import { runtimeLog } from '../utils/runtimeLog';
import { isListingCataloguePath } from '../constants/listingLayout';

interface DashboardWrapperProps {
  children: React.ReactNode;
  breadcrumb?: string[];
  /** Formulaire listing plein écran : marges main réduites, hauteur utile maximale */
  compactMain?: boolean;
}

/**
 * DashboardWrapper — coquille des pages.
 * Édition 2026 « Atelier » : marge constante, animation d'entrée sojori-main-enter,
 * gestion identité utilisateur identique au design précédent (zéro régression métier).
 */
export function DashboardWrapper({ children, breadcrumb = [], compactMain = false }: DashboardWrapperProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const listingCompact = compactMain || isListingCataloguePath(location.pathname);

  useEffect(() => {
    runtimeLog('info', 'Layout', 'DashboardWrapper mount/update', {
      path: location.pathname,
      hasUser: Boolean(user),
      userId: user?.id ?? null,
      hasEmail: Boolean(user?.email?.trim()),
      firstLen: (user?.firstName ?? '').length,
      lastLen: (user?.lastName ?? '').length,
      role: user?.role ?? null,
    });
  }, [location.pathname, user?.id, user?.email, user?.firstName, user?.lastName, user?.role]);

  // Mapping des IDs de navigation vers les routes (inchangé)
  const navToRoute: Record<string, string> = {
    // Pilotage
    'dashboard': '/dashboard',
    'analytics': '/analytics',
    'reports': '/reports',
    'orchestrator': '/orchestrator',
    'orchestration/plans': '/orchestration/plans',
    'orchestration/timeline': '/orchestration/timeline',
    'orchestration/events': '/orchestration/events',
    'orchestration/daily-ops': '/orchestration/daily-ops',
    'orchestration/config': '/orchestration/config',

    // Calendrier
    'calendar': '/calendar',

    // Réservations
    'reservations/list': '/reservations',
    'reservations/planning': '/reservations/planning',
    // Note: 'reservations/detail' removed - Séjour is a tab, not a separate page

    // Tâches
    'tasks/list': '/tasks',
    'tasks/team': '/tasks/team',
    'tasks/planning': '/tasks/planning',
    'tasks/staff-wa': '/tasks/staff-whatsapp',

    // Communications Hub - Navigation principale
    'comms': '/communications',
    'comms/guests': '/communications?tab=whatsapp',
    'comms/staff': '/communications?tab=staff',
    'comms/templates': '/communications?tab=templates',
    'comms/ota': '/communications?tab=ota',
    'comms/leads': '/communications?tab=leads',
    'comms/reviews': '/communications?tab=reviews',

    // Service Client
    'requests': '/requests',
    'reviews': '/reviews',

    // Catalogue
    'listings': '/listings',
    'pricing': '/pricing',
    'channels': '/catalogue/channels',
    'clients': '/clients',

    // CRM
    'crm': '/crm',
    'crm/requests': '/crm?tab=requests',
    'crm/leads': '/crm?tab=leads',
    'crm/support': '/crm?tab=support',
    'crm/onboarding': '/crm?tab=onboarding',

    // Admin
    'admin/channels': '/channels',
    'admin/ChannelManager/channel-manager': '/admin/ChannelManager?tab=channel-manager',
    'admin/ChannelManager/distribution': '/admin/ChannelManager?tab=distribution',

    // Équipe & Rôles
    'admin/equipe/owners': '/admin/equipe/owners?tab=list',
    'admin/equipe/staff': '/admin/equipe?tab=staff-dashboard',
    'admin/equipe/whatsapp': '/admin/equipe?tab=admin-whatsapp',
    'admin/equipe/roles': '/admin/equipe?tab=worker',
    'admin/equipe/groups': '/admin/equipe?tab=groups',

    // Paramètres
    'admin/settings/template': '/admin/settings?tab=template',
    'admin/settings/host-profile': '/admin/settings?tab=host-profile',
    'admin/settings/admin-config': '/admin/settings?tab=admin-config',
    'admin/setting/currency': '/admin/setting/currency',
  };

  /** Détection robuste : on prend la route la plus longue qui matche (préfixes propres). */
  const getActivePathFromUrl = () => {
    const path = location.pathname;

    if (
      path.startsWith('/clients/contacts') ||
      path.startsWith('/crm') ||
      path.startsWith('/onboarding')
    ) {
      return 'clients';
    }

    if (path.startsWith('/catalogue/channels')) {
      return 'channels';
    }

    if (path.startsWith('/admin/ChannelManager')) {
      const tab = new URLSearchParams(location.search).get('tab') || 'channel-manager';
      return tab === 'distribution'
        ? 'admin/ChannelManager/distribution'
        : 'admin/ChannelManager/channel-manager';
    }

    // Channels admin hub (OTA/RU KPIs)
    if (path.startsWith('/channels') || path.startsWith('/admin/channels')) {
      return 'admin/channels';
    }

    if (path.includes('/admin/setting/currency') || path.includes('/admin/settings/currency')) {
      return 'admin/setting/currency';
    }
    if (path.startsWith('/admin/settings') || path.startsWith('/admin/Settings')) {
      const tab = new URLSearchParams(location.search).get('tab') || 'template';
      const map: Record<string, string> = {
        template: 'admin/settings/template',
        'host-profile': 'admin/settings/host-profile',
        'admin-config': 'admin/settings/admin-config',
      };
      return map[tab] || 'admin/settings/template';
    }

    if (path.startsWith('/admin/equipe/owners')) {
      return 'admin/equipe/owners';
    }
    if (path.startsWith('/admin/equipe')) {
      const tab = new URLSearchParams(location.search).get('tab') || 'staff-dashboard';
      const map: Record<string, string> = {
        'staff-dashboard': 'admin/equipe/staff',
        'admin-whatsapp': 'admin/equipe/whatsapp',
        worker: 'admin/equipe/roles',
        groups: 'admin/equipe/groups',
      };
      return map[tab] || 'admin/equipe/staff';
    }

    const entries = Object.entries(navToRoute).sort((a, b) => b[1].length - a[1].length);

    for (const [key, route] of entries) {
      if (path.startsWith(route) && route !== '/') return key;
      if (path === route) return key;
    }
    return 'dashboard';
  };

  const handleNavigate = (navId: string) => {
    const route = navToRoute[navId];
    if (route) navigate(route);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Identité affichée — préférence aux noms, sinon email, sinon fallback
  const layoutUser =
    user &&
    (() => {
      const first = (user.firstName ?? '').trim();
      const last = (user.lastName ?? '').trim();
      const name = [first, last].filter(Boolean).join(' ') || user.email?.trim() || 'Utilisateur';
      const fromNames = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase().trim();
      const initials =
        fromNames ||
        (user.email?.trim().charAt(0) || '?').toUpperCase();
      return {
        name,
        initials,
        role: user.role,
        email: user.email ?? '',
        avatar: user.avatar,
      };
    })();

  return (
    <DashboardLayout
      activePath={getActivePathFromUrl()}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      breadcrumb={breadcrumb}
      compactMain={listingCompact}
      user={layoutUser || undefined}
    >
      {children}
    </DashboardLayout>
  );
}
