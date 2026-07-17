/**
 * Direct booking — Preview : le site du client page par page (iframe du vrai
 * moteur sojori.com avec thème + forme appliqués), mobile et desktop.
 * Charge la config sauvée (pmProfile.directBooking) ; les sélecteurs de
 * thème/forme testent en live SANS sauver — le bouton Config enregistre.
 * Admin : le filtre propriétaire en haut choisit le PM (comme Équipe).
 */
import { useEffect, useState } from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { getAccounById } from '../features/staff/services/serverApi.task';
import { useAuth } from '../hooks/useAuth';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import TeamOwnerScopeBar from '../features/taskHub/staff-design/TeamOwnerScopeBar';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { hasAdminAccess } from '../utils/rbac.utils';

const THEMES = [
  { id: 'sojori', label: 'Sojori' },
  { id: 'medina', label: 'Médina' },
  { id: 'riviera', label: 'Riviera' },
  { id: 'desert', label: 'Désert' },
];

const SHAPES = [
  { id: 'auto', label: 'Auto' },
  { id: 'arche', label: 'Arche' },
  { id: 'carre', label: 'Carré' },
  { id: 'arrondi', label: 'Arrondi' },
  { id: 'galbe', label: 'Galbé' },
];

const PAGES = [
  { id: 'home', label: 'Accueil', path: (_slug: string) => '/' },
  { id: 'search', label: 'Recherche', path: (_slug: string) => '/search' },
  { id: 'vitrine', label: 'Vitrine', path: (slug: string) => (slug ? `/pm/${slug}` : '/') },
];

function DirectBookingPreviewInner() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const userIds = user as { _id?: string; id?: string } | null | undefined;
  const userId = String(userIds?._id || userIds?.id || '');
  const isOwner = String(user?.role || '').toLowerCase() === 'owner';
  const isAdmin = hasAdminAccess(user?.role);
  const { requestOwnerId } = useAdminOwnerFilter();
  const targetOwnerId = isOwner ? userId : isAdmin ? String(requestOwnerId || '') : '';

  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [siteName, setSiteName] = useState('');
  const [savedTheme, setSavedTheme] = useState('sojori');
  const [theme, setTheme] = useState('sojori');
  const [shape, setShape] = useState('auto');
  const [page, setPage] = useState('home');
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (!targetOwnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    void (async () => {
      try {
        const res = await getAccounById(targetOwnerId);
        const account = res.data?.account as
          | {
              pmProfile?: {
                slug?: string;
                publicName?: string;
                directBooking?: { theme?: string; shape?: string; siteName?: string };
              };
            }
          | undefined;
        if (!active) return;
        const profile = account?.pmProfile ?? {};
        const db = profile.directBooking ?? {};
        setSlug(profile.slug || '');
        setSiteName(db.siteName || profile.publicName || '');
        setSavedTheme(db.theme || 'sojori');
        setTheme(db.theme || 'sojori');
        setShape(db.shape || 'auto');
      } catch {
        // silencieux — la preview reste utilisable en thème défaut
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [targetOwnerId]);

  if (!authLoading && !isAuthenticated) return <Navigate to="/login" replace />;

  const currentPage = PAGES.find((p) => p.id === page) ?? PAGES[0];
  const src = `https://sojori.com${currentPage.path(slug)}?theme=${theme}&shape=${shape}&fresh=1${slug ? `&pm=${encodeURIComponent(slug)}` : ''}`;
  const unsaved = theme !== savedTheme;

  return (
    <DashboardWrapper breadcrumb={['Direct booking', 'Preview']}>
      <TeamOwnerScopeBar />
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, md: 2 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 1, mb: 1.5 }}
        >
          <Box>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 20, fontWeight: 800 }}>👁️ Preview du site</Typography>
              {siteName && <Chip size="small" label={siteName} />}
              {unsaved && <Chip size="small" color="warning" label="essai non sauvé" />}
            </Stack>
            <Typography sx={{ fontSize: 12.5, color: '#7a756c' }}>
              Le vrai moteur avec le thème et la forme appliqués — les sélecteurs testent sans
              rien enregistrer.
            </Typography>
          </Box>
          <Button component={RouterLink} to="/direct-booking/config" variant="outlined" size="small">
            ⚙️ Ouvrir la config
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 4 }}>
            <CircularProgress size={20} />
            <Typography sx={{ fontSize: 13, color: '#7a756c' }}>Chargement…</Typography>
          </Box>
        ) : !targetOwnerId ? (
          <Alert severity="info">
            {isAdmin
              ? 'Sélectionnez un propriétaire (PM) dans le filtre en haut pour prévisualiser son site.'
              : 'Cette page est réservée aux comptes propriétaire (PM) et aux admins.'}
          </Alert>
        ) : (
          <>
            <Stack
              direction="row"
              sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 1.25 }}
            >
              <Stack direction="row" sx={{ gap: 0.5 }}>
                {PAGES.map((p) => (
                  <Button
                    key={p.id}
                    size="small"
                    variant={page === p.id ? 'contained' : 'outlined'}
                    onClick={() => setPage(p.id)}
                    sx={{ fontSize: 11.5, px: 1.25, minWidth: 0 }}
                  >
                    {p.label}
                  </Button>
                ))}
              </Stack>
              <Stack direction="row" sx={{ gap: 0.5 }}>
                {THEMES.map((t) => (
                  <Chip
                    key={t.id}
                    size="small"
                    label={t.label}
                    onClick={() => setTheme(t.id)}
                    color={theme === t.id ? 'primary' : 'default'}
                    variant={theme === t.id ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
              <Stack direction="row" sx={{ gap: 0.5 }}>
                {SHAPES.map((sh) => (
                  <Chip
                    key={sh.id}
                    size="small"
                    label={sh.label}
                    onClick={() => setShape(sh.id)}
                    color={shape === sh.id ? 'primary' : 'default'}
                    variant={shape === sh.id ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
              <Button
                size="small"
                variant={mobile ? 'contained' : 'outlined'}
                onClick={() => setMobile((m) => !m)}
                sx={{ fontSize: 11.5, px: 1.25, minWidth: 0, ml: 'auto' }}
              >
                📱 Mobile
              </Button>
            </Stack>

            <Box
              sx={{
                border: '1px solid rgba(26,22,17,0.12)',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#f6f5f1',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Box
                component="iframe"
                key={src + String(mobile)}
                src={src}
                title="Preview du site"
                sx={{
                  width: mobile ? 390 : '100%',
                  maxWidth: '100%',
                  height: 'calc(100vh - 260px)',
                  minHeight: 480,
                  border: 'none',
                  bgcolor: '#fff',
                }}
              />
            </Box>
          </>
        )}
      </Box>
    </DashboardWrapper>
  );
}

/** Provider requis pour le filtre propriétaire (admins cross-tenant). */
export default function DirectBookingPreviewPage() {
  return (
    <AdminOwnerScopeLayout showTopBar={false}>
      <DirectBookingPreviewInner />
    </AdminOwnerScopeLayout>
  );
}
