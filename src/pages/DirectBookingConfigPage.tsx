/**
 * Direct booking — le PM dépose la config de son site marque blanche
 * (domaine, nom du site, contact). Stocké dans pmProfile.directBooking
 * (srv-user), consommé par le moteur multi-tenant sojori-vente.
 * Le branding (logo, couleurs, slug) vient du profil PM existant.
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { getAccounById, updateOwner } from '../features/staff/services/serverApi.task';
import { useAuth } from '../hooks/useAuth';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import TeamOwnerScopeBar from '../features/taskHub/staff-design/TeamOwnerScopeBar';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { hasAdminAccess } from '../utils/rbac.utils';

type DirectBookingConfig = {
  enabled: boolean;
  domain: string;
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  theme: string;
  shape: string;
  social: {
    instagram: string;
    facebook: string;
    linkedin: string;
    tiktok: string;
    youtube: string;
    website: string;
  };
};

const EMPTY_SOCIAL = {
  instagram: '',
  facebook: '',
  linkedin: '',
  tiktok: '',
  youtube: '',
  website: '',
};

const SHAPE_CHOICES: Array<{ id: string; label: string; hint: string }> = [
  { id: 'auto', label: 'Auto', hint: 'La forme du thème choisi' },
  { id: 'arche', label: 'Arche', hint: 'Porte marocaine' },
  { id: 'carre', label: 'Carré', hint: 'Angles francs' },
  { id: 'arrondi', label: 'Arrondi', hint: 'Coins doux' },
  { id: 'galbe', label: 'Galbé', hint: 'Très arrondi' },
];

const SOCIAL_FIELDS: Array<{ key: keyof typeof EMPTY_SOCIAL; label: string; placeholder: string }> = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/votrecompte' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/votrepage' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/…' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@votrecompte' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@votrechaine' },
  { key: 'website', label: 'Site actuel', placeholder: 'https://votre-site-actuel.com' },
];


/** Presets visuels — miroir de lib/themes/presets.ts (sojori-vente). */
const THEME_CHOICES: Array<{
  id: string;
  label: string;
  description: string;
  swatches: string[];
  preview: string;
}> = [
  {
    id: 'sojori',
    label: 'Sojori',
    description: 'Or et papier — le style sojori.com',
    swatches: ['#c89b3c', '#faf7f0', '#0f1011'],
    preview: 'https://sojori.com/?theme=sojori',
  },
  {
    id: 'medina',
    label: 'Médina',
    description: 'Terracotta, safran et chaux — esprit riad',
    swatches: ['#9a3412', '#d97706', '#faf3ec'],
    preview: 'https://sojori.com/?theme=medina',
  },
  {
    id: 'riviera',
    label: 'Riviera',
    description: 'Bleu profond et or discret — élégance européenne',
    swatches: ['#1e3a5f', '#b3a125', '#fbfbf8'],
    preview: 'https://sojori.com/?theme=riviera',
  },
  {
    id: 'desert',
    label: 'Désert',
    description: 'Sable, ocre et basalte — minimal contemporain',
    swatches: ['#8c6f4e', '#c2a878', '#f6f1e7'],
    preview: 'https://sojori.com/?theme=desert',
  },
];

type PmProfileLite = {
  publicName?: string;
  slug?: string;
  vitrineLogoUrl?: string;
  brandColor?: { from?: string; to?: string };
  published?: boolean;
  directBooking?: Partial<DirectBookingConfig>;
};

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'warning' | 'success' }> = {
  brouillon: { label: 'Brouillon', color: 'default' },
  dns_en_attente: { label: 'DNS en attente', color: 'warning' },
  en_ligne: { label: 'En ligne', color: 'success' },
};

const DOMAIN_RE = /^(?!https?:\/\/)[a-z0-9.-]+\.[a-z]{2,}$/i;

function DirectBookingConfigInner() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const userIds = user as { _id?: string; id?: string } | null | undefined;
  const userId = String(userIds?._id || userIds?.id || '');
  const isOwner = String(user?.role || '').toLowerCase() === 'owner';
  const isAdmin = hasAdminAccess(user?.role);
  const { requestOwnerId } = useAdminOwnerFilter();
  /** Owner : son compte · Admin : le PM choisi dans le filtre en haut. */
  const targetOwnerId = isOwner ? userId : isAdmin ? String(requestOwnerId || '') : '';

  const [pmProfile, setPmProfile] = useState<PmProfileLite | null>(null);
  const [config, setConfig] = useState<DirectBookingConfig>({
    enabled: false,
    domain: '',
    siteName: '',
    contactEmail: '',
    contactPhone: '',
    status: 'brouillon',
    theme: 'sojori',
    shape: 'auto',
    social: { ...EMPTY_SOCIAL },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!targetOwnerId) {
      setLoading(false);
      setPmProfile(null);
      return;
    }
    setLoading(true);
    let active = true;
    void (async () => {
      try {
        const res = await getAccounById(targetOwnerId);
        const account = res.data?.account as { pmProfile?: PmProfileLite; email?: string } | undefined;
        if (!active) return;
        const profile = account?.pmProfile ?? {};
        setPmProfile(profile);
        const db = profile.directBooking ?? {};
        setConfig({
          enabled: db.enabled === true,
          domain: db.domain || '',
          siteName: db.siteName || profile.publicName || '',
          contactEmail: db.contactEmail || account?.email || '',
          contactPhone: db.contactPhone || '',
          status: db.status || 'brouillon',
          theme: db.theme || 'sojori',
          shape: db.shape || 'auto',
          social: { ...EMPTY_SOCIAL, ...(db.social ?? {}) },
        });
      } catch {
        if (active) toast.error('Chargement du profil impossible');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [targetOwnerId]);

  const domainInvalid = config.domain.trim() !== '' && !DOMAIN_RE.test(config.domain.trim());
  const statusMeta = STATUS_LABELS[config.status] ?? STATUS_LABELS.brouillon;
  const brandFrom = pmProfile?.brandColor?.from || '#c89b3c';
  const brandTo = pmProfile?.brandColor?.to || brandFrom;

  const canSave = useMemo(
    () => !saving && !domainInvalid && (!config.enabled || config.domain.trim() !== ''),
    [saving, domainInvalid, config.enabled, config.domain],
  );

  const handleSave = async () => {
    if (!canSave || !targetOwnerId) return;
    setSaving(true);
    try {
      await updateOwner(
        targetOwnerId,
        {
          pmProfile: {
            directBooking: {
              enabled: config.enabled,
              domain: config.domain.trim().toLowerCase(),
              siteName: config.siteName.trim(),
              contactEmail: config.contactEmail.trim(),
              contactPhone: config.contactPhone.trim(),
              theme: config.theme,
              shape: config.shape,
              social: config.social,
            },
          },
        },
        undefined,
      );
      toast.success('Configuration Direct booking enregistrée — notre équipe prend le relais.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <DashboardWrapper breadcrumb={['Équipe', 'Direct booking']}>
      <TeamOwnerScopeBar />
      <Box sx={{ maxWidth: 780, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#1a1611' }}>
            🌐 Votre site Direct booking
          </Typography>
          <Chip size="small" label={statusMeta.label} color={statusMeta.color} />
        </Stack>
        <Typography sx={{ fontSize: 13.5, color: '#7a756c', mb: 2.5, lineHeight: 1.55 }}>
          Votre propre site de réservation, sur votre nom de domaine, avec vos annonces
          uniquement — moteur de réservation, calendrier, paiement et assistant WhatsApp
          propulsés par Sojori. Déposez votre configuration : notre équipe met le site en
          ligne et vous guide pour le DNS.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 4 }}>
            <CircularProgress size={20} />
            <Typography sx={{ fontSize: 13, color: '#7a756c' }}>Chargement…</Typography>
          </Box>
        ) : !targetOwnerId ? (
          <Alert severity="info">
            {isAdmin
              ? 'Sélectionnez un propriétaire (PM) dans le filtre en haut de page pour configurer et prévisualiser son site.'
              : "Cette page est réservée aux comptes propriétaire (PM) et aux admins."}
          </Alert>
        ) : (
          <Stack sx={{ gap: 2 }}>
            <Box sx={{ border: '1px solid rgba(26,22,17,0.1)', borderRadius: 2.5, p: 2.25, bgcolor: '#fff' }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
                  Je veux mon site de réservation en direct
                </Typography>
                <Switch
                  checked={config.enabled}
                  onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
                />
              </Stack>
              <Stack sx={{ gap: 2, mt: 1.5 }}>
                <TextField
                  label="Votre nom de domaine"
                  placeholder="riad.ma"
                  value={config.domain}
                  onChange={(e) => setConfig((c) => ({ ...c, domain: e.target.value }))}
                  error={domainInvalid}
                  helperText={
                    domainInvalid
                      ? 'Domaine invalide — sans https:// (ex. riad.ma ou www.riad.ma)'
                      : 'Le domaine que vous possédez déjà (sans https://)'
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Nom du site"
                  placeholder="Riad Atlas — Séjours à Marrakech"
                  value={config.siteName}
                  onChange={(e) => setConfig((c) => ({ ...c, siteName: e.target.value }))}
                  size="small"
                  fullWidth
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
                  <TextField
                    label="Email de contact affiché"
                    value={config.contactEmail}
                    onChange={(e) => setConfig((c) => ({ ...c, contactEmail: e.target.value }))}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Téléphone / WhatsApp affiché"
                    value={config.contactPhone}
                    onChange={(e) => setConfig((c) => ({ ...c, contactPhone: e.target.value }))}
                    size="small"
                    fullWidth
                  />
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ border: '1px solid rgba(26,22,17,0.1)', borderRadius: 2.5, p: 2.25, bgcolor: '#fff' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1 }}>Votre identité visuelle</Typography>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${brandFrom}, ${brandTo})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {pmProfile?.vitrineLogoUrl ? (
                    <Box
                      component="img"
                      src={pmProfile.vitrineLogoUrl}
                      alt="logo"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>
                      {(pmProfile?.publicName || 'PM').slice(0, 2).toUpperCase()}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                    {pmProfile?.publicName || 'Nom public non renseigné'}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#7a756c' }}>
                    Logo, couleurs et description proviennent de votre profil PM.
                  </Typography>
                </Box>
                <Button component={RouterLink} to="/admin/equipe/mon-profil" size="small" variant="outlined">
                  Modifier
                </Button>
              </Stack>
            </Box>


            <Box sx={{ border: '1px solid rgba(26,22,17,0.1)', borderRadius: 2.5, p: 2.25, bgcolor: '#fff' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>Style de votre site</Typography>
              <Typography sx={{ fontSize: 12, color: '#7a756c', mb: 1.5 }}>
                Même moteur de réservation, quatre ambiances — cliquez « Aperçu » pour voir le
                style en réel, votre couleur d'accent s'y applique automatiquement.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                {THEME_CHOICES.map((t) => (
                  <Box
                    key={t.id}
                    onClick={() => setConfig((c) => ({ ...c, theme: t.id }))}
                    sx={{
                      border:
                        config.theme === t.id
                          ? '2px solid #b8851a'
                          : '1px solid rgba(26,22,17,0.12)',
                      borderRadius: 2,
                      p: 1.5,
                      cursor: 'pointer',
                      bgcolor: config.theme === t.id ? 'rgba(184,133,26,0.06)' : '#fff',
                    }}
                  >
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{t.label}</Typography>
                      <Stack direction="row" sx={{ gap: 0.5 }}>
                        {t.swatches.map((color) => (
                          <Box
                            key={color}
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '4px',
                              bgcolor: color,
                              border: '0.5px solid rgba(26,22,17,0.15)',
                            }}
                          />
                        ))}
                      </Stack>
                    </Stack>
                    <Typography sx={{ fontSize: 11.5, color: '#7a756c', mb: 0.75 }}>{t.description}</Typography>
                    <Button
                      size="small"
                      variant="text"
                      sx={{ fontSize: 11.5, p: 0, minWidth: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const pm = pmProfile?.slug ? `&pm=${encodeURIComponent(pmProfile.slug)}` : '';
                        window.open(`${t.preview}${pm}`, '_blank', 'noopener');
                      }}
                    >
                      Aperçu ↗
                    </Button>
                  </Box>
                ))}
              </Box>
            </Box>


            <Box sx={{ border: '1px solid rgba(26,22,17,0.1)', borderRadius: 2.5, p: 2.25, bgcolor: '#fff' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>Forme des visuels</Typography>
              <Typography sx={{ fontSize: 12, color: '#7a756c', mb: 1.25 }}>
                L'empreinte des photos et cartes — « Arche » donne la porte marocaine.
              </Typography>
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                {SHAPE_CHOICES.map((sh) => (
                  <Box
                    key={sh.id}
                    onClick={() => setConfig((c) => ({ ...c, shape: sh.id }))}
                    sx={{
                      border: config.shape === sh.id ? '2px solid #b8851a' : '1px solid rgba(26,22,17,0.12)',
                      borderRadius: 2,
                      px: 1.5,
                      py: 1,
                      cursor: 'pointer',
                      textAlign: 'center',
                      minWidth: 86,
                      bgcolor: config.shape === sh.id ? 'rgba(184,133,26,0.06)' : '#fff',
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 30,
                        mx: 'auto',
                        mb: 0.5,
                        bgcolor: '#c89b3c',
                        borderRadius:
                          sh.id === 'arche'
                            ? '50% 50% 4px 4px'
                            : sh.id === 'carre'
                              ? '0px'
                              : sh.id === 'galbe'
                                ? '12px'
                                : sh.id === 'arrondi'
                                  ? '7px'
                                  : '4px',
                        opacity: sh.id === 'auto' ? 0.45 : 1,
                      }}
                    />
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{sh.label}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: '#9a948a' }}>{sh.hint}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box sx={{ border: '1px solid rgba(26,22,17,0.1)', borderRadius: 2.5, p: 2.25, bgcolor: '#fff' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>Réseaux sociaux</Typography>
              <Typography sx={{ fontSize: 12, color: '#7a756c', mb: 1.5 }}>
                Affichés dans le pied de page de votre site.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                {SOCIAL_FIELDS.map((f) => (
                  <TextField
                    key={f.key}
                    label={f.label}
                    placeholder={f.placeholder}
                    value={config.social[f.key]}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, social: { ...c.social, [f.key]: e.target.value } }))
                    }
                    size="small"
                    fullWidth
                  />
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                border: '1px solid rgba(26,22,17,0.1)',
                borderRadius: 2.5,
                p: 2.25,
                bgcolor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Aperçu du site</Typography>
                <Typography sx={{ fontSize: 12, color: '#7a756c' }}>
                  Votre thème et votre forme appliqués au vrai site — page par page, mobile et
                  desktop.
                </Typography>
              </Box>
              <Button component={RouterLink} to="/direct-booking/preview" variant="contained" size="small">
                👁️ Ouvrir la preview
              </Button>
            </Box>
            {config.domain.trim() && !domainInvalid && (
              <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
                  Étape DNS (après validation par notre équipe)
                </Typography>
                <Typography component="div" sx={{ fontSize: 12.5, lineHeight: 1.6 }}>
                  Chez votre registrar ({config.domain.trim()}), vous ajouterez :
                  <br />• <code>CNAME&nbsp;&nbsp;www → cname.vercel-dns.com</code>
                  <br />• <code>A&nbsp;&nbsp;@ → 76.76.21.21</code>
                  <br />
                  Le certificat HTTPS est provisionné automatiquement. Nous vous guidons pas à
                  pas au moment de la mise en ligne — rien à faire avant notre confirmation.
                </Typography>
              </Alert>
            )}

            <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
              <Button variant="contained" disabled={!canSave} onClick={() => void handleSave()}>
                {saving ? 'Enregistrement…' : 'Enregistrer ma configuration'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </DashboardWrapper>
  );
}

/** Provider requis pour le filtre propriétaire (admins cross-tenant). */
export default function DirectBookingConfigPage() {
  return (
    <AdminOwnerScopeLayout showTopBar={false}>
      <DirectBookingConfigInner />
    </AdminOwnerScopeLayout>
  );
}
