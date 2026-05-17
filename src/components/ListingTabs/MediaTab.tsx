// MediaTab.tsx - Photo grid with drag/drop, AI tags, captions
import { Box, Stack, Typography, Button } from '@mui/material';
import { tokens } from '../ListingFormV2';
import { SectionCard, AIBanner, SaveBar, FormPager } from '../ListingFormHelpers';

interface MediaTabProps {
  data: any;
  onChange?: (field: string, value: any) => void;
}

export function MediaTab({ data }: MediaTabProps) {
  const photos = data?.photos || [
    { id: 1, tag: 'Pool', caption: 'Piscine & terrasse vue mer', cover: true, color: 'linear-gradient(135deg,#fde68a,#d97706)' },
    { id: 2, tag: 'Living', caption: 'Salon principal', color: 'linear-gradient(135deg,#a5f3fc,#0e7490)' },
    { id: 3, tag: 'Kitchen', caption: 'Cuisine ouverte', color: 'linear-gradient(135deg,#f9a8d4,#be185d)' },
    { id: 4, tag: 'Bedroom', caption: 'Suite parentale', color: 'linear-gradient(135deg,#86efac,#16a34a)' },
    { id: 5, tag: 'Bath', caption: 'Salle de bain marbre', color: 'linear-gradient(135deg,#fdba74,#c2410c)' },
    { id: 6, tag: 'View', caption: 'Vue depuis terrasse', color: 'linear-gradient(135deg,#bae6fd,#0369a1)' },
    { id: 7, tag: 'Garden', caption: 'Jardin méditerranéen', color: 'linear-gradient(135deg,#ddd6fe,#7c3aed)' },
    { id: 8, tag: 'Outdoor', caption: 'Coin barbecue', color: 'linear-gradient(135deg,#fef08a,#a16207)' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: tokens.primaryTint, color: tokens.primaryDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              📸
            </Box>
            Médias
          </Typography>
          <Typography sx={{ color: tokens.text3, fontSize: 13.5, lineHeight: 1.5, maxWidth: 640 }}>
            Photos, vidéos et tour 360°. La cover image est utilisée en premier sur tous les canaux.
          </Typography>
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.125, py: 0.5, borderRadius: '99px', bgcolor: tokens.successTint, color: tokens.success, border: `1px solid rgba(16,185,129,0.25)`, fontFamily: 'Geist Mono', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          ● 14 photos · 1 vidéo
        </Box>
      </Box>

      {/* AI Banner */}
      <AIBanner
        title="14 photos analysées par l'IA."
        hint="Ordre suggéré : extérieur → salon → cuisine → chambres → vue. Légendes auto-générées en 4 langues."
        actions={[
          { label: 'Réordonner manuellement', onClick: () => {} },
          { label: 'Accepter ordre IA', onClick: () => {}, primary: true },
        ]}
      />

      {/* Photos Grid */}
      <SectionCard title={`Photos · ${photos.length}`} description="Drag pour réordonner. Première = cover image.">
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 1.5,
        }}>
          {photos.map((photo: { id: number; tag: string; caption: string; cover?: boolean; color: string }, idx: number) => (
            <Box
              key={photo.id}
              sx={{
                position: 'relative',
                aspectRatio: '4/3',
                borderRadius: '10px',
                background: photo.color,
                overflow: 'hidden',
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
              }}
            >
              {/* Order badge */}
              <Box sx={{
                position: 'absolute', top: '6px', left: '6px',
                width: 20, height: 20, borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, fontFamily: 'Geist Mono',
              }}>
                {idx + 1}
              </Box>

              {/* AI tag */}
              <Box sx={{
                position: 'absolute', top: '6px', right: '6px',
                bgcolor: tokens.ai, color: '#fff',
                px: 0.75, py: 0.25, borderRadius: 0.5,
                fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
              }}>
                AI · {photo.tag}
              </Box>

              {/* Cover badge */}
              {photo.cover && (
                <Box sx={{
                  position: 'absolute', bottom: '6px', left: '6px',
                  px: 0.875, py: 0.25, bgcolor: tokens.primary, color: tokens.text,
                  borderRadius: 0.5, fontSize: 9, fontWeight: 800, fontFamily: 'Geist Mono', letterSpacing: 0.6,
                }}>
                  COVER
                </Box>
              )}

              {/* Caption */}
              <Box sx={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                p: '6px 8px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
                color: '#fff', fontSize: 11, fontWeight: 500,
              }}>
                {photo.caption}
              </Box>
            </Box>
          ))}

          {/* Empty tile */}
          <Box sx={{
            aspectRatio: '4/3',
            bgcolor: tokens.bg2, border: `2px dashed ${tokens.borderStrong}`,
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', color: tokens.text3, fontSize: 11, cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': { borderColor: tokens.primary, color: tokens.primaryDeep },
          }}>
            <Box>+ 6 photos</Box>
            <Box sx={{ fontSize: 9, mt: 0.5 }}>drag & drop ou parcourir</Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
          <Button variant="outlined" sx={{ textTransform: 'none' }}>
            📁 Parcourir fichiers
          </Button>
          <Button variant="outlined" sx={{ textTransform: 'none' }}>
            📹 Ajouter vidéo
          </Button>
          <Button variant="outlined" sx={{ textTransform: 'none' }}>
            🔄 Tour 360°
          </Button>
        </Stack>
      </SectionCard>

      {/* Pager */}
      <FormPager
        prevLabel="Adresse"
        nextLabel="Équipements"
        currentIndex={3}
        total={24}
        onPrev={() => {}}
        onNext={() => {}}
      />

      {/* Save Bar */}
      <SaveBar onCancel={() => {}} onSave={() => {}} />
    </Box>
  );
}
