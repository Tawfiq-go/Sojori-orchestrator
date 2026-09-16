// ════════════════════════════════════════════════════════════════════════════
// Sales B2B · MESSAGES — lire les échanges et répondre au client
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ Une réponse envoyée d'ici PART VRAIMENT, depuis b2b@sojori.com. C'est le
// seul geste du module dont l'effet sort de Sojori et ne se rattrape pas.
// L'écran le dit avant l'envoi, et affiche l'adresse expéditrice : personne ne
// doit cliquer « Envoyer » en croyant enregistrer un brouillon.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { T, cardSx, kickerSx } from "../marketing/tokens";
import { isAdminRole, resolveOwnerId } from "../onboarding/resolveOwnerId";
import {
  assignThread,
  collectInbox,
  fetchInboxThread,
  fetchInboxThreads,
  fetchUnassignedThreads,
  replyToInboxThread,
  type InboxThread,
  type InboxThreadDetail,
  type UnassignedThread,
} from "./api";

function when(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0)
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function InboxTab() {
  const { user } = useAuth();
  const ownerId = resolveOwnerId(user) ?? "";
  const isAdmin = isAdminRole(user);

  const [threads, setThreads] = useState<InboxThread[]>([]);
  /** Fils qu'aucun signal n'a rattachés — visibles du seul administrateur. */
  const [unassigned, setUnassigned] = useState<UnassignedThread[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [openThread, setOpenThread] = useState<InboxThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      setError("Aucun établissement identifié.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setThreads(await fetchInboxThreads(ownerId));
      // La file « à rattacher » ne concerne que l'administrateur : un PM ne
      // doit pas voir des messages dont rien ne dit qu'ils lui appartiennent.
      if (isAdmin) {
        setUnassigned(await fetchUnassignedThreads(ownerId));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [ownerId, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (id: string) => {
    setError(null);
    setDraft("");
    try {
      setOpenThread(await fetchInboxThread(ownerId, id));
      // Le fil vient d'être lu : le compteur local suit le serveur.
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t)),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ouverture impossible.");
    }
  };

  const send = async () => {
    if (!openThread || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await replyToInboxThread(ownerId, openThread.id, draft.trim());
      setDraft("");
      // On relit le fil plutôt que d'y ajouter le message localement : le
      // serveur inscrit aussi les envois en échec, et l'écran doit montrer ce
      // qui s'est réellement passé, pas ce qu'on espérait.
      setOpenThread(await fetchInboxThread(ownerId, openThread.id));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  };

  const assign = async (threadId: string) => {
    setAssigning(threadId);
    setError(null);
    try {
      // Un seul établissement suivi aujourd'hui : on rattache au sien. Le jour
      // où il y en aura plusieurs, il faudra un choix explicite — deviner
      // ferait lire à un PM l'échange commercial d'un autre.
      await assignThread(ownerId, threadId, ownerId);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Rattachement impossible.");
    } finally {
      setAssigning(null);
    }
  };

  const collect = async () => {
    setCollecting(true);
    setError(null);
    setNotice(null);
    try {
      const r = await collectInbox(ownerId);
      setNotice(
        r.imported === 0
          ? "Aucun nouveau message."
          : `${r.imported} message(s) importé(s)${r.unresolved ? `, dont ${r.unresolved} sans rattachement` : ""}.`,
      );
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Relève impossible.");
    } finally {
      setCollecting(false);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }} spacing={1.5}>
        <CircularProgress size={24} sx={{ color: T.gold }} />
        <Typography sx={{ fontSize: 13, color: T.mut }}>
          Chargement des messages…
        </Typography>
      </Stack>
    );
  }

  /* ─────────────────────────── Un fil ouvert ─────────────────────────── */
  if (openThread) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            size="small"
            onClick={() => setOpenThread(null)}
            sx={{ textTransform: "none", color: T.mut }}
          >
            ← Tous les messages
          </Button>
        </Stack>

        <Box sx={cardSx}>
          <Typography sx={kickerSx}>{openThread.channel}</Typography>
          <Typography sx={{ fontSize: 17, fontWeight: 700, color: T.ink }}>
            {openThread.contactName ?? openThread.contactAddress}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: T.mut }}>
            {openThread.contactAddress}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ fontSize: 13 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={1.5}>
          {openThread.messages.map((m) => (
            <Box
              key={m.id}
              sx={{
                ...cardSx,
                bgcolor: m.direction === "outbound" ? T.goldBg : T.card,
                borderColor: m.direction === "outbound" ? T.goldSoft : T.line,
                ml: m.direction === "outbound" ? { xs: 0, sm: 6 } : 0,
                mr: m.direction === "outbound" ? 0 : { xs: 0, sm: 6 },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
                mb={0.75}
                flexWrap="wrap"
                useFlexGap
              >
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: T.ink2 }}>
                  {m.direction === "outbound" ? `Nous → ${m.to}` : m.from}
                </Typography>
                <Typography sx={{ fontSize: 12, color: T.mut }}>
                  {when(m.sentAt)}
                </Typography>
              </Stack>
              {m.subject && (
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.ink, mb: 0.5 }}>
                  {m.subject}
                </Typography>
              )}
              <Typography
                sx={{
                  fontSize: 13,
                  color: T.ink2,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.65,
                }}
              >
                {m.body}
              </Typography>
              {m.error && (
                <Alert severity="error" sx={{ mt: 1.5, fontSize: 12 }}>
                  Ce message n'est pas parti : {m.error}
                </Alert>
              )}
            </Box>
          ))}
        </Stack>

        <Divider />

        <Box sx={cardSx}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>Répondre</Typography>
          <TextField
            multiline
            minRows={5}
            fullWidth
            placeholder="Votre réponse…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            sx={{ mb: 1.5 }}
          />
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              disabled={!draft.trim() || sending}
              onClick={() => void send()}
              startIcon={sending ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: T.gold,
                "&:hover": { bgcolor: T.goldPure },
              }}
            >
              {sending ? "Envoi…" : "Envoyer au client"}
            </Button>
            <Typography sx={{ fontSize: 12.5, color: T.mut }}>
              Part immédiatement depuis <strong>b2b@sojori.com</strong>.
            </Typography>
          </Stack>
        </Box>
      </Stack>
    );
  }

  /* ──────────────────────────── Liste des fils ──────────────────────────── */
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant="outlined"
          disabled={collecting}
          onClick={() => void collect()}
          sx={{ textTransform: "none", borderColor: T.line, color: T.ink }}
        >
          {collecting ? "Relève en cours…" : "Relever la boîte"}
        </Button>
        <Typography sx={{ fontSize: 12.5, color: T.mut }}>
          Les nouveaux messages arrivent aussi automatiquement.
        </Typography>
      </Stack>

      {notice && (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          {notice}
        </Alert>
      )}

      {/* La file « à rattacher » : ces messages n'apparaissent chez AUCUN
          établissement. Sans cet encadré, un email de prospect dort sans que
          personne ne le sache. Réservé à l'administrateur. */}
      {isAdmin && unassigned.length > 0 && (
        <Box
          sx={{
            ...cardSx,
            bgcolor: T.warnBg,
            borderColor: T.goldSoft,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.ink, mb: 0.5 }}>
            {unassigned.length} message(s) sans établissement
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: T.ink2, mb: 2, lineHeight: 1.6 }}>
            Rien n'a permis de dire à qui ils appartiennent — ni l'adresse de
            réponse, ni un fil existant. Ils n'apparaissent chez aucun
            gestionnaire tant qu'ils ne sont pas rattachés.
          </Typography>

          <Stack spacing={1.25}>
            {unassigned.map((u) => (
              <Box
                key={u.id}
                sx={{
                  bgcolor: T.card,
                  border: `1px solid ${T.line}`,
                  borderRadius: "8px",
                  p: 1.5,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1.5}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Box sx={{ minWidth: 0, flex: "1 1 280px" }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>
                      {u.contactName ?? u.contactAddress}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: T.mut }}>
                      {u.contactAddress} · {when(u.lastInboundAt)}
                    </Typography>
                    {u.subject && (
                      <Typography sx={{ fontSize: 12.5, color: T.ink2, mt: 0.5 }}>
                        {u.subject}
                      </Typography>
                    )}
                    {u.matchReason && (
                      <Typography sx={{ fontSize: 11.5, color: T.warn, mt: 0.5 }}>
                        {u.matchReason}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={assigning === u.id}
                    onClick={() => void assign(u.id)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      bgcolor: T.gold,
                      "&:hover": { bgcolor: T.goldPure },
                    }}
                  >
                    {assigning === u.id ? "…" : "Rattacher"}
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {error}
        </Alert>
      )}

      {threads.length === 0 && !error && (
        <Box sx={{ ...cardSx, textAlign: "center", py: 6 }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>Aucun message</Typography>
          <Typography sx={{ fontSize: 14, color: T.ink2, maxWidth: 480, mx: "auto" }}>
            Les réponses de vos prospects apparaîtront ici. Elles sont rattachées
            automatiquement grâce à l'adresse de réponse de chaque relance.
          </Typography>
        </Box>
      )}

      {threads.map((t) => (
        <Box
          key={t.id}
          onClick={() => void open(t.id)}
          sx={{
            ...cardSx,
            cursor: "pointer",
            "&:hover": { borderColor: T.gold },
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
          >
            <Box sx={{ minWidth: 0, flex: "1 1 300px" }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>
                  {t.contactName ?? t.contactAddress}
                </Typography>
                {t.unreadCount > 0 && (
                  <Chip
                    size="small"
                    label={t.unreadCount}
                    sx={{
                      bgcolor: T.gold,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 11,
                      height: 20,
                    }}
                  />
                )}
              </Stack>
              {t.subject && (
                <Typography sx={{ fontSize: 13, color: T.ink2, fontWeight: 600 }}>
                  {t.subject}
                </Typography>
              )}
              <Typography
                sx={{
                  fontSize: 12.5,
                  color: T.mut,
                  mt: 0.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.lastPreview ?? ""}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: T.mut, whiteSpace: "nowrap" }}>
              {when(t.lastMessageAt)}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
