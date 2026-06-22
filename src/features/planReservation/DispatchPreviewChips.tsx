import type { MessageDispatchPreview } from './planDispatchPreview';

function chipClass(preview: MessageDispatchPreview, part: 'primary' | 'fallback'): string {
  if (part === 'primary' && preview.primaryMode === 'whatsapp') return 'wa';
  const ch = preview.textChannel === 'email' ? 'email' : 'ota';
  return ch;
}

function chipLabel(preview: MessageDispatchPreview, part: 'primary' | 'fallback'): string {
  if (part === 'primary' && preview.primaryMode === 'whatsapp') return 'WA';
  return preview.textChannel === 'email' ? 'EMAIL' : 'OTA';
}

export default function DispatchPreviewChips({ preview }: { preview?: MessageDispatchPreview }) {
  if (!preview) return null;

  if (preview.primaryMode === 'whatsapp') {
    return (
      <span
        className="dispatch-preview-chips"
        title={`${preview.label}${preview.whatsappUsesMetaTemplate ? ' — template Meta, pas de limite 24h' : ''}`}
      >
        <span className={`ch-chip ${chipClass(preview, 'primary')}`}>{chipLabel(preview, 'primary')}</span>
        <span className="dispatch-preview-arrow" aria-hidden>
          ·
        </span>
        <span className={`ch-chip ${chipClass(preview, 'fallback')}`} title="Corps catalogue si échec WhatsApp">
          {preview.textChannel === 'email' ? 'MSG EMAIL' : 'MSG OTA'}
        </span>
      </span>
    );
  }

  return (
    <span className="dispatch-preview-chips" title={preview.label}>
      <span className={`ch-chip ${chipClass(preview, 'primary')}`}>
        {preview.shortLabel?.toUpperCase() ??
          (preview.textChannel === 'email' ? 'MSG · EMAIL' : 'MSG · OTA')}
      </span>
    </span>
  );
}
