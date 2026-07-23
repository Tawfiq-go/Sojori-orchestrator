import { useEffect, useState } from 'react';
import * as fulltaskApi from '../../services/fulltaskApi';

type PreviewBody = {
  canal: 'whatsapp' | 'email' | 'OTA';
  content: string;
  metaTemplateName?: string;
  templateVariables?: string[];
};

type Props =
  | { reservationId: string; kind: 'message'; messageIndex: number }
  | { reservationId: string; kind: 'relance'; taskId: string; relanceIndex: number };

const TAB_LABEL: Record<PreviewBody['canal'], string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  OTA: 'OTA',
};

export default function MessageBodyPreview(props: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PreviewBody['canal']>('whatsapp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bodies, setBodies] = useState<PreviewBody[]>([]);
  const [meta, setMeta] = useState<{ label?: string; messageId?: string }>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res =
          props.kind === 'message'
            ? await fulltaskApi.previewPlanDispatch(props.reservationId, {
                kind: 'message',
                messageIndex: props.messageIndex,
              })
            : await fulltaskApi.previewPlanDispatch(props.reservationId, {
                kind: 'relance',
                taskId: props.taskId,
                relanceIndex: props.relanceIndex,
              });
        if (cancelled) return;
        if (res?.success === false) throw new Error(res?.error || 'Aperçu indisponible');
        setBodies((res?.data?.bodies as PreviewBody[]) || []);
        setMeta({ label: res?.data?.label, messageId: res?.data?.messageId });
        const first = (res?.data?.bodies as PreviewBody[] | undefined)?.find((b) => b.content?.trim());
        if (first) setTab(first.canal);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur aperçu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, props]);

  const active = bodies.find((b) => b.canal === tab);

  return (
    <div className="msg-body-preview">
      <button
        type="button"
        className="msg-body-preview-toggle"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
      >
        {open ? '▾' : '▸'} Voir contenu message
      </button>
      {open ? (
        <div className="msg-body-preview-panel" onClick={(e) => e.stopPropagation()}>
          {meta.messageId ? (
            <div className="msg-body-preview-meta">
              Template · {meta.messageId}
              {meta.label ? ` · ${meta.label}` : ''}
            </div>
          ) : null}
          <div className="msg-body-preview-tabs">
            {(['whatsapp', 'email', 'OTA'] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`msg-body-preview-tab${tab === c ? ' on' : ''}`}
                onClick={() => setTab(c)}
              >
                {TAB_LABEL[c]}
              </button>
            ))}
          </div>
          {loading ? <div className="msg-body-preview-loading">Chargement…</div> : null}
          {error ? <div className="msg-body-preview-err">{error}</div> : null}
          {!loading && !error && active ? (
            <div className="msg-body-preview-body">
              {active.canal === 'whatsapp' && active.metaTemplateName ? (
                <div className="msg-body-preview-wa-meta">
                  Meta · {active.metaTemplateName}
                  {active.templateVariables?.length
                    ? ` · {{${active.templateVariables.map((_, i) => i + 1).join('}} {{')}}}`
                    : ''}
                </div>
              ) : null}
              {active.canal === 'whatsapp' && active.templateVariables?.length ? (
                <ol className="msg-body-preview-vars">
                  {active.templateVariables.map((v, i) => (
                    <li key={`${i}-${v}`}>
                      <code>{`{{${i + 1}}}`}</code> {v}
                    </li>
                  ))}
                </ol>
              ) : null}
              <pre className="msg-body-preview-text">{active.content || '—'}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
