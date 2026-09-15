import { Fragment, useEffect, useMemo, useState } from "react";
import { Box, Chip, Collapse, Stack, Tooltip, Typography } from "@mui/material";
import type { CampaignDay, MarketingDashboard, ScoredCampaign } from "./api";
import { fetchCampaignDays } from "./api";
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
  inconclusive: { label: "Trop peu de données", fg: T.mut, bg: T.line2 },
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

function Head({ children, num }: { children: React.ReactNode; num?: boolean }) {
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
    </Box>
  );
}

/**
 * La diffusion jour par jour.
 *
 * Répond à « qu'a donné ma publicité hier » — mais seulement pour ce qui se
 * compte au jour. La contribution n'y figure pas : un marché produit ici entre
 * zéro et quatre réservations quotidiennes, et la répartir jour par jour
 * afficherait une précision qui n'existe pas.
 */
function DailyBreakdown({
  tenantId,
  listingId,
  campaignId,
}: {
  tenantId: string;
  listingId: string;
  campaignId: string;
}) {
  const [days, setDays] = useState<CampaignDay[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchCampaignDays({ tenantId, listingId, campaignId })
      .then((d) => alive && setDays(d.days))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [tenantId, listingId, campaignId]);

  if (failed) {
    return (
      <Typography sx={{ fontSize: 12.5, color: T.mut }}>
        Détail quotidien indisponible.
      </Typography>
    );
  }
  if (!days) {
    return (
      <Typography sx={{ fontSize: 12.5, color: T.mut }}>Chargement…</Typography>
    );
  }
  if (!days.length) {
    return (
      <Typography sx={{ fontSize: 12.5, color: T.mut }}>
        Aucune diffusion enregistrée sur la période.
      </Typography>
    );
  }

  const maxSpend = Math.max(...days.map((d) => d.spendMad), 1);

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box
        component="table"
        sx={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}
      >
        <Box component="thead">
          <Box component="tr">
            <Head>Jour</Head>
            <Head num>Dépense</Head>
            <Head num>Impressions</Head>
            <Head num>Clics</Head>
            <Head num>CTR</Head>
            <Head num>CPC</Head>
            <Head>&nbsp;</Head>
          </Box>
        </Box>
        <Box component="tbody">
          {days.map((d) => (
            <Box component="tr" key={d.day}>
              <Cell>
                <Box component="span" sx={{ fontSize: 12.5 }}>
                  {d.day.slice(5)}
                </Box>
              </Cell>
              <Cell num>{nf.format(Math.round(d.spendMad))}</Cell>
              <Cell num color={T.mut}>
                {nf.format(d.impressions)}
              </Cell>
              <Cell num>{nf.format(d.clicks)}</Cell>
              <Cell
                num
                bold
                color={d.ctr >= 5 ? T.ok : d.ctr < 2 ? T.crit : T.ink}
              >
                {d.ctr.toFixed(1)} %
              </Cell>
              <Cell num color={T.mut}>
                {d.cpc.toFixed(2)}
              </Cell>
              <Cell width="26%">
                <Box
                  sx={{
                    height: 6,
                    borderRadius: "3px",
                    bgcolor: T.line2,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${(d.spendMad / maxSpend) * 100}%`,
                      bgcolor: T.gold,
                    }}
                  />
                </Box>
              </Cell>
            </Box>
          ))}
        </Box>
      </Box>
      <Typography
        sx={{ fontSize: 11.5, color: T.mut, mt: 1.2, lineHeight: 1.5 }}
      >
        La diffusion se lit au jour — c'est ce que la régie facture. Les
        réservations, non : ce marché en produit entre zéro et quatre par jour,
        et les répartir afficherait une précision qui n'existe pas. La
        contribution ci-dessus porte sur la semaine.
      </Typography>
    </Box>
  );
}

/** Détail d'une campagne — ouvert au clic sur sa ligne. */
function Detail({
  c,
  tenantId,
  listingId,
}: {
  c: ScoredCampaign;
  tenantId: string;
  listingId: string;
}) {
  const rows: Array<[string, string, string?]> = [
    ["Dépense", mad(c.spendMad)],
    ["Impressions", nf.format(c.impressions)],
    ["Portée", nf.format(c.reach)],
    ["Clics", nf.format(c.clicks)],
    ["CTR", `${c.ctr.toFixed(2)} %`],
    ["CPC", `${c.cpc.toFixed(2)} MAD`],
    ["CPM", `${c.cpm.toFixed(1)} MAD`],
  ];

  const resa: Array<[string, string]> = [
    ["Réservations du marché", String(c.reservations)],
    ["dont OTA (Booking…)", String(c.otaReservations)],
    ["dont direct", String(c.directReservations)],
    ["Estimé sans publicité", c.expectedWithoutAds.toFixed(1)],
    [
      "Attribué à la publicité",
      `${c.attributed > 0 ? "+" : ""}${c.attributed.toFixed(1)}`,
    ],
    ["CA de la fenêtre", mad(c.revenueMad)],
    ["Panier moyen", mad(c.averageBasketMad)],
  ];

  return (
    <Box
      sx={{ px: 2, py: 2, bgcolor: T.bg, borderBottom: `1px solid ${T.line}` }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>Diffusion Meta</Typography>
          {rows.map(([k, v]) => (
            <Stack
              key={k}
              direction="row"
              justifyContent="space-between"
              sx={{ py: 0.4 }}
            >
              <Typography sx={{ fontSize: 12.5, color: T.ink2 }}>
                {k}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontFamily: T.mono }}>
                {v}
              </Typography>
            </Stack>
          ))}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>
            Réservations {FLAG[c.country] ?? ""} {c.country}
          </Typography>
          {resa.map(([k, v]) => (
            <Stack
              key={k}
              direction="row"
              justifyContent="space-between"
              sx={{ py: 0.4 }}
            >
              <Typography sx={{ fontSize: 12.5, color: T.ink2 }}>
                {k}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontFamily: T.mono }}>
                {v}
              </Typography>
            </Stack>
          ))}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>Activité du site</Typography>
          {c.ga4Sessions !== undefined ? (
            <>
              {(
                [
                  ["Sessions", nf.format(c.ga4Sessions ?? 0)],
                  ["Sessions engagées", nf.format(c.ga4EngagedSessions ?? 0)],
                  [
                    "Durée moyenne d'une session",
                    `${c.ga4AverageSessionDuration ?? 0} s`,
                  ],
                  [
                    "Sessions réellement investies",
                    `${c.ga4EngagementRate ?? 0} %`,
                  ],
                  ["Ajouts au panier", String(c.ga4AddToCarts ?? 0)],
                  ["Achats sur le site", String(c.ga4Purchases ?? 0)],
                ] as Array<[string, string]>
              ).map(([k, v]) => (
                <Stack
                  key={k}
                  direction="row"
                  justifyContent="space-between"
                  sx={{ py: 0.4 }}
                >
                  <Typography sx={{ fontSize: 12.5, color: T.ink2 }}>
                    {k}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, fontFamily: T.mono }}>
                    {v}
                  </Typography>
                </Stack>
              ))}
              <Typography
                sx={{ fontSize: 11.5, color: T.mut, mt: 1, lineHeight: 1.5 }}
              >
                Le site ne mesure pas les réservations — la plupart passent par
                une plateforme externe. Ces chiffres disent si le trafic acheté
                regarde quelque chose.
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: 12.5, color: T.mut, lineHeight: 1.6 }}>
              Aucune donnée de site pour cette campagne : elle ne porte pas de
              paramètre d'URL exploitable, ou son trafic n'a pas été identifié.
            </Typography>
          )}
        </Box>
      </Stack>

      <Box
        sx={{
          mt: 2,
          p: 1.5,
          borderRadius: "8px",
          bgcolor: VERDICT[c.verdict].bg,
          borderLeft: `3px solid ${VERDICT[c.verdict].fg}`,
        }}
      >
        <Typography
          sx={{ fontSize: 13, fontWeight: 650, color: VERDICT[c.verdict].fg }}
        >
          {VERDICT[c.verdict].label}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: T.ink2, mt: 0.3 }}>
          {c.reason}
        </Typography>
      </Box>

      <Box sx={{ mt: 2.5 }}>
        <Typography sx={{ ...kickerSx, mb: 1 }}>
          Diffusion jour par jour
        </Typography>
        <DailyBreakdown
          tenantId={tenantId}
          listingId={listingId}
          campaignId={c.campaignId}
        />
      </Box>
    </Box>
  );
}

export default function CampaignScores({ data }: { data: MarketingDashboard }) {
  const [open, setOpen] = useState<string | null>(null);

  const { positives, negatives } = useMemo(() => {
    const pos = data.campaigns.filter((c) => c.attributed > 0.3);
    return {
      positives: pos,
      negatives: data.campaigns.filter((c) => c.attributed <= 0.3),
    };
  }, [data.campaigns]);

  const spendPositive = positives.reduce((s, c) => s + c.spendMad, 0);
  const spendNegative = negatives.reduce((s, c) => s + c.spendMad, 0);

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
              <Head>Campagne</Head>
              <Head>Période</Head>
              <Head num>Dépense</Head>
              <Head num>CTR</Head>
              <Head num>Durée sess.</Head>
              <Head num>Résa</Head>
              <Head num>OTA</Head>
              <Head num>Sans pub</Head>
              <Head num>Attribué</Head>
              <Head num>Coût/attr.</Head>
              <Head num>% du CA</Head>
              <Head>Verdict</Head>
            </Box>
          </Box>
          <Box component="tbody">
            {data.campaigns.map((c) => {
              const isOpen = open === c.campaignId;
              const v = VERDICT[c.verdict];
              return (
                <Fragment key={c.campaignId}>
                  <Box
                    component="tr"
                    onClick={() => setOpen(isOpen ? null : c.campaignId)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: isOpen ? T.bg : "transparent",
                      "&:hover": { bgcolor: T.line2 },
                    }}
                  >
                    <Cell width="26%">
                      <Box component="span" sx={{ fontWeight: 550 }}>
                        {FLAG[c.country] ?? ""} {c.campaignName}
                      </Box>
                      <ConfidenceDot level={c.confidence} />
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
                    <Cell num>{c.reservations}</Cell>
                    <Cell num color={T.mut}>
                      {c.otaReservations}
                    </Cell>
                    <Cell num color={T.mut}>
                      {c.expectedWithoutAds.toFixed(1)}
                    </Cell>
                    <Cell num bold color={c.attributed > 0 ? T.ok : T.crit}>
                      {c.attributed > 0 ? "+" : ""}
                      {c.attributed.toFixed(1)}
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
                  <Box component="tr">
                    <Box component="td" colSpan={12} sx={{ p: 0, border: 0 }}>
                      <Collapse in={isOpen} unmountOnExit>
                        <Detail
                          c={c}
                          tenantId={data.tenantId}
                          listingId={data.listingId}
                        />
                      </Collapse>
                    </Box>
                  </Box>
                </Fragment>
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
      </Box>
    </Box>
  );
}
