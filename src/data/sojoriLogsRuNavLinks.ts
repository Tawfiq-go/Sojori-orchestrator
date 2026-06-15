/**
 * Liens sidebar Logs Sojori → navigation Channels RU existante (Business / Debug / …).
 * Ne pas dupliquer la logique de BusinessTab — deep-link vers /channels ou /admin/channels.
 */
import {
  BUSINESS_FLOW_NAV,
  BUSINESS_STATS_NAV,
  INBOUND_HOOK_DOMAIN_NAV,
  OUTBOUND_DOMAIN_NAV,
  bizFromBusinessFlow,
} from '../utils/channelsBusinessNav';

export const SOJORI_LOG_SOURCE_AIRROI = 'airroi';

export type SojoriLogSourceId = typeof SOJORI_LOG_SOURCE_AIRROI | 'ru-channels';

export type SojoriLogNavLink = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  /** Indentation niveau sidebar (0 = section, 1 = flux, 2 = domaine) */
  depth: number;
};

function channelsUrl(params: Record<string, string>): string {
  const q = new URLSearchParams(params);
  return `/admin/channels?${q.toString()}`;
}

/** Arbre RU = parité ChannelsTopNav (Summary, Business flux/domaines, Debug types, Cron, Import). */
export function buildRuChannelsNavLinks(): SojoriLogNavLink[] {
  const links: SojoriLogNavLink[] = [];

  links.push({
    id: 'ru-sum',
    label: 'Summary',
    hint: 'KPIs agrégés',
    href: channelsUrl({ tab: 'Sum' }),
    depth: 0,
  });

  links.push({
    id: 'ru-business-h',
    label: 'Business',
    hint: 'Entrant / sortant / brut',
    href: channelsUrl({ tab: 'Business', biz: 'api', api: 'm' }),
    depth: 0,
  });

  for (const { flow, label, hint } of BUSINESS_FLOW_NAV) {
    const biz = bizFromBusinessFlow(flow);
    let href = channelsUrl({ tab: 'Business', biz });
    if (flow === 'out') href = channelsUrl({ tab: 'Business', biz, api: 'm' });
    if (flow === 'in-hook') href = channelsUrl({ tab: 'Business', biz, hook: 'm' });
    if (flow === 'in-http') href = channelsUrl({ tab: 'Business', biz, api: 'g' });

    links.push({ id: `ru-flow-${flow}`, label, hint, href, depth: 1 });

    if (flow === 'out') {
      for (const d of OUTBOUND_DOMAIN_NAV) {
        links.push({
          id: `ru-out-${d.seg}`,
          label: d.label,
          hint: d.hint,
          href: channelsUrl({ tab: 'Business', biz: 'api', api: d.seg }),
          depth: 2,
        });
      }
    }
    if (flow === 'in-hook') {
      for (const d of INBOUND_HOOK_DOMAIN_NAV) {
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

  for (const { flow, label, hint } of BUSINESS_STATS_NAV) {
    const biz = bizFromBusinessFlow(flow);
    links.push({
      id: `ru-stats-${flow}`,
      label,
      hint,
      href: channelsUrl({ tab: 'Business', biz }),
      depth: 1,
    });
  }

  links.push({
    id: 'ru-debug-h',
    label: 'Debug',
    hint: 'Pull / Push / OAuth / Webhooks / REST (mapping RU brut)',
    href: channelsUrl({ tab: 'Debug', type: 'pull' }),
    depth: 0,
  });

  const debugTypes = [
    { type: 'pull', label: 'Pull' },
    { type: 'push', label: 'Push' },
    { type: 'oauth', label: 'OAuth' },
    { type: 'webhooks', label: 'Webhooks' },
    { type: 'rest', label: 'REST' },
  ] as const;
  for (const d of debugTypes) {
    links.push({
      id: `ru-debug-${d.type}`,
      label: d.label,
      href: channelsUrl({ tab: 'Debug', type: d.type }),
      depth: 1,
    });
  }

  links.push({
    id: 'ru-cron',
    label: 'Cron',
    href: channelsUrl({ tab: 'Cron' }),
    depth: 0,
  });
  links.push({
    id: 'ru-import',
    label: 'Import RU',
    href: channelsUrl({ tab: 'Import' }),
    depth: 0,
  });

  return links;
}
