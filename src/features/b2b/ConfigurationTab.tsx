// ════════════════════════════════════════════════════════════════════════════
// B2B · CONFIGURATION — la politique commerciale de l'établissement
// ────────────────────────────────────────────────────────────────────────────
// Les règles elles-mêmes vivent dans `policy.ts`. Cet écran ne fait que les
// rendre modifiables et montrer leurs conséquences AVANT l'enregistrement :
// chaque choix est suivi de ce qu'il coûte, parce qu'un client qui coche
// « bloquer dès le devis » ne pense pas spontanément aux nuits invendues.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { resolveOwnerId } from "../onboarding/resolveOwnerId";
import { fetchB2bPolicy, saveB2bPolicy } from "./api";
import { T, cardSx, kickerSx } from "../marketing/tokens";
import {
  type B2bPolicy,
  DEFAULT_POLICY,
  QUOTE_VALIDITY_PRESETS,
  describePolicy,
  validatePolicy,
} from "./policy";

/** « 240 » → « 10 jours ». Une durée en heures ne se lit pas au-delà de 72. */
function formatHours(h: number): string {
  if (!Number.isFinite(h) || h <= 0) return "durée invalide";
  if (h < 48) return `${h} heure${h > 1 ? "s" : ""}`;
  const days = h / 24;
  const rounded = Number.isInteger(days) ? days : Math.round(days * 10) / 10;
  return `${rounded} jour${rounded > 1 ? "s" : ""}`;
}

/** Encadré de section — titre, explication, contenu. */
function Section({
  step,
  title,
  why,
  children,
}: {
  step: number;
  title: string;
  why: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={cardSx}>
      <Stack direction="row" spacing={1.5} alignItems="baseline" mb={0.5}>
        <Typography sx={{ ...kickerSx, color: T.gold }}>
          Étape {step}
        </Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.ink }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 13, color: T.ink2, mb: 2, lineHeight: 1.6 }}>
        {why}
      </Typography>
      {children}
    </Box>
  );
}

/** Conséquence d'un choix, en une ligne discrète sous le contrôle. */
function Consequence({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 12.5,
        color: T.mut,
        mt: 1.5,
        pl: 1.5,
        borderLeft: `2px solid ${T.line}`,
        lineHeight: 1.6,
      }}
    >
      {children}
    </Typography>
  );
}

export default function ConfigurationTab() {
  const { user } = useAuth();
  // Helper partagé : un compte Owner est son propre établissement, un membre
  // du staff pointe vers son employeur. Le déduire à la main ici donnerait un
  // écran vide pour tous les rôles sauf Owner.
  const ownerId = resolveOwnerId(user) ?? "";

  const [policy, setPolicy] = useState<B2bPolicy>(DEFAULT_POLICY);
  const [saved, setSaved] = useState(false);
  const [reminderDraft, setReminderDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** `false` = le PM n'a jamais enregistré, l'écran montre les valeurs par défaut. */
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      setLoadError(
        "Aucun établissement identifié : impossible de charger la politique.",
      );
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchB2bPolicy(ownerId)
      .then((stored) => {
        if (cancelled) return;
        // On ne garde que les champs du contrat : `ownerId`, `isConfigured` et
        // `updatedAt` sont des méta-données, pas des réglages.
        const { ownerId: _o, isConfigured: cfg, updatedAt: _u, ...rest } = stored;
        setPolicy(rest as B2bPolicy);
        setIsConfigured(cfg);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(
          e instanceof Error ? e.message : "Chargement de la politique impossible.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const persist = useCallback(async () => {
    if (!ownerId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const stored = await saveB2bPolicy(ownerId, policy);
      const { ownerId: _o, isConfigured: cfg, updatedAt: _u, ...rest } = stored;
      // On réaffiche ce que le SERVEUR a retenu, pas ce qu'on lui a envoyé :
      // il normalise (jalons dédoublonnés et triés), et masquer cet écart
      // ferait croire à un enregistrement qui n'a pas eu lieu tel quel.
      setPolicy(rest as B2bPolicy);
      setIsConfigured(cfg);
      setSaved(true);
    } catch (e: unknown) {
      setSaveError(
        e instanceof Error ? e.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }, [ownerId, policy]);

  /** Ajoute un jalon de relance, sans doublon, du plus lointain au plus proche. */
  const addReminder = () => {
    const d = Number(reminderDraft);
    if (!Number.isFinite(d) || d < 0 || reminderDraft.trim() === "") return;
    setPolicy((p) =>
      p.reminderDaysBefore.includes(d)
        ? p
        : {
            ...p,
            reminderDaysBefore: [...p.reminderDaysBefore, d].sort(
              (a, b) => b - a,
            ),
          },
    );
    setSaved(false);
    setReminderDraft("");
  };

  const set = <K extends keyof B2bPolicy>(key: K, value: B2bPolicy[K]) => {
    setPolicy((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const warnings = useMemo(() => validatePolicy(policy), [policy]);
  const errors = warnings.filter((w) => w.severity === "error");
  const summary = useMemo(() => describePolicy(policy), [policy]);

  const isCustomValidity = !QUOTE_VALIDITY_PRESETS.some(
    (v) => v.hours === policy.quoteValidityHours,
  );

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }} spacing={1.5}>
        <CircularProgress size={24} sx={{ color: T.gold }} />
        <Typography sx={{ fontSize: 13, color: T.mut }}>
          Chargement de la politique…
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      {loadError && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {loadError}
        </Alert>
      )}
      {!loadError && !isConfigured && (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          Aucune politique enregistrée pour cet établissement : les valeurs
          ci-dessous sont les réglages par défaut. Elles ne s'appliqueront
          qu'une fois enregistrées.
        </Alert>
      )}

      {/* ── Ce que la configuration produit, en une phrase ── */}
      <Box
        sx={{
          ...cardSx,
          bgcolor: T.goldBg,
          borderColor: T.goldSoft,
        }}
      >
        <Typography sx={kickerSx}>Règle appliquée</Typography>
        <Typography
          sx={{ fontSize: 15, fontWeight: 600, color: T.ink, mt: 0.5 }}
        >
          {summary}
        </Typography>
      </Box>

      {/* ── 1. Validité du devis ── */}
      <Section
        step={1}
        title="Durée de validité d'un devis"
        why="Passé ce délai, le devis n'est plus acceptable et le bien redevient vendable. C'est ce qui empêche un prospect indécis d'immobiliser une villa indéfiniment."
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {QUOTE_VALIDITY_PRESETS.map((v) => (
            <ToggleButton
              key={v.hours}
              value={v.hours}
              selected={policy.quoteValidityHours === v.hours}
              onChange={() => set("quoteValidityHours", v.hours)}
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
              {v.label}
            </ToggleButton>
          ))}
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" mt={2}>
          <TextField
            size="small"
            type="number"
            label="Ou saisir en heures"
            value={policy.quoteValidityHours}
            onChange={(e) =>
              set("quoteValidityHours", Number(e.target.value) || 0)
            }
            sx={{ width: 180 }}
          />
          <Typography sx={{ fontSize: 12.5, color: T.mut }}>
            {isCustomValidity
              ? `Durée sur-mesure — ${formatHours(policy.quoteValidityHours)}.`
              : "Aucune limite : saisir la durée voulue, même hors des raccourcis."}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} mt={2}>
          <Switch
            checked={policy.clampValidityToArrival}
            onChange={(e) => set("clampValidityToArrival", e.target.checked)}
            size="small"
          />
          <Typography sx={{ fontSize: 13.5, color: T.ink }}>
            Ne jamais laisser un devis expirer après la date d'arrivée
          </Typography>
        </Stack>
        <Consequence>
          Sans cette garde, un devis de 7 jours émis pour une arrivée dans 3
          jours resterait « valable » alors que le séjour a commencé.
        </Consequence>
      </Section>

      {/* ── 2. Acompte ── */}
      <Section
        step={2}
        title="Ce qu'on exige pour engager l'affaire"
        why="Le montant demandé à la commande. Il détermine aussi ce qui reste dû, et donc l'échéancier de l'étape 4."
      >
        <ToggleButtonGroup
          exclusive
          value={policy.depositMode}
          onChange={(_, v) => v && set("depositMode", v)}
          size="small"
          sx={{ flexWrap: "wrap", gap: 1 }}
        >
          <ToggleButton value="none" sx={tbSx}>
            Aucun acompte
          </ToggleButton>
          <ToggleButton value="deposit" sx={tbSx}>
            Acompte en %
          </ToggleButton>
          <ToggleButton value="full" sx={tbSx}>
            Paiement intégral
          </ToggleButton>
        </ToggleButtonGroup>

        {policy.depositMode === "deposit" && (
          <Box mt={3} px={1}>
            <Stack direction="row" spacing={2} alignItems="center" mb={1.5}>
              <TextField
                size="small"
                type="number"
                label="Acompte (%)"
                value={policy.depositPercent}
                onChange={(e) =>
                  set("depositPercent", Number(e.target.value) || 0)
                }
                sx={{ width: 140 }}
              />
              <Stack direction="row" spacing={0.75}>
                {[10, 20, 30, 50, 70].map((v) => (
                  <Button
                    key={v}
                    size="small"
                    variant={policy.depositPercent === v ? "contained" : "text"}
                    onClick={() => set("depositPercent", v)}
                    sx={{
                      minWidth: 48,
                      textTransform: "none",
                      fontSize: 12.5,
                      ...(policy.depositPercent === v
                        ? { bgcolor: T.gold, "&:hover": { bgcolor: T.goldPure } }
                        : { color: T.mut }),
                    }}
                  >
                    {v} %
                  </Button>
                ))}
              </Stack>
            </Stack>
            <Slider
              value={Math.min(Math.max(policy.depositPercent, 0), 100)}
              onChange={(_, v) => set("depositPercent", v as number)}
              min={0}
              max={100}
              step={1}
              sx={{ color: T.gold }}
            />
          </Box>
        )}

        {policy.depositMode === "none" && (
          <Consequence>
            Le bien sera bloqué sur un accord verbal. Adapté à des partenaires
            de confiance ; risqué avec un prospect rencontré la veille.
          </Consequence>
        )}
        {policy.depositMode === "full" && (
          <Consequence>
            Aucun solde ne courra après la commande — l'étape 4 devient sans
            objet.
          </Consequence>
        )}
      </Section>

      {/* ── 3. Déclencheur du blocage ── */}
      <Section
        step={3}
        title="Quand le bien cesse d'être vendable ailleurs"
        why="C'est l'arbitrage central : protéger le prospect, ou protéger le calendrier. Les deux ont un coût, il n'y a pas de choix gratuit."
      >
        <ToggleButtonGroup
          exclusive
          value={policy.holdTrigger}
          onChange={(_, v) => v && set("holdTrigger", v)}
          size="small"
          sx={{ flexWrap: "wrap", gap: 1 }}
        >
          <ToggleButton value="on_quote" sx={tbSx}>
            Dès l'envoi du devis
          </ToggleButton>
          <ToggleButton value="on_deposit" sx={tbSx}>
            À réception de l'acompte
          </ToggleButton>
        </ToggleButtonGroup>

        <Consequence>
          {policy.holdTrigger === "on_quote" ? (
            <>
              Le prospect est certain d'avoir le bien, mais chaque devis sans
              suite immobilise des nuits. Sur une villa très demandée, c'est du
              chiffre d'affaires perdu sans contrepartie.
            </>
          ) : (
            <>
              Aucune nuit n'est immobilisée sans argent reçu. En contrepartie,
              le bien peut partir entre l'envoi du devis et le virement — il
              faut assumer de le dire au prospect.
            </>
          )}
        </Consequence>

        <Alert
          severity="info"
          sx={{ mt: 2, fontSize: 12.5, bgcolor: T.okBg, color: T.ink }}
        >
          Ce blocage est une <strong>réservation provisoire</strong>, pas un
          blocage de calendrier ordinaire : il ferme la vente sur tous les
          canaux (Booking, Airbnb) et sait exactement quels jours rouvrir à son
          expiration.
        </Alert>
      </Section>

      {/* ── 4. Solde ── */}
      {policy.depositMode !== "full" && (
        <Section
          step={4}
          title="Quand le solde devient exigible"
          why="Réclamé trop tard, un solde n'est plus négociable : le client est déjà sur place. Réclamé trop tôt, il fait fuir."
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Select
              size="small"
              value={policy.balanceDueMode}
              onChange={(e) => set("balanceDueMode", e.target.value as never)}
              sx={{ minWidth: 260, bgcolor: T.card }}
            >
              <MenuItem value="on_arrival">À l'arrivée</MenuItem>
              <MenuItem value="days_after_deposit">
                X jours après l'acompte
              </MenuItem>
              <MenuItem value="days_before_arrival">
                X jours avant l'arrivée
              </MenuItem>
            </Select>

            {policy.balanceDueMode !== "on_arrival" && (
              <TextField
                size="small"
                type="number"
                label="Nombre de jours"
                value={policy.balanceDueDays}
                onChange={(e) =>
                  set("balanceDueDays", Number(e.target.value) || 1)
                }
                sx={{ width: 160 }}
              />
            )}
          </Stack>

          <Consequence>
            {policy.balanceDueMode === "on_arrival"
              ? "Le solde est encaissé sur place. Simple, mais sans recours si le client conteste le jour même."
              : policy.balanceDueMode === "days_after_deposit"
                ? `Échéance calculée depuis l'encaissement de l'acompte. Indépendante de la date du séjour — attention aux réservations prises très en avance.`
                : `Échéance calculée depuis l'arrivée. C'est la forme la plus sûre : elle laisse le temps de revendre si le solde n'arrive pas.`}
          </Consequence>
        </Section>
      )}

      {/* ── 5. Expiration du devis ── */}
      <Section
        step={5}
        title="Ce que deviennent les réservations quand le devis expire"
        why="Un devis non signé laisse derrière lui des réservations non payées. Les effacer donne un calendrier propre ; les annuler garde la mémoire de ce qui n'a pas abouti."
      >
        <ToggleButtonGroup
          exclusive
          value={policy.onQuoteExpired}
          onChange={(_, v) => v && set("onQuoteExpired", v)}
          size="small"
          sx={{ flexWrap: "wrap", gap: 1 }}
        >
          <ToggleButton value="cancel" sx={tbSx}>
            Passer en annulé
          </ToggleButton>
          <ToggleButton value="delete" sx={tbSx}>
            Supprimer
          </ToggleButton>
        </ToggleButtonGroup>

        <Consequence>
          {policy.onQuoteExpired === "cancel" ? (
            <>
              Le bien est libéré et la réservation reste visible en annulé.
              C'est ce qui permet de savoir, dans trois mois, quelle part des
              devis n'aboutit pas — et donc si le déclencheur de blocage de
              l'étape 3 est bien réglé.
            </>
          ) : (
            <>
              Le bien est libéré et la réservation disparaît. Calendrier plus
              lisible, mais aucun moyen de mesurer le taux de transformation :
              un devis perdu ne laisse aucune trace.
            </>
          )}
        </Consequence>
      </Section>

      {/* ── 6. Défaut de paiement ── */}
      {policy.depositMode !== "full" && (
        <Section
          step={6}
          title="Si le solde n'arrive jamais"
          why="La question que personne ne se pose avant qu'elle ne se produise. Elle doit être tranchée à l'avance, pas dans l'urgence la veille d'une arrivée."
        >
          <ToggleButtonGroup
            exclusive
            value={policy.onBalanceMissed}
            onChange={(_, v) => v && set("onBalanceMissed", v)}
            size="small"
            sx={{ flexWrap: "wrap", gap: 1 }}
          >
            <ToggleButton value="release" sx={tbSx}>
              Libérer le bien
            </ToggleButton>
            <ToggleButton value="keep" sx={tbSx}>
              Garder le blocage
            </ToggleButton>
          </ToggleButtonGroup>

          <Stack direction="row" spacing={1.5} alignItems="center" mt={2.5}>
            <TextField
              size="small"
              type="number"
              label="Jours de tolérance"
              value={policy.gracePeriodDays}
              onChange={(e) =>
                set("gracePeriodDays", Number(e.target.value) || 0)
              }
              sx={{ width: 170 }}
            />
            <Typography sx={{ fontSize: 12.5, color: T.mut }}>
              Un virement international met trois jours ouvrés.
            </Typography>
          </Stack>

          <Consequence>
            {policy.onBalanceMissed === "release"
              ? "Le bien repart à la vente automatiquement. Le sort de l'acompte déjà versé reste une décision commerciale, traitée hors de cet écran."
              : "Le bien reste bloqué et l'affaire remonte en alerte pour arbitrage manuel. À réserver aux comptes stratégiques."}
          </Consequence>
        </Section>
      )}

      {/* ── 7. Relances ── */}
      {policy.depositMode !== "full" && (
        <Section
          step={7}
          title="Relances avant échéance"
          why="Combien de jours avant l'échéance du solde on rappelle au client qu'il doit payer. Un PM qui suit dix comptes les appelle lui-même ; celui qui en suit trois cents ne peut pas."
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
            {policy.reminderDaysBefore.length === 0 && (
              <Typography sx={{ fontSize: 13, color: T.mut, py: 0.75 }}>
                Aucune relance automatique.
              </Typography>
            )}
            {policy.reminderDaysBefore.map((d) => (
              <Box
                key={d}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: "999px",
                  bgcolor: T.goldBg,
                  border: `1px solid ${T.goldSoft}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.ink,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                J−{d}
                <Box
                  component="button"
                  type="button"
                  onClick={() =>
                    set(
                      "reminderDaysBefore",
                      policy.reminderDaysBefore.filter((x) => x !== d),
                    )
                  }
                  sx={{
                    border: "none",
                    bgcolor: "transparent",
                    cursor: "pointer",
                    color: T.mut,
                    fontSize: 15,
                    lineHeight: 1,
                    p: 0,
                  }}
                >
                  ×
                </Box>
              </Box>
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              size="small"
              type="number"
              label="Ajouter J−"
              value={reminderDraft}
              onChange={(e) => setReminderDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addReminder();
                }
              }}
              sx={{ width: 130 }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={addReminder}
              sx={{
                textTransform: "none",
                borderColor: T.line,
                color: T.ink,
              }}
            >
              Ajouter
            </Button>
          </Stack>

          <Consequence>
            Liste libre, sans limite de nombre. Les relances partent dans
            l'ordre décroissant — J−7 puis J−2 avec le réglage par défaut.
          </Consequence>
        </Section>
      )}

      {/* ── Incohérences ── */}
      {warnings.length > 0 && (
        <Stack spacing={1}>
          {warnings.map((w) => (
            <Alert
              key={`${w.field}-${w.message}`}
              severity={w.severity === "error" ? "error" : "warning"}
              sx={{ fontSize: 13 }}
            >
              {w.message}
            </Alert>
          ))}
        </Stack>
      )}

      {/* ── Enregistrement ── */}
      <Box sx={{ ...cardSx, bgcolor: T.bg }}>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2, fontSize: 12.5 }}>
            {saveError}
          </Alert>
        )}
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Cette politique s'applique aux <strong>nouvelles affaires</strong>.
          Les devis déjà envoyés gardent les conditions annoncées au client :
          chacun embarque sa propre copie, figée à l'envoi.
        </Alert>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            disabled={errors.length > 0 || saving || !ownerId}
            onClick={() => void persist()}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{
              bgcolor: T.gold,
              textTransform: "none",
              fontWeight: 700,
              "&:hover": { bgcolor: T.goldPure },
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer la politique"}
          </Button>
          <Button
            variant="text"
            disabled={saving}
            onClick={() => {
              setPolicy(DEFAULT_POLICY);
              setSaved(false);
            }}
            sx={{ textTransform: "none", color: T.mut }}
          >
            Revenir aux valeurs par défaut
          </Button>
          {errors.length > 0 && (
            <Typography sx={{ fontSize: 12.5, color: T.crit }}>
              Corriger {errors.length} erreur{errors.length > 1 ? "s" : ""} avant
              d'enregistrer.
            </Typography>
          )}
          {saved && !saving && errors.length === 0 && (
            <Typography sx={{ fontSize: 12.5, color: T.ok, fontWeight: 600 }}>
              Politique enregistrée.
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}

const tbSx = {
  textTransform: "none" as const,
  px: 2.5,
  borderColor: T.line,
  borderRadius: "8px !important",
  border: `1px solid ${T.line} !important`,
  "&.Mui-selected": {
    bgcolor: T.goldBg,
    borderColor: `${T.gold} !important`,
    color: T.ink,
    fontWeight: 700,
  },
};
