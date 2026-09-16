import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import type { MarketingDashboard, ScoredCampaign } from "./api";
import { T, cardSx, kickerSx } from "./tokens";

// ════════════════════════════════════════════════════════════════════════════
// CONTRIBUTION PAR CAMPAGNE
// ────────────────────────────────────────────────────────────────────────────
// Ce tableau ne montre pas une attribution : aucun identifiant ne relie un clic
// Meta à une réservation Booking, et 91 % des réservations en viennent. Il
// montre un écart — combien ce marché a réservé pendant la diffusion, face à ce
// qu'il réservait avant, saison déduite.
//
// La distinction n'est pas cosmétique : une interface qui affiche « 14
// réservations » là où le calcul dit « environ 14, entre 9 et 19 » fait prendre
// des décisions sur une précision qui n'existe pas. D'où la pastille de
// confiance sur chaque ligne, et le rappel en pied de tableau.
// ════════════════════════════════════════════════════════════════════════════

const nf = new Intl.NumberFormat("fr-FR");
const mad = (n: number) => `${nf.format(Math.round(n))} MAD`;

const FLAG: Record<string, string> = {
  FR: "🇫🇷",
  GB: "🇬🇧",
  MA: "🇲🇦",
  US: "🇺🇸",
  NL: "🇳🇱",
  DE: "🇩🇪",
  BE: "🇧🇪",
  ES: "🇪🇸",
  IT: "🇮🇹",
  CH: "🇨🇭",
  PT: "🇵🇹",
  DK: "🇩🇰",
};

const VERDICT: Record<
  ScoredCampaign["verdict"],
  { label: string; fg: string; bg: string }
> = {
  accelerate: { label: "Accélérer", fg: T.ok, bg: T.okBg },
  keep: { label: "Maintenir", fg: T.warn, bg: T.warnBg },
  stop: { label: "Arrêter", fg: T.crit, bg: T.critBg },
  // « Trop peu de données » se lit comme un jugement définitif sur une
  // campagne terminée. Or celles qui portent ce verdict diffusent encore : le
  // signal est simplement trop faible POUR L'INSTANT. Dire « en cours » décrit
  // la situation réelle et n'invite pas à couper une campagne qui n'a pas
  // encore eu le temps de produire.
  inconclusive: { label: "Signal en cours", fg: T.mut, bg: T.line2 },
};

/** Trois niveaux plutôt qu'un intervalle : le lecteur décide, il n'estime pas. */
const CONFIDENCE: Record<ScoredCampaign["confidence"], string> = {
  high: "Signal net — plus de 15 réservations observées",
  medium: "Signal modéré — 8 à 15 réservations, ordre de grandeur seulement",
  low: "Trop peu de réservations pour conclure",
};

function ConfidenceDot({ level }: { level: ScoredCampaign["confidence"] }) {
  const color = level === "high" ? T.ok : level === "medium" ? T.warn : T.mut;
  return (
    <Tooltip title={CONFIDENCE[level]} arrow>
      <Box
        component="span"
        sx={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          bgcolor: color,
          opacity: level === "low" ? 0.4 : 1,
          ml: 0.75,
          verticalAlign: "middle",
        }}
      />
    </Tooltip>
  );
}

function Cell({
  children,
  num,
  bold,
  color,
  width,
}: {
  children: React.ReactNode;
  num?: boolean;
  bold?: boolean;
  color?: string;
  width?: number | string;
}) {
  return (
    <Box
      component="td"
      sx={{
        px: 1,
        py: 1.1,
        borderBottom: `1px solid ${T.line2}`,
        fontSize: 13,
        textAlign: num ? "right" : "left",
        fontFamily: num ? T.mono : "inherit",
        fontWeight: bold ? 650 : 400,
        color: color ?? T.ink,
        whiteSpace: num ? "nowrap" : "normal",
        width,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * D'où vient une colonne.
 *
 * Trois origines, qui n'ont pas la même valeur de preuve :
 *   Meta   — facturé par la régie, vérifiable sur la facture ;
 *   GA4    — mesuré sur le site, une session est un fait ;
 *   Sojori — nos réservations, exactes mais sans lien avec la campagne ;
 *   estimé — calculé, jamais observé. C'est le cas de tout ce qui relie une
 *            campagne à une réservation : le lien n'existe pas, il est déduit
 *            d'un écart de marché.
 *
 * Afficher la source sous chaque intitulé évite la lecture qui coûte le plus
 * cher : prendre une estimation pour une mesure.
 */
type Source = "Meta" | "GA4" | "GA4 · marché" | "Sojori" | "estimé";

const SOURCE_COLOR: Record<Source, string> = {
  Meta: T.mut,
  GA4: T.mut,
  "GA4 · marché": T.mut,
  Sojori: T.mut,
  // L'estimation se distingue à l'œil : c'est la seule qui n'est pas mesurée.
  estimé: T.warn,
};

function Head({
  children,
  num,
  src,
}: {
  children: React.ReactNode;
  num?: boolean;
  src?: Source;
}) {
  return (
    <Box
      component="th"
      sx={{
        px: 1,
        py: 0.9,
        borderBottom: `1.5px solid ${T.line}`,
        fontSize: 10.5,
        fontWeight: 650,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: T.mut,
        textAlign: num ? "right" : "left",
        whiteSpace: "nowrap",
      }}
    >
      {children}
      {src && (
        <Box
          sx={{
            fontSize: 8.5,
            fontWeight: 600,
            letterSpacing: "0.02em",
            textTransform: "none",
            color: SOURCE_COLOR[src],
            fontStyle: src === "estimé" ? "italic" : "normal",
            mt: 0.15,
          }}
        >
          {src}
        </Box>
      )}
    </Box>
  );
}

export default function CampaignScores({ data }: { data: MarketingDashboard }) {
  const navigate = useNavigate();

  const { positives, negatives, shared } = useMemo(() => {
    // Une campagne dont le marché est visé par plusieurs campagnes ne peut
    // être dite ni contributive ni sans effet : les réservations sont celles
    // du marché entier et rien ne dit laquelle les a produites. La ranger dans
    // « sans effet mesuré » la condamnerait sur une mesure qui n'existe pas.
    const isShared = (c: ScoredCampaign) =>
      data.campaigns.filter((x) => x.country === c.country).length > 1;
    const measurable = data.campaigns.filter((c) => !isShared(c));
    return {
      positives: measurable.filter((c) => c.attributed > 0.3),
      negatives: measurable.filter((c) => c.attributed <= 0.3),
      shared: data.campaigns.filter(isShared),
    };
  }, [data.campaigns]);

  const spendPositive = positives.reduce((s, c) => s + c.spendMad, 0);
  const spendNegative = negatives.reduce((s, c) => s + c.spendMad, 0);
  const spendShared = shared.reduce((s, c) => s + c.spendMad, 0);

  return (
    <Box sx={{ ...cardSx, p: 0, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
        <Typography sx={kickerSx}>Contribution par campagne</Typography>
        <Typography
          sx={{ fontSize: 13, color: T.ink2, mt: 0.5, lineHeight: 1.6 }}
        >
          Classées de la plus à la moins contributive. La contribution est un{" "}
          <b>écart estimé</b> — ce que le marché a réservé pendant la diffusion,
          face à ce qu'il réservait avant, saison déduite. Aucun lien direct
          entre un clic et une réservation n'existe : la majorité arrive par une
          plateforme externe.
        </Typography>

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}
        >
          <Chip
            size="small"
            label={`${positives.length} contributives · ${mad(spendPositive)}`}
            sx={{ bgcolor: T.okBg, color: T.ok, fontWeight: 650, fontSize: 12 }}
          />
          {shared.length > 0 && (
            <Chip
              size="small"
              label={`${shared.length} non mesurables · ${mad(spendShared)}`}
              sx={{
                bgcolor: T.warnBg,
                color: T.warn,
                fontWeight: 650,
                fontSize: 12,
              }}
            />
          )}
          <Chip
            size="small"
            label={`${negatives.length} sans effet mesuré · ${mad(spendNegative)}`}
            sx={{
              bgcolor: T.critBg,
              color: T.crit,
              fontWeight: 650,
              fontSize: 12,
            }}
          />
          {data.totals.netCostShare !== null && (
            <Chip
              size="small"
              label={`Coût sur CA généré : ${data.totals.netCostShare} %`}
              sx={{
                bgcolor: T.goldBg,
                color: T.gold,
                fontWeight: 650,
                fontSize: 12,
              }}
            />
          )}
        </Stack>

        {data.campaigns[0] && !data.campaigns[0].seasonalTrustworthy && (
          <Typography
            sx={{ fontSize: 12, color: T.warn, mt: 1.2, lineHeight: 1.5 }}
          >
            Le coefficient de saison a été plafonné : les marchés témoins
            manquaient de volume sur cette période. Les contributions sont à
            lire comme des ordres de grandeur.
          </Typography>
        )}
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Box
          component="table"
          sx={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}
        >
          <Box component="thead">
            <Box component="tr">
              <Head src="Meta">Campagne</Head>
              <Head>Période</Head>
              <Head num src="Meta">Dépense</Head>
              <Head num src="Meta">CTR</Head>
              <Head num src="GA4">Durée sess.</Head>
              <Head num src="GA4">Paniers camp.</Head>
              <Head num src="GA4 · marché">Paniers marché</Head>
              <Head num src="GA4 · marché">Taux</Head>
              <Head num src="Sojori">Résa</Head>
              <Head num src="Sojori">OTA</Head>
              <Head num src="estimé">Sans pub</Head>
              <Head num src="estimé">Écart</Head>
              <Head num src="estimé">Coût/résa est.</Head>
              <Head num src="estimé">% du CA</Head>
              <Head src="estimé">Verdict</Head>
            </Box>
          </Box>
          <Box component="tbody">
            {data.campaigns.map((c) => {
              const v = VERDICT[c.verdict];
              // ⚠️ « Paniers marché », Résa, OTA et « Sans pub » décrivent le MARCHÉ, pas
              // la campagne. Quand deux campagnes visent le même pays, elles
              // affichent les mêmes chiffres — et un lecteur les additionne :
              // 3 + 3 = 6 réservations alors qu'il n'y en a que 3, partagées.
              // La mention rend le partage visible au lieu de le laisser
              // deviner.
              const sameMarket = data.campaigns.filter(
                (x) => x.country === c.country,
              );
              const sharesMarket = sameMarket.length > 1;
              return (
                <Box
                  component="tr"
                  key={c.campaignId}
                  onClick={() =>
                    navigate(`/marketing/campagne/${c.campaignId}`)
                  }
                  sx={{
                    cursor: "pointer",
                    "&:hover": { bgcolor: T.line2 },
                  }}
                >
                  <Cell width="26%">
                    <Box component="span" sx={{ fontWeight: 550 }}>
                      {FLAG[c.country] ?? ""} {c.campaignName}
                    </Box>
                    <ConfidenceDot level={c.confidence} />
                    {/*
                      L'avertissement vit SUR la ligne, pas seulement en légende
                      de bas de tableau : quelqu'un qui lit une ligne ne lit pas
                      forcément le pied de page, et c'est précisément là qu'il
                      décide de couper une campagne. Rien n'est réparti au
                      prorata — répartir 3 réservations en « 2,1 » et « 0,9 »
                      donnerait à une hypothèse l'apparence d'une mesure.
                    */}
                    {sharesMarket && (
                      <Box
                        sx={{
                          fontSize: 11,
                          color: T.warn,
                          mt: 0.4,
                          lineHeight: 1.45,
                        }}
                      >
                        ◈ {sameMarket.length} campagnes sur ce marché — les
                        réservations affichées sont celles du marché entier,
                        impossible de savoir laquelle les a produites.
                      </Box>
                    )}
                  </Cell>
                  <Cell>
                    <Box component="span" sx={{ fontSize: 12, color: T.mut }}>
                      {c.windowFrom.slice(5)} → {c.windowTo.slice(5)}
                    </Box>
                  </Cell>
                  <Cell num>{nf.format(Math.round(c.spendMad))}</Cell>
                  <Cell num>{c.ctr.toFixed(1)} %</Cell>
                  <Cell
                    num
                    color={
                      // Sous trente secondes, le visiteur n'a guère eu le
                      // temps de lire : le signalement vaut avertissement.
                      c.ga4AverageSessionDuration !== undefined &&
                      c.ga4AverageSessionDuration < 30
                        ? T.crit
                        : T.ink
                    }
                  >
                    {c.ga4AverageSessionDuration !== undefined
                      ? `${Math.round(c.ga4AverageSessionDuration)} s`
                      : "—"}
                  </Cell>
                  <Cell
                    num
                    color={T.mut}
                    // Le panier dit que quelqu'un a choisi ses dates et sa
                    // villa : l'intention la plus proche d'une réservation que
                    // le site sache mesurer.
                  >
                    {typeof c.ga4AddToCarts === "number" ? c.ga4AddToCarts : "—"}
                  </Cell>
                  <Cell
                    num
                    color={T.mut}
                    // Le MARCHÉ entier, pas cette campagne : tout le trafic du
                    // pays, publicitaire ou non. Deux campagnes visant le même
                    // marché affichent donc le même nombre — d'où la colonne
                    // précédente, qui seule dit ce que CETTE campagne a produit.
                  >
                    {typeof c.marketAddToCarts === "number"
                      ? c.marketAddToCarts
                      : "—"}
                  </Cell>
                  <Cell num color={T.mut}>
                    {/* Paniers rapportés aux sessions : un taux se compare
                        entre marchés de tailles différentes, un nombre non. */}
                    {typeof c.marketAddToCartRate === "number"
                      ? `${c.marketAddToCartRate.toFixed(2)} %`
                      : "—"}
                  </Cell>
                  <Cell num>
                    {c.reservations}
                    {sharesMarket && (
                      <Box
                        component="span"
                        sx={{ fontSize: 10, color: T.mut, ml: 0.4 }}
                        title={`Réservations du marché ${c.country}, partagées avec les autres campagnes de ce pays — ne pas additionner.`}
                      >
                        ◈
                      </Box>
                    )}
                  </Cell>
                  <Cell num color={T.mut}>
                    {c.otaReservations}
                  </Cell>
                  <Cell num color={T.mut}>
                    {c.expectedWithoutAds.toFixed(1)}
                  </Cell>
                  <Cell
                    num
                    bold
                    color={c.lift == null ? T.mut : c.lift > 1 ? T.ok : T.crit}
                  >
                    {/* Un multiple, pas un décompte : « −3 réservations » se
                        lirait comme « la publicité en a détruit trois ». */}
                    {c.lift == null ? (
                      "—"
                    ) : (
                      <>
                        ×{c.lift.toFixed(1)}
                        <Box
                          component="span"
                          sx={{ fontSize: 11, color: T.mut, ml: 0.5 }}
                        >
                          {(c.liftPercent ?? 0) > 0 ? "+" : ""}
                          {c.liftPercent} %
                        </Box>
                      </>
                    )}
                  </Cell>
                  <Cell num>
                    {c.costPerAttributedMad === null
                      ? "—"
                      : nf.format(Math.round(c.costPerAttributedMad))}
                  </Cell>
                  <Cell
                    num
                    bold
                    color={c.costShareOfRevenue === null ? T.mut : v.fg}
                  >
                    {c.costShareOfRevenue === null
                      ? "—"
                      : `${c.costShareOfRevenue} %`}
                  </Cell>
                  <Cell>
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.3,
                        borderRadius: "5px",
                        bgcolor: v.bg,
                        color: v.fg,
                        fontSize: 11.5,
                        fontWeight: 650,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {v.label}
                    </Box>
                  </Cell>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{ px: 2.5, py: 2, borderTop: `1px solid ${T.line}`, bgcolor: T.bg }}
      >
        <Typography sx={{ fontSize: 12, color: T.mut, lineHeight: 1.7 }}>
          <b style={{ color: T.ink }}>Comment lire ces chiffres.</b> La colonne
          « % du CA » se compare à la commission d'une plateforme externe — 15 à
          18 %. En dessous de 8 %, la publicité coûte moins cher que
          l'intermédiation ; au-delà de 15 %, l'établissement paierait moins en
          laissant la plateforme encaisser sa commission.
        </Typography>
        <Typography
          sx={{ fontSize: 12, color: T.mut, lineHeight: 1.7, mt: 0.8 }}
        >
          La fenêtre analysée court du {data.windowFrom} au {data.windowTo}, et
          la saison est mesurée sur les marchés ne recevant aucune publicité
          (coefficient ×{data.campaigns[0]?.seasonalFactor ?? 1}). Sur des
          fenêtres courtes, le signe et l'ordre de grandeur sont exploitables,
          la décimale ne l'est pas — la pastille au bout de chaque nom indique
          ce que la ligne vaut.
        </Typography>
        {data.campaigns.some(
          (c) =>
            data.campaigns.filter((x) => x.country === c.country).length > 1,
        ) && (
          <Typography
            sx={{ fontSize: 12, color: T.warn, lineHeight: 1.7, mt: 0.8 }}
          >
            <b>◈ Chiffres de marché, à ne pas additionner.</b> Plusieurs
            campagnes visent le même pays : les réservations affichées sont
            celles du marché entier, identiques sur chaque ligne. Les
            additionner compterait deux fois les mêmes séjours. La dépense et le
            CTR, eux, appartiennent bien à chaque campagne.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
