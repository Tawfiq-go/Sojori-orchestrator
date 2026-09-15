// ════════════════════════════════════════════════════════════════════════════
// B2B · CONFIGURATION — la politique commerciale de l'établissement
// ────────────────────────────────────────────────────────────────────────────
// Les règles elles-mêmes vivent dans `policy.ts`. Cet écran ne fait que les
// rendre modifiables et montrer leurs conséquences AVANT l'enregistrement :
// chaque choix est suivi de ce qu'il coûte, parce qu'un client qui coche
// « bloquer dès le devis » ne pense pas spontanément aux nuits invendues.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import { T, cardSx, kickerSx } from "../marketing/tokens";
import {
  type B2bPolicy,
  DEFAULT_POLICY,
  QUOTE_VALIDITY_PRESETS,
  describePolicy,
  validatePolicy,
} from "./policy";

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
  const [policy, setPolicy] = useState<B2bPolicy>(DEFAULT_POLICY);
  const [saved, setSaved] = useState(false);

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

  return (
    <Stack spacing={2.5}>
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
          <TextField
            size="small"
            type="number"
            label="Sur-mesure (h)"
            value={isCustomValidity ? policy.quoteValidityHours : ""}
            onChange={(e) =>
              set("quoteValidityHours", Number(e.target.value) || 1)
            }
            sx={{ width: 150 }}
          />
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
            <Typography sx={{ fontSize: 13, color: T.ink2, mb: 1 }}>
              Pourcentage demandé :{" "}
              <strong style={{ color: T.ink, fontSize: 15 }}>
                {policy.depositPercent} %
              </strong>
            </Typography>
            <Slider
              value={policy.depositPercent}
              onChange={(_, v) => set("depositPercent", v as number)}
              min={5}
              max={95}
              step={5}
              marks={[
                { value: 20, label: "20 %" },
                { value: 50, label: "50 %" },
                { value: 80, label: "80 %" },
              ]}
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

      {/* ── 5. Défaut de paiement ── */}
      {policy.depositMode !== "full" && (
        <Section
          step={5}
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
        <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
          <strong>Non connecté au serveur.</strong> Le module B2B back-end
          n'existe pas encore : ces réglages ne sont pas encore enregistrés ni
          appliqués. Cet écran sert à valider la forme de la politique avant de
          la coder — rien de ce qui est saisi ici n'agit sur les calendriers.
        </Alert>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="contained"
            disabled={errors.length > 0}
            onClick={() => setSaved(true)}
            sx={{
              bgcolor: T.gold,
              textTransform: "none",
              fontWeight: 700,
              "&:hover": { bgcolor: T.goldPure },
            }}
          >
            Enregistrer la politique
          </Button>
          <Button
            variant="text"
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
          {saved && errors.length === 0 && (
            <Typography sx={{ fontSize: 12.5, color: T.ok, fontWeight: 600 }}>
              Politique retenue (localement).
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
