/**
 * PANNEAU DES CHAMBRES PHYSIQUES — la brique qui manquait au front Multi.
 *
 * ⚠️ POURQUOI CE COMPOSANT EXISTE (agent futur) :
 * Le front s'arrêtait au room type et à son compteur `roomNumber`. Les chambres
 * physiques (collection `Room` : « Villa 05 », son état de ménage, son
 * activation) existaient en base — 14 pour NOMMOS — mais n'étaient affichées
 * NULLE PART. On ne pouvait ni les voir, ni les activer/désactiver.
 *
 * ⚠️ LE COMPTEUR MENT — c'est tout le propos de ce panneau.
 * `declaredUnits` est la capacité THÉORIQUE saisie sur le type.
 * `sellableRooms` est la capacité RÉELLE : chambres actives dont l'état n'est
 * ni OutOfOrder ni OutOfService. Mesuré en prod sur NOMMOS le 13/08/2026 :
 * 14 déclarées, 7 vendables. Un type « Villa avec Piscine Privée » affiche
 * 2 unités alors qu'une est en travaux → occupation et RevPAR faux d'un
 * facteur 2. N'affiche JAMAIS le compteur sans l'écart.
 *
 * Lecture seule pour l'instant : l'état de ménage vient de Mews par webhook,
 * on ne l'écrase pas depuis ici.
 */
import { useEffect, useState } from 'react';
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import { multiTokens as t } from './multiTypes';
import listingsService from '../../../services/listingsService';
import type {
  ListingStructure,
  ListingStructureRoom,
  ListingStructureRoomType,
} from '../../../types/listings.types';

type Props = {
  listingId: string;
  /** Rafraîchit quand le parent sauvegarde des types (nouvelle clé = refetch). */
  refreshKey?: number | string;
};

/**
 * Les 5 états Mews. ⚠️ Jamais la couleur seule : chaque état porte aussi une
 * FORME distincte (plein / contour / hachuré) et un libellé — un daltonien
 * doit pouvoir lire l'état, et l'écran est consulté en plein soleil sur un
 * téléphone au bord d'une piscine.
 */
const HK: Record<
  string,
  { label: string; color: string; bg: string; border: string; dashed?: boolean }
> = {
  Inspected: { label: 'Prête à vendre', color: t.success, bg: 'rgba(10,143,94,0.14)', border: t.success },
  Clean: { label: 'Nettoyée', color: t.primaryDeep, bg: t.primaryTint, border: t.primary },
  Dirty: { label: 'À nettoyer', color: t.error, bg: 'transparent', border: t.error },
  OutOfOrder: { label: 'Hors service', color: t.text3, bg: t.bg3, border: t.borderStrong, dashed: true },
  OutOfService: { label: 'Hors périmètre', color: t.text3, bg: t.bg3, border: t.borderStrong, dashed: true },
};

const UNKNOWN_HK = { label: 'État inconnu', color: t.text4, bg: t.bg2, border: t.border };

function hkStyle(state: string | null | undefined) {
  return HK[String(state || '')] ?? UNKNOWN_HK;
}

/** Une chambre = une pastille. Forme + couleur + libellé au survol. */
function RoomChip({ room }: { room: ListingStructureRoom }) {
  const s = hkStyle(room.housekeepingState);
  const disabled = !room.enabled;
  return (
    <Tooltip
      title={
        `${room.name || '—'}` +
        `${room.code ? ` · ${room.code}` : ''}` +
        ` — ${s.label}` +
        `${disabled ? ' · désactivée' : ''}` +
        `${room.sellable ? '' : ' · NON VENDABLE'}`
      }
      arrow
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.4,
          borderRadius: '8px',
          fontSize: 12,
          fontFamily: t.mono,
          fontWeight: 600,
          color: disabled ? t.text4 : s.color,
          bgcolor: disabled ? t.bg2 : s.bg,
          border: `1.5px ${s.dashed || disabled ? 'dashed' : 'solid'} ${disabled ? t.border : s.border}`,
          // Une chambre désactivée reste lisible : on la grise, on ne la cache pas.
          textDecoration: disabled ? 'line-through' : 'none',
          cursor: 'default',
          whiteSpace: 'nowrap',
        }}
      >
        {room.name || `#${room.number ?? '?'}`}
      </Box>
    </Tooltip>
  );
}

/** Bandeau d'écart déclaré / vendable — rouge quand plus rien n'est vendable. */
function CapacityBar({ declared, physical, sellable }: { declared: number; physical: number; sellable: number }) {
  const none = sellable === 0;
  const gap = declared !== sellable;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        fontSize: 12,
        fontFamily: t.mono,
        fontWeight: 700,
        color: none ? t.error : gap ? t.primaryDeep : t.success,
      }}
    >
      <Box component="span">
        {sellable} / {physical} vendable{sellable > 1 ? 's' : ''}
      </Box>
      {declared !== physical ? (
        <Tooltip
          title={`Le type déclare ${declared} unité(s) mais ${physical} chambre(s) existent réellement en base.`}
          arrow
        >
          <Box component="span" sx={{ color: t.error, fontWeight: 700 }}>
            ⚠ {declared} déclarée{declared > 1 ? 's' : ''}
          </Box>
        </Tooltip>
      ) : null}
    </Box>
  );
}

function RoomTypeBlock({ rt }: { rt: ListingStructureRoomType }) {
  const label = rt.otaDisplayName || rt.name || 'Type sans nom';
  return (
    <Box
      sx={{
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        bgcolor: t.bg1,
        p: 1.5,
        opacity: rt.active ? 1 : 0.6,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: t.text }}>
            {label}
            {!rt.active ? (
              <Box component="span" sx={{ ml: 1, fontSize: 11, color: t.text4, fontWeight: 600 }}>
                (inactif)
              </Box>
            ) : null}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: t.text3 }}>
            {[
              rt.capacityMax ? `${rt.capacityMax} pers.` : null,
              rt.bedrooms ? `${rt.bedrooms} ch.` : null,
              rt.bathrooms ? `${rt.bathrooms} SdB` : null,
              rt.surface ? `${rt.surface} m²` : null,
              rt.basePrice ? `${rt.basePrice} MAD` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Box>
        <CapacityBar declared={rt.declaredUnits} physical={rt.physicalRooms} sellable={rt.sellableRooms} />
      </Box>

      {rt.rooms.length ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {rt.rooms.map((r) => (
            <RoomChip key={r.id} room={r} />
          ))}
        </Box>
      ) : (
        // Le cas « compteur sans chambres » est un défaut de données réel
        // (import Mews partiel, type créé à la main) — on le dit franchement.
        <Typography sx={{ fontSize: 11.5, color: t.error, fontStyle: 'italic' }}>
          Aucune chambre physique créée pour ce type — le compteur annonce {rt.declaredUnits} unité
          {rt.declaredUnits > 1 ? 's' : ''}, mais rien n'est assignable.
        </Typography>
      )}
    </Box>
  );
}

export function PhysicalRoomsPanel({ listingId, refreshKey }: Props) {
  const [data, setData] = useState<ListingStructure | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * ⚠️ Distinguer DEUX cas que rien ne séparait au départ :
   *   - la route répond mais le listing n'a aucune chambre → normal, on se tait
   *   - la route échoue (404 : backend pas déployé, 401, réseau) → ANORMAL
   * Sans ce drapeau, un backend sans la route donnait exactement le même écran
   * qu'un listing sans chambres : panneau absent, et impossible de savoir
   * lequel des deux. Ne le supprime pas pour « faire plus propre ».
   */
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    let alive = true;
    setLoading(true);
    setFailed(false);
    void listingsService
      .getListingStructure(listingId)
      .then((s) => {
        if (!alive) return;
        setData(s);
        setFailed(s === null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [listingId, refreshKey]);

  if (loading) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress size={20} sx={{ color: t.primary }} />
      </Box>
    );
  }
  // La route n'a pas répondu (404 backend pas à jour, 401, réseau). On le DIT :
  // se taire ici donnait le même écran qu'un listing sans chambres, et faisait
  // chercher le bug dans le composant alors qu'il était dans le déploiement.
  if (failed) {
    return (
      <Box
        sx={{
          mt: 2,
          border: `1px dashed ${t.borderStrong}`,
          borderRadius: t.radius,
          p: 1.5,
          fontSize: 12.5,
          color: t.text3,
        }}
      >
        <b>Chambres physiques indisponibles.</b> La route <code>/listings/:id/structure</code>{' '}
        n'a pas répondu — vérifiez que srv-listing est à jour.
      </Box>
    );
  }
  // Pas de chambres du tout : c'est le cas NORMAL d'un Multi géré uniquement
  // par compteurs (pas d'import Mews). On n'affiche rien plutôt qu'un bloc vide
  // anxiogène — le panneau n'a de sens que s'il y a des chambres à montrer.
  const totals = data?.totals;
  if (!data || !totals || Number(totals.physicalRooms || 0) === 0) return null;

  const { roomTypes = [], orphanRooms = [] } = data;
  const hiddenGap = Number(totals.declaredUnits || 0) - Number(totals.sellableRooms || 0);

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: t.text }}>
          Chambres physiques
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: t.text3 }}>
          l'unité qu'on assigne à un client et qu'on fait nettoyer
        </Typography>
      </Box>

      {/* L'écart global, énoncé en clair : c'est l'information la plus utile
          de tout l'écran et celle qui fausse l'occupation si on l'ignore. */}
      {hiddenGap > 0 ? (
        <Box
          sx={{
            border: `1px solid ${t.error}`,
            bgcolor: t.errorTint,
            borderRadius: t.radius,
            p: 1.25,
            mb: 1.5,
            fontSize: 12.5,
            color: t.text,
            lineHeight: 1.5,
          }}
        >
          <b>Le compteur ment.</b> {totals.declaredUnits} unité
          {totals.declaredUnits > 1 ? 's' : ''} déclarée{totals.declaredUnits > 1 ? 's' : ''} sur les
          types, <b>{totals.sellableRooms} réellement vendable{totals.sellableRooms > 1 ? 's' : ''}</b>{' '}
          ({totals.physicalRooms} chambre{totals.physicalRooms > 1 ? 's' : ''} en base). Occupation et
          RevPAR calculés sur le compteur seraient faux.
        </Box>
      ) : null}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {roomTypes.map((rt) => (
          <RoomTypeBlock key={rt.id} rt={rt} />
        ))}
      </Box>

      {/* Chambres sans type : défaut de données à corriger, jamais à masquer. */}
      {orphanRooms.length ? (
        <Box sx={{ mt: 1.5, border: `1px dashed ${t.error}`, borderRadius: t.radius, p: 1.25 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.error, mb: 0.75 }}>
            {orphanRooms.length} chambre{orphanRooms.length > 1 ? 's' : ''} rattachée
            {orphanRooms.length > 1 ? 's' : ''} à aucun type
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {orphanRooms.map((r) => (
              <RoomChip key={r.id} room={r} />
            ))}
          </Box>
        </Box>
      ) : null}

      {/* Légende — obligatoire : la couleur seule ne suffit pas à lire un état. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mt: 1.5 }}>
        {(['Inspected', 'Clean', 'Dirty', 'OutOfOrder'] as const).map((k) => {
          const s = HK[k];
          return (
            <Box key={k} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '3px',
                  bgcolor: s.bg,
                  border: `1.5px ${s.dashed ? 'dashed' : 'solid'} ${s.border}`,
                }}
              />
              <Typography sx={{ fontSize: 11, color: t.text3 }}>{s.label}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default PhysicalRoomsPanel;
