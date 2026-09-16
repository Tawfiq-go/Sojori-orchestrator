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
// PAGE D'UNE CAMPAGNE
// ────────────────────────────────────────────────────────────────────────────
// Une page plutôt qu'un panneau qui se déplie : il y a trop de matière — la
// diffusion, l'activité du site, les réservations, la journée par journée — et
// un accordéon oblige à tout relire pour comparer deux campagnes.
//
// Le sélecteur en tête permet de passer de l'une à l'autre sans repasser par
// la liste, ce qui est le geste réel quand on arbitre un budget.
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

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "crit";
}) {
  const fg = tone === "ok" ? T.ok : tone === "crit" ? T.crit : T.ink;
  const bg = tone === "ok" ? T.okBg : tone === "crit" ? T.critBg : T.card;
  return (
    <Box
      sx={{
        ...cardSx,
        flex: "1 1 150px",
        bgcolor: bg,
        ...(tone ? { borderLeft: `3px solid ${fg}` } : {}),
      }}
    >
      <Typography
        sx={{ fontSize: 22, fontWeight: 650, fontFamily: T.mono, color: fg }}
      >
        {value}
      </Typography>
      <Typography sx={kickerSx}>{label}</Typography>
      {hint && (
        <Typography sx={{ fontSize: 11.5, color: T.mut, mt: 0.4 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Une ligne libellé / valeur.
 *
 * Une grille à deux colonnes plutôt qu'un `Stack` en ligne : ce dernier passe
 * à la ligne quand la largeur manque, et le libellé se retrouve seul au-dessus
 * de son chiffre. La lecture se perd — on ne sait plus quelle valeur appartient
 * à quoi. La grille garde les deux côte à côte à toute largeur, le libellé
 * passant sur deux lignes s'il le faut.
 *
 * Le filet pointillé entre les deux guide l'œil jusqu'au chiffre, comme dans
 * un relevé.
 */
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

function Th({ children, num }: { children: React.ReactNode; num?: boolean }) {
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

function Td({
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
  width?: string;
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
        whiteSpace: num ? "nowrap" : "normal",
        width,
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

  // Le tableau de bord sert deux choses : les chiffres de la campagne, et la
  // liste des autres pour le sélecteur. Une seule lecture pour les deux.
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

  // Sans identifiant dans l'URL — entrée par « Campagnes » dans le menu — on
  // ouvre la plus contributive : elle est en tête de liste, et c'est celle
  // qu'on regarde en premier.
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
        // Le détail quotidien est un complément : son absence laisse les
        // chiffres de synthèse lisibles.
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
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1240, mx: "auto" }}>
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
      <Typography sx={{ fontSize: 13, color: T.mut, mb: 2 }}>
        Marché {campaign.country} · fenêtre du {campaign.windowFrom} au{" "}
        {campaign.windowTo} · relevé du {campaign.day}
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2.5 }}>
        <Kpi
          label="Dépense"
          value={nf.format(Math.round(campaign.spendMad))}
          hint="MAD"
        />
        <Kpi label="Taux de clic" value={`${campaign.ctr.toFixed(1)} %`} />
        <Kpi
          label="Écart à la normale"
          value={campaign.lift == null ? "—" : `×${campaign.lift.toFixed(1)}`}
          hint={
            campaign.lift == null
              ? `${campaign.reservations} réservations observées`
              : `${(campaign.liftPercent ?? 0) > 0 ? "+" : ""}${campaign.liftPercent} % · ${campaign.reservations} observées contre ${campaign.expectedWithoutAds.toFixed(1)} attendues`
          }
          tone={
            campaign.lift == null
              ? undefined
              : campaign.lift > 1
                ? "ok"
                : "crit"
          }
        />
        <Kpi
          label="Coût sur CA généré"
          value={
            campaign.costShareOfRevenue === null
              ? "—"
              : `${campaign.costShareOfRevenue} %`
          }
          hint="commission OTA : 15–18 %"
          tone={
            campaign.costShareOfRevenue === null
              ? undefined
              : campaign.costShareOfRevenue < 15
                ? "ok"
                : "crit"
          }
        />
      </Box>

      <Box
        sx={{
          ...cardSx,
          bgcolor: v.bg,
          borderLeft: `3px solid ${v.fg}`,
          mb: 2.5,
        }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 650, color: v.fg }}>
          {v.label}
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.ink2, mt: 0.3 }}>
          {campaign.reason}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          // Trois colonnes quand la place le permet, deux puis une sinon —
          // jamais de colonne si étroite que le libellé passe sous sa valeur.
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box sx={{ ...cardSx }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>Diffusion</Typography>
          <Row k="Dépense" v={mad(campaign.spendMad)} bold />
          <Row k="Impressions" v={nf.format(campaign.impressions)} />
          <Row k="Portée" v={nf.format(campaign.reach)} />
          <Row k="Clics" v={nf.format(campaign.clicks)} />
          <Row k="Taux de clic" v={`${campaign.ctr.toFixed(2)} %`} bold />
          <Row k="Coût par clic" v={`${campaign.cpc.toFixed(2)} MAD`} />
          <Row k="Coût pour mille" v={`${campaign.cpm.toFixed(1)} MAD`} />
        </Box>

        <Box sx={{ ...cardSx }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>
            Réservations {FLAG[campaign.country] ?? ""} {campaign.country}
          </Typography>
          <Row
            k="Observées sur la fenêtre"
            v={String(campaign.reservations)}
            bold
          />
          <Row
            k="dont plateforme externe"
            v={String(campaign.otaReservations)}
          />
          <Row k="dont direct" v={String(campaign.directReservations)} />
          <Row
            k="Estimé sans publicité"
            v={campaign.expectedWithoutAds.toFixed(1)}
          />
          <Row
            k="Écart à la normale"
            v={
              campaign.lift == null
                ? "—"
                : `×${campaign.lift.toFixed(1)}  (${(campaign.liftPercent ?? 0) > 0 ? "+" : ""}${campaign.liftPercent} %)`
            }
            bold
          />
          <Row k="Chiffre d'affaires" v={mad(campaign.revenueMad)} />
          <Row k="Panier moyen" v={mad(campaign.averageBasketMad)} />
        </Box>

        <Box sx={{ ...cardSx }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>Activité du site</Typography>
          {campaign.ga4Sessions !== undefined ? (
            <>
              <Row k="Sessions" v={nf.format(campaign.ga4Sessions)} bold />
              <Row
                k="Sessions engagées"
                v={nf.format(campaign.ga4EngagedSessions ?? 0)}
              />
              <Row
                k="Durée moyenne"
                v={`${Math.round(campaign.ga4AverageSessionDuration ?? 0)} s`}
                bold
              />
              <Row
                k="Sessions investies"
                v={`${campaign.ga4EngagementRate ?? 0} %`}
              />
              <Row
                k="Ajouts au panier"
                v={String(campaign.ga4AddToCarts ?? 0)}
              />
              <Row
                k="Achats sur le site"
                v={String(campaign.ga4Purchases ?? 0)}
              />
              {typeof campaign.marketAddToCarts === "number" && (
                <>
                  <Box sx={{ height: 12 }} />
                  <Typography sx={{ ...kickerSx, mb: 0.5 }}>
                    Marché {campaign.country}, tous canaux
                  </Typography>
                  <Row
                    k="Paniers pendant la diffusion"
                    v={String(campaign.marketAddToCarts)}
                    bold
                  />
                  <Row
                    k="Taux (paniers / sessions)"
                    v={`${(campaign.marketAddToCartRate ?? 0).toFixed(2)} %`}
                    bold
                  />
                  <Row
                    k="Paniers période de référence"
                    v={String(campaign.marketAddToCartsBefore ?? 0)}
                  />
                  <Row
                    k="Taux période de référence"
                    v={`${(campaign.marketAddToCartRateBefore ?? 0).toFixed(2)} %`}
                  />
                </>
              )}
              <Typography
                sx={{ fontSize: 11.5, color: T.mut, mt: 1, lineHeight: 1.5 }}
              >
                Le site ne mesure pas les réservations — la plupart passent par
                une plateforme externe. Un ajout au panier dit en revanche que
                le visiteur a choisi ses dates et sa villa : c'est l'intention
                la plus proche d'une réservation que le site sache mesurer.
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: 13, color: T.mut, lineHeight: 1.6 }}>
              Cette campagne ne porte pas de paramètre d'URL exploitable : son
              trafic n'a pas pu être identifié sur le site.
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ ...cardSx, p: 0, overflow: "hidden" }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
          <Typography sx={kickerSx}>Jour par jour</Typography>
          <Typography sx={{ fontSize: 12.5, color: T.ink2, mt: 0.4 }}>
            {normal !== null ? (
              <>
                Hors publicité, ce marché réserve{" "}
                <b>{normal.toFixed(2)} fois par jour</b> en moyenne — c'est la
                référence pour lire la colonne « Résa ».
              </>
            ) : (
              "Dépense, activité du site et réservations du marché, jour après jour."
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
              sx={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}
            >
              <Box component="thead">
                <Box component="tr">
                  <Th>Jour</Th>
                  <Th num>Dépense</Th>
                  <Th num>Clics</Th>
                  <Th num>CTR</Th>
                  <Th num>Sessions</Th>
                  <Th num>Durée</Th>
                  <Th num>Résa</Th>
                  <Th num>OTA</Th>
                  <Th>&nbsp;</Th>
                </Box>
              </Box>
              <Box component="tbody">
                {detail.days.map((d) => {
                  const max = Math.max(
                    ...detail.days.map((x) => x.spendMad),
                    1,
                  );
                  // La collecte tourne à 4 h UTC : la ligne du jour ne couvre
                  // que les premières heures. Sans le dire, une dépense de
                  // 23 MAD face à 500 la veille se lit comme un effondrement
                  // de la campagne — alors que la journée commence à peine.
                  const isToday = d.day === new Date().toISOString().slice(0, 10);
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
                        // Une journée au double de la normale se remarque ; à
                        // zéro, l'absence mérite aussi l'œil.
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
                      <Td width="22%">
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
                              width: `${(d.spendMad / max) * 100}%`,
                              bgcolor: T.gold,
                            }}
                          />
                        </Box>
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
            reste du bruit. Celle affichée en tête porte sur la semaine.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
