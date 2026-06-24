import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function useDashboardChrome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Mapping des IDs de navigation vers les routes (inchangé)
  const navToRoute: Record<string, string> = {
    // Pilotage
    'dashboard': '/dashboard',
    'analytics': '/analytics',
    'reports': '/reports',

    // Orchestration (routes réelles fulltask)
    'orchestration': '/tasks/plans',
    'orch/plans': '/tasks/plans',
    'orch/ops': '/tasks/ops',
    'orch/workflows': '/tasks/orchestration-config',
    'orchestrator': '/tasks/plans',
    'orchestration/plans': '/tasks/plans',
    'orchestration/config': '/tasks/orchestration-config',
    'orchestration/whatsapp-messages': '/tasks/orchestration-config?tab=config',

    // Calendrier
    'calendar': '/calendar',

    // Réservations
    'reservations': '/reservations',
    'reservations/list': '/reservations',
    'reservations/planning': '/reservations/planning',
    'payments': '/paiements',

    // Tâches
    'tasks': '/tasks',
    'tasks/list': '/tasks',
    'tasks/team': '/tasks/team',
    'tasks/planning': '/tasks/planning',
    'tasks/kanban': '/tasks/kanban',
    'tasks/orchestration': '/tasks/plans',
    'tasks/plans': '/tasks/plans',
    'tasks/orchestration-config': '/tasks/orchestration-config',
    'tasks/whatsapp-messages': '/tasks/orchestration-config?tab=config',

    // Chatbot (srv-fullchatbot)
    'chatbot': '/chatbot/whitelist',
    'chatbot/whitelist': '/chatbot/whitelist',
    'chatbot/listing': '/chatbot/listing',

    // Communications Hub - Navigation principale
    'comms': '/communications',
    'comms/inbox': '/communications',
    'comms/guests': '/communications?tab=whatsapp',
    'comms/staff': '/communications?tab=staff',
    'comms/ota': '/communications?tab=ota',
    'comms/leads': '/communications?tab=leads',
    'comms/reviews': '/communications?tab=reviews',

    // Service Client
    'requests': '/crm?tab=requests',
    'reviews': '/reviews',

    // Catalogue & revenue
    'listings': '/listings',
    'listings/list': '/listings',
    'listings/mapping': '/listings/mapping',
    'listings/config': '/listings/orchestration-model',
    'listings/orchestration-model': '/listings/orchestration-model',
    'listing-orchestration': '/listings/orchestration-model',
    'listing-orchestration-v3': '/listings/orchestration-model',
    'pricing': '/dynamic-pricing/portefeuille',
    'pricing/portfolio': '/dynamic-pricing/portefeuille',
    'pricing/audit': '/dynamic-pricing/audit',
    'dynamic-pricing': '/dynamic-pricing/portefeuille',
    'dynamic-pricing/portefeuille': '/dynamic-pricing/portefeuille',
    'dynamic-pricing/audit': '/dynamic-pricing/audit',
    'dynamic-pricing/bien': '/dynamic-pricing/portefeuille',
    'channels': '/admin/ChannelManager?tab=channel-manager',
    'admin/ChannelManager/channel-manager': '/admin/ChannelManager?tab=channel-manager',
    'admin/ChannelManager/distribution': '/admin/ChannelManager?tab=distribution',

    // CRM
    'crm': '/crm',
    'crm/clients': '/clients',
    'crm/requests': '/crm?tab=requests',
    'crm/leads': '/crm?tab=leads',
    'crm/support': '/crm?tab=support',
    'crm/onboarding': '/crm?tab=onboarding',
    'crm/reviews': '/reviews',
    'clients': '/clients',
    'temp/booking-clients': '/temp/booking-clients',

    // Équipe
    'staff': '/admin/equipe?tab=worker',
    'my-tasks': '/tasks',
    'my-sched': '/tasks/planning',

    // Finances
    'revenue': '/reports',
    'statements': '/reports',

    // Monitor & infra
    'monitor': '/monitor?tab=Summary',
    'mon/summary': '/monitor?tab=Summary',
    'mon/logs': '/monitor?tab=Logs',
    'mon/metrics': '/monitor?tab=Metrics',
    'mon/rabbit': '/monitor?tab=RabbitMQ',
    'mon/wa': '/monitor?tab=WhatsApp',
    'mon/ai': '/monitor?tab=AI',
    'mon/infra': '/monitor?tab=Infrastructure',
    'mon/res-sync': '/monitor?tab=ReservationSync',
    'admin/monitor': '/monitor?tab=Summary',
    'admin/monitor/summary': '/monitor?tab=Summary',
    'admin/monitor/logs': '/monitor?tab=Logs',
    'admin/monitor/metrics': '/monitor?tab=Metrics',
    'admin/monitor/rabbitmq': '/monitor?tab=RabbitMQ',
    'admin/monitor/whatsapp': '/monitor?tab=WhatsApp',
    'admin/monitor/ai': '/monitor?tab=AI',
    'admin/monitor/infrastructure': '/monitor?tab=Infrastructure',
    'admin/monitor/reservation-sync': '/monitor?tab=ReservationSync',
    'admin/sojori-logs': '/admin/sojori-logs',
    'admin/unified': '/admin/unified',
    'admin/unified-api-demo': '/admin/unified',

    // Administration
    'admin/pms': '/admin/equipe/owners?tab=list',
    'admin/mapping': '/admin/mapping',
    'admin/roles': '/admin/equipe?tab=worker',
    'admin/settings': '/admin/settings?tab=host-profile',
    'admin/channels': '/channels?tab=Business&biz=api&api=m',
    'admin/channels/business': '/admin/channels?tab=Business&biz=api&api=m',
    'admin/channels/debug': '/admin/channels?tab=Debug&type=pull',
    'admin/channels/summary': '/admin/channels?tab=Sum',
    'admin/ChannelManager/channel-manager': '/admin/ChannelManager?tab=channel-manager',
    'admin/ChannelManager/distribution': '/admin/ChannelManager?tab=distribution',
    'admin/equipe/owners': '/admin/equipe/owners?tab=list',
    'admin/equipe/staff': '/tasks/team',
    'admin/equipe/whatsapp': '/tasks/team',
    'admin/equipe/roles': '/admin/equipe?tab=worker',
    'admin/equipe/groups': '/admin/equipe?tab=groups',
    'admin/settings/template': '/admin/settings?tab=template',
    'admin/settings/host-profile': '/admin/settings?tab=host-profile',
    'admin/settings/admin-config': '/admin/settings?tab=admin-config',
    'admin/setting/currency': '/admin/setting/currency',

    // Temp — pages legacy / placement à décider
    'temp/pricing-calendar': '/pricing',
    'temp/reservations-planning': '/reservations/planning',
    'temp/orch-rules': '/tasks/orchestration-config',
    'temp/sojori-logs': '/admin/sojori-logs',
    'temp/channel-distribution': '/admin/ChannelManager?tab=distribution',
    'temp/settings-template': '/admin/settings?tab=template',
    'temp/settings-currency': '/admin/setting/currency',
    'temp/settings-admin-config': '/admin/settings?tab=admin-config',
    'temp/equipe-groups': '/admin/equipe?tab=groups',
    'temp/tasks-team-legacy': '/tasks/team-legacy',
    'temp/booking-clients': '/temp/booking-clients',
  };

  /** Détection robuste : on prend la route la plus longue qui matche (préfixes propres). */
  const getActivePathFromUrl = () => {
    const path = location.pathname;

    if (path === '/tasks' || path === '/tasks/list') {
      return 'tasks/list';
    }
    if (path.startsWith('/tasks/planning')) {
      return 'tasks/planning';
    }
    if (path.startsWith('/tasks/kanban')) {
      return 'tasks/kanban';
    }
    if (path.startsWith('/tasks/team')) {
      return 'tasks/team';
    }

    if (path.startsWith('/listings/mapping')) {
      return 'listings/mapping';
    }
    if (path.startsWith('/listings/orchestration-model')) {
      return 'listings/orchestration-model';
    }
    if (path.startsWith('/listings') || path.startsWith('/catalogue/listings')) {
      return 'listings/list';
    }

    if (path === '/reservations' || /^\/reservations\/[^/]+$/.test(path)) {
      return 'reservations';
    }
    if (path.startsWith('/reservations/planning')) {
      return 'reservations/planning';
    }

    if (path.startsWith('/clients/contacts')) {
      return 'clients';
    }

    if (path.startsWith('/reviews')) {
      return 'reviews';
    }

    if (path.startsWith('/communications')) {
      const tab = new URLSearchParams(location.search).get('tab') || 'whatsapp';
      const commTabToNav: Record<string, string> = {
        whatsapp: 'comms/guests',
        guests: 'comms/guests',
        staff: 'comms/staff',
        ota: 'comms/ota',
        leads: 'comms/leads',
        reviews: 'reviews',
      };
      return commTabToNav[tab] || 'comms/guests';
    }

    if (path.startsWith('/paiements')) {
      return 'payments';
    }

    if (path.startsWith('/crm')) {
      const tab = new URLSearchParams(location.search).get('tab') || 'requests';
      const crmTabToNav: Record<string, string> = {
        requests: 'crm/requests',
        demandes: 'crm/requests',
        leads: 'crm/leads',
        support: 'crm/support',
        staff: 'crm/support',
        rendezvous: 'crm/support',
        'rendez-vous': 'crm/support',
        onboarding: 'crm/onboarding',
      };
      return crmTabToNav[tab] || 'crm/requests';
    }

    if (path.startsWith('/onboarding')) {
      return 'crm/onboarding';
    }

    if (path.startsWith('/admin/ChannelManager')) {
      const tab = new URLSearchParams(location.search).get('tab');
      if (tab === 'distribution') return 'admin/ChannelManager/distribution';
      return 'admin/ChannelManager/channel-manager';
    }
    if (path.startsWith('/catalogue/channels')) {
      return 'channels';
    }

    if (path.startsWith('/dynamic-pricing/bien/')) {
      return 'dynamic-pricing/portefeuille';
    }
    if (path.startsWith('/dynamic-pricing/audit')) {
      return 'dynamic-pricing/audit';
    }
    if (path.startsWith('/dynamic-pricing/portefeuille') || path === '/dynamic-pricing') {
      return 'dynamic-pricing/portefeuille';
    }
    if (path.startsWith('/catalogue/dynamic-pricing')) {
      if (path.includes('/audit')) return 'dynamic-pricing/audit';
      if (path.includes('/bien/')) return 'dynamic-pricing/bien';
      if (path.includes('/bien')) return 'dynamic-pricing/bien';
      return 'dynamic-pricing/portefeuille';
    }

    // Monitor hub (onglets via ?tab=)
    if (path.startsWith('/monitor') || path.startsWith('/admin/monitor')) {
      const tab = new URLSearchParams(location.search).get('tab') || 'Summary';
      const tabToNav: Record<string, string> = {
        Summary: 'admin/monitor/summary',
        summary: 'admin/monitor/summary',
        Logs: 'admin/monitor/logs',
        logs: 'admin/monitor/logs',
        Metrics: 'admin/monitor/metrics',
        metrics: 'admin/monitor/metrics',
        RabbitMQ: 'admin/monitor/rabbitmq',
        rabbitmq: 'admin/monitor/rabbitmq',
        WhatsApp: 'admin/monitor/whatsapp',
        whatsapp: 'admin/monitor/whatsapp',
        AI: 'admin/monitor/ai',
        ai: 'admin/monitor/ai',
        Infrastructure: 'admin/monitor/infrastructure',
        infrastructure: 'admin/monitor/infrastructure',
      };
      return tabToNav[tab] || 'admin/monitor/summary';
    }

    if (path.startsWith('/admin/sojori-logs')) {
      return 'admin/sojori-logs';
    }

    if (path.startsWith('/admin/unified')) {
      return 'admin/unified';
    }

    // Channels admin hub (OTA/RU KPIs)
    if (path.startsWith('/channels') || path.startsWith('/admin/channels')) {
      const tab = (new URLSearchParams(location.search).get('tab') || 'Business').trim();
      const tabLo = tab.toLowerCase();
      if (tabLo === 'sum' || tabLo === 'summary') return 'admin/channels/summary';
      if (tabLo === 'debug' || tabLo === 'audit') return 'admin/channels/debug';
      return 'admin/channels/business';
    }

    if (path.startsWith('/admin/mapping')) {
      return 'admin/mapping';
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

    if (path.startsWith('/chatbot/listing')) {
      return 'chatbot/listing';
    }
    if (path.startsWith('/chatbot/whitelist') || path.startsWith('/chatbot')) {
      return 'chatbot/whitelist';
    }

    if (path.startsWith('/tasks/ops') || path.startsWith('/orchestration/daily-ops')) {
      return 'orch/ops';
    }

    if (path.startsWith('/tasks/orchestration-config')) {
      return 'orch/workflows';
    }

    if (path.startsWith('/tasks/plans')) {
      return 'orch/plans';
    }

    if (path.startsWith('/admin/equipe')) {
      const tab = new URLSearchParams(location.search).get('tab') || 'list';
      if (tab === 'admin-whatsapp') return 'tasks/team';
      if (tab === 'worker' || tab === 'groups') return 'staff';
      const map: Record<string, string> = {
        worker: 'staff',
        groups: 'staff',
        list: 'admin/equipe/owners',
      };
      return map[tab] || 'admin/equipe/owners';
    }

    const entries = Object.entries(navToRoute).sort((a, b) => b[1].length - a[1].length);

    for (const [key, route] of entries) {
      if (path.startsWith(route) && route !== '/') return key;
      if (path === route) return key;
    }
    return 'dashboard';
  };

  const handleNavigate = (navId: string) => {
    console.log('🔴 handleNavigate called with navId:', navId);
    const route = navToRoute[navId];
    console.log('   → Found route:', route);
    if (route) {
      console.log('   ✅ Navigating to:', route);
      navigate(route);
    } else {
      console.warn('   ⚠️ NO ROUTE found for navId:', navId);
    }
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
  return {
    activePath: getActivePathFromUrl(),
    onNavigate: handleNavigate,
    onLogout: handleLogout,
    user: layoutUser || undefined,
  };
}
