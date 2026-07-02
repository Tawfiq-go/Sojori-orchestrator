/** Canonicalisation onglets URL — compat legacy sojori-dashboard `/admin/Channels`. */

export const SECTION_VALID = new Set([
  'Sum',
  'Business',
  'Mapping',
  'LogApiRU',
  'Debug',
  'Cron',
]);

export type SectionTab =
  | 'Sum'
  | 'Business'
  | 'Mapping'
  | 'LogApiRU'
  | 'Debug'
  | 'Cron';

export function canonicalSectionTab(tabParam: string | null): SectionTab {
  if (!tabParam) return 'Sum';
  const raw = tabParam.trim();
  if (SECTION_VALID.has(raw)) return raw as SectionTab;
  const lo = raw.toLowerCase();
  if (lo === 'business' || lo === 'biz') return 'Business';
  if (lo === 'mapping' || lo === 'geo') return 'Mapping';
  if (lo === 'summary' || lo === 'sum' || lo === 'overview' || lo === 'kpi') return 'Sum';
  if (lo === 'logapiru' || lo === 'logapi-ru' || lo === 'ru-logs') return 'LogApiRU';
  if (lo === 'debug' || lo === 'audit') return 'Debug';
  if (lo === 'cron' || lo === 'crons' || lo === 'jobs') return 'Cron';
  if (lo === 'import' || lo === 'onboard') return 'Sum';
  if (lo === 'channel-manager' || lo === 'channelmanager' || lo === 'channel_manager') {
    return 'Sum';
  }
  if (lo === 'distribution' || lo === 'dist') return 'Sum';
  if (lo === 'api' || lo === 'hook') return 'Business';
  if (lo === 'map' || lo === 'rulist') return 'Mapping';
  return 'Sum';
}

/** Onglet UI orchestrator (minuscule) ↔ section legacy. */
export function sectionToUiTab(section: SectionTab): string {
  const map: Record<SectionTab, string> = {
    Sum: 'summary',
    Business: 'business',
    Mapping: 'mapping',
    LogApiRU: 'logapiru',
    Debug: 'debug',
    Cron: 'cron',
  };
  return map[section];
}

export function uiTabToSection(uiTab: string): SectionTab {
  return canonicalSectionTab(uiTab);
}

/** Migre query legacy vers format canonique (replace). */
export function migrateLegacyChannelsSearchParams(sp: URLSearchParams): URLSearchParams | null {
  const raw = (sp.get('tab') || '').trim();
  const lo = raw.toLowerCase();
  const next = new URLSearchParams(sp);

  if (lo === 'channel-manager' || lo === 'distribution') {
    return null;
  }

  if (lo === 'api' || lo === 'hook' || lo === 'map' || lo === 'rulist') {
    if (lo === 'hook') {
      next.set('tab', 'Business');
      next.set('biz', 'hooks');
      if (!next.get('hook')) next.set('hook', 'm');
    } else if (lo === 'api') {
      next.set('tab', 'Business');
      const ap = next.get('api') || 'm';
      next.set('biz', ap === 'g' ? 'logapi' : 'api');
      if (!next.get('api')) next.set('api', 'm');
    } else if (lo === 'map') {
      next.set('tab', 'Mapping');
      next.set('mapSub', 'fields');
    } else {
      next.set('tab', 'Mapping');
      next.set('mapSub', 'list');
    }
    next.delete('layout');
    next.delete('view');
    return next;
  }

  const canon = canonicalSectionTab(raw);
  const bEarly = (next.get('biz') || '').toLowerCase();

  if (canon === 'Debug' && (bEarly === 'logapi' || next.get('api') === 'g')) {
    next.set('tab', 'Debug');
    next.set('type', 'http');
    next.delete('biz');
    next.delete('api');
    return next;
  }

  if (bEarly === 'owner-vol' || bEarly === 'listing') {
    next.set('tab', 'Sum');
    next.set('sumView', bEarly);
    next.delete('biz');
    next.delete('api');
    next.delete('hook');
    return next;
  }

  if (canon === 'Business' && bEarly === 'logapi') {
    next.set('tab', 'Debug');
    next.set('type', 'http');
    next.delete('biz');
    next.delete('api');
    return next;
  }

  if (!raw) {
    next.set('tab', 'Sum');
    return next;
  }
  if (raw !== canon && SECTION_VALID.has(canon)) {
    next.set('tab', canon);
    next.delete('layout');
    next.delete('view');
    return next;
  }

  if (canon === 'Business') {
    const b = (next.get('biz') || '').toLowerCase();
    if (!b) {
      next.set('biz', 'api');
      if (!next.get('api')) next.set('api', 'm');
      return next;
    }
    if (b === 'logapi' && next.get('api') !== 'g') {
      next.set('api', 'g');
      return next;
    }
    if (b === 'hooks' && !next.get('hook')) {
      next.set('hook', 'm');
      return next;
    }
    if (b === 'api' && next.get('api') === 'g') {
      next.set('api', 'm');
      return next;
    }
  }
  if (canon === 'Mapping' && !(next.get('mapSub') || '').trim()) {
    next.set('mapSub', 'fields');
    return next;
  }

  return null;
}
