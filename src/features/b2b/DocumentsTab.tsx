// ════════════════════════════════════════════════════════════════════════════
// Sales B2B · DOCUMENTS — les modèles de devis et de contrat du PM
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ Sojori ne fournit le contrat de personne. Cet écran est un ÉDITEUR : le
// PM écrit ses propres articles, place ses variables, désigne ses signataires.
// Un modèle de départ est proposé, à modifier ou à jeter.
//
// ⚠️ LE POINT LE PLUS SENSIBLE : chaque bloc peut être masqué au client final.
// La commission du partenaire en fait partie. L'aperçu montre les DEUX
// versions côte à côte — sans cela, on enverrait au client un document qui
// affiche la marge de son agence, et ça ne se rattrape pas.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  Divider,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { T, cardSx, kickerSx } from "../marketing/tokens";
import { resolveOwnerId } from "../onboarding/resolveOwnerId";
import {
  deleteTemplate,
  fetchTemplates,
  fetchVariableCatalog,
  previewTemplate,
  saveTemplate,
  type BlockType,
  type DocumentTemplate,
  type TemplateBlock,
  type TemplatePreview,
  type VariableFamily,
} from "./api";

const BLOCK_LABEL: Record<BlockType, { label: string; hint: string }> = {
  text: { label: "Texte", hint: "Un article, un préambule — avec vos variables" },
  line_items: { label: "Prestations", hint: "Désignation, quantité, PU HT, TVA" },
  totals: { label: "Synthèse", hint: "Total HT, remise, TVA, TTC" },
  installments: { label: "Échéancier", hint: "Chaque échéance et son montant" },
  commission: { label: "Commission", hint: "À masquer au client final" },
  signatures: { label: "Signatures", hint: "Le cartouche des deux côtés" },
};

/** Un modèle de départ, inspiré des usages du métier — à modifier ou à jeter. */
const STARTER_BLOCKS: TemplateBlock[] = [
  {
    type: "text",
    title: "OBJET",
    body:
      "Le présent devis {{devis.numero}}, établi le {{devis.date}}, concerne " +
      "{{affaire.intitule}} pour {{client.societe}}.\n\n" +
      "Arrivée le {{affaire.arrivee}}, {{affaire.nuits}} nuit(s), " +
      "{{affaire.participants}} participant(s).",
    visibleForClient: true,
  },
  { type: "line_items", title: "DÉTAIL DES PRESTATIONS", body: null, visibleForClient: true },
  { type: "totals", title: "SYNTHÈSE FINANCIÈRE", body: null, visibleForClient: true },
  { type: "installments", title: "ÉCHÉANCIER DE PAIEMENT", body: null, visibleForClient: true },
  {
    type: "commission",
    title: "CONDITIONS PARTENAIRE",
    body: null,
    // Masqué d'office : c'est le seul bloc dont l'oubli coûte cher.
    visibleForClient: false,
  },
  {
    type: "text",
    title: "VALIDITÉ",
    body:
      "La présente proposition est valable jusqu'au {{devis.validite}}. " +
      "Passé ce délai, les tarifs et disponibilités pourront faire l'objet " +
      "d'une nouvelle proposition.",
    visibleForClient: true,
  },
  { type: "signatures", title: "BON POUR ACCORD", body: null, visibleForClient: true },
];

export default function DocumentsTab() {
  const { user } = useAuth();
  const ownerId = resolveOwnerId(user) ?? "";

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [catalog, setCatalog] = useState<VariableFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editing, setEditing] = useState<Partial<DocumentTemplate> | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      setError("Aucun établissement identifié.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [t, c] = await Promise.all([
        fetchTemplates(ownerId),
        fetchVariableCatalog(ownerId),
      ]);
      setTemplates(t);
      setCatalog(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!editing?.name?.trim() || !editing.kind) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const r = await saveTemplate(ownerId, {
        id: editing.id,
        name: editing.name.trim(),
        kind: editing.kind,
        blocks: editing.blocks ?? [],
        signatories: editing.signatories ?? [],
        isDefault: editing.isDefault ?? false,
      });
      // Les fautes de frappe ne bloquent pas — c'est au PM de décider — mais
      // il doit les voir : une variable mal orthographiée s'imprime en clair
      // sur le document du client.
      setNotice(
        r.unknownVariables.length > 0
          ? `Modèle enregistré. ⚠️ Variables inconnues, laissées telles quelles : ${r.unknownVariables.join(", ")}`
          : "Modèle enregistré.",
      );
      setEditing(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, name: string) => {
    setError(null);
    try {
      await deleteTemplate(ownerId, id);
      setNotice(`Modèle « ${name} » supprimé.`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Suppression impossible.");
    }
  };

  const openPreview = async (id: string) => {
    setError(null);
    try {
      setPreview(await previewTemplate(ownerId, id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Aperçu impossible.");
    }
  };

  const updateBlock = (index: number, patch: Partial<TemplateBlock>) => {
    setEditing((prev) => {
      if (!prev?.blocks) return prev;
      const blocks = [...prev.blocks];
      blocks[index] = { ...blocks[index], ...patch };
      return { ...prev, blocks };
    });
  };

  const moveBlock = (index: number, delta: number) => {
    setEditing((prev) => {
      if (!prev?.blocks) return prev;
      const to = index + delta;
      if (to < 0 || to >= prev.blocks.length) return prev;
      const blocks = [...prev.blocks];
      [blocks[index], blocks[to]] = [blocks[to], blocks[index]];
      return { ...prev, blocks };
    });
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }} spacing={1.5}>
        <CircularProgress size={24} sx={{ color: T.gold }} />
        <Typography sx={{ fontSize: 13, color: T.mut }}>
          Chargement des modèles…
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          variant="contained"
          size="small"
          onClick={() =>
            setEditing({
              name: "",
              kind: "quote",
              blocks: STARTER_BLOCKS,
              signatories: [
                { side: "Le client", name: null, role: null },
                { side: "L'établissement", name: null, role: null },
              ],
              isDefault: templates.filter((t) => t.kind === "quote").length === 0,
            })
          }
          sx={{
            textTransform: "none",
            fontWeight: 700,
            bgcolor: T.gold,
            "&:hover": { bgcolor: T.goldPure },
          }}
        >
          Nouveau modèle
        </Button>
        <Typography sx={{ fontSize: 12.5, color: T.mut }}>
          {templates.length} modèle(s)
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ fontSize: 12.5 }}>
        Ces modèles sont les <strong>vôtres</strong>. Sojori ne fournit aucun
        contrat type : le modèle de départ proposé n'est qu'une base, à modifier
        ou à remplacer entièrement. Écrivez <code>{"{{client.societe}}"}</code> et
        le système remplira.
      </Alert>

      {notice && (
        <Alert severity={notice.includes("⚠️") ? "warning" : "success"} sx={{ fontSize: 13 }}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {error}
        </Alert>
      )}

      {templates.length === 0 && !error && (
        <Box sx={{ ...cardSx, textAlign: "center", py: 6 }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>Aucun modèle</Typography>
          <Typography
            sx={{ fontSize: 14, color: T.ink2, maxWidth: 520, mx: "auto", lineHeight: 1.7 }}
          >
            Créez votre premier modèle de devis. Un exemple vous est proposé —
            objet, prestations, échéancier, conditions partenaire, signature —
            que vous pouvez réécrire de bout en bout.
          </Typography>
        </Box>
      )}

      <Stack spacing={1.5}>
        {templates.map((t) => (
          <Box key={t.id} sx={cardSx}>
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
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.ink }}>
                    {t.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={t.kind === "quote" ? "Devis" : "Contrat"}
                    sx={{ height: 20, fontSize: 11, bgcolor: T.line2, color: T.ink2 }}
                  />
                  {t.isDefault && (
                    <Chip
                      size="small"
                      label="Par défaut"
                      sx={{
                        height: 20,
                        fontSize: 11,
                        bgcolor: T.goldBg,
                        color: T.ink,
                        fontWeight: 650,
                      }}
                    />
                  )}
                </Stack>
                <Typography sx={{ fontSize: 12.5, color: T.mut }}>
                  {t.blocks.length} bloc(s)
                  {t.blocks.some((b) => !b.visibleForClient) && (
                    <Box component="span" sx={{ color: T.warn }}>
                      {" · "}
                      {t.blocks.filter((b) => !b.visibleForClient).length} masqué(s) au
                      client
                    </Box>
                  )}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void openPreview(t.id)}
                  sx={{ textTransform: "none", borderColor: T.line, color: T.ink }}
                >
                  Aperçu
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setEditing(t)}
                  sx={{ textTransform: "none", borderColor: T.line, color: T.ink }}
                >
                  Modifier
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => void remove(t.id, t.name)}
                  sx={{ textTransform: "none", color: T.mut }}
                >
                  Supprimer
                </Button>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* ───────────────────────── L'éditeur ───────────────────────── */}
      <Drawer
        anchor="right"
        open={!!editing}
        onClose={() => !saving && setEditing(null)}
      >
        <Box sx={{ width: { xs: "100vw", sm: 720 }, p: 2.5 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.ink }}>
            {editing?.id ? "Modifier le modèle" : "Nouveau modèle"}
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.ink2, mb: 2.5 }}>
            Composez vos blocs, placez vos variables. Le contenu vous appartient.
          </Typography>

          <Stack direction="row" spacing={1.5} mb={2.5}>
            <TextField
              label="Nom du modèle"
              required
              fullWidth
              size="small"
              value={editing?.name ?? ""}
              onChange={(e) =>
                setEditing((p) => (p ? { ...p, name: e.target.value } : p))
              }
            />
            <Select
              size="small"
              value={editing?.kind ?? "quote"}
              onChange={(e) =>
                setEditing((p) => (p ? { ...p, kind: e.target.value as never } : p))
              }
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="quote">Devis</MenuItem>
              <MenuItem value="contract">Contrat</MenuItem>
            </Select>
          </Stack>

          {/* Les variables, cliquables : le PM ne devrait pas avoir à les retenir. */}
          <Box sx={{ ...cardSx, p: 1.5, mb: 2.5, bgcolor: T.bg }}>
            <Typography sx={{ ...kickerSx, mb: 1 }}>
              Variables — cliquer pour copier
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {catalog.flatMap((f) =>
                f.variables.map((v) => (
                  <Chip
                    key={v.key}
                    size="small"
                    label={v.key}
                    title={`${v.label} — ex. ${v.sample}`}
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(`{{${v.key}}}`)
                        .catch(() => undefined);
                    }}
                    sx={{
                      height: 22,
                      fontSize: 11,
                      fontFamily: T.mono,
                      bgcolor: T.card,
                      border: `1px solid ${T.line}`,
                      cursor: "pointer",
                      "&:hover": { borderColor: T.gold },
                    }}
                  />
                )),
              )}
            </Stack>
          </Box>

          <Stack spacing={1.5}>
            {(editing?.blocks ?? []).map((b, i) => (
              <Box
                key={`${b.type}-${i}`}
                sx={{
                  ...cardSx,
                  p: 1.75,
                  borderColor: b.visibleForClient ? T.line : T.goldSoft,
                  bgcolor: b.visibleForClient ? T.card : T.warnBg,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={BLOCK_LABEL[b.type].label}
                      sx={{ height: 20, fontSize: 11, bgcolor: T.line2, color: T.ink2 }}
                    />
                    <Typography sx={{ fontSize: 11.5, color: T.mut }}>
                      {BLOCK_LABEL[b.type].hint}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Button
                      size="small"
                      disabled={i === 0}
                      onClick={() => moveBlock(i, -1)}
                      sx={{ minWidth: 30, color: T.mut }}
                    >
                      ↑
                    </Button>
                    <Button
                      size="small"
                      disabled={i === (editing?.blocks?.length ?? 0) - 1}
                      onClick={() => moveBlock(i, 1)}
                      sx={{ minWidth: 30, color: T.mut }}
                    >
                      ↓
                    </Button>
                  </Stack>
                </Stack>

                <TextField
                  size="small"
                  fullWidth
                  placeholder="Titre du bloc"
                  value={b.title ?? ""}
                  onChange={(e) => updateBlock(i, { title: e.target.value })}
                  sx={{ mb: 1 }}
                />
                {b.type === "text" && (
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="Votre texte, avec {{vos.variables}}"
                    value={b.body ?? ""}
                    onChange={(e) => updateBlock(i, { body: e.target.value })}
                    sx={{ mb: 1 }}
                  />
                )}

                <Stack direction="row" spacing={1} alignItems="center">
                  <Switch
                    size="small"
                    checked={b.visibleForClient}
                    onChange={(e) =>
                      updateBlock(i, { visibleForClient: e.target.checked })
                    }
                  />
                  <Typography sx={{ fontSize: 12.5, color: T.ink2 }}>
                    Visible par le client final
                  </Typography>
                  {!b.visibleForClient && (
                    <Typography sx={{ fontSize: 11.5, color: T.warn, fontWeight: 650 }}>
                      · retiré de sa version
                    </Typography>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button
              onClick={() => setEditing(null)}
              disabled={saving}
              sx={{ textTransform: "none", color: T.mut }}
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              disabled={!editing?.name?.trim() || saving}
              onClick={() => void save()}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: T.gold,
                "&:hover": { bgcolor: T.goldPure },
              }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* ───────────── L'aperçu : les deux versions côte à côte ───────────── */}
      <Drawer anchor="right" open={!!preview} onClose={() => setPreview(null)}>
        <Box sx={{ width: { xs: "100vw", sm: 820 }, p: 2.5 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.ink }}>
            {preview?.name}
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.ink2, mb: 2 }}>
            Rendu avec des valeurs d'exemple.
          </Typography>

          {preview && preview.hiddenForClient > 0 && (
            <Alert severity="warning" sx={{ fontSize: 12.5, mb: 2 }}>
              <strong>
                {preview.hiddenForClient} bloc(s) ne figurent pas dans la version du
                client final.
              </strong>{" "}
              Vérifiez la colonne de droite : c'est exactement ce qu'il recevra.
            </Alert>
          )}

          <Box
            sx={{
              display: { xs: "block", sm: "grid" },
              gridTemplateColumns: { sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            {(
              [
                ["Version partenaire", preview?.partner ?? [], T.goldBg],
                ["Version client final", preview?.client ?? [], T.okBg],
              ] as const
            ).map(([label, blocks, bg]) => (
              <Box key={label}>
                <Typography
                  sx={{ ...kickerSx, mb: 1, px: 1, py: 0.5, bgcolor: bg, borderRadius: "6px" }}
                >
                  {label}
                </Typography>
                <Stack spacing={1}>
                  {blocks.map((bl, i) => (
                    <Box
                      key={`${label}-${i}`}
                      sx={{ ...cardSx, p: 1.5, bgcolor: T.card }}
                    >
                      {bl.title && (
                        <Typography
                          sx={{ fontSize: 12, fontWeight: 700, color: T.ink, mb: 0.5 }}
                        >
                          {bl.title}
                        </Typography>
                      )}
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: T.ink2,
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.6,
                        }}
                      >
                        {bl.body ?? (
                          <Box component="span" sx={{ color: T.mut, fontStyle: "italic" }}>
                            tableau calculé à la génération
                          </Box>
                        )}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 2.5 }} />
          <Stack direction="row" justifyContent="flex-end">
            <Button
              onClick={() => setPreview(null)}
              sx={{ textTransform: "none", color: T.mut }}
            >
              Fermer
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Stack>
  );
}
