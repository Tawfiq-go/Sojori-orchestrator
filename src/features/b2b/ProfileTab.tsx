// ════════════════════════════════════════════════════════════════════════════
// Sales B2B · ENTREPRISE — l'identité qui s'imprime sur les documents
// ────────────────────────────────────────────────────────────────────────────
// Ce que le PM saisit ici apparaît en tête de ses devis et dans les parties
// d'un contrat. Les champs vides ne disparaissent pas du document : la
// variable y reste visible, pour qu'un ICE manquant saute aux yeux plutôt que
// de laisser un blanc entre deux virgules.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { T, cardSx, kickerSx } from "../marketing/tokens";
import { resolveOwnerId } from "../onboarding/resolveOwnerId";
import SignaturePad from "./SignaturePad";
import {
  fetchCompanyProfile,
  fetchSignatureImage,
  saveCompanyProfile,
  type CompanyProfile,
  type SignaturePayload,
} from "./api";

type Draft = Partial<CompanyProfile> & { tradeName: string };

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
        <Typography sx={{ ...kickerSx, color: T.gold }}>Étape {step}</Typography>
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

export default function ProfileTab() {
  const { user } = useAuth();
  const ownerId = resolveOwnerId(user) ?? "";

  const [draft, setDraft] = useState<Draft>({ tradeName: "" });
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  /** `undefined` = inchangée, `null` = à effacer, un objet = nouvelle. */
  const [newSignature, setNewSignature] = useState<SignaturePayload | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const load = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      setError("Aucun établissement identifié.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = await fetchCompanyProfile(ownerId);
      setDraft({ ...p, tradeName: p.tradeName ?? "" });
      setIsConfigured(p.isConfigured);
      if (p.hasSignature) setExistingSignature(await fetchSignatureImage(ownerId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: keyof CompanyProfile, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  const onSignatureChange = (dataUrl: string | null) => {
    setSaved(false);
    if (dataUrl === null) {
      setNewSignature(null);
      setExistingSignature(null);
      return;
    }
    setNewSignature({ base64: dataUrl, contentType: "image/png" });
  };

  const save = async () => {
    if (!draft.tradeName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const r = await saveCompanyProfile(ownerId, draft, newSignature);
      setIsConfigured(true);
      setSaved(true);
      // On oublie la signature envoyée : le prochain enregistrement ne doit
      // pas la renvoyer inutilement, ni l'effacer par omission.
      setNewSignature(undefined);
      if (r.hasSignature && !existingSignature) {
        setExistingSignature(await fetchSignatureImage(ownerId));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const F = (key: keyof CompanyProfile, label: string, placeholder?: string) => (
    <TextField
      size="small"
      fullWidth
      label={label}
      placeholder={placeholder}
      value={(draft[key] as string) ?? ""}
      onChange={(e) => set(key, e.target.value)}
    />
  );

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }} spacing={1.5}>
        <CircularProgress size={24} sx={{ color: T.gold }} />
        <Typography sx={{ fontSize: 13, color: T.mut }}>
          Chargement du profil…
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      {!isConfigured && !error && (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          Ces informations s'impriment sur vos devis et contrats. Tant qu'un
          champ reste vide, sa variable apparaît en clair dans le document —
          c'est voulu : un ICE manquant doit se voir.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {error}
        </Alert>
      )}

      <Section
        step={1}
        title="Identité de l'entreprise"
        why="La raison sociale et la forme juridique figurent dans l'en-tête d'un contrat : « NOMMOS BEACH SARL, SARL au capital de… »."
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "1 1 260px" }}>
              {F("tradeName", "Nom commercial *", "Nommos Beach Resort")}
            </Box>
            <Box sx={{ flex: "1 1 260px" }}>
              {F("legalName", "Raison sociale", "NOMMOS BEACH SARL")}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "1 1 200px" }}>{F("legalForm", "Forme juridique", "SARL")}</Box>
            <Box sx={{ flex: "1 1 200px" }}>
              {F("shareCapital", "Capital social", "1 000 000 MAD")}
            </Box>
          </Stack>
        </Stack>
      </Section>

      <Section
        step={2}
        title="Coordonnées"
        why="Elles composent le cartouche en tête de chaque document."
      >
        <Stack spacing={2}>
          {F("address", "Adresse", "Route de Fès, Km 6")}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "1 1 180px" }}>{F("city", "Ville", "Marrakech")}</Box>
            <Box sx={{ flex: "1 1 140px" }}>{F("postalCode", "Code postal")}</Box>
            <Box sx={{ flex: "1 1 160px" }}>{F("country", "Pays", "Maroc")}</Box>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "1 1 200px" }}>{F("phone", "Téléphone")}</Box>
            <Box sx={{ flex: "1 1 200px" }}>{F("email", "Email")}</Box>
            <Box sx={{ flex: "1 1 200px" }}>{F("website", "Site web")}</Box>
          </Stack>
        </Stack>
      </Section>

      <Section
        step={3}
        title="Identifiants légaux"
        why="Un contrat commercial marocain les cite tous. ⚠️ L'ICE et le numéro de TVA sont deux identifiants différents : ne pas les confondre."
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "1 1 240px" }}>
              {F("ice", "ICE", "001745829000047")}
            </Box>
            <Box sx={{ flex: "1 1 180px" }}>
              {F("rc", "Registre du commerce", "128455")}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "1 1 180px" }}>{F("patente", "Patente")}</Box>
            <Box sx={{ flex: "1 1 180px" }}>{F("if", "Identifiant fiscal")}</Box>
            <Box sx={{ flex: "1 1 180px" }}>{F("cnss", "CNSS")}</Box>
          </Stack>
        </Stack>
      </Section>

      <Section
        step={4}
        title="Signataire"
        why="La personne qui engage l'établissement. Son nom s'imprime sous la signature : « M. Karim TAZI, Directeur général »."
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "0 1 110px" }}>
              {F("signatoryTitle", "Civilité", "M.")}
            </Box>
            <Box sx={{ flex: "1 1 200px" }}>{F("signatoryFirstName", "Prénom")}</Box>
            <Box sx={{ flex: "1 1 200px" }}>{F("signatoryLastName", "Nom")}</Box>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "1 1 220px" }}>
              {F("signatoryRole", "Fonction", "Directeur général")}
            </Box>
            <Box sx={{ flex: "1 1 260px" }}>
              {F("signatoryAuthority", "Pouvoir de signature", "agissant en qualité de gérant")}
            </Box>
          </Stack>

          <Box>
            <Typography sx={{ ...kickerSx, mb: 1 }}>Signature</Typography>
            <SignaturePad
              existingDataUrl={existingSignature}
              onChange={onSignatureChange}
            />
          </Box>
        </Stack>
      </Section>

      <Section
        step={5}
        title="Coordonnées bancaires"
        why="Un devis qui demande un virement sans dire où l'envoyer oblige le client à rappeler."
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "1 1 220px" }}>{F("bankName", "Banque")}</Box>
            <Box sx={{ flex: "1 1 260px" }}>{F("bankRib", "RIB")}</Box>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: "1 1 300px" }}>{F("bankIban", "IBAN")}</Box>
            <Box sx={{ flex: "1 1 160px" }}>{F("bankSwift", "SWIFT / BIC")}</Box>
          </Stack>
          {F("footerNote", "Mention de bas de page")}
        </Stack>
      </Section>

      <Box sx={{ ...cardSx, bgcolor: T.bg }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            disabled={!draft.tradeName.trim() || saving}
            onClick={() => void save()}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              bgcolor: T.gold,
              "&:hover": { bgcolor: T.goldPure },
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {saved && (
            <Typography sx={{ fontSize: 12.5, color: T.ok, fontWeight: 600 }}>
              Profil enregistré.
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
