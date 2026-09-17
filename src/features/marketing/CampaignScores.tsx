import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import type { MarketingDashboard, ScoredCampaign } from "./api";
import { T, cardSx, kickerSx } from "./tokens";

// ════════════════════════════════════════════════════════════════════════════
// CONTRIBUTION PAR CAMPAGNE
// ────────────────────────────────────────────────────────────────────────────
// Lignes compactes groupées par source (Meta / GA4 / Sojori / Estimé) — pas un
// tableau 15 colonnes. La contribution reste un écart estimé, pas une attribution.
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
  inconclusive: { label: "Signal en cours", fg: T.mut, bg: T.line2 },
};

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

type Source = "Meta" | "GA4" | "Sojori" | "Estimé";

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: 9.5,
          fontWeight: 650,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          color: T.mut,
          lineHeight: 1.2,
          mb: 0.15,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13,
          fontFamily: T.mono,
          fontWeight: 550,
          color: color ?? T.ink,
          whiteSpace: "nowrap",
          lineHeight: 1.25,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function SourceBlock({
  src,
  children,
}: {
  src: Source;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        flex: "1 1 120px",
        minWidth: 110,
        maxWidth: 220,
        px: 1.25,
        py: 0.85,
        borderLeft: `1px solid ${T.line2}`,
        "&:first-of-type": { borderLeft: "none", pl: 0 },
      }}
    >
      <Typography
        sx={{
          ...kickerSx,
          fontSize: 9.5,
          letterSpacing: "0.06em",
          color: src === "Estimé" ? T.warn : T.mut,
          fontStyle: src === "Estimé" ? "italic" : "normal",
          mb: 0.6,
        }}
      >
        {src}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.25,
          rowGap: 0.75,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function CampaignScores({ data }: { data: MarketingDashboard }) {
  const navigate = useNavigate();

  const { positives, negatives, shared } = useMemo(() => {
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
          {data.totals?.netCostShare !== null &&
            data.totals?.netCostShare !== undefined && (
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

      <Box sx={{ borderTop: `1px solid ${T.line}` }}>
        {data.campaigns.map((c) => {
          const v = VERDICT[c.verdict];
          const sameMarket = data.campaigns.filter(
            (x) => x.country === c.country,
          );
          const sharesMarket = sameMarket.length > 1;
          const period = `${c.windowFrom.slice(5)} → ${c.windowTo.slice(5)}`;

          return (
            <Box
              key={c.campaignId}
              onClick={() => navigate(`/marketing/campagne/${c.campaignId}`)}
              sx={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                px: 2.5,
                py: 1.35,
                cursor: "pointer",
                borderBottom: `1px solid ${T.line2}`,
                "&:hover": { bgcolor: T.line2 },
                flexWrap: { xs: "wrap", lg: "nowrap" },
              }}
            >
              {/* Identité + période·dépense fusionnées */}
              <Box sx={{ flex: "1 1 220px", minWidth: 180, pr: 1.5, py: 0.25 }}>
                <Box sx={{ fontWeight: 550, fontSize: 13.5, color: T.ink }}>
                  {FLAG[c.country] ?? ""} {c.campaignName}
                  <ConfidenceDot level={c.confidence} />
                </Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: T.mut,
                    mt: 0.35,
                    fontFamily: T.mono,
                  }}
                >
                  {period} · {mad(c.spendMad)}
                </Typography>
                {sharesMarket && (
                  <Box
                    sx={{
                      fontSize: 11,
                      color: T.warn,
                      mt: 0.4,
                      lineHeight: 1.45,
                    }}
                  >
                    ◈ {sameMarket.length} campagnes sur ce marché — résa =
                    marché entier.
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flex: "2 1 420px",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  minWidth: 0,
                }}
              >
                <SourceBlock src="Meta">
                  <Metric label="CTR" value={`${c.ctr.toFixed(1)} %`} />
                </SourceBlock>

                <SourceBlock src="GA4">
                  <Metric
                    label="Durée"
                    value={
                      c.ga4AverageSessionDuration !== undefined
                        ? `${Math.round(c.ga4AverageSessionDuration)} s`
                        : "—"
                    }
                    color={
                      c.ga4AverageSessionDuration !== undefined &&
                      c.ga4AverageSessionDuration < 30
                        ? T.crit
                        : undefined
                    }
                  />
                  <Metric
                    label="Paniers"
                    value={
                      typeof c.ga4AddToCarts === "number"
                        ? c.ga4AddToCarts
                        : "—"
                    }
                    color={T.mut}
                  />
                  <Metric
                    label="Marché"
                    value={
                      typeof c.marketAddToCarts === "number"
                        ? c.marketAddToCarts
                        : "—"
                    }
                    color={T.mut}
                  />
                  <Metric
                    label="Taux"
                    value={
                      typeof c.marketAddToCartRate === "number"
                        ? `${c.marketAddToCartRate.toFixed(2)} %`
                        : "—"
                    }
                    color={T.mut}
                  />
                </SourceBlock>

                <SourceBlock src="Sojori">
                  <Metric
                    label="Résa"
                    value={
                      <>
                        {c.reservations}
                        {sharesMarket && (
                          <Box
                            component="span"
                            sx={{ fontSize: 10, color: T.mut, ml: 0.35 }}
                          >
                            ◈
                          </Box>
                        )}
                      </>
                    }
                  />
                  <Metric
                    label="OTA"
                    value={c.otaReservations}
                    color={T.mut}
                  />
                </SourceBlock>

                <SourceBlock src="Estimé">
                  <Metric
                    label="Sans pub"
                    value={c.expectedWithoutAds.toFixed(1)}
                    color={T.mut}
                  />
                  <Metric
                    label="Écart"
                    value={
                      c.lift == null ? (
                        "—"
                      ) : (
                        <>
                          ×{c.lift.toFixed(1)}{" "}
                          <Box
                            component="span"
                            sx={{ fontSize: 11, color: T.mut }}
                          >
                            {(c.liftPercent ?? 0) > 0 ? "+" : ""}
                            {c.liftPercent}%
                          </Box>
                        </>
                      )
                    }
                    color={
                      c.lift == null ? T.mut : c.lift > 1 ? T.ok : T.crit
                    }
                  />
                  <Metric
                    label="Coût/résa"
                    value={
                      c.costPerAttributedMad === null
                        ? "—"
                        : nf.format(Math.round(c.costPerAttributedMad))
                    }
                  />
                  <Metric
                    label="% CA"
                    value={
                      c.costShareOfRevenue === null
                        ? "—"
                        : `${c.costShareOfRevenue} %`
                    }
                    color={
                      c.costShareOfRevenue === null ? T.mut : v.fg
                    }
                  />
                </SourceBlock>
              </Box>

              <Box
                sx={{
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  pl: 1.5,
                  py: 0.25,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    px: 1,
                    py: 0.35,
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
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{ px: 2.5, py: 2, borderTop: `1px solid ${T.line}`, bgcolor: T.bg }}
      >
        <Typography sx={{ fontSize: 12, color: T.mut, lineHeight: 1.7 }}>
          <b style={{ color: T.ink }}>Comment lire ces chiffres.</b> « % du CA »
          se compare à la commission d'une plateforme externe — 15 à 18 %. En
          dessous de 8 %, la publicité coûte moins cher que l'intermédiation ;
          au-delà de 15 %, l'établissement paierait moins en laissant la
          plateforme encaisser sa commission.
        </Typography>
        <Typography
          sx={{ fontSize: 12, color: T.mut, lineHeight: 1.7, mt: 0.8 }}
        >
          Fenêtre du {data.windowFrom} au {data.windowTo}, saison ×
          {data.campaigns[0]?.seasonalFactor ?? 1}. Sur des fenêtres courtes, le
          signe et l'ordre de grandeur comptent — pas la décimale. La pastille
          indique ce que la ligne vaut.
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
            celles du marché entier. La dépense et le CTR appartiennent à chaque
            campagne.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
