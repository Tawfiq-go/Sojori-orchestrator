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
import { useState } from "react";
import { Alert, Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import { T, cardSx, kickerSx } from "../marketing/tokens";
import ConfigurationTab from "./ConfigurationTab";
import OutboxTab from "./OutboxTab";

/** Onglet encore vide — dit ce qu'il attend, sans simuler de données. */
function Placeholder({ title, waiting }: { title: string; waiting: string }) {
  return (
    <Box sx={{ ...cardSx, textAlign: "center", py: 6 }}>
      <Typography sx={{ ...kickerSx, mb: 1 }}>À venir</Typography>
      <Typography sx={{ fontSize: 17, fontWeight: 700, color: T.ink, mb: 1 }}>
        {title}
      </Typography>
      <Typography
        sx={{ fontSize: 13.5, color: T.ink2, maxWidth: 520, mx: "auto", lineHeight: 1.7 }}
      >
        {waiting}
      </Typography>
    </Box>
  );
}

const TABS = [
  { key: "outbox", label: "À relancer" },
  { key: "prospects", label: "Prospects" },
  { key: "config", label: "Configuration" },
] as const;

export default function B2bDashboard() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("outbox");

  return (
    <Box sx={{ bgcolor: T.bg, minHeight: "100%", p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5} sx={{ maxWidth: 1080, mx: "auto" }}>
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

        <Alert severity="info" sx={{ fontSize: 13 }}>
          <strong>Module en cours de construction.</strong> La{" "}
          <strong>Configuration</strong> est enregistrée et lue par le suivi des
          échéances, qui alimente <strong>À relancer</strong>. L'onglet
          Prospects reste à venir.
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

        {tab === "outbox" && <OutboxTab />}

        {tab === "config" && <ConfigurationTab />}

        {tab === "prospects" && (
          <Placeholder
            title="Aucun prospect n'est encore suivi"
            waiting="La collection est vide et le modèle Prospect reste à créer (étape 5). Cet onglet listera les entreprises contactées, leur dernière interaction et la prochaine action à mener."
          />
        )}


      </Stack>
    </Box>
  );
}
