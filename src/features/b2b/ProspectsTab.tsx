// ════════════════════════════════════════════════════════════════════════════
// Sales B2B · PROSPECTS — la liste, pensée pour des milliers
// ────────────────────────────────────────────────────────────────────────────
// Le pipeline montre des cartes : lisible à vingt affaires, illisible à deux
// mille. Cette liste est faite pour le volume — colonnes triables du regard,
// recherche, filtre par statut, et pagination qui DIT ce qu'elle ne montre pas.
//
// ⚠️ Le total est affiché en permanence. Une liste qui plafonne en silence
// ment par omission : le millième prospect existe, il faut que l'écran le
// reconnaisse même quand il ne l'affiche pas.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { T, cardSx, kickerSx } from "../marketing/tokens";
import { resolveOwnerId } from "../onboarding/resolveOwnerId";
import { fetchProspects, type Prospect } from "./api";

const STATUS_LABEL: Record<string, { label: string; fg: string; bg: string }> = {
  new: { label: "Nouveau", fg: T.ink2, bg: T.line2 },
  contacted: { label: "Contacté", fg: T.warn, bg: T.warnBg },
  replied: { label: "A répondu", fg: T.ok, bg: T.okBg },
  discarded: { label: "Écarté", fg: T.mut, bg: T.line2 },
};

const PAGE_SIZE = 50;

function Th({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <Box
      component="th"
      sx={{
        textAlign: "left",
        px: 1.5,
        py: 1,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: T.mut,
        borderBottom: `1.5px solid ${T.line}`,
        whiteSpace: "nowrap",
        width,
      }}
    >
      {children}
    </Box>
  );
}

function Td({
  children,
  color,
  bold,
}: {
  children: React.ReactNode;
  color?: string;
  bold?: boolean;
}) {
  return (
    <Box
      component="td"
      sx={{
        px: 1.5,
        py: 1.25,
        fontSize: 13,
        color: color ?? T.ink,
        fontWeight: bold ? 650 : 400,
        borderBottom: `1px solid ${T.line2}`,
        verticalAlign: "top",
      }}
    >
      {children}
    </Box>
  );
}

export default function ProspectsTab() {
  const { user } = useAuth();
  const ownerId = resolveOwnerId(user) ?? "";

  const [rows, setRows] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      setError("Aucun établissement identifié.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProspects(ownerId, {
        q: q.trim() || undefined,
        status,
        page,
        limit: PAGE_SIZE,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [ownerId, q, status, page]);

  useEffect(() => {
    // La recherche attend la fin de la frappe : une requête par caractère
    // saturerait le serveur et ferait clignoter la liste.
    const t = setTimeout(() => void load(), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <Stack spacing={2}>
      {/* ─────────────────── Filtres, en haut ─────────────────── */}
      <Box sx={{ ...cardSx, p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Rechercher une entreprise, un contact, une ville…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            sx={{ flex: "1 1 320px", bgcolor: T.card }}
          />
          <Select
            size="small"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 180, bgcolor: T.card }}
          >
            <MenuItem value="open">Actifs (hors écartés)</MenuItem>
            <MenuItem value="new">Nouveaux</MenuItem>
            <MenuItem value="contacted">Contactés</MenuItem>
            <MenuItem value="replied">Ont répondu</MenuItem>
            <MenuItem value="discarded">Écartés</MenuItem>
            <MenuItem value="all">Tous</MenuItem>
          </Select>
          <Typography sx={{ fontSize: 12.5, color: T.mut }}>
            {loading ? "…" : `${total} prospect(s)`}
          </Typography>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {error}
        </Alert>
      )}

      {loading && rows.length === 0 && (
        <Stack alignItems="center" sx={{ py: 6 }} spacing={1.5}>
          <CircularProgress size={22} sx={{ color: T.gold }} />
          <Typography sx={{ fontSize: 13, color: T.mut }}>Chargement…</Typography>
        </Stack>
      )}

      {!loading && rows.length === 0 && !error && (
        <Box sx={{ ...cardSx, textAlign: "center", py: 6 }}>
          <Typography sx={{ ...kickerSx, mb: 1 }}>
            {q || status !== "open" ? "Aucun résultat" : "Aucun prospect"}
          </Typography>
          <Typography sx={{ fontSize: 14, color: T.ink2 }}>
            {q || status !== "open"
              ? "Aucun prospect ne correspond à ces critères."
              : "Les entreprises à démarcher apparaîtront ici."}
          </Typography>
        </Box>
      )}

      {/* ─────────────────── Le tableau ─────────────────── */}
      {rows.length > 0 && (
        <Box sx={{ ...cardSx, p: 0, overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <Box
              component="table"
              sx={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}
            >
              <Box component="thead">
                <Box component="tr">
                  <Th width="26%">Entreprise</Th>
                  <Th width="18%">Contact</Th>
                  <Th width="20%">Coordonnées</Th>
                  <Th width="14%">Ville</Th>
                  <Th width="12%">Segment</Th>
                  <Th width="10%">Statut</Th>
                </Box>
              </Box>
              <Box component="tbody">
                {rows.map((p) => {
                  const s = STATUS_LABEL[p.status] ?? STATUS_LABEL.new;
                  return (
                    <Box
                      component="tr"
                      key={p.id}
                      sx={{ "&:hover": { bgcolor: T.bg } }}
                    >
                      <Td bold>
                        {p.companyName}
                        {p.companyId && (
                          <Typography
                            component="span"
                            sx={{ fontSize: 11, color: T.ok, ml: 0.75 }}
                            title="Promu en fiche entreprise après sa première réponse"
                          >
                            · client
                          </Typography>
                        )}
                      </Td>
                      <Td color={p.contactName ? T.ink : T.mut}>
                        {p.contactName ?? "—"}
                      </Td>
                      <Td color={T.ink2}>
                        {p.email ?? (
                          <Box component="span" sx={{ color: T.crit, fontSize: 12 }}>
                            sans email
                          </Box>
                        )}
                        {p.phone && (
                          <Typography sx={{ fontSize: 12, color: T.mut }}>
                            {p.phone}
                          </Typography>
                        )}
                      </Td>
                      <Td color={T.ink2}>{p.city ?? "—"}</Td>
                      <Td color={T.mut}>{p.segment ?? "—"}</Td>
                      <Td>
                        <Chip
                          size="small"
                          label={s.label}
                          sx={{
                            height: 20,
                            fontSize: 11,
                            fontWeight: 650,
                            bgcolor: s.bg,
                            color: s.fg,
                          }}
                        />
                      </Td>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* ⚠️ Toujours visible : dire ce qui est montré ET ce qui ne l'est pas. */}
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.5, borderTop: `1px solid ${T.line}`, bgcolor: T.bg }}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography sx={{ fontSize: 12.5, color: T.mut }}>
              {from}–{to} sur {total}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                disabled={page <= 1 || loading}
                onClick={() => setPage((n) => n - 1)}
                sx={{ textTransform: "none", color: T.ink }}
              >
                Précédent
              </Button>
              <Typography sx={{ fontSize: 12.5, color: T.mut }}>
                page {page} / {lastPage}
              </Typography>
              <Button
                size="small"
                disabled={page >= lastPage || loading}
                onClick={() => setPage((n) => n + 1)}
                sx={{ textTransform: "none", color: T.ink }}
              >
                Suivant
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
