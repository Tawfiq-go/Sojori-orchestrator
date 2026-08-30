import { useNavigate } from 'react-router-dom';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';

/**
 * Accueil des rapports — une carte par rapport, lancée d'un clic.
 *
 * Les rapports disponibles sont distingués de ceux à venir : une carte
 * grisée qui ne fait rien est plus honnête qu'une carte qui ouvre une page
 * vide.
 */

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  gold: '#E6B022',
  green: '#93C47D',
  red: '#C81E1E',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.08)',
};

type Report = {
  id: string;
  title: string;
  pitch: string;
  detail: string;
  accent: string;
  route?: string;
  /** Ce qui manque, quand le rapport n'est pas encore lançable. */
  blocked?: string;
};

const REPORTS: Report[] = [
  {
    id: 'clients',
    title: 'Client 360',
    pitch: 'Qui consomme quoi, sur tous ses séjours',
    detail:
      'Classement par consommation, produits favoris, répartition par type. Le PMS ne sait pas le produire : il connaît des séjours, pas des clients.',
    accent: T.gold,
    route: '/reports/clients',
  },
  {
    id: 'revenue',
    title: 'Revenue overview',
    pitch: 'Ventilation USALI du chiffre d’affaires',
    detail:
      'Restauration, prestations, divers — par période et par service. Disponible dès maintenant dans Extra › Ventes.',
    accent: T.primary,
    route: '/tasks/extras/ventes',
  },
  {
    id: 'daily',
    title: 'Journée',
    pitch: 'Arrivées, départs, occupation, revenu du jour',
    detail:
      'Le rapport que l’hôtelier lit chaque matin. Demande de trancher le dénominateur de l’occupation : chambres déclarées ou chambres actives.',
    accent: T.green,
    blocked: 'dénominateur de l’occupation à définir',
  },
  {
    id: 'products',
    title: 'Produits',
    pitch: 'Ce qui se vend, ce qui dort',
    detail:
      'Rotation par article, marge, produits jamais vendus. Utile pour arbitrer le catalogue et la dotation des villas.',
    accent: T.red,
    blocked: 'à construire',
  },
];

export function ReportsHubPage() {
  const navigate = useNavigate();

  return (
    <DashboardWrapper breadcrumb={['Rapports']}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
        Choisissez un rapport. Les données proviennent du PMS et des saisies Sojori, sans
        ressaisie.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        {REPORTS.map((r) => {
          const available = Boolean(r.route);
          return (
            <Paper
              key={r.id}
              onClick={() => r.route && navigate(r.route)}
              sx={{
                p: 2.5,
                border: `1px solid ${T.border}`,
                borderTop: `3px solid ${available ? r.accent : T.border}`,
                borderRadius: 1.75,
                bgcolor: T.bg1,
                cursor: available ? 'pointer' : 'default',
                opacity: available ? 1 : 0.62,
                transition: 'border-color .15s, box-shadow .15s',
                '&:hover': available
                  ? { borderColor: r.accent, boxShadow: '0 2px 12px rgba(20,17,10,0.06)' }
                  : {},
              }}
            >
              <Stack
                direction="row"
                sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}
              >
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: T.text }}>
                  {r.title}
                </Typography>
                {available ? (
                  <Chip
                    size="small"
                    label="Lancer"
                    sx={{
                      height: 20,
                      fontSize: 10.5,
                      fontWeight: 700,
                      bgcolor: `${r.accent}1e`,
                      color: r.accent === T.gold ? T.primaryDeep : r.accent,
                    }}
                  />
                ) : (
                  <Chip
                    size="small"
                    label="Bientôt"
                    sx={{ height: 20, fontSize: 10.5, fontWeight: 600, bgcolor: T.bg2, color: T.text3 }}
                  />
                )}
              </Stack>

              <Typography sx={{ fontSize: 12.5, color: T.text2, fontWeight: 600, mt: 0.5 }}>
                {r.pitch}
              </Typography>
              <Typography sx={{ fontSize: 12, color: T.text3, mt: 1, lineHeight: 1.55 }}>
                {r.detail}
              </Typography>

              {r.blocked ? (
                <Typography sx={{ fontSize: 11, color: T.text3, mt: 1.25, fontStyle: 'italic' }}>
                  En attente : {r.blocked}
                </Typography>
              ) : null}
            </Paper>
          );
        })}
      </Box>
    </DashboardWrapper>
  );
}
