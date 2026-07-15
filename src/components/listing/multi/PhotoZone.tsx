import { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { multiTokens as t, type MultiListingImage } from './multiTypes';

type Props = {
  variant: 'common' | 'type';
  tag: string;
  hint: string;
  images: MultiListingImage[];
  onChange: (images: MultiListingImage[]) => void;
  uploading?: boolean;
  onPickFiles?: (files: FileList) => void;
};

export function PhotoZone({ variant, tag, hint, images, onChange, uploading, onPickFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
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
        {images.map((img, i) => (
          <Box
            key={`${img.url}-${i}`}
            sx={{
              aspectRatio: '4/3',
              borderRadius: '9px',
              overflow: 'hidden',
              position: 'relative',
              background: `linear-gradient(135deg, ${t.bg3}, #ddd6c6)`,
              backgroundImage: img.url ? `url(${img.url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              cursor: 'pointer',
            }}
            title="Cliquer pour retirer"
            onClick={() => onChange(images.filter((_, idx) => idx !== i))}
          >
            {i === 0 && (
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
            {(img.caption || img.fileName) && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  fontSize: 9,
                  color: '#fff',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  px: 0.75,
                  pt: 1.2,
                  pb: 0.5,
                }}
              >
                {img.caption || img.fileName}
              </Box>
            )}
          </Box>
        ))}

        <Box
          onClick={() => !uploading && inputRef.current?.click()}
          sx={{
            aspectRatio: '4/3',
            borderRadius: '9px',
            background: t.bg1,
            border: `1.5px dashed ${t.borderStrong}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            color: t.text3,
            fontSize: 11,
            fontWeight: 600,
            cursor: uploading ? 'wait' : 'pointer',
            opacity: uploading ? 0.6 : 1,
            '&:hover': {
              borderColor: t.primary,
              color: t.primaryDeep,
              background: t.primaryTint,
            },
          }}
        >
          <Box component="span" sx={{ fontSize: 20, lineHeight: 1 }}>
            +
          </Box>
          {uploading ? 'Upload…' : 'Ajouter'}
        </Box>
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length && onPickFiles) onPickFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </Box>
  );
}
