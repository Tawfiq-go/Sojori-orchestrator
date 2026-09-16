// ════════════════════════════════════════════════════════════════════════════
// AGENT COMMERCIAL B2B — prospection entreprises, devis, acomptes
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ RÈGLE DE LANGAGE : tant que le back-end n'existe pas, cet écran ne doit
// afficher AUCUN chiffre d'activité — ni prospect, ni devis, ni encaissement.
// Un tableau de bord vide se lit comme « zéro affaire » ; un tableau de bord
// rempli de données d'exemple se lit comme la réalité. Les deux mentent. Seul
// l'onglet Configuration est fonctionnel, et il le dit lui-même.
//
// Ordre de livraison prévu (docs/patterns/13-agent-commercial-b2b.md) :
//   1. Company.ownerId en ObjectId          ← fait
//   2. Devis + expiration + blocage         ← la configuration ci-dessous
//   3. Échéancier du solde
//   4. Canal d'envoi ET réception
//   5. L'agent, en dernier
// ════════════════════════════════════════════════════════════════════════════
import { useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Skeleton, Stack, Tab, Tabs, Typography } from "@mui/material";
import { T, cardSx, kickerSx } from "../marketing/tokens";
import { useAuth } from "../../hooks/useAuth";
import { resolveOwnerId } from "../onboarding/resolveOwnerId";
import { fetchB2bKpis, type B2bKpis } from "./api";
import ConfigurationTab from "./ConfigurationTab";
import InboxTab from "./InboxTab";
import PipelineTab from "./PipelineTab";
import ProspectsTab from "./ProspectsTab";
import OutboxTab from "./OutboxTab";

/** Carte d'indicateur — même forme que celles du module Marketing. */
function Kpi({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <Box sx={{ ...cardSx, p: 2, flex: "1 1 220px", minWidth: 200 }}>
      <Typography sx={kickerSx}>{label}</Typography>
      {loading ? (
        <Skeleton width={110} height={34} sx={{ mt: 0.5 }} />
      ) : (
        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 650,
            letterSpacing: "-0.02em",
            color: T.ink,
            mt: 0.25,
          }}
        >
          {value}
        </Typography>
      )}
      {sub && (
        <Typography sx={{ fontSize: 12, color: T.mut, mt: 0.25, lineHeight: 1.5 }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

function mad(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} MAD`;
}

const TABS = [
  { key: "inbox", label: "Messages" },
  { key: "outbox", label: "À relancer" },
  { key: "pipeline", label: "Pipeline" },
  { key: "prospects", label: "Prospects" },
  { key: "config", label: "Configuration" },
] as const;

export default function B2bDashboard() {
  // L'URL décide de l'onglet ouvert : /b2b/configuration est une entrée de
  // menu à part entière, elle doit atterrir sur le bon onglet.
  const { pathname } = useLocation();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(
    pathname.includes("/configuration") ? "config" : "inbox",
  );

  const { user } = useAuth();
  const ownerId = resolveOwnerId(user) ?? "";
  const [kpis, setKpis] = useState<B2bKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  const loadKpis = useCallback(async () => {
    if (!ownerId) {
      setKpisLoading(false);
      return;
    }
    try {
      setKpis(await fetchB2bKpis(ownerId));
    } catch {
      // Un indicateur indisponible ne doit pas empêcher d'utiliser l'écran :
      // les cartes affichent « — » et le travail continue.
      setKpis(null);
    } finally {
      setKpisLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void loadKpis();
  }, [loadKpis]);

  return (
    <Box sx={{ bgcolor: T.bg, minHeight: "100%", p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        {/* ── En-tête ── */}
        <Box>
          <Typography sx={kickerSx}>Sales B2B</Typography>
          <Typography
            sx={{ fontSize: 26, fontWeight: 800, color: T.ink, lineHeight: 1.2 }}
          >
            Agent commercial B2B
          </Typography>
          <Typography sx={{ fontSize: 14, color: T.ink2, mt: 0.75, maxWidth: 680 }}>
            Prospection d'entreprises, agences et comptes corporate : qualifier,
            envoyer un devis, encaisser un acompte, bloquer le bien, relancer le
            solde.
          </Typography>
        </Box>

        {/* Les deux chiffres qu'un commercial regarde en premier. */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Kpi
            label="Affaires en cours"
            value={kpis ? String(kpis.openOpportunities) : "—"}
            sub="Ni gagnées, ni perdues"
            loading={kpisLoading}
          />
          <Kpi
            label="Valeur du pipeline"
            value={kpis ? mad(kpis.pipelineValueMad) : "—"}
            sub={
              kpis && kpis.openOpportunities > 0
                ? kpis.opportunitiesWithValue < kpis.openOpportunities
                  ? `Estimation — ${kpis.opportunitiesWithValue} affaire(s) chiffrée(s) sur ${kpis.openOpportunities}`
                  : "Montants espérés, pas des engagements"
                : "Montants espérés, pas des engagements"
            }
            loading={kpisLoading}
          />
        </Stack>

        <Alert severity="info" sx={{ fontSize: 13 }}>
          <strong>Module en cours de construction.</strong> La{" "}
          <strong>Configuration</strong> est enregistrée et lue par le suivi des
          échéances, qui alimente <strong>À relancer</strong>.
        </Alert>

        {/* ── Onglets ── */}
        <Box sx={{ borderBottom: `1.5px solid ${T.line}` }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              minHeight: 42,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: 14,
                color: T.mut,
                minHeight: 42,
              },
              "& .Mui-selected": { color: `${T.ink} !important` },
              "& .MuiTabs-indicator": { bgcolor: T.gold, height: 2.5 },
            }}
          >
            {TABS.map((t) => (
              <Tab key={t.key} value={t.key} label={t.label} />
            ))}
          </Tabs>
        </Box>

        {tab === "inbox" && <InboxTab />}

        {tab === "pipeline" && <PipelineTab />}

        {tab === "prospects" && <ProspectsTab />}

        {tab === "outbox" && <OutboxTab />}

        {tab === "config" && <ConfigurationTab />}

      </Stack>
    </Box>
  );
}
