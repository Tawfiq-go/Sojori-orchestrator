/**
 * Liens sidebar Logs Sojori → navigation Channels (2 niveaux Business + Summary volumes).
 */
import {
  API_DOMAIN_NAV,
  BUSINESS_LEVEL1_NAV,
  level1NavDefaults,
  SUMMARY_VIEW_NAV,
  WEBHOOK_DOMAIN_NAV,
} from '../utils/channelsBusinessNav';

export const SOJORI_LOG_SOURCE_AIRROI = 'airroi';

export type SojoriLogSourceId = typeof SOJORI_LOG_SOURCE_AIRROI | 'ru-channels';

export type SojoriLogNavLink = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  depth: number;
};

function channelsUrl(params: Record<string, string>): string {
  const q = new URLSearchParams(params);
  return `/admin/channels?${q.toString()}`;
}

export function buildRuChannelsNavLinks(): SojoriLogNavLink[] {
  const links: SojoriLogNavLink[] = [];

  links.push({
    id: 'ru-sum',
    label: 'Summary',
    hint: 'KPIs et volumes',
    href: channelsUrl({ tab: 'Sum' }),
    depth: 0,
  });

  for (const { view, label, hint } of SUMMARY_VIEW_NAV) {
    links.push({
      id: `ru-sum-${view}`,
      label,
      hint,
      href: channelsUrl(view === 'kpi' ? { tab: 'Sum' } : { tab: 'Sum', sumView: view }),
      depth: 1,
    });
  }

  links.push({
    id: 'ru-business-h',
    label: 'Business',
    hint: 'API sortante et webhooks entrants',
    href: channelsUrl({ tab: 'Business', biz: 'api', api: 'r' }),
    depth: 0,
  });

  for (const { section, label, hint } of BUSINESS_LEVEL1_NAV) {
    const defaults = level1NavDefaults(section, 'r', 'm');
    links.push({
      id: `ru-l1-${section}`,
      label,
      hint,
      href: channelsUrl(
        Object.fromEntries(
          Object.entries(defaults).filter(([, v]) => v != null) as [string, string][],
        ),
      ),
      depth: 1,
    });

    if (section === 'api') {
      for (const d of API_DOMAIN_NAV) {
        links.push({
          id: `ru-api-${d.seg}`,
          label: d.label,
          hint: d.hint,
          href: channelsUrl({ tab: 'Business', biz: 'api', api: d.seg }),
          depth: 2,
        });
      }
    }
    if (section === 'hooks') {
      for (const d of WEBHOOK_DOMAIN_NAV) {
        links.push({
          id: `ru-hook-${d.seg}`,
          label: d.label,
          hint: d.hint,
          href: channelsUrl({ tab: 'Business', biz: 'hooks', hook: d.seg }),
          depth: 2,
        });
      }
    }
  }

  links.push({
    id: 'ru-debug-h',
    label: 'Debug',
    hint: 'Audit technique RU + HTTP brut',
    href: channelsUrl({ tab: 'Debug', type: 'pull' }),
    depth: 0,
  });

  const debugTypes = [
    { type: 'pull', label: 'Pull' },
    { type: 'push', label: 'Push' },
    { type: 'oauth', label: 'OAuth' },
    { type: 'webhooks', label: 'Webhooks' },
    { type: 'rest', label: 'REST' },
    { type: 'http', label: 'HTTP brut' },
  ] as const;
  for (const d of debugTypes) {
    links.push({
      id: `ru-debug-${d.type}`,
      label: d.label,
      href: channelsUrl({ tab: 'Debug', type: d.type }),
      depth: 1,
    });
  }

  links.push({ id: 'ru-cron', label: 'Cron', href: channelsUrl({ tab: 'Cron' }), depth: 0 });

  return links;
}
