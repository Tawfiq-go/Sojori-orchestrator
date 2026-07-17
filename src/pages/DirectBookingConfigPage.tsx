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

type DirectBookingConfig = {
  enabled: boolean;
  domain: string;
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
};

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

export default function DirectBookingConfigPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const userIds = user as { _id?: string; id?: string } | null | undefined;
  const userId = String(userIds?._id || userIds?.id || '');
  const isOwner = String(user?.role || '').toLowerCase() === 'owner';

  const [pmProfile, setPmProfile] = useState<PmProfileLite | null>(null);
  const [config, setConfig] = useState<DirectBookingConfig>({
    enabled: false,
    domain: '',
    siteName: '',
    contactEmail: '',
    contactPhone: '',
    status: 'brouillon',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || !isOwner) {
      setLoading(false);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const res = await getAccounById(userId);
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
  }, [userId, isOwner]);

  const domainInvalid = config.domain.trim() !== '' && !DOMAIN_RE.test(config.domain.trim());
  const statusMeta = STATUS_LABELS[config.status] ?? STATUS_LABELS.brouillon;
  const brandFrom = pmProfile?.brandColor?.from || '#c89b3c';
  const brandTo = pmProfile?.brandColor?.to || brandFrom;

  const canSave = useMemo(
    () => !saving && !domainInvalid && (!config.enabled || config.domain.trim() !== ''),
    [saving, domainInvalid, config.enabled, config.domain],
  );

  const handleSave = async () => {
    if (!canSave || !userId) return;
    setSaving(true);
    try {
      await updateOwner(
        userId,
        {
          pmProfile: {
            directBooking: {
              enabled: config.enabled,
              domain: config.domain.trim().toLowerCase(),
              siteName: config.siteName.trim(),
              contactEmail: config.contactEmail.trim(),
              contactPhone: config.contactPhone.trim(),
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
        ) : !isOwner ? (
          <Alert severity="info">
            Cette page est réservée aux comptes propriétaire (PM). La configuration d'un
            client se gère depuis sa fiche owner.
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
