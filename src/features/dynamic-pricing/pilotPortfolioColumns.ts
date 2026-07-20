/** Colonnes réglages pilote — alignées §02–§07 fiche bien */

export type PilotColumnDef = {
  id: string;
  label: string;
  hintTitle: string;
  hintBody: string;
};

export const PILOT_PORTFOLIO_COLUMNS: PilotColumnDef[] = [
  {
    id: 'sync',
    label: 'Sync',
    hintTitle: 'Périmètre synchronisé',
    hintBody: 'Ce qui part au calendrier quand Sojori AI est ON : prix, min stay, ou les deux.',
  },
  {
    id: 'base',
    label: 'Base',
    hintTitle: 'Source base prix',
    hintBody: 'Marché = estimate AirROI · Base fixe = manualBasePriceMad (§03).',
  },
  {
    id: 'floor',
    label: 'Prix min',
    hintTitle: 'Plancher (§02)',
    hintBody: 'floorNormal — le prix final ne descend jamais sous ce plancher. Éditable.',
  },
  {
    id: 'ceiling',
    label: 'Prix max',
    hintTitle: 'Plafond (§02)',
    hintBody: 'ceiling — le prix final ne dépasse jamais ce plafond. Éditable.',
  },
  {
    id: 'mode',
    label: 'Mode',
    hintTitle: 'Coefficient modes (§03)',
    hintBody: 'Prudent ×0,95 · Équilibré ×1 · Agressif ×1,1. OFF = modeEnabled désactivé.',
  },
  {
    id: 'occRef',
    label: 'Occ. ref.',
    hintTitle: 'Occupation de référence',
    hintBody: 'occupancyP50 du revenue estimate — base du mix (≠ ajustements §04).',
  },
  {
    id: 'occBands',
    label: 'Occ. taux',
    hintTitle: 'Taux d’occupation (§04)',
    hintBody: 'Seuils bas/haut sur le mois restant : sous-seuil → baisse %, sur-seuil → hausse %.',
  },
  {
    id: 'lastMinute',
    label: 'Last-min',
    hintTitle: 'Dernière minute (§05)',
    hintBody: 'Fenêtre J+A→J+B (jours avant arrivée) + ajustement Y % sur le prix dynamique.',
  },
  {
    id: 'gapBlock',
    label: 'Trous MS',
    hintTitle: 'Combler trous (§06)',
    hintBody: 'Réduit le min stay sur les trous calendrier (référence client en nuits).',
  },
  {
    id: 'minStay',
    label: 'MS ref.',
    hintTitle: 'Min stay client',
    hintBody: 'minStayPlancher (+ minStayDelta en fiche). Référence pour §06 et calendrier.',
  },
  {
    id: 'events',
    label: 'Events',
    hintTitle: 'Événements (§07)',
    hintBody: 'Lead absolu sur leurs dates — remplace mode, occ., bornes et last-min.',
  },
];
