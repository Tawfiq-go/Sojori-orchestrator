import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalScrollColumn } from '../../../components/common/ModalScrollColumn';
import { MESSAGE_MERGE_VARIABLES } from './orchestrationMessageVars';

interface Props {
  open: boolean;
  title: string;
  messageFr: string;
  channelLabel: string;
  onClose: () => void;
  onChange: (text: string) => void;
}

/** Aperçu + édition message Email/OTA avec variables résa / listing */
export default function MessageBodyModal({
  open,
  title,
  messageFr,
  channelLabel,
  onClose,
  onChange,
}: Props) {
  const [showVars, setShowVars] = useState(true);

  const groupedVars = useMemo(() => {
    const map = new Map<string, typeof MESSAGE_MERGE_VARIABLES>();
    MESSAGE_MERGE_VARIABLES.forEach((v) => {
      const arr = map.get(v.group) || [];
      arr.push(v);
      map.set(v.group, arr);
    });
    return [...map.entries()];
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const insertVar = (key: string) => {
    onChange(`${messageFr}${messageFr.endsWith('\n') || messageFr === '' ? '' : '\n'}${key}`);
  };

  return createPortal(
    <div
      className="orch-msg-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orch-msg-modal-title"
      onClick={onClose}
    >
      <div className="orch-msg-modal" onClick={(e) => e.stopPropagation()}>
        <header className="orch-msg-modal-h">
          <div>
            <h3 id="orch-msg-modal-title">{title}</h3>
            <span className="orch-msg-modal-sub">Canal · {channelLabel} · version FR</span>
          </div>
          <button type="button" className="orch-msg-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <div className="orch-msg-modal-body">
          <div className="orch-msg-editor-col">
            <label className="orch-msg-lbl" htmlFor="orch-msg-textarea">
              Corps du message
            </label>
            <textarea
              id="orch-msg-textarea"
              className="orch-msg-textarea"
              value={messageFr}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
            />
          </div>

          <aside className="orch-msg-vars-col">
            <button
              type="button"
              className="orch-msg-vars-toggle"
              onClick={() => setShowVars((v) => !v)}
            >
              {showVars ? '▼' : '▶'} Variables réservation / listing
            </button>
            {showVars && (
              <ModalScrollColumn
                active={open}
                className="orch-message-vars-scroll"
                wrapperSx={{ flex: 1, minHeight: 0 }}
                innerSx={{ p: 1 }}
              >
                {groupedVars.map(([group, vars]) => (
                  <div key={group} className="orch-msg-var-group">
                    <div className="orch-msg-var-group-h">{group}</div>
                    {vars.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        className="orch-msg-var-btn"
                        title={`Insérer ${v.key}`}
                        onClick={() => insertVar(v.key)}
                      >
                        <code>{v.key}</code>
                        <span>{v.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </ModalScrollColumn>
            )}
          </aside>
        </div>

        <footer className="orch-msg-modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
