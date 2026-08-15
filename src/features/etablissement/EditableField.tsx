/**
 * Champ éditable en place — la brique d'édition de l'écran Configuration.
 *
 * Parti pris : PAS de mode « édition globale » avec un gros bouton Sauvegarder
 * en bas. Un établissement se corrige champ par champ, souvent un seul à la
 * fois ; un formulaire global oblige à retrouver ce qu'on a changé et rend
 * l'échec partiel illisible (« quels champs sont passés ? »).
 *
 * Chaque champ sauvegarde SEUL, dit ce qu'il fait, et revient à sa valeur
 * d'origine s'il échoue. Entrée valide, Échap annule.
 */
import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, TextField, Typography } from '@mui/material';
import { T, kickerSx } from './tokens';

type Props = {
  label: string;
  value: string | number | null | undefined;
  /** Sauvegarde. Résout `false` (ou lève) si le serveur refuse. */
  onSave: (next: string) => Promise<boolean>;
  /** Affiché en gris italique quand la valeur est absente. */
  placeholder?: string;
  type?: 'text' | 'number';
  multiline?: boolean;
  /** Lecture seule : rend la valeur sans interaction (droits, champ dérivé…). */
  readOnly?: boolean;
  suffix?: string;
};

export default function EditableField({
  label,
  value,
  onSave,
  placeholder = 'non renseigné',
  type = 'text',
  multiline = false,
  readOnly = false,
  suffix,
}: Props) {
  const initial = value == null ? '' : String(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // La valeur peut changer sous nos pieds (rechargement après sauvegarde d'un
  // autre champ) : on resynchronise tant qu'on n'est pas en train d'éditer.
  useEffect(() => {
    if (!editing) setDraft(initial);
  }, [initial, editing]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = async () => {
    const next = draft.trim();
    if (next === initial.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setFailed(false);
    try {
      const ok = await onSave(next);
      if (ok) {
        setEditing(false);
      } else {
        // Échec : on garde la saisie à l'écran pour ne pas la perdre, et on le
        // signale. Revenir en silence à l'ancienne valeur ferait croire à un
        // enregistrement réussi.
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(initial);
    setEditing(false);
    setFailed(false);
  };

  if (readOnly || !editing) {
    const empty = !initial.trim();
    return (
      <Box>
        <Typography sx={{ ...kickerSx, fontSize: 9.5, mb: 0.25 }}>{label}</Typography>
        <Box
          component={readOnly ? 'div' : 'button'}
          type={readOnly ? undefined : 'button'}
          onClick={readOnly ? undefined : () => setEditing(true)}
          sx={{
            all: readOnly ? 'unset' : undefined,
            ...(readOnly
              ? {}
              : {
                  cursor: 'pointer',
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: '6px',
                  px: 0.75,
                  ml: -0.75,
                  py: 0.35,
                  '&:hover': { bgcolor: T.goldTint },
                  '&:focus-visible': { outline: `2px solid ${T.gold}`, outlineOffset: 1 },
                }),
          }}
        >
          <Typography
            sx={{
              fontSize: 13.5,
              color: empty ? T.ink4 : T.ink,
              fontStyle: empty ? 'italic' : 'normal',
              whiteSpace: multiline ? 'pre-wrap' : 'normal',
              lineHeight: multiline ? 1.6 : 1.4,
            }}
          >
            {empty ? placeholder : initial}
            {!empty && suffix ? (
              <Box component="span" sx={{ color: T.ink3, ml: 0.5 }}>
                {suffix}
              </Box>
            ) : null}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography sx={{ ...kickerSx, fontSize: 9.5, mb: 0.25 }}>{label}</Typography>
      <TextField
        inputRef={ref}
        size="small"
        fullWidth
        type={type}
        multiline={multiline}
        minRows={multiline ? 3 : undefined}
        value={draft}
        disabled={saving}
        error={failed}
        helperText={failed ? "L'enregistrement a échoué — votre saisie est conservée." : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            void commit();
          }
          if (e.key === 'Escape') cancel();
        }}
        InputProps={{
          endAdornment: saving ? <CircularProgress size={14} sx={{ color: T.gold }} /> : undefined,
        }}
        sx={{ '& .MuiInputBase-input': { fontSize: 13.5 } }}
      />
    </Box>
  );
}
