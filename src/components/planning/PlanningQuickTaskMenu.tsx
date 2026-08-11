// ════════════════════════════════════════════════════════════════════
// PlanningQuickTaskMenu — Clic droit sur la grille = créer une tâche
// La POSITION porte déjà le contexte (logement + jour + résa) : le PM
// choisit juste le TYPE. Un seul geste, aucun bouton en plus dans l'UI.
// Les types les plus probables du jour cliqué remontent en tête
// (jour de départ → ménage/check-out · jour d'arrivée → check-in).
// ════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import {
  Box,
  Divider,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { PlanningCreateContext } from '../calendar-views/_shared';

type QuickType = { type: string; label: string; icon: string; defaultTime?: string };

/** Catalogue court — les types qu'un PM crée à la main depuis le planning. */
const QUICK_TYPES: QuickType[] = [
  { type: 'checkout_cleaning', label: 'Ménage checkout', icon: '🧼', defaultTime: '11:00' },
  { type: 'cleaning_free', label: 'Ménage gratuit', icon: '🧹', defaultTime: '11:00' },
  { type: 'cleaning_paid', label: 'Ménage payant', icon: '🧽', defaultTime: '11:00' },
  { type: 'receive_arrival', label: 'Accueil client (check-in)', icon: '🛎️', defaultTime: '15:00' },
  { type: 'receive_departure', label: 'Départ client (check-out)', icon: '🛎️', defaultTime: '11:00' },
  { type: 'transport', label: 'Navette / transport', icon: '🚐', defaultTime: '09:00' },
  { type: 'groceries', label: 'Courses', icon: '🛒', defaultTime: '10:00' },
  { type: 'concierge', label: 'Conciergerie', icon: '🤝', defaultTime: '10:00' },
  { type: 'support', label: 'Support / maintenance', icon: '🛠️', defaultTime: '10:00' },
];

/** Types mis en avant selon le jour cliqué — la position suggère l'intention. */
function suggestedFor(ctx: PlanningCreateContext): string[] {
  if (ctx.isDepartureDay) return ['checkout_cleaning', 'cleaning_free', 'receive_departure', 'transport'];
  if (ctx.isArrivalDay) return ['receive_arrival', 'transport', 'groceries'];
  if (ctx.reservationId) return ['cleaning_free', 'cleaning_paid', 'support', 'concierge'];
  return ['checkout_cleaning', 'cleaning_free', 'support'];
}

export default function PlanningQuickTaskMenu({
  ctx,
  anchorPos,
  ownerId,
  onClose,
  onCreated,
}: {
  ctx: PlanningCreateContext | null;
  anchorPos: { x: number; y: number } | null;
  ownerId?: string | null;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const { suggested, others } = useMemo(() => {
    if (!ctx) return { suggested: [] as QuickType[], others: [] as QuickType[] };
    const top = suggestedFor(ctx);
    const rank = (t: QuickType) => {
      const i = top.indexOf(t.type);
      return i === -1 ? 99 : i;
    };
    const sorted = [...QUICK_TYPES].sort((a, b) => rank(a) - rank(b));
    return {
      suggested: sorted.filter((t) => top.includes(t.type)),
      others: sorted.filter((t) => !top.includes(t.type)),
    };
  }, [ctx]);

  if (!ctx || !anchorPos) return null;

  const dayLabel = new Date(`${ctx.dayIso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const create = async (t: QuickType) => {
    setBusy(t.type);
    try {
      /* Contrat aligné sur createFulltaskFromModal (modal « + Tâche » de /tasks) :
         guestPhone/guestName sont requis par l'API — valeurs de repli quand la
         cellule n'a pas de résa. scheduledAt/dueAt sont des ISO complets. */
      const hm = (time || t.defaultTime || '10:00').trim();
      const start = new Date(`${ctx.dayIso}T${hm}:00`);
      const end = new Date(start.getTime() + 2 * 3600 * 1000);
      const res = await fulltaskApi.createTask({
        type: t.type,
        triggeredBy: 'manual',
        listingId: ctx.listingId,
        ...(ctx.reservationId ? { reservationId: ctx.reservationId } : {}),
        ...(ctx.reservationNumber ? { reservationCode: ctx.reservationNumber } : {}),
        guestName: ctx.guestName || 'Sans réservation',
        guestPhone: '+212000000000',
        ...(ownerId ? { ownerId } : {}),
        priority: 'normal',
        scheduledDate: start.toISOString(),
        scheduledAt: start.toISOString(),
        dueAt: end.toISOString(),
        payload: {
          source: 'ADMIN',
          createdFrom: 'planning_context_menu',
          ...(ctx.reservationId ? {} : { noReservation: true }),
        },
      });
      if (res?.success === false) throw new Error(res?.error || 'Création impossible');
      toast.success(`${t.icon} ${t.label} créée · ${dayLabel} ${hm}`);
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de la création');
    } finally {
      setBusy(null);
    }
  };

  const renderItem = (t: QuickType) => (
    <MenuItem key={t.type} disabled={busy != null} onClick={() => create(t)} dense>
      <Box component="span" sx={{ mr: 1, fontSize: 15 }}>
        {t.icon}
      </Box>
      <Box component="span" sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
        {t.label}
      </Box>
      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', ml: 1 }}>
        {time || t.defaultTime}
      </Typography>
    </MenuItem>
  );

  return (
    <Menu
      open
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={{ top: anchorPos.y, left: anchorPos.x }}
      slotProps={{ paper: { sx: { minWidth: 268, borderRadius: 1.5 } } }}
    >
      {/* En-tête : ce que le clic a détecté — le PM ne saisit rien de tout ça. */}
      <Box sx={{ px: 1.5, pt: 1, pb: 0.75 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.3 }} noWrap>
          {ctx.listingName}
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          {dayLabel}
          {ctx.guestName ? ` · ${ctx.guestName}` : ' · sans réservation'}
          {ctx.isDepartureDay ? ' · départ' : ctx.isArrivalDay ? ' · arrivée' : ''}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Heure</Typography>
          <TextField
            type="time"
            size="small"
            value={time}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setTime(e.target.value)}
            placeholder="auto"
            sx={{ '& input': { fontSize: 12, py: 0.4, width: 78 } }}
          />
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
            vide = heure du type
          </Typography>
        </Box>
      </Box>
      <Divider />
      {suggested.map(renderItem)}
      {others.length > 0 && <Divider />}
      {others.map(renderItem)}
    </Menu>
  );
}
