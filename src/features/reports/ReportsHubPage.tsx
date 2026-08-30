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
    id: 'daily',
    title: 'Résumé quotidien',
    pitch: 'Ce que l’équipe lit chaque matin',
    detail:
      'Mouvement du jour, villas immobilisées et pourquoi, semaine à venir, rythme de prise. Le PMS donne les chiffres ; celui-ci nomme les villas.',
    accent: T.gold,
    route: '/reports/quotidien',
  },
  {
    id: 'operations',
    title: 'Exploitation',
    pitch: 'Occupation, revenu et encaissements',
    detail:
      'Six blocs de gestion sur quatre périodes. Ventile les nuitées retirées de la vente par motif — ce que le PMS range sous un type unique.',
    accent: T.primary,
    route: '/reports/exploitation',
  },
  {
    id: 'clients',
    title: 'Clients',
    pitch: 'D’où viennent les réservations',
    detail:
      'Carte, canal de distribution et concentration. Le podium change selon le critère : le Maroc réserve le plus, la France dépense le plus.',
    accent: T.gold,
    route: '/reports/clients',
  },
  {
    id: 'revenue',
    title: 'Ventes d’extras',
    pitch: 'Ventilation USALI du chiffre d’affaires',
    detail:
      'Restauration, prestations, divers — vue facture ou vue ligne, avec le détail des articles.',
    accent: T.primary,
    route: '/tasks/extras/ventes',
  },
  {
    id: 'arrivals',
    title: 'Arrivées et départs',
    pitch: 'Le mouvement du jour, villa par villa',
    detail:
      'Qui arrive, qui part, quelles villas se libèrent. Complète Exploitation, qui donne les volumes mais pas le détail nominatif de la journée.',
    accent: T.green,
    blocked: 'à construire',
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
