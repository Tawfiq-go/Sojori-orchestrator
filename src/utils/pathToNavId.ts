import { NAV_TO_ROUTE } from '../config/navRoutes';

const NAV_ROUTE_OVERRIDES: Record<string, string> = {
  'dynamic-pricing': '/dynamic-pricing/portefeuille',
  'dynamic-pricing/bien': '/dynamic-pricing/portefeuille',
  staff: '/admin/equipe?tab=worker',
  channels: '/admin/ChannelManager?tab=channel-manager',
};

const navToRoute: Record<string, string> = {
  ...NAV_TO_ROUTE,
  ...NAV_ROUTE_OVERRIDES,
};

/** Map pathname (+ optional search) → nav feature id (aligné sidebar / grants). */
export function resolveNavIdFromPath(pathname: string, search = ''): string {
  const path = pathname;

  if (path === '/tasks' || path === '/tasks/list') return 'tasks/list';
  if (path.startsWith('/tasks/planning')) return 'tasks/planning';
  if (path.startsWith('/tasks/kanban')) return 'tasks/kanban';
  if (path.startsWith('/tasks/team')) return 'tasks/team';
  if (path.startsWith('/calendar') || path.startsWith('/calendar-v2')) {
    const view = new URLSearchParams(search).get('view');
    if (view === 'simple') return 'calendar/simple';
    return 'calendar/multi';
  }
  if (path.startsWith('/listings/mapping')) return 'listings/mapping';
  if (path.startsWith('/listings/orchestration-model')) return 'listings/orchestration-model';
  if (path.startsWith('/listings') || path.startsWith('/catalogue/listings')) return 'listings/list';
  if (path === '/reservations' || /^\/reservations\/[^/]+$/.test(path)) return 'reservations';
  if (path.startsWith('/reservations/planning')) return 'reservations/planning';
  if (path.startsWith('/clients/contacts')) return 'clients';
  if (path.startsWith('/reviews')) return 'reviews';

  if (path.startsWith('/communications')) {
    const tab = new URLSearchParams(search).get('tab') || 'whatsapp';
    const section = new URLSearchParams(search).get('section');
    if (section === 'staff' || tab === 'staff' || tab === 'admin' || tab === 'booking') {
      if (tab === 'admin') return 'comms/admin';
      if (tab === 'booking') return 'comms/booking';
      return 'comms/staff';
    }
    const commTabToNav: Record<string, string> = {
      whatsapp: 'comms/guests',
      guests: 'comms/guests',
      ota: 'comms/ota',
      leads: 'comms/leads',
      reviews: 'comms/reviews',
    };
    return commTabToNav[tab] || 'comms/guests';
  }

  if (path.startsWith('/paiements')) return 'payments';

  if (path.startsWith('/crm')) {
    const tab = new URLSearchParams(search).get('tab') || 'requests';
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

  if (path.startsWith('/onboarding')) return 'equipe/onboarding';

  if (path.startsWith('/admin/ChannelManager')) {
    const tab = new URLSearchParams(search).get('tab');
    if (tab === 'distribution') return 'admin/ChannelManager/distribution';
    return 'admin/ChannelManager/channel-manager';
  }
  if (path.startsWith('/catalogue/channels')) return 'channels';

  if (path.startsWith('/dynamic-pricing/bien/')) return 'dynamic-pricing/portefeuille';
  if (path.startsWith('/dynamic-pricing/audit')) return 'dynamic-pricing/audit';
  if (path.startsWith('/dynamic-pricing/portefeuille') || path === '/dynamic-pricing') {
    return 'dynamic-pricing/portefeuille';
  }
  if (path.startsWith('/catalogue/dynamic-pricing')) {
    if (path.includes('/audit')) return 'dynamic-pricing/audit';
    return 'dynamic-pricing/portefeuille';
  }

  if (path.startsWith('/monitor') || path.startsWith('/admin/monitor')) {
    const tab = new URLSearchParams(search).get('tab') || 'Summary';
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

  if (path.startsWith('/admin/sojori-logs')) return 'admin/sojori-logs';
  if (path.startsWith('/admin/unified')) return 'admin/unified';

  if (path.startsWith('/channels') || path.startsWith('/admin/channels')) {
    const tab = (new URLSearchParams(search).get('tab') || 'Business').trim();
    const tabLo = tab.toLowerCase();
    if (tabLo === 'sum' || tabLo === 'summary') return 'admin/channels/summary';
    if (tabLo === 'debug' || tabLo === 'audit') return 'admin/channels/debug';
    return 'admin/channels/business';
  }

  if (path.startsWith('/admin/pm-lifecycle')) return 'admin/pm-lifecycle';
  if (path.startsWith('/admin/mapping')) return 'admin/mapping';
  if (path.includes('/admin/setting/currency') || path.includes('/admin/settings/currency')) {
    return 'admin/setting/currency';
  }
  if (path.startsWith('/admin/settings') || path.startsWith('/admin/Settings')) {
    const tab = new URLSearchParams(search).get('tab') || 'template';
    const map: Record<string, string> = {
      template: 'admin/settings/template',
      'host-profile': 'admin/settings/host-profile',
      'admin-config': 'admin/settings/admin-config',
      'pm-simulation': 'admin/settings/pm-simulation',
    };
    return map[tab] || 'admin/settings/template';
  }

  if (path.startsWith('/admin/equipe/owners')) return 'admin/equipe/owners';
  if (path.startsWith('/chatbot/listing')) return 'chatbot/listing';
  if (path.startsWith('/chatbot/whitelist') || path.startsWith('/chatbot')) return 'chatbot/whitelist';
  if (path.startsWith('/finances/landlords')) return 'finances/landlords';
  if (path.startsWith('/finances/ledger')) return 'finances/ledger';
  if (path.startsWith('/finances/branding')) return 'finances/branding';
  if (path.startsWith('/finances/reports')) return 'finances/reports';
  if (
    path.startsWith('/orchestration/ops') ||
    path.startsWith('/tasks/ops') ||
    path.startsWith('/orchestration/daily-ops')
  )
    return 'orch/ops';
  if (path.startsWith('/orchestration/config') || path.startsWith('/tasks/orchestration-config'))
    return 'orch/workflows';
  if (path.startsWith('/orchestration/plans') || path.startsWith('/tasks/plans')) return 'orch/plans';

  if (path.startsWith('/admin/equipe/mon-profil')) return 'equipe/mon-profil';
  if (path.startsWith('/admin/equipe/notifications')) return 'equipe/notifications';

  if (path.startsWith('/admin/equipe')) {
    const tab = new URLSearchParams(search).get('tab') || 'list';
    if (tab === 'admin-whatsapp') return 'tasks/team';
    if (tab === 'onboarding') return 'equipe/onboarding';
    if (tab === 'worker' || tab === 'groups') return 'staff';
    const map: Record<string, string> = {
      worker: 'staff',
      groups: 'staff',
      onboarding: 'equipe/onboarding',
      list: 'admin/equipe/owners',
    };
    return map[tab] || 'admin/equipe/owners';
  }

  const entries = Object.entries(navToRoute).sort((a, b) => b[1].length - a[1].length);
  for (const [key, route] of entries) {
    const routePath = route.split('?')[0];
    if (path.startsWith(routePath) && routePath !== '/') return key;
    if (path === routePath) return key;
  }

  return 'dashboard';
}
