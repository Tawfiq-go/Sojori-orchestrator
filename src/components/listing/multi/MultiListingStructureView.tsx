import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { MultiRecapPanel } from './MultiRecapPanel';
import {
  multiTokens as t,
  totalUnits,
  type MultiCreateValues,
  type MultiListingImage,
  type MultiRoomTypeDraft,
} from './multiTypes';

type Props = {
  values: MultiCreateValues;
};

/**
 * Vue Multi (maquette Claude Design) — lecture pour valider le concept.
 * Single ne passe jamais par ce composant.
 */
export function MultiListingStructureView({ values }: Props) {
  const units = totalUnits(values.roomTypes);
  const desc =
    Array.isArray(values.description) && values.description[0]
      ? String(values.description[0].value || '')
      : '';

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          background: t.primaryTint,
          border: '1px solid rgba(230,176,34,0.35)',
          borderRadius: '12px',
          p: 1.75,
          mb: 2.5,
        }}
      >
        <Box sx={{ fontSize: 20 }}>🏛</Box>
        <Box>
          <Typography sx={{ fontSize: 13, color: t.text2, lineHeight: 1.5 }}>
            <b>Structure Multi.</b> Bâtiment commun + types de chambres (stock, prix, photos
            séparés).
          </Typography>
          <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.5 }}>
            {values.roomTypes.length} type{values.roomTypes.length > 1 ? 's' : ''} · {units} unités
            au total
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 336px' },
          gap: 2.75,
          alignItems: 'start',
        }}
      >
        <Box>
          {/* Building */}
          <Section
            lvl="B"
            lvlTone="info"
            title="Le bâtiment"
            desc="Infos & photos communes à toutes les chambres"
          >
            <MetaGrid
              items={[
                { label: 'Nom', value: values.name || '—' },
                { label: 'Adresse', value: values.address || '—' },
                { label: 'Ville', value: values.city || '—' },
              ]}
            />
            {desc ? (
              <Typography sx={{ fontSize: 13, color: t.text2, mt: 1.5, lineHeight: 1.55 }}>
                {desc}
              </Typography>
            ) : null}
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mt: 2, mb: 0.8 }}>
              Photos communes · listingImages
            </Typography>
            <PhotoStrip
              variant="common"
              tag="Communes"
              hint="Patio, piscine, terrasse, façade — pas les chambres"
              images={values.listingImages}
            />
          </Section>

          {/* Room types */}
          <Section
            lvl="R"
            lvlTone="primary"
            title="Types de chambres"
            desc={`${values.roomTypes.length} type${values.roomTypes.length > 1 ? 's' : ''} · ${units} unités au total`}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: 1.5,
              }}
            >
              {values.roomTypes.map((rt) => (
                <RoomTypeCard key={rt._key} rt={rt} />
              ))}
            </Box>
          </Section>
        </Box>

        <MultiRecapPanel values={values} />
      </Box>
    </Box>
  );
}

function Section({
  lvl,
  lvlTone,
  title,
  desc,
  children,
}: {
  lvl: string;
  lvlTone: 'info' | 'primary';
  title: string;
  desc: string;
  children: ReactNode;
}) {
  const bg = lvlTone === 'info' ? t.infoTint : t.primaryTint;
  const color = lvlTone === 'info' ? t.info : t.primaryDeep;
  return (
    <Box
      sx={{
        background: t.bg1,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.25,
          py: 1.75,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '8px',
            background: bg,
            color,
            fontFamily: t.mono,
            fontWeight: 800,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {lvl}
        </Box>
        <Box>
          <Typography sx={{ fontSize: 14.5, fontWeight: 800 }}>{title}</Typography>
          <Typography sx={{ fontSize: 11.5, color: t.text3 }}>{desc}</Typography>
        </Box>
      </Box>
      <Box sx={{ p: 2.25 }}>{children}</Box>
    </Box>
  );
}

function MetaGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 1.25,
      }}
    >
      {items.map((it) => (
        <Box key={it.label} sx={{ background: t.bg2, borderRadius: '10px', p: 1.25 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.text4, mb: 0.4 }}>
            {it.label}
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{it.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function PhotoStrip({
  variant,
  tag,
  hint,
  images,
}: {
  variant: 'common' | 'type';
  tag: string;
  hint: string;
  images: MultiListingImage[];
}) {
  const isCommon = variant === 'common';
  return (
    <Box
      sx={{
        border: `1.5px dashed ${t.borderStrong}`,
        borderRadius: '11px',
        p: 1.75,
        background: t.bg2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, mb: 1.3, flexWrap: 'wrap' }}>
        <Box
          component="span"
          sx={{
            fontSize: 10,
            fontWeight: 800,
            fontFamily: t.mono,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            px: 1.1,
            py: 0.35,
            borderRadius: '6px',
            background: isCommon ? t.infoTint : t.primaryTint,
            color: isCommon ? t.info : t.primaryDeep,
          }}
        >
          {tag}
        </Box>
        <Typography sx={{ fontSize: 11, color: t.text3 }}>{hint}</Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          gap: 1.1,
        }}
      >
        {(images.length ? images : [{ url: '', caption: 'Placeholder' }]).map((img, i) => (
          <Box
            key={`${img.url || img.caption}-${i}`}
            sx={{
              aspectRatio: '4/3',
              borderRadius: '9px',
              overflow: 'hidden',
              position: 'relative',
              background: img.url
                ? `center/cover url(${img.url})`
                : `linear-gradient(135deg, ${t.bg3}, #d8d0c0)`,
            }}
          >
            {i === 0 && images.length > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 5,
                  left: 5,
                  fontFamily: t.mono,
                  fontSize: 8,
                  fontWeight: 800,
                  background: t.primary,
                  color: '#3a2c08',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '5px',
                }}
              >
                Couverture
              </Box>
            )}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                fontSize: 9,
                color: '#fff',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
                px: 0.75,
                pt: 1.2,
                pb: 0.5,
              }}
            >
              {img.caption || img.fileName || (img.url ? `Photo ${i + 1}` : 'À ajouter')}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function RoomTypeCard({ rt }: { rt: MultiRoomTypeDraft }) {
  const cover = rt.roomTypeImages?.[0]?.url;
  return (
    <Box
      sx={{
        border: `1.5px solid ${t.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        background: t.bg1,
      }}
    >
      <Box
        sx={{
          height: 104,
          position: 'relative',
          background: cover
            ? `center/cover url(${cover})`
            : `linear-gradient(135deg, ${t.bg3}, #d8d0c0)`,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: t.primary,
            color: '#3a2c08',
            borderRadius: '8px',
            px: 1.1,
            py: 0.45,
            fontWeight: 800,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 0.6,
            boxShadow: '0 2px 6px rgba(184,133,26,0.4)',
          }}
        >
          {rt.roomNumber}
          <Box component="span" sx={{ fontSize: 9, fontWeight: 700, opacity: 0.75, fontFamily: t.mono }}>
            unités
          </Box>
        </Box>
        <Box
          sx={{
            position: 'absolute',
            bottom: 7,
            right: 7,
            fontFamily: t.mono,
            fontSize: 9.5,
            fontWeight: 700,
            background: 'rgba(20,17,10,0.62)',
            color: '#fff',
            px: 0.9,
            py: 0.25,
            borderRadius: '6px',
          }}
        >
          {rt.roomTypeImages?.length || 0} photo{(rt.roomTypeImages?.length || 0) > 1 ? 's' : ''}
        </Box>
      </Box>
      <Box sx={{ px: 1.5, py: 1.3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{rt.roomTypeName}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.4, fontSize: 11, color: t.text3 }}>
          <span>👤 {rt.personCapacity} pers.</span>
          <span>🛏 {rt.bedsLabel || `${rt.bedsNumber} lit(s)`}</span>
          <span>🛁 {rt.bathroomsNumber} SDB</span>
        </Box>
        <Typography sx={{ mt: 1, fontWeight: 800, fontSize: 13, color: t.primaryDeep }}>
          {Number(rt.basePrice || 0).toLocaleString('fr-FR')} MAD{' '}
          <Box component="small" sx={{ fontWeight: 600, color: t.text3, fontSize: 10.5 }}>
            / nuit
          </Box>
        </Typography>
        {(rt.roomTypeImages?.length ?? 0) > 0 && (
          <Box sx={{ display: 'flex', gap: 0.6, mt: 1.1, overflow: 'hidden' }}>
            {rt.roomTypeImages.slice(0, 4).map((img, i) => (
              <Box
                key={`${img.url}-${i}`}
                sx={{
                  width: 44,
                  height: 34,
                  borderRadius: '6px',
                  flexShrink: 0,
                  background: img.url
                    ? `center/cover url(${img.url})`
                    : `linear-gradient(135deg, ${t.bg3}, #d8d0c0)`,
                  border: `1px solid ${t.border}`,
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** Map API / form values → MultiCreateValues for the validate view. */
export function formValuesToMultiStructure(values: Record<string, unknown>): MultiCreateValues {
  const description = Array.isArray(values.description)
    ? (values.description as MultiCreateValues['description'])
    : [{ value: String(values.description || '') }];

  const listingImages = Array.isArray(values.listingImages)
    ? (values.listingImages as MultiListingImage[])
    : [];

  const roomTypesRaw = Array.isArray(values.roomTypes) ? values.roomTypes : [];
  const roomTypes: MultiRoomTypeDraft[] = roomTypesRaw.map((rt, i) => {
    const row = (rt && typeof rt === 'object' ? rt : {}) as Record<string, unknown>;
    const rooms = Array.isArray(row.rooms) ? row.rooms : [];
    const roomNumber =
      Number(row.roomNumber) ||
      (rooms.length > 0 ? rooms.length : 1);
    return {
      _key: String(row._id || row.id || `rt_${i}`),
      _id: row._id ? String(row._id) : undefined,
      roomTypeName: String(row.roomTypeName || row.name || `Type ${i + 1}`),
      roomNumber,
      personCapacity: Number(row.personCapacity) || 1,
      personCapacityMax: Number(row.personCapacityMax) || Number(row.personCapacity) || 1,
      bedsNumber: Number(row.bedsNumber) || 1,
      bedroomsNumber: Number(row.bedroomsNumber) || 1,
      bathroomsNumber: Number(row.bathroomsNumber) || 1,
      basePrice: Number(row.basePrice) || 0,
      surface: Number(row.surface) || 0,
      roomTypeImages: Array.isArray(row.roomTypeImages)
        ? (row.roomTypeImages as MultiListingImage[])
        : [],
      amenitiesIds: [],
      ratePlanIds: [],
      bedTypes: [],
      roomAmenities: [],
      useAddress: true,
      active: true,
      startCode: 0,
      ranking: Number(row.ranking) || i,
      bedsLabel:
        row.bedsLabel != null
          ? String(row.bedsLabel)
          : `${Number(row.bedsNumber) || 1} lit(s)`,
    };
  });

  return {
    propertyUnit: 'Multi',
    name: String(values.name || ''),
    address: String(values.address || ''),
    description,
    listingImages,
    roomTypes,
    country: String(values.country || ''),
    city: String(values.city || ''),
    cityId: String(values.cityId || ''),
    ownerId: values.ownerId ? String(values.ownerId) : undefined,
    active: Boolean(values.active),
    directEnabled: Boolean(values.directEnabled),
    atSojori: values.atSojori !== false,
    listingAmenitiesIds: [],
    rulesAndInfo: { Rules: [], InfoUtils: [] },
  };
}
