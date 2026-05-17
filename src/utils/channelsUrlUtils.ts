/** Canonicalisation onglets URL — compat legacy sojori-dashboard `/admin/Channels`. */

export const SECTION_VALID = new Set(['Sum', 'Business', 'Mapping', 'Debug', 'Cron', 'Import']);

export type SectionTab = 'Sum' | 'Business' | 'Mapping' | 'Debug' | 'Cron' | 'Import';

export function canonicalSectionTab(tabParam: string | null): SectionTab {
  if (!tabParam) return 'Sum';
  const raw = tabParam.trim();
  if (SECTION_VALID.has(raw)) return raw as SectionTab;
  const lo = raw.toLowerCase();
  if (lo === 'business' || lo === 'biz') return 'Business';
  if (lo === 'mapping' || lo === 'geo') return 'Mapping';
  if (lo === 'summary' || lo === 'sum' || lo === 'overview' || lo === 'kpi') return 'Sum';
  if (lo === 'debug' || lo === 'audit') return 'Debug';
  if (lo === 'cron' || lo === 'crons' || lo === 'jobs') return 'Cron';
  if (lo === 'import' || lo === 'onboard') return 'Import';
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
    Debug: 'debug',
    Cron: 'cron',
    Import: 'import',
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
