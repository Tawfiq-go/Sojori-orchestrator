import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { multiTokens as t } from './multiTypes';
import { btnPrimarySx } from '../../dashboard/DashboardV2.components';

export type PropertyUnitChoice = 'Single' | 'Multi';

type Props = {
  onContinue: (unit: PropertyUnitChoice) => void;
  onBack?: () => void;
};

export function ListingTypeChooser({ onContinue, onBack }: Props) {
  const [choice, setChoice] = useState<PropertyUnitChoice | null>(null);

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', py: 1 }}>
      <Typography
        sx={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          textAlign: 'center',
          mb: 0.75,
        }}
      >
        Quel type d&apos;annonce créez-vous ?
      </Typography>
      <Typography sx={{ textAlign: 'center', color: t.text3, fontSize: 13.5, mb: 3.25 }}>
        Ce choix détermine la structure. Il reste modifiable tant que l&apos;annonce n&apos;est
        pas publiée.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        <ChoiceCard
          kind="single"
          selected={choice === 'Single'}
          frozen
          icon="🚪"
          title="Logement unique"
          body="Un seul logement loué en entier, façon Airbnb. Un calendrier, un prix, une capacité."
          examples={['Appartement, villa, studio', '1 seule unité réservable']}
          onSelect={() => setChoice('Single')}
        />
        <ChoiceCard
          kind="multi"
          selected={choice === 'Multi'}
          icon="🏛"
          title="Structure à chambres"
          badge="Multi"
          body="Un riad, une maison d'hôtes ou un petit hôtel avec plusieurs catégories de chambres, chacune en plusieurs exemplaires."
          examples={['Riad, maison d’hôtes, boutique-hôtel', 'Plusieurs types × plusieurs unités']}
          onSelect={() => setChoice('Multi')}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
        {onBack && (
          <Button
            onClick={onBack}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              color: t.text2,
              border: `1px solid ${t.border}`,
              borderRadius: '9px',
              px: 2,
            }}
          >
            Retour à la liste
          </Button>
        )}
        <Button
          disabled={!choice}
          sx={{
            ...btnPrimarySx,
            opacity: choice ? 1 : 0.5,
            cursor: choice ? 'pointer' : 'not-allowed',
          }}
          onClick={() => choice && onContinue(choice)}
        >
          Continuer
          {choice === 'Multi'
            ? ' — configurer les chambres'
            : choice === 'Single'
              ? ' — logement unique'
              : ''}{' '}
          →
        </Button>
      </Box>
    </Box>
  );
}

function ChoiceCard({
  kind,
  selected,
  frozen,
  icon,
  title,
  badge,
  body,
  examples,
  onSelect,
}: {
  kind: 'single' | 'multi';
  selected: boolean;
  frozen?: boolean;
  icon: string;
  title: string;
  badge?: string;
  body: string;
  examples: string[];
  onSelect: () => void;
}) {
  const isSingle = kind === 'single';
  return (
    <Box
      onClick={onSelect}
      sx={{
        background: t.bg1,
        border: `2px solid ${selected ? t.primary : t.border}`,
        boxShadow: selected ? `0 0 0 4px ${t.primaryTint}` : 'none',
        borderRadius: '16px',
        p: 3,
        cursor: 'pointer',
        position: 'relative',
        transition: '0.16s',
        '&:hover': {
          borderColor: selected ? t.primary : t.borderStrong,
          transform: 'translateY(-2px)',
        },
      }}
    >
      {frozen && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 52,
            fontFamily: t.mono,
            fontSize: 9,
            fontWeight: 700,
            color: t.text4,
            background: t.bg2,
            px: 1,
            py: 0.35,
            borderRadius: '5px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          UI gelée
        </Box>
      )}
      <Box
        sx={{
          position: 'absolute',
          top: 18,
          right: 18,
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: `2px solid ${selected ? t.primary : t.borderStrong}`,
          background: selected
            ? `radial-gradient(circle, ${t.primary} 0 6px, transparent 6px)`
            : 'transparent',
        }}
      />
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          mb: 1.75,
          background: isSingle ? t.infoTint : t.primaryTint,
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          mb: 0.6,
          display: 'flex',
          alignItems: 'center',
          gap: 1.1,
        }}
      >
        {title}
        {badge && (
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: 11,
              color: t.primaryDeep,
              background: t.primaryTint,
              px: 1,
              py: 0.25,
              borderRadius: '6px',
            }}
          >
            {badge}
          </Box>
        )}
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: t.text3, mb: 1.75, lineHeight: 1.5 }}>
        {body}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.9 }}>
        {examples.map((eg) => (
          <Box
            key={eg}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.1, fontSize: 12, color: t.text2 }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isSingle ? t.info : t.primary,
                flexShrink: 0,
              }}
            />
            {eg}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
