// ════════════════════════════════════════════════════════════════════════════
// Sales B2B · PIPELINE — les affaires, de la piste au séjour vendu
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ Trois colonnes ne se déplacent PAS à la main : « Devis envoyé »,
// « Acompte reçu » et « Gagné » reflètent l'état réel du devis et de
// l'encaissement. Les rendre déplaçables ferait de ce tableau un registre
// d'intentions — il cesserait de décrire l'entreprise pour décrire l'optimisme
// du commercial. L'écran les grise et le dit, plutôt que de laisser l'erreur
// venir du serveur.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { T, cardSx, kickerSx } from "../marketing/tokens";
import { resolveOwnerId } from "../onboarding/resolveOwnerId";
import {
  createOpportunity,
  createProspect,
  fetchOpportunities,
  fetchProspects,
  moveOpportunity,
  type Opportunity,
  type OpportunityStage,
  type Prospect,
} from "./api";

/** Les colonnes, dans l'ordre du cycle commercial. */
const STAGES: {
  key: OpportunityStage;
  label: string;
  manual: boolean;
  hint?: string;
}[] = [
  { key: "to_contact", label: "À contacter", manual: true },
  { key: "contacted", label: "Contacté", manual: true },
  { key: "discussing", label: "En discussion", manual: true },
  {
    key: "quote_sent",
    label: "Devis envoyé",
    manual: false,
    hint: "Posé par l'envoi du devis",
  },
  {
    key: "deposit_paid",
    label: "Acompte reçu",
    manual: false,
    hint: "Posé par l'encaissement",
  },
  { key: "won", label: "Gagné", manual: false, hint: "Séjour soldé" },
  { key: "lost", label: "Perdu", manual: true },
];

function mad(n: number | null): string {
  if (n === null) return "—";
  return `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} MAD`;
}

export default function PipelineTab() {
  const { user } = useAuth();
  const ownerId = resolveOwnerId(user) ?? "";

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newProspect, setNewProspect] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    segment: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      setError("Aucun établissement identifié.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [p, o] = await Promise.all([
        fetchProspects(ownerId),
        fetchOpportunities(ownerId),
      ]);
      setProspects(p);
      setOpportunities(o);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const byStage = useMemo(() => {
    const map = new Map<OpportunityStage, Opportunity[]>();
    for (const s of STAGES) map.set(s.key, []);
    for (const o of opportunities) map.get(o.stage)?.push(o);
    return map;
  }, [opportunities]);

  const saveProspect = async () => {
    if (!form.companyName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { id } = await createProspect(ownerId, {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        segment: form.segment.trim() || null,
        notes: form.notes.trim() || null,
      });
      // Une piste sans affaire n'apparaîtrait nulle part dans le pipeline :
      // on crée l'opportunité dans la foulée, au premier stade.
      await createOpportunity(ownerId, {
        label: form.companyName.trim(),
        prospectId: id,
      });
      setNewProspect(false);
      setForm({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        city: "",
        segment: "",
        notes: "",
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  };

  const move = async (o: Opportunity, stage: OpportunityStage) => {
    setBusyId(o.id);
    setError(null);
    try {
      const reason =
        stage === "lost"
          ? (window.prompt("Pourquoi cette affaire est-elle perdue ?") ?? "")
          : undefined;
      await moveOpportunity(ownerId, o.id, stage, reason || undefined);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Déplacement impossible.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }} spacing={1.5}>
        <CircularProgress size={24} sx={{ color: T.gold }} />
        <Typography sx={{ fontSize: 13, color: T.mut }}>
          Chargement du pipeline…
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Button
          variant="contained"
          size="small"
          onClick={() => setNewProspect(true)}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            bgcolor: T.gold,
            "&:hover": { bgcolor: T.goldPure },
          }}
        >
          Ajouter un prospect
        </Button>
        <Typography sx={{ fontSize: 12.5, color: T.mut }}>
          {prospects.length} prospect(s) · {opportunities.length} affaire(s)
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {error}
        </Alert>
      )}

      {opportunities.length === 0 && !error && (
        <Box sx={{ ...cardSx, textAlign: "center", py: 6 }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>Pipeline vide</Typography>
          <Typography
            sx={{ fontSize: 14, color: T.ink2, maxWidth: 520, mx: "auto", lineHeight: 1.7 }}
          >
            Ajoutez un premier prospect : une entreprise, une agence ou un
            comité d'entreprise à démarcher. Son affaire apparaîtra dans « À
            contacter ».
          </Typography>
        </Box>
      )}

      {opportunities.length > 0 && (
        <Box sx={{ overflowX: "auto", pb: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ minWidth: 1100 }}>
            {STAGES.map((s) => {
              const cards = byStage.get(s.key) ?? [];
              return (
                <Box
                  key={s.key}
                  sx={{
                    flex: "1 1 0",
                    minWidth: 190,
                    bgcolor: s.manual ? T.bg : T.line2,
                    border: `1px solid ${T.line}`,
                    borderRadius: "10px",
                    p: 1.25,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="baseline"
                    mb={1}
                  >
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 700, color: T.ink }}
                    >
                      {s.label}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: T.mut }}>
                      {cards.length}
                    </Typography>
                  </Stack>
                  {s.hint && (
                    <Typography
                      sx={{ fontSize: 10.5, color: T.mut, mb: 1, lineHeight: 1.4 }}
                    >
                      {s.hint} — non déplaçable
                    </Typography>
                  )}

                  <Stack spacing={1}>
                    {cards.map((o) => (
                      <Box
                        key={o.id}
                        sx={{
                          bgcolor: T.card,
                          border: `1px solid ${T.line}`,
                          borderRadius: "8px",
                          p: 1.25,
                          opacity: busyId === o.id ? 0.5 : 1,
                        }}
                      >
                        <Typography
                          sx={{ fontSize: 13, fontWeight: 700, color: T.ink }}
                        >
                          {o.companyName ?? o.label}
                        </Typography>
                        {o.contactName && (
                          <Typography sx={{ fontSize: 11.5, color: T.mut }}>
                            {o.contactName}
                          </Typography>
                        )}
                        {o.estimatedValueMad !== null && (
                          <Chip
                            size="small"
                            label={mad(o.estimatedValueMad)}
                            sx={{
                              mt: 0.75,
                              height: 20,
                              fontSize: 11,
                              bgcolor: T.goldBg,
                              color: T.ink,
                              fontWeight: 650,
                            }}
                          />
                        )}
                        {o.lostReason && (
                          <Typography
                            sx={{ fontSize: 11, color: T.crit, mt: 0.75, lineHeight: 1.4 }}
                          >
                            {o.lostReason}
                          </Typography>
                        )}

                        {/* Le déplacement n'est proposé que si l'étape ACTUELLE
                            est manuelle : une affaire passée en « Devis envoyé »
                            ne revient pas en arrière d'un clic. */}
                        {o.stageIsManual && (
                          <Select
                            size="small"
                            value=""
                            displayEmpty
                            disabled={busyId === o.id}
                            onChange={(e) =>
                              void move(o, e.target.value as OpportunityStage)
                            }
                            sx={{
                              mt: 1,
                              width: "100%",
                              fontSize: 11.5,
                              bgcolor: T.bg,
                              "& .MuiSelect-select": { py: 0.5 },
                            }}
                          >
                            <MenuItem value="" disabled>
                              Déplacer vers…
                            </MenuItem>
                            {STAGES.filter(
                              (x) => x.manual && x.key !== o.stage,
                            ).map((x) => (
                              <MenuItem key={x.key} value={x.key} sx={{ fontSize: 12.5 }}>
                                {x.label}
                              </MenuItem>
                            ))}
                          </Select>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* ─────────────────────── Saisie d'un prospect ─────────────────────── */}
      <Dialog
        open={newProspect}
        onClose={() => !saving && setNewProspect(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: 17, fontWeight: 700 }}>
          Nouveau prospect
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Entreprise"
              required
              fullWidth
              size="small"
              value={form.companyName}
              onChange={(e) =>
                setForm((f) => ({ ...f, companyName: e.target.value }))
              }
            />
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Contact"
                fullWidth
                size="small"
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
              />
              <TextField
                label="Ville"
                fullWidth
                size="small"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Email"
                fullWidth
                size="small"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <TextField
                label="Téléphone"
                fullWidth
                size="small"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Stack>
            <TextField
              label="Segment"
              placeholder="Agence réceptive, comité d'entreprise, corporate…"
              fullWidth
              size="small"
              value={form.segment}
              onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
            />
            <TextField
              label="Notes"
              multiline
              minRows={3}
              fullWidth
              size="small"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <Typography sx={{ fontSize: 12, color: T.mut, lineHeight: 1.6 }}>
              L'affaire sera créée dans « À contacter ». L'email n'est pas
              obligatoire, mais sans lui aucune relance ne pourra partir.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setNewProspect(false)}
            disabled={saving}
            sx={{ textTransform: "none", color: T.mut }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={!form.companyName.trim() || saving}
            onClick={() => void saveProspect()}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              bgcolor: T.gold,
              "&:hover": { bgcolor: T.goldPure },
            }}
          >
            {saving ? "Création…" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
