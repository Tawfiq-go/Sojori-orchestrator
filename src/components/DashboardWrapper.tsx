import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from './dashboard/DashboardV2.components';
import { useAuth } from '../hooks/useAuth';

interface DashboardWrapperProps {
  children: React.ReactNode;
  breadcrumb?: string[];
}

export function DashboardWrapper({ children, breadcrumb = [] }: DashboardWrapperProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Mapping des IDs de navigation vers les routes
  const navToRoute: Record<string, string> = {
    // Pilotage
    'dashboard': '/dashboard',
    'analytics': '/analytics',
    'reports': '/reports',
    'orchestration': '/orchestration',
    'orchestration/timeline': '/orchestration/timeline/1234',
    'orchestration/events': '/orchestration/events',
    'orchestration/config': '/orchestration/config',

    // Calendrier
    'calendar': '/calendar',

    // Réservations
    'reservations/list': '/reservations',
    'reservations/detail': '/reservations/1234',

    // Tâches
    'tasks/list': '/tasks',
    'tasks/team': '/tasks/team',
    'tasks/planning': '/tasks/planning',
    'tasks/staff-wa': '/tasks/staff-whatsapp',

    // Communications
    'comms/guests': '/communications/whatsapp',
    'comms/staff': '/communications/staff',
    'comms/ota': '/communications/ota',

    // Service Client
    'requests': '/requests',
    'reviews': '/reviews',

    // Catalogue
    'listings': '/listings',
    'pricing': '/pricing',
    'channels': '/channels',
    'clients': '/clients',
  };

  // Trouver l'activePath à partir de l'URL actuelle
  const getActivePathFromUrl = () => {
    const path = location.pathname;
    const entries = Object.entries(navToRoute).sort((a, b) => b[1].length - a[1].length);

    for (const [key, route] of entries) {
      if (path.startsWith(route) && route !== '/') return key;
      if (path === route) return key;
    }
    return 'dashboard'; // default
  };

  const handleNavigate = (navId: string) => {
    const route = navToRoute[navId];
    if (route) {
      navigate(route);
    }
  };

  return (
    <DashboardLayout
      activePath={getActivePathFromUrl()}
      onNavigate={handleNavigate}
      onLogout={logout}
      breadcrumb={breadcrumb}
      user={user ? {
        name: `${user.firstName} ${user.lastName}`.trim(),
        initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase(),
        role: user.role,
        email: user.email,
        avatar: user.avatar,
      } : undefined}
    >
      {children}
    </DashboardLayout>
  );
}
