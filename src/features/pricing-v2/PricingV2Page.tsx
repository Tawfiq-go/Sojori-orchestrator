// ════════════════════════════════════════════════════════════════════════════
// PRICING V2 — page bien, deux modes assumés (brief docs/dynamicprice/)
// ────────────────────────────────────────────────────────────────────────────
//   MODE SIMPLE (owner)  : un prix qui travaille pour lui · 3 décisions max ·
//                          zéro jargon (ni percentile, ni ADR, ni momentum).
//   MODE EXPERT (PM)     : la distribution du marché avec son bien dessus,
//                          le compset ouvert, les leviers, le ticket de caisse.
//
// ⚠️ RÈGLES DU MODULE (agent futur — lis aussi api.ts) :
// - Zéro import depuis features/dynamic-pricing (pricing v1). Module greenfield.
// - Chaque chiffre affiché vient du moteur. Si le moteur ne le produit pas,
//   l'UI ne l'invente pas (l'audit de maquette avait trouvé « 2 ch · 4 pers » et
//   « terrasse » inventés sur un studio 1 ch sans terrasse).
// - Traduction obligatoire jargon → business (brief §2) : voir les libellés.
//
// TODO restants (par ordre de valeur) :
//   [ ] Édition des leviers saison/semaine (backend prêt : seasonalCoefs, dowMult)
//   [ ] Overrides datés au drag sur le calendrier (backend prêt : dailyOverrides)
//   [ ] Drag du curseur de positionnement sur la distribution (aujourd'hui : 3 cartes)
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { hasAdminAccess } from '../../utils/rbac.utils';
import CompsTable from './CompsTable';
import PublishPanel from './PublishPanel';
import PacingPanel, { PACING_DEFAULTS, type PacingMethod, type PacingSettings } from './PacingPanel';
import SeasonWeekLevers from './SeasonWeekLevers';
import RangeActionBar, { type RangeAction } from './RangeActionBar';
import DistributionChart from './DistributionChart';
import PriceTicket from './PriceTicket';
import {
  fetchPricingV2Config,
  fetchPricingV2Market,
  fetchPricingV2Portfolio,
  fetchPricingV2Preview,
  savePricingV2Config,
  type PricingV2Config,
  type PricingV2Day,
  type PricingV2Market,
  type PricingV2PortfolioRow,
  type PricingV2Result,
} from './api';

import { T, cardSx, kickerSx } from './tokens';

/**
 * ⚠️ DOIT rester identique à GAMME_OFFSET (apps/srv-pricing-v2/src/engine/
 * config.ts:5). Sert uniquement à inverser le calcul de `base` pour poser le
 * curseur doré pile sur le repère cliqué (voir onGammeChange) — ce n'est PAS
 * une deuxième source de vérité sur le prix, juste son inverse côté UI.
 */
const GAMME_OFFSET_FRONT: Record<'economique' | 'normal' | 'premium' | 'luxe', number> = {
  economique: 0.9,
  normal: 1.0,
  premium: 1.08,
  luxe: 1.15,
};

// Table de traduction (brief §2) — aucun terme technique nu à l'écran.
/**
 * ⚠️ `pct` DOIT rester aligné sur MODE.tilt (apps/srv-pricing-v2/src/engine/
 * config.ts) : prudent 0.97, equilibre 1.00, agressif 1.05. Afficher un chiffre
 * faux serait pire que ne rien afficher — si tu changes le moteur, change ici.
 */
const MODE_LABELS: Record<string, { label: string; sub: string; pct: number }> = {
  prudent: { label: 'Prudent', sub: 'Je veux remplir', pct: -3 },
  equilibre: { label: 'Équilibré', sub: "L'optimum revenu", pct: 0 },
  agressif: { label: 'Agressif', sub: 'Je vise le prix haut', pct: 5 },
};

/** Mois affichés au calendrier, EN ENTIER et sans défilement (le moteur en
 *  calcule 6 — cf. HORIZON_DAYS = 182 côté engine). */
// 6 mois = les 182 jours que le moteur renvoie. Affichés sur deux colonnes,
// ils tiennent tous à l'écran : plus de zone défilante interne.
const CALENDAR_MONTHS = 6;

export default function PricingV2Page() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Mécanique du calcul nocturne (shadow/AirROI) = admin only, cf. DynamicPricingPage.
  // L'owner ne doit ni voir ni savoir que ce calcul existe (Tawfiq, 07/08/2026).
  const isPlatformAdmin = hasAdminAccess(user?.role);
  const [result, setResult] = useState<PricingV2Result | null>(null);
  const [config, setConfig] = useState<PricingV2Config | null>(null);
  const [market, setMarket] = useState<PricingV2Market | null>(null);
  const [ticketDay, setTicketDay] = useState<PricingV2Day | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Renseigné quand le calcul est refusé faute de prix de marché récent. */
  const [stale, setStale] = useState<{ ageDays: number | null; maxAgeDays: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // ── Sélection de plage (consigne maquette : « glisser = plage ») ──
  // Un seul objet : `from`/`to` bougent toujours ensemble, sinon la barre
  // d'action se rendait un instant avec des bornes dépareillées.
  // `dragging` distingue le geste en cours du résultat figé ; il ne suffit pas
  // de le poser au mousedown car un clic simple doit AUSSI ouvrir le ticket.
  const [sel, setSel] = useState<{ from: string; to: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Vrai dès que la souris a survolé une AUTRE cellule pendant le geste :
   *  c'est ce qui sépare « clic » (ticket de caisse) de « glisser » (plage). */
  const movedRef = useRef(false);
  /** Sur les nuits VENDUES : afficher le prix payé (figé) ou le prix du moteur. */
  const [showBookedPrices, setShowBookedPrices] = useState(false);
  /** Jour cliqué dans le calendrier — la courbe "Le marché, et vous dessus"
   *  et le texte "marché autour de chez vous ce soir" doivent refléter CE
   *  jour, pas rester figés sur aujourd'hui (demandé par Tawfiq 08/08/2026:
   *  chaque clic cellule doit changer le statut marché affiché). null =
   *  aucun clic encore → on retombe sur `today`. */
  const [selectedMarketDate, setSelectedMarketDate] = useState<string | null>(null);
  /** Liste { listingId, name } pour le sélecteur — chargée UNE fois, jamais
   *  reliée à `reload()` : changer de bien ne doit ni re-fetcher le portfolio
   *  ni naviguer vers /pricing-v2 (l'atterrissage), juste changer l'URL. */
  const [allListings, setAllListings] = useState<PricingV2PortfolioRow[]>([]);
  useEffect(() => {
    void fetchPricingV2Portfolio()
      .then((r) => setAllListings(r.data.success ? r.data.rows : []))
      .catch(() => setAllListings([]));
  }, []);
  const currentListingName =
    allListings.find((r) => r.listingId === listingId)?.name ?? null;

  const reload = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError(null);
    try {
      // Le preview est un calcul à la volée côté service : aucun effet de bord.
      const [p, c] = await Promise.all([
        fetchPricingV2Preview(listingId),
        fetchPricingV2Config(listingId),
      ]);
      if (!p.data.success) {
        // Prix de marché périmé : état métier, pas panne. On garde le détail
        // pour l'afficher franchement au PM plutôt qu'un « indisponible ».
        if (p.data.code === 'SNAPSHOT_STALE') {
          setStale({ ageDays: p.data.ageDays ?? null, maxAgeDays: p.data.maxAgeDays ?? 7 });
          throw new Error(p.data.error || 'prix de marché obsolète');
        }
        throw new Error(p.data.error || 'preview indisponible');
      }
      setStale(null);
      setResult(p.data.result);
      setConfig(c.data.config);
      // Secondaires : ne doivent jamais casser la page principale.
      void fetchPricingV2Market(listingId)
        .then((m) => setMarket(m.data.success ? m.data : null))
        .catch(() => setMarket(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Relâcher la souris N'IMPORTE OÙ termine le geste en gardant la plage.
   *  Avant, un `onMouseLeave` sur la grille annulait `dragging` : en sortant du
   *  calendrier pour aller cliquer « Fixer », la plage restait mais le geste
   *  était réputé en cours, et la barre d'action (masquée pendant `dragging`)
   *  ne réapparaissait jamais — d'où l'impression que « ça ne marche pas ». */
  useEffect(() => {
    if (!dragging) return;
    const end = () => setDragging(false);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [dragging]);

  /** Échap annule la sélection en cours (réflexe attendu sur une multi-sélection). */
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel]);

  const patch = async (p: Partial<PricingV2Config>) => {
    if (!listingId) return;
    setSaving(true);
    try {
      await savePricingV2Config(listingId, p);
      await reload(); // recalcul en direct — le calendrier suit
    } finally {
      setSaving(false);
    }
  };

  // Bornes normalisées de la sélection (le drag peut aller de droite à gauche).
  const range = sel
    ? { from: sel.from <= sel.to ? sel.from : sel.to, to: sel.from <= sel.to ? sel.to : sel.from }
    : null;
  const inRange = (iso: string) => !!range && iso >= range.from && iso <= range.to;
  const clearSelection = () => {
    setSel(null);
    setDragging(false);
    movedRef.current = false;
  };

  /** Applique Fixer / Ajuster / Revenir au calcul sur la plage sélectionnée. */
  const applyRange = async (action: RangeAction) => {
    if (!range || !result) return;
    const next: Record<string, { type: 'fixed' | 'mult'; value: number }> = {
      ...(config?.dailyOverrides ?? {}),
    };
    for (const d of result.days) {
      if (!inRange(d.date)) continue;
      // ⚠️ AUCUNE nuit n'est exclue, y compris `booked` et `blocked` (Tawfiq
      // 08/08/2026). Un override est une CONSIGNE DE PRIX, pas un encaissement :
      // si la nuit est débloquée, ou la réservation annulée, elle doit repartir
      // au prix voulu par le PM et pas au prix calculé de l'époque. Filtrer ici
      // laissait des trous silencieux dans la plage.
      if (action.type === 'clear') delete next[d.date];
      else next[d.date] = { type: action.type, value: action.value };
    }
    // La sélection ne se vide qu'APRÈS l'écriture : en la vidant avant, la barre
    // d'action disparaissait pendant l'appel réseau et le PM ne savait plus si
    // son geste avait porté (et un échec le laissait sans rien à réessayer).
    await patch({ dailyOverrides: next });
    clearSelection();
  };

  // Méthode de pacing : 'threshold' est le défaut produit (config absente =
  // seuils actifs quand même, cf. moteur pacingMult) — pas 'dynamic'.
  const pacingMethod: PacingMethod = config?.pacingMethod ?? 'threshold';
  // Pacing : valeurs affichées = celles de la config, sinon les défauts maquette.
  const pacing: PacingSettings = {
    highThreshold: config?.pacingHighThreshold ?? PACING_DEFAULTS.highThreshold,
    highMax: config?.pacingHighMax ?? PACING_DEFAULTS.highMax,
    lowThreshold: config?.pacingLowThreshold ?? PACING_DEFAULTS.lowThreshold,
    lowMax: config?.pacingLowMax ?? PACING_DEFAULTS.lowMax,
  };

  // Groupement par mois — on n'affiche que les 3 PREMIERS mois, en entier et
  // SANS zone défilante (le moteur en calcule 6, cf. HORIZON_DAYS = 182).
  // ⚠️ Ne remets pas un conteneur scrollable ici : la colonne doit tenir d'un
  // seul tenant en face des réglages, pour que le PM voie l'effet d'un curseur
  // sans avoir à faire défiler.
  const months = useMemo(() => {
    const m = new Map<string, PricingV2Day[]>();
    for (const d of result?.days ?? []) {
      const k = d.date.slice(0, 7);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(d);
    }
    return [...m.entries()].slice(0, CALENDAR_MONTHS);
  }, [result]);

  if (loading && !result) {
    return (
      <Box sx={{ p: 6, textAlign: 'center', bgcolor: T.bg, minHeight: '100%' }}>
        <CircularProgress size={28} sx={{ color: T.goldPure }} />
      </Box>
    );
  }
  if (stale) {
    return (
      <Box sx={{ p: 4, maxWidth: 720, mx: 'auto', bgcolor: T.bg, minHeight: '100%' }}>
        <Alert severity="error" sx={{ fontSize: 14 }}>
          <b>Prix de marché obsolète — calcul arrêté.</b>
          <Box sx={{ mt: 1 }}>
            Les données de marché de ce bien datent de{' '}
            <b>{stale.ageDays != null ? `${stale.ageDays} jours` : 'trop longtemps'}</b> (maximum{' '}
            {stale.maxAgeDays} jours). Calculer dessus donnerait des prix crédibles mais faux.
          </Box>
          <Box sx={{ mt: 1 }}>
            <b>Le calendrier n'est pas mis à jour</b> et aucun prix n'a été modifié. Relancez
            « Estimation Sojori » sur ce bien, puis revenez ici.
          </Box>
        </Alert>
      </Box>
    );
  }
  if (error || !result) {
    return (
      <Box sx={{ p: 4, maxWidth: 720, mx: 'auto', bgcolor: T.bg, minHeight: '100%' }}>
        <Alert severity="warning">
          Pricing v2 indisponible pour ce bien : {error ?? 'aucune donnée'}
        </Alert>
      </Box>
    );
  }

  const today = result.days[0];
  // Jour affiché par la courbe "Le marché, et vous dessus" + le texte
  // "marché autour de chez vous" — le dernier jour cliqué dans le calendrier,
  // sinon aujourd'hui. Cherché par date (pas par index) : le calendrier ne
  // garantit pas que la position cliquée == l'index dans result.days une
  // fois qu'on a navigué entre biens/rechargé.
  const marketDay =
    (selectedMarketDate && result.days.find((d) => d.date === selectedMarketDate)) || today;
  const lowConfidence = result.meta.compsetSize < 3;
  const trendPct = Math.round((result.meta.momentum - 1) * 100);

  return (
    <Box sx={{ bgcolor: T.bg, color: T.ink, fontFamily: T.sans, minHeight: '100%', p: { xs: 2, md: 4 } }}>
      {/* Pleine largeur comme le reste du dashboard, avec une marge de
          respiration. Le plafond à 1240 px bridait le calendrier sur grand
          écran alors que c'est la zone qui a le plus besoin de place. */}
      <Box sx={{ maxWidth: 1800, mx: 'auto' }}>
      {/* ── En-tête + nom du bien + sélecteur ── */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 750, fontSize: 20, color: T.ink }}>
            Prix dynamiques
            <Box component="span" sx={{ ml: 1, ...kickerSx, color: T.gold }}>
              v2 · bêta
            </Box>
          </Typography>
          {currentListingName ? (
            <Typography sx={{ fontSize: 14, color: T.ink2, mt: 0.25 }}>
              {currentListingName}
            </Typography>
          ) : null}
        </Box>
        {/* Changer de bien SANS repasser par le portfolio (/pricing-v2) — juste
            une navigation directe vers /pricing-v2/bien/:id. Recherche par nom
            (Autocomplete filtre déjà en tapant, pas besoin de logique perso). */}
        {allListings.length > 0 ? (
          <Autocomplete
            options={allListings}
            getOptionLabel={(o) => o.name}
            value={allListings.find((r) => r.listingId === listingId) ?? null}
            onChange={(_, next) => {
              if (next) navigate(`/pricing-v2/bien/${next.listingId}`);
            }}
            isOptionEqualToValue={(o, v) => o.listingId === v.listingId}
            size="small"
            sx={{ width: { xs: '100%', sm: 320 } }}
            renderInput={(params) => (
              <TextField {...params} placeholder="Changer de bien…" />
            )}
          />
        ) : null}
      </Stack>

      {/* ── Hero sur DEUX colonnes ──────────────────────────────────────────
          Gauche : le prix de ce soir (le chiffre qu'on vient lire en premier).
          Droite : la fourchette et l'interrupteur — les deux réglages qui
          décident si ce prix s'applique et entre quelles bornes. Ils étaient
          dispersés plus bas dans la page alors qu'ils commentent ce chiffre. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 1.75,
          mb: 3,
          alignItems: 'stretch',
        }}
      >
      <Box sx={{ ...cardSx, textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography sx={{ ...kickerSx, fontSize: 10, letterSpacing: '1.2px', color: T.gold }}>
          CE SOIR CHEZ VOUS
        </Typography>
        <Typography sx={{ fontSize: { xs: 34, md: 42 }, fontWeight: 750, lineHeight: 1.05, letterSpacing: '-0.02em', color: T.ink, mt: 0.25 }}>
          {today.price}
          <Box component="span" sx={{ fontSize: 20, ml: 1, color: T.mut, fontWeight: 600 }}>
            MAD
          </Box>
        </Typography>
        <Typography sx={{ color: T.ink2, fontSize: 13, mt: 0.5 }}>
          Le marché autour de chez vous est à <b>{Math.round(today.comp)} MAD</b> ce soir.
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'center', mt: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={
              lowConfidence
                ? 'Peu de biens comparables — prix à confirmer'
                : 'Mesuré sur les biens similaires au vôtre'
            }
            color={lowConfidence ? 'warning' : 'default'}
          />
          <Chip size="small" label={`Tendance 90 j : ${trendPct >= 0 ? '+' : ''}${trendPct} %`} />
          <Chip size="small" label={`Séjour min : ${result.minStay} nuit${result.minStay > 1 ? 's' : ''}`} />
        </Stack>
      </Box>

        {/* Colonne droite du hero : bornes + interrupteur */}
        <Stack spacing={1.75}>
          <Box sx={{ ...cardSx, opacity: saving ? 0.55 : 1, transition: 'opacity .15s' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink }}>Votre fourchette</Typography>
            <Typography sx={{ fontSize: 11, color: T.mut }}>le prix ne sort jamais de ces bornes</Typography>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              label="Jamais en dessous"
              defaultValue={config?.minPrice ?? result.meta.floor}
              onBlur={(e) => void patch({ minPrice: Number(e.target.value) || null })}
              sx={{ '& input': { fontFamily: T.mono, fontSize: 15, fontWeight: 700 } }}
            />
            <TextField
              size="small"
              fullWidth
              label="Jamais au-dessus"
              defaultValue={config?.maxPrice ?? result.meta.ceil}
              onBlur={(e) => void patch({ maxPrice: Number(e.target.value) || null })}
              sx={{ '& input': { fontFamily: T.mono, fontSize: 15, fontWeight: 700 } }}
            />
          </Stack>
          <Typography sx={{ fontSize: 12, color: T.ink2, mt: 1 }}>
            Conseillé pour votre bien :{' '}
            <Box component="span" sx={{ color: T.gold, fontWeight: 700 }}>
              {Math.round(result.suggestedBounds.low)} – {Math.round(result.suggestedBounds.high)} MAD
            </Box>{' '}
            (prix d'appel → top 10 %)
          </Typography>
          </Box>

          {/* Interrupteur du calcul nocturne — remonté ici : il décide si le
              prix ci-contre est recalculé chaque nuit. Admin only : l'owner ne
              doit ni voir ni savoir que ce mécanisme (shadow/AirROI) existe. */}
          {isPlatformAdmin ? (
            <Box sx={{ ...cardSx, opacity: saving ? 0.55 : 1, transition: 'opacity .15s' }}>
              <Typography sx={{ ...kickerSx, mb: 1 }}>CALCUL NOCTURNE (SHADOW)</Typography>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13.5, color: T.ink }}>
                  {config?.shadowEnabled ? 'Activé — historisé chaque nuit' : 'Désactivé'}
                </Typography>
                <Switch
                  checked={config?.shadowEnabled ?? false}
                  disabled={saving}
                  onChange={(e) => void patch({ shadowEnabled: e.target.checked })}
                />
              </Stack>
              <Typography sx={{ fontSize: 11.5, color: T.ink2, mt: 0.75, lineHeight: 1.5 }}>
                Le calcul tourne chaque nuit et conserve les prix. Leur envoi vers vos canaux se
                règle ci-dessous.
              </Typography>
            </Box>
          ) : null}

          {/* Publication réelle — ne s'affiche que pour un propriétaire autorisé
              (déploiement progressif). Le composant interroge lui-même son
              éligibilité et ne rend rien si le droit manque. */}
          {listingId ? (
            <PublishPanel
              listingId={listingId}
              publishEnabled={config?.publishEnabled === true}
              busy={saving}
              onTogglePublish={(next) => void patch({ publishEnabled: next })}
            />
          ) : null}
        </Stack>
      </Box>

      {/* ══ GRILLE 2 COLONNES — calquée sur la maquette validée ══
          Mesuré au DOM : 614px / 492px, gap 14px (≈ 1.25fr / 1fr).
          GAUCHE : tout ce qui explique et règle (distribution, décisions, leviers)
          DROITE : le calendrier, qui garde SA taille.
          ⚠️ Ne repasse pas le calendrier pleine largeur : la maquette le veut
          en colonne étroite à droite, la lecture du mois en dépend. */}
      <Box
        sx={{
          display: 'grid',
          // Moitié-moitié : le calendrier (colonne droite) était à ~44 % et
          // ses cellules étaient trop serrées pour lire deux prix par nuit.
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 1.75,
          alignItems: 'start',
        }}
      >
        {/* ══════════ COLONNE GAUCHE ══════════ */}
        <Stack spacing={1.75}>
          {/* Distribution — écran signature, en tête de colonne gauche */}
          {market?.scale ? (
            <>
            {/* Date affichée par la courbe — sans ça, un clic droit change les
                chiffres sans dire lesquels (pas de popup ici, contrairement au
                ticket de caisse). Bouton "Aujourd'hui" seulement si on s'est
                écarté de la date du jour. */}
            {marketDay.date !== today.date ? (
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 0.25 }}>
                <Typography sx={{ fontSize: 12, color: T.ink2 }}>
                  Marché affiché pour le{' '}
                  <b style={{ color: T.ink }}>
                    {new Date(`${marketDay.date}T12:00:00Z`).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      timeZone: 'UTC',
                    })}
                  </b>
                </Typography>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setSelectedMarketDate(null)}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: T.gold,
                  }}
                >
                  ↺ Aujourd'hui
                </Box>
              </Stack>
            ) : null}
            <DistributionChart
              scale={market.scale}
              comps={market.comps}
              // Suit le dernier jour cliqué dans le calendrier (marketDay),
              // pas figé sur aujourd'hui — chaque clic cellule change le
              // statut marché affiché ici (demandé par Tawfiq 08/08/2026).
              yourPrice={marketDay.price}
              compsetSize={market.compsetSize}
              gamme={config?.gamme ?? 'normal'}
              busy={saving}
              /* Clic sur le curseur VOUS → le détail complet (même ticket que
                 le calendrier) : base, saison, jour, remplissage, bornes —
                 pour le jour actuellement affiché par la courbe. */
              onExplainYours={() => setTicketDay(marketDay)}
              /* Cliquer une gamme = poser le curseur doré PILE sur ce repère
                 (502/550/702/747 affichés). `result.meta.base` (= benchmark ×
                 GAMME_OFFSET × momentum × mode.tilt) et `scale.p25/p50/p75/p90`
                 (percentile pondéré sur le compset qualité-ajusté, market.ts)
                 sont deux calculs INDÉPENDANTS — ils ne coïncident pas
                 forcément, l'écart étant le plus visible sur premium/luxe où
                 GAMME_OFFSET amplifie la divergence. Sans ce calcul, le
                 curseur retombait sur meta.base et semblait "décalé" du
                 repère qu'on venait de cliquer (signalé par Tawfiq 08/08/2026).
                 On calcule donc l'annualTilt qui fait ATTERRIR base exactement
                 sur la valeur du repère, comme pour un drag manuel. */
              onGammeChange={(g) => {
                const scaleByGamme: Record<typeof g, number> = {
                  economique: market.scale.p25,
                  normal: market.scale.p50,
                  premium: market.scale.p75,
                  luxe: market.scale.p90,
                };
                const targetForGamme = scaleByGamme[g];
                // base = benchmarkRaw × GAMME_OFFSET[gamme] × momentum × mode.tilt × annualTilt
                // (engine/engine.ts:462). GAMME_OFFSET_FRONT ci-dessous DOIT rester
                // synchronisé avec GAMME_OFFSET côté moteur (engine/config.ts:5) — ce
                // n'est PAS le calcul de prix, juste l'inverse pour poser le curseur.
                // On retire l'offset de la gamme ACTUELLE de currentBase pour retomber
                // sur la partie constante (benchmarkRaw × momentum × mode.tilt × oldTilt),
                // puis on calcule le tilt qui, combiné au NOUVEL offset, atterrit
                // exactement sur targetForGamme.
                const currentGamme = config?.gamme ?? 'normal';
                const currentBase = result.meta.base || 1;
                const oldTilt = config?.annualTilt ?? 1;
                const constantPart = currentBase / GAMME_OFFSET_FRONT[currentGamme] / oldTilt;
                const tilt = targetForGamme / GAMME_OFFSET_FRONT[g] / constantPart;
                void patch({
                  gamme: g,
                  annualTilt: Math.min(1.6, Math.max(0.6, Number(tilt.toFixed(3)))),
                });
              }}
              /* Cible = prix de base du moteur, ajusté du réglage fin du PM.
                 Tant qu'il n'a rien touché (annualTilt = 1), elle se superpose
                 au constat — les deux curseurs sont alors alignés. */
              targetPrice={Math.round(result.meta.base)}
              onTargetChange={(price) => {
                // Le PM raisonne en prix, le moteur en multiplicateur : on
                // convertit. `base` inclut déjà le tilt courant, donc on part du
                // ratio prix visé / base actuelle.
                const current = result.meta.base || 1;
                const tilt = (config?.annualTilt ?? 1) * (price / current);
                // Borné : au-delà, on sort de ce que le marché peut absorber et
                // le moteur écrêterait de toute façon sur floor/ceil.
                void patch({ annualTilt: Math.min(1.6, Math.max(0.6, Number(tilt.toFixed(3)))) });
              }}
            />
            </>
          ) : null}

          {/* ── Décisions ── */}
          <Box sx={{ ...cardSx, opacity: saving ? 0.55 : 1, transition: 'opacity .15s' }}>
          <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink, mb: 2 }}>
            Vos réglages
          </Typography>

          {/* ⚠️ ORDRE MAQUETTE : « Votre fourchette » n'est PAS ici — elle vit en
              COLONNE DROITE, juste au-dessus du calendrier (relevé au DOM de la
              maquette : fourchette y=2591 puis calendrier y=2863, même colonne).
              Ne la ramène pas ici : le PM règle ses bornes en regardant l'effet
              immédiat sur le calendrier, les deux doivent être côte à côte. */}

          <Typography sx={{ ...kickerSx, mb: 1 }}>
            1 · VOTRE STRATÉGIE
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            {(['prudent', 'equilibre', 'agressif'] as const).map((m) => (
              <Box
                key={m}
                component="button"
                type="button"
                onClick={() => void patch({ mode: m })}
                sx={{
                  all: 'unset',
                  flex: 1,
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: config?.mode === m ? `1.5px solid ${T.goldPure}` : `1.5px solid ${T.line}`,
                  bgcolor: config?.mode === m ? T.goldBg : T.card,
                  borderRadius: `${T.radius}px`,
                  py: 1.25,
                  px: 1,
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: T.ink }}>{MODE_LABELS[m].label}</Typography>
                {/* Le % réellement appliqué au prix de base : sans lui, les
                    trois modes se choisissent au ressenti. */}
                <Typography
                  sx={{
                    fontFamily: T.mono,
                    fontSize: 13,
                    fontWeight: 750,
                    color: config?.mode === m ? T.gold : T.ink2,
                    mt: 0.25,
                  }}
                >
                  {MODE_LABELS[m].pct > 0 ? '+' : ''}
                  {MODE_LABELS[m].pct}&nbsp;%
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: T.mut, mt: 0.25 }}>{MODE_LABELS[m].sub}</Typography>
              </Box>
            ))}
          </Stack>

          {/* L'interrupteur du calcul nocturne a été remonté dans le hero, à
              droite du prix : il décide si ce prix est recalculé chaque nuit.
              Ne pas le redupliquer ici — deux interrupteurs pour un même
              réglage, c'est un de trop. */}

          {/* Le repère marché large, en contexte discret */}
          {market ? (
            <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${T.line2}` }}>
              <Typography sx={{ ...kickerSx, mb: 0.5 }}>
                REPÈRE — TOUT LE MARCHÉ AUTOUR DE VOUS
              </Typography>
              <Typography sx={{ fontSize: 12, color: T.ink2, lineHeight: 1.5 }}>
                {market.marketWide.p25} → {market.marketWide.p90} MAD (tous types de biens).
                Votre échelle est plus resserrée : elle ne retient que les biens réellement
                similaires au vôtre.
              </Typography>
            </Box>
          ) : null}
          </Box>

          {/* ── Les leviers (maquette : « Vos 5 leviers ») ── */}
          <Box sx={{ ...cardSx, opacity: saving ? 0.55 : 1, transition: 'opacity .15s' }}>
              <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink, mb: 1.5 }}>
                Vos leviers
              </Typography>
              {/* Saisonnalité + semaine (maquette : leviers 1 et 2) */}
              {result.levers ? (
                <>
                  <SeasonWeekLevers
                    seasonalCoefs={result.levers.seasonalCoefs}
                    dowMult={result.levers.dowMult}
                    busy={saving}
                    onSeasonalChange={(next) => void patch({ seasonalCoefs: next })}
                    onDowChange={(next) =>
                      void patch({
                        dowMult: Object.fromEntries(next.map((v, i) => [String(i), v])),
                      })
                    }
                    onResetSeasonal={() => void patch({ seasonalCoefs: null })}
                    onResetDow={() => void patch({ dowMult: null })}
                  />
                  <Box sx={{ height: 1, bgcolor: T.line2, my: 2.5 }} />
                </>
              ) : null}

              {/* ── Orphan gaps ── Rangé avec les autres leviers : c'en est un.
                  Il était dans la carte « fourchette », qui parle de bornes. */}
              <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${T.line2}` }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography sx={{ ...kickerSx }}>ORPHAN GAPS</Typography>
                  <Typography sx={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.ink }}>
                    {config?.gapAdjustPct ?? -20} %
                  </Typography>
                </Stack>
                <Slider
                  size="small"
                  min={-50}
                  max={0}
                  step={5}
                  value={config?.gapAdjustPct ?? -20}
                  disabled={saving}
                  marks={[{ value: -20, label: 'défaut' }]}
                  onChangeCommitted={(_, v) => void patch({ gapAdjustPct: v as number })}
                  sx={{ color: T.goldPure, mt: 0.5 }}
                />
                <Typography sx={{ fontSize: 11.5, color: T.ink2, lineHeight: 1.5 }}>
                  Une nuit ou deux coincées entre deux réservations, plus courtes que votre minimum de
                  séjour : invendables en l'état. Le minimum est abaissé à la taille du trou et le prix
                  ajusté d'autant, pour les remplir.
                </Typography>
              </Box>

              {/* Pacing (maquette : levier 3) */}
              <PacingPanel
                method={pacingMethod}
                onMethodChange={(next) => void patch({ pacingMethod: next })}
                value={pacing}
                busy={saving}
                onChange={(next) =>
                  void patch({
                    pacingHighThreshold: next.highThreshold,
                    pacingHighMax: next.highMax,
                    pacingLowThreshold: next.lowThreshold,
                    pacingLowMax: next.lowMax,
                  })
                }
              />
            </Box>

          {/* Le tableau du marché a quitté cette colonne : il vit désormais en
              PLEINE LARGEUR sous la grille. Six colonnes de données dans une
              demi-largeur, c'était illisible. */}
        </Stack>

        {/* ══════════ COLONNE DROITE — le calendrier ══════════
            La fourchette a été remontée dans le hero (à droite du prix), avec
            l'interrupteur : ce sont les deux réglages qui commentent ce prix.
            Le calendrier occupe donc toute cette colonne. */}
        <Stack spacing={1.75}>
        <Box sx={cardSx}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
            <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink }}>
              Vos {CALENDAR_MONTHS} prochains mois
            </Typography>
            <Typography sx={{ fontSize: 11, color: T.mut }}>
              <Box component="span" sx={{ color: T.manual }}>■</Box> réservé ·{' '}
              <Box component="span" sx={{ color: T.line }}>■</Box> bloqué ·{' '}
              <Box component="span" sx={{ color: T.goldPure }}>■</Box> à vendre ·{' '}
              <Box component="span" sx={{ color: T.crit }}>▁</Box> borné ·{' '}
              <Box component="span" sx={{ color: T.crit }}>▢</Box> orphan gap
            </Typography>
          </Stack>
          {/* Nuits vendues : quel prix afficher ? (maquette : « Prix actuels / Prix à la résa »)
              Le PM compare ce qu'il a encaissé à ce que le moteur aurait proposé. */}
          {result.days.some((d) => d.status === 'booked') ? (
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.25, flexWrap: 'wrap' }}>
              <Typography sx={{ ...kickerSx, fontSize: 9 }}>NUITS RÉSERVÉES :</Typography>
              <Stack
                direction="row"
                sx={{ bgcolor: T.line2, borderRadius: `${T.radius}px`, p: 0.25, gap: 0.25, border: `1px solid ${T.line}` }}
              >
                {[
                  { on: false, label: 'Prix du moteur' },
                  { on: true, label: 'Prix encaissé' },
                ].map((o) => (
                  <Box
                    key={String(o.on)}
                    component="button"
                    type="button"
                    onClick={() => setShowBookedPrices(o.on)}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      px: 1.25,
                      py: 0.4,
                      borderRadius: 1,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: showBookedPrices === o.on ? T.card : T.ink2,
                      bgcolor: showBookedPrices === o.on ? T.manual : 'transparent',
                    }}
                  >
                    {o.label}
                  </Box>
                ))}
              </Stack>
            </Stack>
          ) : null}

          {/* Barre d'action — apparaît dès qu'une plage est sélectionnée au drag.
              Reste montée pendant le glisser (opacité seule) : la démonter puis
              la remonter faisait sauter la page et vidait le champ « MAD ». */}
          {range ? (
            <RangeActionBar
              fromDate={range.from}
              toDate={range.to}
              // Toutes les nuits de la plage reçoivent la consigne, réservées et
              // bloquées incluses (cf. applyRange) — le décompte doit dire vrai.
              nbDays={result.days.filter((d) => inRange(d.date)).length}
              nbBooked={result.days.filter((d) => inRange(d.date) && d.status === 'booked').length}
              nbBlocked={result.days.filter((d) => inRange(d.date) && d.status === 'blocked').length}
              dragging={dragging}
              busy={saving}
              onApply={(a) => void applyRange(a)}
              onCancel={clearSelection}
            />
          ) : null}
          {/* Les 6 mois du moteur, sur deux colonnes, sans zone défilante. */}
          <Box
            sx={{
              // Les 6 mois sur DEUX colonnes : empilés verticalement, il fallait
              // faire défiler pour en voir plus de deux. Sur écran large ils
              // tiennent côte à côte, donc plus de scroll du tout.
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              alignItems: 'start',
              // Plus de plafond de hauteur : la grille 2 colonnes divise déjà la
              // hauteur par deux. Le scroll interne masquait les derniers mois.
              pr: 0.5,
            }}
          >
          {months.map(([month, days]) => {
            const prices = days.map((d) => d.price);
            const lo = Math.min(...prices);
            const hi = Math.max(...prices);
            // Grille SEMAINE (7 colonnes, DIM→SAM) comme la maquette — pas un
            // auto-fill : un calendrier doit s'aligner sur les jours de semaine,
            // sinon le PM ne repère pas ses week-ends.
            const firstDow = new Date(`${days[0].date}T12:00:00Z`).getUTCDay();
            return (
              <Box key={month} sx={{ mb: 2 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
                  <Typography sx={{ fontWeight: 750, fontSize: 13.5, color: T.ink }}>
                    {new Date(`${month}-01T12:00:00Z`).toLocaleDateString('fr-FR', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </Typography>
                  <Typography sx={{ fontFamily: T.mono, fontSize: 11, color: T.ink2 }}>
                    {lo} – {hi} MAD
                  </Typography>
                </Stack>
                {/* En-tête des jours de semaine */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                  {['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'].map((d) => (
                    <Typography key={d} sx={{ ...kickerSx, fontSize: 8.5, textAlign: 'center' }}>
                      {d}
                    </Typography>
                  ))}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                  {/* Cases vides avant le 1er jour du mois — aligne la 1re semaine */}
                  {Array.from({ length: firstDow }, (_, i) => (
                    <Box key={`pad-${i}`} />
                  ))}
                  {days.map((d) => {
                    const t = hi > lo ? (d.price - lo) / (hi - lo) : 0.5;
                    const booked = d.status === 'booked';
                    const blocked = d.status === 'blocked';
                    // Couleur = ÉTAT d'abord (le PM doit voir d'un coup d'œil ce
                    // qui est vendu), intensité de l'or = niveau de prix ensuite.
                    const bg = booked
                      ? T.manualBg
                      : blocked
                        ? T.line2
                        : `rgba(230, 176, 34, ${0.1 + 0.5 * t})`;
                    // Trou invendable : le minStay du bien interdit de vendre ces
                    // nuits. On les signale explicitement — c'est de l'argent qui
                    // dort, invisible autrement.
                    const gap = d.gap;
                    const picked = inRange(d.date);
                    // La sélection PRIME sur l'état : avant, une nuit réservée
                    // sélectionnée gardait la même bordure `T.manual` que non
                    // sélectionnée — le PM ne voyait pas ce qu'il avait pris.
                    const borderCol = picked ? T.goldPure : gap ? T.crit : booked ? T.manual : T.line;
                    return (
                      <Box
                        key={d.date}
                        component="button"
                        type="button"
                        // clic = ticket de caisse · glisser = sélection de plage.
                        // Pointer events (pas mouse) : gère aussi le tactile, et
                        // `releasePointerCapture` permet de suivre le survol des
                        // cellules voisines pendant le glisser.
                        onPointerDown={(e) => {
                          // Bouton droit : géré par onContextMenu, ne démarre pas
                          // un glisser (sinon la sélection restait coincée).
                          if (e.button !== 0) return;
                          e.currentTarget.releasePointerCapture(e.pointerId);
                          // Maj + clic = étendre depuis l'ancre existante. Sur 6
                          // mois affichés, un glisser de septembre à février est
                          // impraticable ; c'est le geste attendu d'un tableur.
                          if (e.shiftKey && sel) {
                            movedRef.current = true;
                            setSel({ from: sel.from, to: d.date });
                            return;
                          }
                          setDragging(true);
                          movedRef.current = false;
                          setSel({ from: d.date, to: d.date });
                        }}
                        onPointerEnter={() => {
                          if (!dragging) return;
                          movedRef.current = true;
                          // Étend depuis l'ancre `from`, jamais depuis `to` : en
                          // repartant en arrière la plage se réduit correctement.
                          setSel((s) => (s ? { from: s.from, to: d.date } : s));
                        }}
                        onPointerUp={(e) => {
                          if (e.button !== 0) return;
                          // Maj + clic vient d'étendre la plage : ne pas ouvrir le
                          // ticket ni effacer ce qu'on vient de sélectionner.
                          if (e.shiftKey) return;
                          setDragging(false);
                          // Clic sans déplacement = consultation, pas sélection.
                          if (!movedRef.current) {
                            setSel(null);
                            setTicketDay(d);
                          }
                          movedRef.current = false;
                        }}
                        /* Clic droit = changer le jour affiché par "Le marché,
                           et vous dessus" SANS ouvrir le ticket de caisse —
                           demandé par Tawfiq 08/08/2026 (clic simple garde le
                           popup, clic droit met juste à jour la courbe). */
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedMarketDate(d.date);
                        }}
                        title={
                          (gap
                            ? `${d.date} — ORPHAN GAP de ${gap.size} nuit${gap.size > 1 ? 's' : ''} entre deux réservations.` +
                              ` Invendable avec un minimum de ${result.minStay} nuits :` +
                              ` minimum abaissé à ${gap.minStay} et prix ajusté de ${gap.adjustPct} % → ${d.price} MAD`
                            : booked
                            ? `${d.date} — RÉSERVÉ` +
                              (d.bookedPriceMad ? ` · encaissé ${d.bookedPriceMad} MAD` : '') +
                              ` · le moteur proposerait ${d.price} MAD`
                            : blocked
                              ? `${d.date} — bloqué (fermé à la vente)`
                              : `${d.date} — ${d.price} MAD (marché : ${Math.round(d.comp)})`) +
                          ' · clic : détail du prix · glisser ou Maj+clic : sélectionner une plage' +
                          ' · clic droit : voir dans "Le marché, et vous dessus"'
                        }
                        sx={{
                          all: 'unset',
                          cursor: 'pointer',
                          userSelect: 'none',
                          borderRadius: 1,
                          textAlign: 'center',
                          py: 0.4,
                          fontSize: 11.5,
                          fontFamily: T.mono,
                          color: blocked && !picked ? T.mut : T.ink,
                          // Une nuit bloquée SÉLECTIONNÉE doit être aussi lisible
                          // que les autres : elle reçoit bien la consigne de prix.
                          opacity: blocked && !picked ? 0.7 : 1,
                          border: `1px solid ${borderCol}`,
                          // Le fond garde l'ÉTAT (vendu / bloqué / niveau de prix) :
                          // seul le contour dit la sélection, sinon on perdait
                          // l'information métier en sélectionnant.
                          bgcolor: bg,
                          borderBottom: d.breakdown.clamped
                            ? `2px solid ${T.crit}`
                            : `1px solid ${borderCol}`,
                          // Contour épais + halo : visible sur TOUS les fonds,
                          // y compris les nuits réservées et bloquées.
                          ...(picked
                            ? {
                                outline: `2px solid ${T.goldPure}`,
                                outlineOffset: -1,
                                boxShadow: `inset 0 0 0 2px ${T.manualBg}`,
                                fontWeight: 700,
                              }
                            : {}),
                          '&:hover': { outline: `1.5px solid ${T.gold}` },
                        }}
                      >
                        <Box sx={{ opacity: 0.5, fontSize: 9.5 }}>{Number(d.date.slice(8))}</Box>
                        {booked ? (
                          // Nuit vendue : prix encaissé OU prix moteur selon le
                          // toggle, avec l'autre en tout petit dessous.
                          <>
                            <Box sx={{ fontWeight: 700, color: T.manual }}>
                              {showBookedPrices && d.bookedPriceMad ? d.bookedPriceMad : d.price}
                            </Box>
                            {d.bookedPriceMad ? (
                              <Box sx={{ fontSize: 8.5, opacity: 0.6, lineHeight: 1 }}>
                                {showBookedPrices ? d.price : d.bookedPriceMad}
                              </Box>
                            ) : null}
                          </>
                        ) : blocked ? (
                          <Box sx={{ fontSize: 10, opacity: 0.75 }}>—</Box>
                        ) : (
                          d.price
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
          </Box>
        </Box>
        </Stack>
      </Box>

      {/* ── Le marché ouvert — PLEINE LARGEUR ──
          Six colonnes (ressemblance, quartier, note, deux prix, équipement) ont
          besoin de toute la page pour être comparables d'un coup d'œil. En
          demi-largeur, les écarts de taille et de note étaient illisibles. */}
      {market?.comps?.length ? (
        <Box sx={{ mt: 1.75 }}>
          <CompsTable comps={market.comps} subject={market.subject} />
        </Box>
      ) : null}

      <PriceTicket
        day={ticketDay}
        floor={result.meta.floor}
        ceil={result.meta.ceil}
        onClose={() => setTicketDay(null)}
      />
      </Box>
    </Box>
  );
}
