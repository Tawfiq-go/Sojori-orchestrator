// ════════════════════════════════════════════════════════════════════════════
// Sales B2B · À RELANCER — la file de sortie
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ RÈGLE DE LANGAGE : cet écran ne dit JAMAIS qu'un client a été relancé.
// Aucun envoi automatique n'existe — le canal de prospection reste à ouvrir, et
// le SMTP disponible sert les confirmations de réservation. Une ligne ici veut
// dire « il faudrait relancer », et c'est le PM qui envoie depuis sa boîte.
// Écrire « relance envoyée » ferait croire à un client contacté qui ne l'a
// jamais été — et personne ne s'en apercevrait avant l'impayé.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { resolveOwnerId } from "../onboarding/resolveOwnerId";
import { T, cardSx, kickerSx } from "../marketing/tokens";
import { fetchB2bOutbox, handleOutboxMessage, type OutboxMessage } from "./api";

/** `2027-01-30` → « 30 janv. », plus l'urgence en jours. */
function dueLabel(dueAt: string | null): { text: string; urgent: boolean } {
  if (!dueAt) return { text: "—", urgent: false };
  const due = new Date(dueAt);
  const days = Math.floor((due.getTime() - Date.now()) / 86400000);
  const date = due.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (days < 0) return { text: `${date} · en retard de ${-days} j`, urgent: true };
  if (days === 0) return { text: `${date} · aujourd'hui`, urgent: true };
  if (days === 1) return { text: `${date} · demain`, urgent: true };
  return { text: `${date} · dans ${days} j`, urgent: days <= 3 };
}

function money(mad: number): string {
  return `${Math.round(mad).toLocaleString("fr-FR").replace(/ | /g, " ")} MAD`;
}

export default function OutboxTab() {
  const { user } = useAuth();
  const ownerId = resolveOwnerId(user) ?? "";

  const [rows, setRows] = useState<OutboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      setError("Aucun établissement identifié.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchB2bOutbox(ownerId, "pending"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, status: "sent_manually" | "dismissed") => {
    setBusyId(id);
    try {
      await handleOutboxMessage(ownerId, id, status);
      // Retiré de la liste : la file ne montre que ce qui reste à faire.
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Mise à jour impossible.");
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (row: OutboxMessage) => {
    try {
      await navigator.clipboard.writeText(`${row.subject}\n\n${row.body}`);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Le presse-papiers peut être refusé : le texte reste lisible à l'écran,
      // l'échec ne bloque donc rien.
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }} spacing={1.5}>
        <CircularProgress size={24} sx={{ color: T.gold }} />
        <Typography sx={{ fontSize: 13, color: T.mut }}>
          Chargement de la file…
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Alert severity="warning" sx={{ fontSize: 12.5 }}>
        <strong>Aucun envoi automatique.</strong> Ces messages sont détectés par
        le suivi des échéances, mais rien ne part tout seul : le canal de
        prospection reste à ouvrir. Copier le texte, l'envoyer depuis{" "}
        <strong>b2b@sojori.com</strong>, puis marquer la ligne comme envoyée.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {error}
        </Alert>
      )}

      {rows.length === 0 && !error && (
        <Box sx={{ ...cardSx, textAlign: "center", py: 6 }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>File vide</Typography>
          <Typography sx={{ fontSize: 14, color: T.ink2 }}>
            Aucune relance à traiter. Les échéances qui approchent apparaîtront
            ici automatiquement.
          </Typography>
        </Box>
      )}

      {rows.map((row) => {
        const due = dueLabel(row.dueAt);
        return (
          <Box key={row.id} sx={cardSx}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              justifyContent="space-between"
              flexWrap="wrap"
              useFlexGap
            >
              <Box sx={{ minWidth: 0, flex: "1 1 320px" }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={row.kind === "payment_reminder" ? "Paiement" : "Devis"}
                    sx={{
                      bgcolor: T.goldBg,
                      color: T.ink,
                      fontWeight: 700,
                      fontSize: 11,
                      height: 22,
                    }}
                  />
                  <Chip
                    size="small"
                    label={due.text}
                    sx={{
                      bgcolor: due.urgent ? T.critBg : T.okBg,
                      color: due.urgent ? T.crit : T.ok,
                      fontWeight: 700,
                      fontSize: 11,
                      height: 22,
                    }}
                  />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
                    {money(row.amountMad)}
                  </Typography>
                </Stack>

                <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>
                  {row.groupLabel}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: T.mut, mt: 0.25 }}>
                  {row.reason}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void copy(row)}
                  sx={{ textTransform: "none", borderColor: T.line, color: T.ink }}
                >
                  {copiedId === row.id ? "Copié" : "Copier le message"}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={busyId === row.id}
                  onClick={() => void act(row.id, "sent_manually")}
                  sx={{
                    textTransform: "none",
                    bgcolor: T.gold,
                    fontWeight: 700,
                    "&:hover": { bgcolor: T.goldPure },
                  }}
                >
                  J'ai envoyé
                </Button>
                <Button
                  size="small"
                  variant="text"
                  disabled={busyId === row.id}
                  onClick={() => void act(row.id, "dismissed")}
                  sx={{ textTransform: "none", color: T.mut }}
                >
                  Ignorer
                </Button>
              </Stack>
            </Stack>

            {/* Le texte prêt à envoyer, lisible sans ouvrir quoi que ce soit. */}
            <Box
              sx={{
                mt: 2,
                p: 1.75,
                bgcolor: T.bg,
                border: `1px solid ${T.line2}`,
                borderRadius: "8px",
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.ink, mb: 1 }}>
                {row.subject}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12.5,
                  color: T.ink2,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.65,
                }}
              >
                {row.body}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
