import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNew";
import type { CampaignDays, MarketingDashboard, ScoredCampaign } from "./api";
import { fetchCampaignDays, fetchMarketingDashboard } from "./api";
import { T, cardSx, kickerSx } from "./tokens";

// ════════════════════════════════════════════════════════════════════════════
// PAGE D'UNE CAMPAGNE — 2 cartes
// ────────────────────────────────────────────────────────────────────────────
// 1. Résumé dashboard : Meta | GA4 | Sojori | Estimé
// 2. Veille jour par jour, colonnes groupées par source
// ════════════════════════════════════════════════════════════════════════════

const NOMMOS = {
  tenantId: "6a76078abdcf7860a409ef46",
  listingId: "6a763507fc05d00aba524a23",
};

const nf = new Intl.NumberFormat("fr-FR");
const mad = (n: number) => `${nf.format(Math.round(n))} MAD`;

const FLAG: Record<string, string> = {
  FR: "🇫🇷",
  GB: "🇬🇧",
  MA: "🇲🇦",
  US: "🇺🇸",
  NL: "🇳🇱",
  DE: "🇩🇪",
  ES: "🇪🇸",
  BE: "🇧🇪",
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

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "baseline",
        gap: 1,
        py: 0.65,
        borderBottom: `1px solid ${T.line2}`,
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Typography
        sx={{
          fontSize: 12.5,
          color: T.ink2,
          lineHeight: 1.35,
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: "0.28em",
            ml: 0.75,
            width: "100%",
            borderBottom: `1px dotted ${T.line}`,
          },
        }}
      >
        <Box
          component="span"
          sx={{ position: "relative", bgcolor: T.card, pr: 0.25 }}
        >
          {k}
        </Box>
      </Typography>
      <Typography
        sx={{
          fontSize: bold ? 14 : 13,
          fontFamily: T.mono,
          fontWeight: bold ? 650 : 450,
          color: bold ? T.ink : T.ink2,
          whiteSpace: "nowrap",
        }}
      >
        {v}
      </Typography>
    </Box>
  );
}

function SourcePanel({
  title,
  estimated,
  children,
}: {
  title: string;
  estimated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: "8px",
        border: `1px solid ${T.line2}`,
        bgcolor: T.bg,
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          ...kickerSx,
          mb: 1,
          color: estimated ? T.warn : T.mut,
          fontStyle: estimated ? "italic" : "normal",
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Th({
  children,
  num,
  src,
}: {
  children: React.ReactNode;
  num?: boolean;
  src?: string;
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
            color: T.mut,
            mt: 0.15,
          }}
        >
          {src}
        </Box>
      )}
    </Box>
  );
}

function Td({
  children,
  num,
  bold,
  color,
}: {
  children: React.ReactNode;
  num?: boolean;
  bold?: boolean;
  color?: string;
}) {
  return (
    <Box
      component="td"
      sx={{
        px: 1,
        py: 1,
        borderBottom: `1px solid ${T.line2}`,
        fontSize: 13,
        textAlign: num ? "right" : "left",
        fontFamily: num ? T.mono : "inherit",
        fontWeight: bold ? 650 : 400,
        color: color ?? T.ink,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Box>
  );
}

export default function CampaignPage() {
  const { campaignId: fromUrl } = useParams();
  const navigate = useNavigate();

  const [dash, setDash] = useState<MarketingDashboard | null>(null);
  const [detail, setDetail] = useState<CampaignDays | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMarketingDashboard({
      tenantId: NOMMOS.tenantId,
      listingId: NOMMOS.listingId,
    })
      .then((d) => alive && setDash(d))
      .catch(
        (e) => alive && setError(e instanceof Error ? e.message : String(e)),
      );
    return () => {
      alive = false;
    };
  }, []);

  const campaignId = fromUrl || dash?.campaigns[0]?.campaignId || "";

  useEffect(() => {
    if (!campaignId) return;
    let alive = true;
    setDetail(null);
    fetchCampaignDays({
      tenantId: NOMMOS.tenantId,
      listingId: NOMMOS.listingId,
      campaignId,
    })
      .then((d) => alive && setDetail(d))
      .catch(() => {
        // Le détail quotidien est un complément.
      });
    return () => {
      alive = false;
    };
  }, [campaignId]);

  const campaign = useMemo(
    () => dash?.campaigns.find((c) => c.campaignId === campaignId) ?? null,
    [dash, campaignId],
  );

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 14, color: T.crit }}>{error}</Typography>
      </Box>
    );
  }
  if (!dash) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={28} sx={{ color: T.gold }} />
      </Box>
    );
  }
  if (!campaign) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 14, color: T.mut }}>
          Cette campagne n'est pas dans le dernier relevé.
        </Typography>
      </Box>
    );
  }

  const v = VERDICT[campaign.verdict];
  const normal = detail?.dailyNormal ?? null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}
      >
        <Box
          onClick={() => navigate("/marketing")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            cursor: "pointer",
            color: T.mut,
            fontSize: 13,
            "&:hover": { color: T.ink },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 13 }} />
          Toutes les campagnes
        </Box>

        <Select
          size="small"
          value={campaignId}
          onChange={(e) => navigate(`/marketing/campagne/${e.target.value}`)}
          sx={{
            fontSize: 13,
            minWidth: 300,
            bgcolor: T.card,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: T.line },
          }}
        >
          {dash.campaigns.map((c) => (
            <MenuItem
              key={c.campaignId}
              value={c.campaignId}
              sx={{ fontSize: 13 }}
            >
              {FLAG[c.country] ?? ""} {c.campaignName}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <Typography
        sx={{ fontSize: 22, fontWeight: 650, letterSpacing: "-0.02em" }}
      >
        {FLAG[campaign.country] ?? ""} {campaign.campaignName}
      </Typography>
      <Typography sx={{ fontSize: 13, color: T.mut, mb: 1.5 }}>
        Marché {campaign.country} · {campaign.windowFrom.slice(5)} →{" "}
        {campaign.windowTo.slice(5)} · {mad(campaign.spendMad)} · relevé du{" "}
        {campaign.day}
      </Typography>

      <Box
        sx={{
          ...cardSx,
          bgcolor: v.bg,
          borderLeft: `3px solid ${v.fg}`,
          mb: 2.5,
          py: 1.5,
        }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 650, color: v.fg }}>
          {v.label}
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.ink2, mt: 0.3 }}>
          {campaign.reason}
        </Typography>
      </Box>

      {/* Carte 1 — résumé Meta | GA4 | Sojori | Estimé */}
      <Box sx={{ ...cardSx, mb: 2.5 }}>
        <Typography sx={{ ...kickerSx, mb: 0.5 }}>Résumé</Typography>
        <Typography sx={{ fontSize: 12.5, color: T.ink2, mb: 1.75 }}>
          Quatre sources, une lecture. Meta facture ; GA4 mesure le site ;
          Sojori compte les réservations ; l'estimé relie les deux.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "repeat(4, 1fr)",
            },
            gap: 1.5,
          }}
        >
          <SourcePanel title="Meta">
            <Row k="Dépense" v={mad(campaign.spendMad)} bold />
            <Row k="Impressions" v={nf.format(campaign.impressions)} />
            <Row k="Portée" v={nf.format(campaign.reach)} />
            <Row k="Clics" v={nf.format(campaign.clicks)} />
            <Row k="CTR" v={`${campaign.ctr.toFixed(2)} %`} bold />
            <Row k="CPC" v={`${campaign.cpc.toFixed(2)} MAD`} />
            <Row k="CPM" v={`${campaign.cpm.toFixed(1)} MAD`} />
          </SourcePanel>

          <SourcePanel title="GA4">
            {campaign.ga4Sessions !== undefined ? (
              <>
                <Row k="Sessions" v={nf.format(campaign.ga4Sessions)} bold />
                <Row
                  k="Engagées"
                  v={nf.format(campaign.ga4EngagedSessions ?? 0)}
                />
                <Row
                  k="Durée moy."
                  v={`${Math.round(campaign.ga4AverageSessionDuration ?? 0)} s`}
                  bold
                />
                <Row
                  k="Engagement"
                  v={`${campaign.ga4EngagementRate ?? 0} %`}
                />
                <Row
                  k="Paniers camp."
                  v={String(campaign.ga4AddToCarts ?? 0)}
                />
                <Row
                  k="Achats site"
                  v={String(campaign.ga4Purchases ?? 0)}
                />
                {typeof campaign.marketAddToCarts === "number" && (
                  <>
                    <Row
                      k={`Paniers ${campaign.country}`}
                      v={String(campaign.marketAddToCarts)}
                      bold
                    />
                    <Row
                      k="Taux marché"
                      v={`${(campaign.marketAddToCartRate ?? 0).toFixed(2)} %`}
                      bold
                    />
                  </>
                )}
              </>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: T.mut, lineHeight: 1.5 }}>
                Pas de paramètre d'URL exploitable — trafic non isolé sur le
                site.
              </Typography>
            )}
          </SourcePanel>

          <SourcePanel title="Sojori">
            <Row
              k={`Résa ${FLAG[campaign.country] ?? ""} ${campaign.country}`}
              v={String(campaign.reservations)}
              bold
            />
            <Row k="OTA" v={String(campaign.otaReservations)} />
            <Row k="Direct" v={String(campaign.directReservations)} />
            <Row k="CA" v={mad(campaign.revenueMad)} />
            <Row k="Panier moy." v={mad(campaign.averageBasketMad)} />
          </SourcePanel>

          <SourcePanel title="Estimé" estimated>
            <Row
              k="Sans pub"
              v={campaign.expectedWithoutAds.toFixed(1)}
            />
            <Row
              k="Écart"
              v={
                campaign.lift == null
                  ? "—"
                  : `×${campaign.lift.toFixed(1)}  (${(campaign.liftPercent ?? 0) > 0 ? "+" : ""}${campaign.liftPercent} %)`
              }
              bold
            />
            <Row
              k="Coût / résa est."
              v={
                campaign.costPerAttributedMad === null
                  ? "—"
                  : mad(campaign.costPerAttributedMad)
              }
            />
            <Row
              k="% du CA"
              v={
                campaign.costShareOfRevenue === null
                  ? "—"
                  : `${campaign.costShareOfRevenue} %`
              }
              bold
            />
            <Typography
              sx={{ fontSize: 11, color: T.mut, mt: 1, lineHeight: 1.45 }}
            >
              Commission OTA de référence : 15–18 %.
            </Typography>
          </SourcePanel>
        </Box>
      </Box>

      {/* Carte 2 — Veille jour par jour */}
      <Box sx={{ ...cardSx, p: 0, overflow: "hidden" }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
          <Typography sx={kickerSx}>Veille</Typography>
          <Typography sx={{ fontSize: 12.5, color: T.ink2, mt: 0.4 }}>
            {normal !== null ? (
              <>
                Hors publicité, ce marché réserve{" "}
                <b>{normal.toFixed(2)} fois par jour</b> en moyenne — référence
                pour lire Sojori.
              </>
            ) : (
              "Dépense Meta, activité GA4 et réservations Sojori, jour après jour."
            )}
          </Typography>
        </Box>

        {!detail ? (
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Typography sx={{ fontSize: 12.5, color: T.mut }}>
              Chargement…
            </Typography>
          </Box>
        ) : !detail.days.length ? (
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Typography sx={{ fontSize: 12.5, color: T.mut }}>
              Aucune diffusion enregistrée.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Box
              component="table"
              sx={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}
            >
              <Box component="thead">
                <Box component="tr">
                  <Th>Jour</Th>
                  <Th num src="Meta">
                    Dépense
                  </Th>
                  <Th num src="Meta">
                    Clics
                  </Th>
                  <Th num src="Meta">
                    CTR
                  </Th>
                  <Th num src="GA4">
                    Sessions
                  </Th>
                  <Th num src="GA4">
                    Durée
                  </Th>
                  <Th num src="Sojori">
                    Résa
                  </Th>
                  <Th num src="Sojori">
                    OTA
                  </Th>
                </Box>
              </Box>
              <Box component="tbody">
                {detail.days.map((d) => {
                  const isToday =
                    d.day === new Date().toISOString().slice(0, 10);
                  return (
                    <Box
                      component="tr"
                      key={d.day}
                      sx={isToday ? { opacity: 0.55 } : undefined}
                    >
                      <Td>
                        {d.day.slice(5)}
                        {isToday && (
                          <Box
                            component="span"
                            sx={{ fontSize: 10.5, color: T.mut, ml: 0.75 }}
                          >
                            en cours
                          </Box>
                        )}
                      </Td>
                      <Td num>{nf.format(Math.round(d.spendMad))}</Td>
                      <Td num color={T.mut}>
                        {nf.format(d.clicks)}
                      </Td>
                      <Td
                        num
                        color={d.ctr >= 5 ? T.ok : d.ctr < 2 ? T.crit : T.ink}
                      >
                        {d.ctr.toFixed(1)} %
                      </Td>
                      <Td num color={T.mut}>
                        {typeof d.sessions === "number"
                          ? nf.format(d.sessions)
                          : "—"}
                      </Td>
                      <Td num color={T.mut}>
                        {typeof d.averageSessionDuration === "number"
                          ? `${Math.round(d.averageSessionDuration)} s`
                          : "—"}
                      </Td>
                      <Td
                        num
                        bold
                        color={
                          normal && (d.reservations ?? 0) >= normal * 2
                            ? T.ok
                            : d.reservations === 0
                              ? T.mut
                              : T.ink
                        }
                      >
                        {typeof d.reservations === "number"
                          ? d.reservations
                          : "—"}
                      </Td>
                      <Td num color={T.mut}>
                        {typeof d.otaReservations === "number"
                          ? d.otaReservations
                          : "—"}
                      </Td>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: `1px solid ${T.line}`,
            bgcolor: T.bg,
          }}
        >
          <Typography sx={{ fontSize: 12, color: T.mut, lineHeight: 1.7 }}>
            La diffusion se lit au jour — c'est ce que la régie facture. La
            contribution, non : sur ces volumes, l'écart d'une seule journée
            reste du bruit. Celle du résumé porte sur la semaine.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
