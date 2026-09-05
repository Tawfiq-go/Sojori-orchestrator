/**
 * SECTION 2 — STRUCTURE : bâtiment → types de chambre → chambres physiques.
 *
 * ⚠️ LE COMPTEUR MENT — c'est le propos central de cette section.
 * Un type déclare N unités (`declaredUnits`), mais la capacité RÉELLE est le
 * nombre de chambres exploitables :
 *
 *     vendable = enabled && état ∉ { Hors service, Hors périmètre }
 *
 * Mesuré en prod sur NOMMOS : 14 chambres déclarées, 7 réellement vendables.
 * Un type « Villa avec Piscine Privée » affiche 2 unités alors qu'une est en
 * travaux → occupation et RevPAR faux d'un facteur 2. N'affiche JAMAIS le
 * compteur sans l'écart.
 *
 * Les états de ménage viennent de Mews par webhook : lecture seule ici, on ne
 * les écrase pas depuis cet écran.
 */
import { Box, Stack, Switch, Tooltip, Typography } from '@mui/material';
import type {
  ListingStructure,
  ListingStructureRoom,
  ListingStructureRoomType,
} from '../../../types/listings.types';
import listingsService from '../../../services/listingsService';
import { T, cardSx, kickerSx } from '../tokens';

type Props = { structure: ListingStructure; onChanged?: () => void };

/**
 * Les 5 états Mews, en vocabulaire métier.
 * ⚠️ Jamais la couleur seule : chaque état porte aussi une FORME (plein /
 * contour / tirets) et un libellé. L'écran se consulte en plein soleil.
 */
const HK: Record<string, { label: string; color: string; bg: string; border: string; dashed?: boolean }> = {
  Inspected: { label: 'Prête', color: T.ok, bg: T.okBg, border: T.ok },
  Clean: { label: 'Nettoyée', color: T.goldDeep, bg: T.goldTint, border: T.gold },
  Dirty: { label: 'À nettoyer', color: T.err, bg: 'transparent', border: T.err },
  OutOfOrder: { label: 'Hors service', color: T.ink3, bg: T.bg3, border: T.lineStrong, dashed: true },
  OutOfService: { label: 'Hors périmètre', color: T.ink3, bg: T.bg3, border: T.lineStrong, dashed: true },
};
const UNKNOWN = { label: 'État inconnu', color: T.ink4, bg: T.bg2, border: T.line };
const hk = (s?: string | null) => HK[String(s || '')] ?? UNKNOWN;

function StayExtraToggle({
  title,
  checked,
  priceMad,
  savingLabel,
  ariaLabel,
  onToggle,
}: {
  title: string;
  checked: boolean;
  priceMad: number;
  savingLabel?: string;
  ariaLabel: string;
  onToggle: (next: boolean) => Promise<void>;
}) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1.25 }}>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{title}</Typography>
        <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>
          Option WhatsApp · {priceMad} DH / jour{savingLabel ? ` · ${savingLabel}` : ''}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        onChange={(e) => {
          void onToggle(e.target.checked);
        }}
        inputProps={{ 'aria-label': ariaLabel }}
      />
    </Stack>
  );
}

function RoomChip({ room }: { room: ListingStructureRoom }) {
  const s = hk(room.housekeepingState);
  const off = !room.enabled;
  return (
    <Tooltip
      arrow
      title={`${room.name || '—'}${room.code ? ` · ${room.code}` : ''} — ${s.label}${
        off ? ' · désactivée' : ''
      }${room.sellable ? '' : ' · non vendable'}`}
    >
      <Box
        sx={{
          px: 1,
          py: 0.4,
          borderRadius: '8px',
          fontSize: 12,
          fontFamily: T.mono,
          fontWeight: 600,
          color: off ? T.ink4 : s.color,
          bgcolor: off ? T.bg2 : s.bg,
          border: `1.5px ${s.dashed || off ? 'dashed' : 'solid'} ${off ? T.line : s.border}`,
          textDecoration: off ? 'line-through' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {room.name || `#${room.number ?? '?'}`}
      </Box>
    </Tooltip>
  );
}

function RoomTypeCard({
  rt,
  listingId,
  onChanged,
}: {
  rt: ListingStructureRoomType;
  listingId: string;
  onChanged?: () => void;
}) {
  const none = rt.sellableRooms === 0;
  const label = rt.otaDisplayName || rt.name || 'Type sans nom';
  return (
    <Box sx={{ ...cardSx, p: 1.75, opacity: rt.active ? 1 : 0.65 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap', mb: 1.25 }}>
        <Box>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 750, fontSize: 14.5, color: T.ink }}>{label}</Typography>
            <Box
              component="span"
              sx={{
                px: 0.7,
                py: 0.1,
                borderRadius: '999px',
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.4px',
                color: T.goldDeep,
                bgcolor: T.goldTint,
                border: `1px solid ${T.gold}`,
              }}
            >
              CE QUE LE CLIENT ACHÈTE
            </Box>
            {!rt.active ? (
              <Typography sx={{ fontSize: 11, color: T.ink4, fontWeight: 600 }}>· inactif</Typography>
            ) : null}
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 0.25 }}>
            {[
              rt.capacityMax ? `${rt.capacityMax} pers.` : null,
              rt.bedrooms ? `${rt.bedrooms} ch.` : null,
              rt.bathrooms ? `${rt.bathrooms} SdB` : null,
              rt.surface ? `${rt.surface} m²` : null,
              rt.basePrice ? `${rt.basePrice} MAD/nuit` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Box>

        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontFamily: T.mono,
              fontSize: 13,
              fontWeight: 800,
              color: none ? T.err : rt.sellableRooms < rt.physicalRooms ? T.goldDeep : T.ok,
            }}
          >
            {rt.sellableRooms} / {rt.physicalRooms} vendable{rt.sellableRooms > 1 ? 's' : ''}
          </Typography>
          {rt.declaredUnits !== rt.physicalRooms ? (
            <Tooltip
              arrow
              title={`Ce type déclare ${rt.declaredUnits} unité(s) mais ${rt.physicalRooms} chambre(s) existent réellement.`}
            >
              <Typography sx={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: T.err }}>
                ⚠ {rt.declaredUnits} déclarée{rt.declaredUnits > 1 ? 's' : ''}
              </Typography>
            </Tooltip>
          ) : null}
        </Stack>
      </Stack>

      {rt.rooms.length ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {rt.rooms.map((r) => (
            <RoomChip key={r.id} room={r} />
          ))}
        </Box>
      ) : (
        <Typography sx={{ fontSize: 12, color: T.err, fontStyle: 'italic' }}>
          Aucune chambre physique — ce type annonce {rt.declaredUnits} unité
          {rt.declaredUnits > 1 ? 's' : ''}, mais rien n'est assignable.
        </Typography>
      )}
      <StayExtraToggle
        title="Piscine privée"
        ariaLabel="Piscine privée payante"
        checked={rt.paidPrivatePool === true}
        priceMad={rt.privatePoolPricePerDayMad || 1000}
        onToggle={async (next) => {
          const r = await listingsService.patchListingConfiguration(listingId, {
            roomTypeId: rt.id,
            roomType: { paidPrivatePool: next, privatePoolPricePerDayMad: rt.privatePoolPricePerDayMad || 1000 },
          });
          if (r.success) onChanged?.();
        }}
      />
      <StayExtraToggle
        title="Beds piscine"
        ariaLabel="Beds piscine payants"
        checked={rt.paidBeds === true}
        priceMad={rt.bedsPricePerDayMad || 200}
        onToggle={async (next) => {
          const r = await listingsService.patchListingConfiguration(listingId, {
            roomTypeId: rt.id,
            roomType: { paidBeds: next, bedsPricePerDayMad: rt.bedsPricePerDayMad || 200 },
          });
          if (r.success) onChanged?.();
        }}
      />
    </Box>
  );
}

export default function SectionStructure({ structure }: Props) {
  const { building, totals, roomTypes, orphanRooms } = structure;
  const isMulti = building.propertyUnit === 'Multi';
  const gap = totals.declaredUnits - totals.sellableRooms;

  // ── Cas SINGLE : pas un Multi amputé, un modèle plus simple, énoncé comme tel.
  if (!isMulti) {
    return (
      <Box sx={cardSx}>
        <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink, mb: 0.5 }}>
          Un logement, un seul niveau
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>
          Ce logement est <b>son propre type de vente</b> : ce que le client achète et l'unité
          physique ne font qu'un. Il n'y a ni types multiples ni chambres à gérer séparément.
        </Typography>
        <StayExtraToggle
          title="Piscine privée"
          ariaLabel="Piscine privée payante"
          checked={building.paidPrivatePool === true}
          priceMad={building.privatePoolPricePerDayMad || 1000}
          savingLabel="listing"
          onToggle={async (next) => {
            const r = await listingsService.patchListingConfiguration(building.id, {
              building: {
                paidPrivatePool: next,
                privatePoolPricePerDayMad: building.privatePoolPricePerDayMad || 1000,
              },
            });
            if (r.success) onChanged?.();
          }}
        />
        <StayExtraToggle
          title="Beds piscine"
          ariaLabel="Beds piscine payants"
          checked={building.paidBeds === true}
          priceMad={building.bedsPricePerDayMad || 200}
          savingLabel="listing"
          onToggle={async (next) => {
            const r = await listingsService.patchListingConfiguration(building.id, {
              building: {
                paidBeds: next,
                bedsPricePerDayMad: building.bedsPricePerDayMad || 200,
              },
            });
            if (r.success) onChanged?.();
          }}
        />
      </Box>
    );
  }

  return (
    <Stack spacing={1.75}>
      {/* L'écart, énoncé d'entrée : c'est l'information la plus utile. */}
      {gap > 0 ? (
        <Box
          sx={{
            border: `1px solid ${T.err}`,
            bgcolor: T.errBg,
            borderRadius: `${T.radius}px`,
            p: 1.5,
            fontSize: 13,
            color: T.ink,
            lineHeight: 1.6,
          }}
        >
          <b>Le compteur ne dit pas la vérité.</b> {totals.declaredUnits} unité
          {totals.declaredUnits > 1 ? 's' : ''} déclarée{totals.declaredUnits > 1 ? 's' : ''},{' '}
          <b>
            {totals.sellableRooms} réellement vendable{totals.sellableRooms > 1 ? 's' : ''}
          </b>{' '}
          sur {totals.physicalRooms} chambre{totals.physicalRooms > 1 ? 's' : ''}. Occupation et
          revenu par chambre calculés sur le compteur seraient faux.
        </Box>
      ) : null}

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ ...kickerSx }}>
          {totals.roomTypes} type{totals.roomTypes > 1 ? 's' : ''} · {totals.physicalRooms} chambre
          {totals.physicalRooms > 1 ? 's' : ''} physique{totals.physicalRooms > 1 ? 's' : ''}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>
          l'état d'une chambre se règle dans Orchestration
        </Typography>
      </Stack>

      {/* Grille : sur 1800px de large, empiler 3 cartes en colonne laisse les
          deux tiers de l'écran vides. `auto-fit` + minmax garde une carte
          lisible (≥ 420px) et se replie seule sur mobile. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(420px, 1fr))' },
          gap: 1.75,
          alignItems: 'start',
        }}
      >
        {roomTypes.map((rt) => (
          <RoomTypeCard key={rt.id} rt={rt} listingId={building.id} onChanged={onChanged} />
        ))}
      </Box>

      {/* Chambres sans type : défaut de données à corriger, jamais à masquer. */}
      {orphanRooms.length ? (
        <Box sx={{ border: `1px dashed ${T.err}`, borderRadius: `${T.radius}px`, p: 1.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 750, color: T.err, mb: 0.75 }}>
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

      {/* Légende — la couleur seule ne suffit pas à lire un état. */}
      <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', pt: 0.5 }}>
        {(['Inspected', 'Clean', 'Dirty', 'OutOfOrder'] as const).map((k) => {
          const s = HK[k];
          return (
            <Stack key={k} direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '3px',
                  bgcolor: s.bg,
                  border: `1.5px ${s.dashed ? 'dashed' : 'solid'} ${s.border}`,
                }}
              />
              <Typography sx={{ fontSize: 11, color: T.ink3 }}>{s.label}</Typography>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
