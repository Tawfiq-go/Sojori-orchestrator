// ════════════════════════════════════════════════════════════════════════════
// Sales B2B · MESSAGES — liste à gauche, conversation à droite
// ────────────────────────────────────────────────────────────────────────────
// Même principe que l'Inbox Guest : on ne quitte jamais la liste pour lire un
// fil. Remplacer la liste par la conversation fait perdre le contexte — on ne
// voit plus qui attend une réponse pendant qu'on en rédige une.
//
// ⚠️ Une réponse envoyée d'ici PART VRAIMENT, depuis b2b@sojori.com. C'est le
// seul geste du module dont l'effet sort de Sojori et ne se rattrape pas.
// L'écran le dit sous le bouton et nomme l'adresse expéditrice.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  ToggleButton,
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
  if (days < 7) return `${days} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function InboxTab() {
  const { user } = useAuth();
  const ownerId = resolveOwnerId(user) ?? "";
  const isAdmin = isAdminRole(user);

  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [total, setTotal] = useState(0);
  const [unassigned, setUnassigned] = useState<UnassignedThread[]>([]);
  const [openThread, setOpenThread] = useState<InboxThreadDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
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
      const res = await fetchInboxThreads(ownerId, {
        q: q.trim() || undefined,
        unread: unreadOnly ? "1" : undefined,
        limit: 100,
      });
      setThreads(res.rows);
      setTotal(res.total);
      if (isAdmin) setUnassigned(await fetchUnassignedThreads(ownerId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [ownerId, isAdmin, q, unreadOnly]);

  useEffect(() => {
    // La recherche attend la fin de la frappe.
    const t = setTimeout(() => void load(), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const open = async (id: string) => {
    setError(null);
    setDraft("");
    setSelectedId(id);
    try {
      setOpenThread(await fetchInboxThread(ownerId, id));
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
      // On relit depuis le serveur : il inscrit aussi les envois en échec, et
      // l'écran doit montrer ce qui s'est passé, pas ce qu'on espérait.
      setOpenThread(await fetchInboxThread(ownerId, openThread.id));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setSending(false);
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

  const assign = async (threadId: string) => {
    setAssigning(threadId);
    setError(null);
    try {
      await assignThread(ownerId, threadId, ownerId);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Rattachement impossible.");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Stack spacing={2}>
      {/* ─────────────────── Filtres, en haut ─────────────────── */}
      <Box sx={{ ...cardSx, p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Rechercher un expéditeur, un sujet…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ flex: "1 1 280px", bgcolor: T.card }}
          />
          <ToggleButton
            value="unread"
            selected={unreadOnly}
            onChange={() => setUnreadOnly((v) => !v)}
            size="small"
            sx={{
              textTransform: "none",
              px: 2,
              borderColor: T.line,
              "&.Mui-selected": {
                bgcolor: T.goldBg,
                borderColor: T.gold,
                color: T.ink,
                fontWeight: 700,
              },
            }}
          >
            Non lus
          </ToggleButton>
          <Button
            size="small"
            variant="outlined"
            disabled={collecting}
            onClick={() => void collect()}
            sx={{ textTransform: "none", borderColor: T.line, color: T.ink }}
          >
            {collecting ? "Relève…" : "Relever la boîte"}
          </Button>
          <Typography sx={{ fontSize: 12.5, color: T.mut }}>
            {loading ? "…" : `${total} conversation(s)`}
          </Typography>
        </Stack>
      </Box>

      {notice && (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {error}
        </Alert>
      )}

      {/* La file « à rattacher » : ces messages n'apparaissent chez AUCUN
          établissement. Sans cet encadré, un email de prospect dort sans que
          personne ne le sache. Réservé à l'administrateur. */}
      {isAdmin && unassigned.length > 0 && (
        <Box sx={{ ...cardSx, bgcolor: T.warnBg, borderColor: T.goldSoft }}>
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

      {/* ───────────── Deux colonnes : liste à gauche, fil à droite ───────────── */}
      <Box
        sx={{
          display: { xs: "block", md: "grid" },
          gridTemplateColumns: { md: "minmax(280px, 360px) 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {/* Liste */}
        <Box sx={{ ...cardSx, p: 0, overflow: "hidden" }}>
          {loading && threads.length === 0 && (
            <Stack alignItems="center" sx={{ py: 5 }} spacing={1.5}>
              <CircularProgress size={20} sx={{ color: T.gold }} />
            </Stack>
          )}

          {!loading && threads.length === 0 && (
            <Box sx={{ textAlign: "center", py: 5, px: 2.5 }}>
              <Typography sx={{ ...kickerSx, mb: 1 }}>
                {q || unreadOnly ? "Aucun résultat" : "Aucun message"}
              </Typography>
              <Typography sx={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>
                {q || unreadOnly
                  ? "Aucune conversation ne correspond."
                  : "Les réponses de vos prospects apparaîtront ici."}
              </Typography>
            </Box>
          )}

          <Stack divider={<Box sx={{ borderBottom: `1px solid ${T.line2}` }} />}>
            {threads.map((t) => {
              const active = t.id === selectedId;
              return (
                <Box
                  key={t.id}
                  onClick={() => void open(t.id)}
                  sx={{
                    p: 1.5,
                    cursor: "pointer",
                    bgcolor: active ? T.goldBg : "transparent",
                    borderLeft: `3px solid ${active ? T.gold : "transparent"}`,
                    "&:hover": { bgcolor: active ? T.goldBg : T.bg },
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="baseline"
                    spacing={1}
                  >
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        fontWeight: t.unreadCount > 0 ? 750 : 600,
                        color: T.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.contactName ?? t.contactAddress}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: T.mut, whiteSpace: "nowrap" }}>
                      {when(t.lastMessageAt)}
                    </Typography>
                  </Stack>
                  {t.subject && (
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        color: T.ink2,
                        fontWeight: t.unreadCount > 0 ? 650 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.subject}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} alignItems="center" mt={0.25}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: T.mut,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {t.lastPreview ?? ""}
                    </Typography>
                    {t.unreadCount > 0 && (
                      <Chip
                        size="small"
                        label={t.unreadCount}
                        sx={{
                          height: 18,
                          minWidth: 18,
                          fontSize: 10.5,
                          fontWeight: 700,
                          bgcolor: T.gold,
                          color: "#fff",
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Conversation */}
        <Box sx={{ minWidth: 0 }}>
          {!openThread && (
            <Box sx={{ ...cardSx, textAlign: "center", py: 8 }}>
              <Typography sx={{ ...kickerSx, mb: 1 }}>Conversation</Typography>
              <Typography sx={{ fontSize: 14, color: T.ink2 }}>
                Choisissez une conversation à gauche pour la lire et y répondre.
              </Typography>
            </Box>
          )}

          {openThread && (
            <Stack spacing={2}>
              <Box sx={cardSx}>
                <Typography sx={kickerSx}>{openThread.channel}</Typography>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: T.ink }}>
                  {openThread.contactName ?? openThread.contactAddress}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: T.mut }}>
                  {openThread.contactAddress}
                </Typography>
              </Box>

              <Stack spacing={1.5}>
                {openThread.messages.map((m) => (
                  <Box
                    key={m.id}
                    sx={{
                      ...cardSx,
                      bgcolor: m.direction === "outbound" ? T.goldBg : T.card,
                      borderColor: m.direction === "outbound" ? T.goldSoft : T.line,
                      ml: m.direction === "outbound" ? { xs: 0, sm: 4 } : 0,
                      mr: m.direction === "outbound" ? 0 : { xs: 0, sm: 4 },
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
                      <Typography
                        sx={{ fontSize: 13, fontWeight: 700, color: T.ink, mb: 0.5 }}
                      >
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

              <Box sx={cardSx}>
                <Typography sx={{ ...kickerSx, mb: 1 }}>Répondre</Typography>
                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  placeholder="Votre réponse…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Button
                    variant="contained"
                    disabled={!draft.trim() || sending}
                    onClick={() => void send()}
                    startIcon={
                      sending ? <CircularProgress size={14} color="inherit" /> : undefined
                    }
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
          )}
        </Box>
      </Box>
    </Stack>
  );
}
