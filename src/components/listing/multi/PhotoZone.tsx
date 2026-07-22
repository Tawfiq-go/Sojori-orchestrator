import { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { multiTokens as t, type MultiListingImage } from './multiTypes';

type Props = {
  variant: 'common' | 'type';
  tag?: string;
  hint?: string;
  images: MultiListingImage[];
  onChange: (images: MultiListingImage[]) => void;
  uploading?: boolean;
  onPickFiles?: (files: FileList) => void;
  /** Moins de padding / pas de bandeau tag+hint */
  compact?: boolean;
};

export function PhotoZone({
  variant,
  tag,
  hint,
  images,
  onChange,
  uploading,
  onPickFiles,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isCommon = variant === 'common';
  const showHeader = Boolean(tag || hint);

  return (
    <Box
      sx={{
        border: `1px solid ${t.borderStrong}`,
        borderRadius: compact ? '8px' : '11px',
        p: compact ? 0.85 : 1.75,
        background: t.bg2,
      }}
    >
      {showHeader ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.1,
            mb: compact ? 0.9 : 1.3,
            flexWrap: 'wrap',
          }}
        >
          {tag ? (
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
          ) : null}
          {hint ? <Typography sx={{ fontSize: 11, color: t.text3 }}>{hint}</Typography> : null}
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: compact
            ? 'repeat(auto-fill, minmax(80px, 1fr))'
            : 'repeat(auto-fill, minmax(96px, 1fr))',
          gap: compact ? 0.85 : 1.1,
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
            gap: 0.35,
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
