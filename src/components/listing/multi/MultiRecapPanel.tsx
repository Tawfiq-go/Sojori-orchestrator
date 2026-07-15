import { Box, Typography } from '@mui/material';
import { multiTokens as t, totalUnits, typePhotoCount, type MultiCreateValues } from './multiTypes';

type Props = {
  values: MultiCreateValues;
};

export function MultiRecapPanel({ values }: Props) {
  const units = totalUnits(values.roomTypes);
  const typePhotos = typePhotoCount(values.roomTypes);
  const desc =
    Array.isArray(values.description) && values.description[0]
      ? String(values.description[0].value || '')
      : '';

  return (
    <Box
      sx={{
        position: { md: 'sticky' },
        top: { md: 88 },
        background: t.bg1,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}` }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.9,
            fontSize: 11,
            fontWeight: 700,
            color: t.primaryDeep,
            background: t.primaryTint,
            border: '1px solid rgba(230,176,34,0.28)',
            borderRadius: '999px',
            px: 1.2,
            py: 0.45,
            mb: 1.2,
          }}
        >
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: t.primary }} />
          Multi · {values.roomTypes.length} type{values.roomTypes.length > 1 ? 's' : ''} · {units}{' '}
          unité{units > 1 ? 's' : ''}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
          {values.name?.trim() || 'Sans nom'}
        </Typography>
        <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.4 }}>
          {values.address?.trim() || '—'}
        </Typography>
        {desc ? (
          <Typography sx={{ fontSize: 11.5, color: t.text3, mt: 1, lineHeight: 1.45 }}>
            {desc.slice(0, 140)}
            {desc.length > 140 ? '…' : ''}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}` }}>
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 800,
            color: t.text4,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 1.2,
          }}
        >
          Composition
        </Typography>
        {values.roomTypes.map((rt) => (
          <Box
            key={rt._key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 0.7,
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: 1, background: t.primary, flexShrink: 0 }} />
            <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{rt.roomTypeName}</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: t.primaryDeep }}>
              ×{rt.roomNumber}{' '}
              <Box component="small" sx={{ color: t.text3, fontWeight: 600 }}>
                u.
              </Box>
            </Typography>
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1.2, fontWeight: 800 }}>
          <Typography sx={{ fontSize: 12.5 }}>Total réservable</Typography>
          <Typography sx={{ fontSize: 13, color: t.primaryDeep }}>
            {units}{' '}
            <Box component="small" sx={{ color: t.text3, fontWeight: 600 }}>
              unités
            </Box>
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}` }}>
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 800,
            color: t.text4,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 1.2,
          }}
        >
          En un coup d&apos;œil
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {[
            { v: values.roomTypes.length, k: 'types de chambres' },
            { v: units, k: 'unités réservables' },
          ].map((s) => (
            <Box
              key={s.k}
              sx={{ background: t.bg2, borderRadius: '10px', p: 1.25, textAlign: 'center' }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }}>
                {s.v}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: t.text3, mt: 0.3 }}>{s.k}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ p: 2 }}>
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 800,
            color: t.text4,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 1.2,
          }}
        >
          Photos
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.9 }}>
          <PhotoSplitRow color={t.info} label="Communes" count={values.listingImages.length} />
          <PhotoSplitRow color={t.primary} label="Par type" count={typePhotos} />
        </Box>
      </Box>
    </Box>
  );
}

function PhotoSplitRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12.5 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <Typography sx={{ flex: 1, fontSize: 12.5, color: t.text2 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontFamily: t.mono, fontSize: 12 }}>{count}</Typography>
    </Box>
  );
}
