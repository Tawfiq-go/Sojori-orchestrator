#!/usr/bin/env node
/**
 * AI-READ-API-PARITY — Test batterie GET (lecture seule)
 *
 * Compare les endpoints utilisés par sojori-dashboard et Sojori-orchestrator
 * contre le backend (dev.sojori.com par défaut).
 *
 * Usage:
 *   # Sur dev.sojori.com, la plupart des GET métier passent sans Bearer (voir docs/AI-READ-API-PARITY.md)
 *   export SOJORI_API_TOKEN="eyJ..."  # optionnel : parité navigateur / routes encore protégées
 *   export SOJORI_DEV_TOKEN="..."     # optionnel (CORS)
 *   node scripts/test-api-parity-all.mjs
 *   node scripts/test-api-parity-all.mjs --only=auth,reservations,messages
 *   node scripts/test-api-parity-all.mjs --base=https://dev.sojori.com
 *   node scripts/test-api-parity-all.mjs --strict   # tenter tous les cas même sans token
 *
 * Doc: docs/AI-READ-API-PARITY.md
 */

const BASE = process.env.SOJORI_API_BASE || process.env.VITE_API_URL || 'https://dev.sojori.com';
const TOKEN = process.env.SOJORI_API_TOKEN || process.env.SOJORI_TOKEN || '';
const DEV_TOKEN = process.env.SOJORI_DEV_TOKEN || process.env.VITE_DEV_TOKEN || '';

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const onlyGroups = onlyArg ? onlyArg.split(',').map((s) => s.trim().toLowerCase()) : null;
const baseOverride = args.find((a) => a.startsWith('--base='))?.split('=')[1];
const API_BASE = baseOverride || BASE;

const today = new Date();
const iso = (d) => d.toISOString().split('T')[0];
const startDate = iso(today);
const endDate = iso(new Date(today.getTime() + 7 * 86400000));

const STRICT = args.includes('--strict');
const DEFAULT_TEST_OWNER_ID = process.env.SOJORI_TEST_OWNER_ID || '507f191e810c19729de860ea';

/** Sans JWT : ignorer les cas connus pour 401 / timeout sur dev (sauf --strict). */
const SKIP_WITHOUT_TOKEN = new Set([
  'A3',
  'A2',
  'M1',
  'M5',
  'D4',
  'D1',
  'D3',
  'R1',
  'R2',
  'L1',
  'L5',
  'D5',
]);

/** @type {{ id: string, group: string, method: string, path: string, dashboard: string, orchestrator: string, note?: string }[]} */
const CASES = [
  // AUTH
  {
    id: 'A3',
    group: 'auth',
    method: 'GET',
    path: '/api/v1/user/auth/valid-token-check',
    dashboard: 'apiClient / axios interceptors',
    orchestrator: 'apiClient.ts',
  },
  {
    id: 'A2',
    group: 'auth',
    method: 'GET',
    path: '/api/v1/user/auth/me',
    dashboard: 'AuthApi / AuthSlice',
    orchestrator: 'authService.getCurrentUser',
  },

  // RESERVATIONS
  {
    id: 'R1',
    group: 'reservations',
    method: 'GET',
    path: `/api/v1/reservations/reservations?dateType=arrival&startDate=${startDate}&endDate=${endDate}&limit=5`,
    dashboard: 'serverApi.reservation getReservations',
    orchestrator: 'reservationsService.getList',
  },
  {
    id: 'R2',
    group: 'reservations',
    method: 'GET',
    path: '/api/v1/reservations/reservations/stats?staging=false',
    dashboard: 'stats / dashboard',
    orchestrator: 'dashboardService',
  },

  // TASKS
  {
    id: 'T1',
    group: 'tasks',
    method: 'GET',
    path: `/api/v1/task/tasks/search?limit=5&page=0&sortField=startDate&sortDirection=desc&ownerId=${DEFAULT_TEST_OWNER_ID}`,
    dashboard: 'TasksNew (tasks-new/search — path différent)',
    orchestrator: 'tasksService.getTasks',
    note: 'Dashboard legacy utilise tasks-new/search',
  },
  {
    id: 'T6',
    group: 'tasks',
    method: 'GET',
    path: '/api/v1/task/staff-simplified?limit=5&page=0',
    dashboard: 'serverApi.staffSimplified',
    orchestrator: 'tasksService.getStaff',
  },

  // MESSAGES / WHATSAPP
  {
    id: 'M1',
    group: 'messages',
    method: 'GET',
    path: '/api/v1/ai/debug/conversations?limit=5&skip=0&filter=recent',
    dashboard: 'communicationsApi whatsappApi',
    orchestrator: 'messagesService.getConversations',
  },
  {
    id: 'M5',
    group: 'messages',
    method: 'GET',
    path: '/api/v1/ai/debug/storage-stats',
    dashboard: '—',
    orchestrator: 'messagesService.getStorageStats',
  },
  {
    id: 'D4',
    group: 'messages',
    method: 'GET',
    path: '/api/v1/message/get-message-kpis-live?staging=false',
    dashboard: 'dashboard KPIs',
    orchestrator: 'dashboardService',
  },

  // LISTINGS
  {
    id: 'L1',
    group: 'listings',
    method: 'GET',
    path: '/api/v1/listing/listings?limit=5',
    dashboard: 'serverApi.listing',
    orchestrator: 'listingsService',
  },
  {
    id: 'L5',
    group: 'listings',
    method: 'GET',
    path: '/api/v1/listing/listings/stats?staging=false',
    dashboard: 'listing stats',
    orchestrator: 'listingsService / dashboardService',
  },

  // CALENDAR
  {
    id: 'D3',
    group: 'calendar',
    method: 'GET',
    path: `/api/v1/calendar/calendar/occupancy-rate?startDate=${startDate}&endDate=${endDate}`,
    dashboard: 'charts',
    orchestrator: 'dashboardService',
  },

  // DASHBOARD / ADMIN
  {
    id: 'D1',
    group: 'dashboard',
    method: 'GET',
    path: `/api/v1/admin/dashboard/overview?startDate=${startDate}&endDate=${endDate}`,
    dashboard: 'ultimate dashboard',
    orchestrator: 'dashboardService.getSnapshot',
  },
  {
    id: 'D5',
    group: 'dashboard',
    method: 'GET',
    path: `/api/v1/admin/analytics/snapshot?period=30d&comparison=vs-last-period&source=Tous`,
    dashboard: '—',
    orchestrator: 'analyticsService',
  },

  // ORCHESTRATION
  {
    id: 'OCH1',
    group: 'orchestration',
    method: 'GET',
    path: '/api/v1/orchestrator/reservations?limit=5&offset=0&reservationStatus=ACTIVE&sortBy=recent',
    dashboard: 'OrchestrationView',
    orchestrator: 'orchestrationService.getOrchestrationPlans',
  },
  {
    id: 'OCH3',
    group: 'orchestration',
    method: 'GET',
    path: '/api/v1/orchestrator/orchestration/stats',
    dashboard: 'orchestration header',
    orchestrator: 'getOrchestrationStats',
  },

  // CRM (srv-crm via ingress)
  {
    id: 'CR1',
    group: 'crm',
    method: 'GET',
    path: '/api/v1/crm/appointments',
    dashboard: 'CRM / démo (à cartographier)',
    orchestrator: 'CRMPage (futur branchement)',
  },
];

function headers() {
  const h = { Accept: 'application/json' };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  if (DEV_TOKEN) h['X-Dev-Token'] = DEV_TOKEN;
  return h;
}

async function runCase(c) {
  const url = `${API_BASE.replace(/\/$/, '')}${c.path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, { method: c.method, headers: headers() });
    const ms = Date.now() - start;
    const ok = res.status >= 200 && res.status < 300;
    let snippet = '';
    try {
      const text = await res.text();
      snippet = text.slice(0, 120).replace(/\s+/g, ' ');
    } catch {
      snippet = '';
    }
    return { ...c, url, status: res.status, ok, ms, snippet };
  } catch (err) {
    return {
      ...c,
      url,
      status: 0,
      ok: false,
      ms: Date.now() - start,
      snippet: String(err.message || err),
    };
  }
}

function pad(s, n) {
  const str = String(s);
  return str.length >= n ? str.slice(0, n - 1) + '…' : str.padEnd(n);
}

async function main() {
  let filtered = onlyGroups
    ? CASES.filter((c) => onlyGroups.includes(c.group))
    : CASES;

  if (!TOKEN && !STRICT) {
    const before = filtered.length;
    filtered = filtered.filter((c) => !SKIP_WITHOUT_TOKEN.has(c.id));
    const skipped = before - filtered.length;
    if (skipped > 0) {
      console.log(
        `ℹ️  Sans token (--strict pour tout tenter) : ${skipped} cas ignorés (auth, /ai/*, listing/réservations 401 observés, KPI messages, overview admin, analytics lent, occupancy JWT).\n`,
      );
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  AI-READ-API-PARITY — test-api-parity-all.mjs               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Base:   ${API_BASE}`);
  console.log(`Token:  ${TOKEN ? 'yes (' + TOKEN.slice(0, 12) + '…)' : 'NO — set SOJORI_API_TOKEN'}`);
  console.log(`Strict: ${STRICT ? 'yes (tous les cas)' : 'no'}`);
  console.log(`Dev:    ${DEV_TOKEN ? 'X-Dev-Token set' : 'none'}`);
  console.log(`Cases:  ${filtered.length} (read-only GET)\n`);
  console.log(
    pad('ID', 6) +
      pad('GRP', 14) +
      pad('HTTP', 6) +
      pad('ms', 7) +
      pad('STAT', 6) +
      'Endpoint',
  );
  console.log('-'.repeat(90));

  let pass = 0;
  let fail = 0;

  for (const c of filtered) {
    const r = await runCase(c);
    const stat = r.ok ? 'PASS' : 'FAIL';
    if (r.ok) pass++;
    else fail++;

    console.log(
      pad(r.id, 6) +
        pad(r.group, 14) +
        pad(String(r.status || 'ERR'), 6) +
        pad(String(r.ms), 7) +
        pad(stat, 6) +
        r.path.split('?')[0],
    );
    if (!r.ok) {
      console.log(`       ↳ dashboard: ${r.dashboard}`);
      console.log(`       ↳ orchestrator: ${r.orchestrator}`);
      if (r.note) console.log(`       ↳ note: ${r.note}`);
      console.log(`       ↳ ${r.snippet}`);
    }
  }

  console.log('-'.repeat(90));
  console.log(`\nRésultat: ${pass} pass, ${fail} fail (sur ${filtered.length})\n`);
  console.log('Doc complète: docs/AI-READ-API-PARITY.md\n');

  if (!TOKEN) {
    console.log(
      'ℹ️  Sans SOJORI_API_TOKEN : certains préfixes GET métier répondent sur dev ; le script ignore les routes auth / ai / JWT calendar / agrégats message.',
    );
    console.log('   Pour tout couvrir, exporter un JWT depuis le navigateur après login.\n');
  }

  process.exit(fail > 0 ? 1 : 0);
}

main();
