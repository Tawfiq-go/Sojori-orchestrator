import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from './dashboard/DashboardV2.components';
import { useAuth } from '../hooks/useAuth';
import { runtimeLog } from '../utils/runtimeLog';

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
    'channels': '/channels',
    'clients': '/clients',

    // CRM
    'crm': '/crm',
    'crm/requests': '/crm?tab=requests',
    'crm/leads': '/crm?tab=leads',
    'crm/support': '/crm?tab=support',
    'crm/onboarding': '/crm?tab=onboarding',
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
      compactMain={compactMain}
      user={layoutUser || undefined}
    >
      {children}
    </DashboardLayout>
  );
}
