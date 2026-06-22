export type TextDispatchChannel = 'email' | 'ota';

export interface PlanDispatchContext {
  atSojori: boolean;
  channelName?: string;
  textFallback: TextDispatchChannel;
}

export interface MessageDispatchPreview {
  configCanal: 'whatsapp' | 'OTA' | 'email';
  textChannel: TextDispatchChannel;
  primaryMode: 'whatsapp' | 'text';
  whatsappUsesMetaTemplate?: boolean;
  label: string;
  shortLabel?: string;
  fallbackLabel?: string;
}

export function dispatchPreviewToChannel(preview?: MessageDispatchPreview): 'wa' | 'email' | 'ota' | undefined {
  if (!preview) return undefined;
  if (preview.primaryMode === 'whatsapp') return 'wa';
  return preview.textChannel === 'email' ? 'email' : 'ota';
}

export function formatReservationSourceLabel(ctx?: PlanDispatchContext): string {
  if (!ctx) return '';
  if (ctx.atSojori) return 'Direct Sojori';
  return ctx.channelName || 'OTA';
}

export function sourceLabelFromSummary(summary: {
  atSojori?: boolean;
  channelName?: string;
  reservationCode?: string;
}): string {
  if (summary.atSojori === true) return 'Direct Sojori';
  if (summary.atSojori === false) return summary.channelName || 'OTA';
  if (summary.channelName?.trim()) return summary.channelName.trim();
  return 'Direct';
}

export function dispatchPreviewShort(preview?: MessageDispatchPreview): string | undefined {
  if (!preview) return undefined;
  if (preview.shortLabel) return preview.shortLabel;
  if (preview.primaryMode === 'whatsapp') {
    return preview.fallbackLabel ? `WA · ${preview.fallbackLabel.replace(/^Message /i, 'msg ')}` : preview.label;
  }
  return preview.label;
}
