import { Box, Typography } from '@mui/material';
import type { Thread } from '../../types/unifiedInbox.types';
import { T } from './_tokens';
import {
  avatarColorIndex,
  shortStayDate,
  sourceChipFromThread,
  stayBadgeFromBucket,
  waStayBucket,
} from './waThreadListGroups';

const AV_BG: Record<number, string> = {
  1: 'linear-gradient(135deg,#fde68a,#d97706)',
  2: 'linear-gradient(135deg,#a5f3fc,#0e7490)',
  3: 'linear-gradient(135deg,#86efac,#16a34a)',
  4: 'linear-gradient(135deg,#ddd6fe,#7c3aed)',
  5: 'linear-gradient(135deg,#fda4af,#ec4899)',
};

const SRC: Record<string, { bg: string; color: string }> = {
  airbnb: { bg: '#ff5a5f', color: '#fff' },
  booking: { bg: '#003580', color: '#fff' },
  sojori: { bg: 'linear-gradient(135deg,#b8851a,#876119)', color: '#fff' },
  other: { bg: T.bg3, color: T.text2 },
};

const BADGE: Record<string, { bg: string; color: string }> = {
  now: { bg: '#c2410c', color: '#fff' },
  future: { bg: T.bg2, color: T.text3 },
  done: { bg: '#047857', color: '#fff' },
  unread: { bg: T.green, color: '#fff' },
  other: { bg: T.bg2, color: T.text4 },
};

function initials(name?: string): string {
  if (!name) return 'WA';
  const p = name.trim().split(/\s+/);
  const a = (p[0]?.[0] || '').toUpperCase();
  const b = (p[p.length - 1]?.[0] || '').toUpperCase();
  return (a + b).slice(0, 2) || 'WA';
}

interface Props {
  thread: Thread;
  active: boolean;
  onSelect: () => void;
}

/** Carte liste WA — même densité / hiérarchie que Plans (sidebar résas). */
export default function WaPlansStyleThreadItem({ thread, active, onSelect }: Props) {
  const bucket = waStayBucket(thread);
  const unread = (thread.unread || 0) > 0;
  const source = sourceChipFromThread(thread);
  const badge = stayBadgeFromBucket(bucket, unread);
  const colorIdx = avatarColorIndex(String(thread.reservationNumber || thread.phone || thread.id));
  const avBg = AV_BG[colorIdx] || AV_BG[1];
  const srcStyle = SRC[source.tone];
  const badgeStyle = BADGE[badge.tone];
  const resa = thread.reservationNumber || '—';
  const phone = thread.phone && thread.phone !== thread.name ? thread.phone : '';

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      title={[resa !== '—' ? resa : '', phone ? `TEL: ${phone}` : '', thread.name, source.label]
        .filter(Boolean)
        .join(' · ')}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        p: '10px',
        mb: '4px',
        border: `1px solid ${active ? T.primary : 'transparent'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        position: 'relative',
        background: active
          ? `linear-gradient(135deg, ${T.primaryTint}, ${T.bg1} 70%)`
          : 'transparent',
        boxShadow: active ? '0 1px 2px rgba(184,133,26,0.10)' : 'none',
        transition: 'all 0.12s',
        // Trait canal (WA vert / OTA Airbnb ou Booking)
        borderLeft: `3px solid ${
          source.tone === 'airbnb'
            ? '#FF5A5F'
            : source.tone === 'booking'
              ? '#003580'
              : T.green
        }`,
        '&:hover': { background: active ? undefined : T.bg2 },
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '9px',
          background: avBg,
          color: colorIdx === 1 ? '#1a1408' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          flexShrink: 0,
          position: 'relative',
          fontFamily: '"Geist", system-ui, sans-serif',
        }}
      >
        {initials(thread.name)}
        <Box
          sx={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: T.green,
            border: `2px solid ${T.bg1}`,
            fontSize: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          ✓
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {(phone || resa !== '—') && (
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 10.5,
              fontWeight: 800,
              color: active ? T.primary : T.primaryDeep,
              letterSpacing: '0.03em',
              lineHeight: 1.2,
              mb: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={[resa !== '—' ? resa : '', phone ? `TEL: ${phone}` : '']
              .filter(Boolean)
              .join(' · ')}
          >
            {resa !== '—' ? <Box component="span">{resa}</Box> : null}
            {phone && resa !== '—' ? (
              <Box component="span" sx={{ color: T.text4, fontWeight: 600, mx: '5px' }}>
                ·
              </Box>
            ) : null}
            {phone ? (
              <Box
                component="span"
                sx={{ fontWeight: 700, color: T.text3, letterSpacing: '0.02em' }}
              >
                TEL:&nbsp;{phone}
              </Box>
            ) : null}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.2 }}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '-0.005em',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: T.text,
            }}
          >
            {thread.name}
          </Typography>
          <Box
            component="span"
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.04em',
              px: '6px',
              py: '2px',
              borderRadius: '5px',
              flexShrink: 0,
              textTransform: 'uppercase',
              bgcolor: srcStyle.bg,
              color: srcStyle.color,
              ...(source.tone === 'other' ? { border: `1px solid ${T.border}` } : {}),
            }}
          >
            {source.label}
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: 9,
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 800,
              px: '5px',
              py: '1px',
              borderRadius: '4px',
              letterSpacing: '0.06em',
              flexShrink: 0,
              bgcolor: badgeStyle.bg,
              color: badgeStyle.color,
            }}
          >
            {badge.label}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            mt: '3px',
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10,
            color: T.text3,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          <Box
            component="span"
            sx={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={thread.listingName}
          >
            {thread.listingName || '—'}
          </Box>
          <Box component="span" sx={{ flexShrink: 0 }}>
            {shortStayDate(thread.checkInDate)}-{shortStayDate(thread.checkOutDate)}
          </Box>
        </Box>

        {(thread.preview || thread.programmedAuto) && (
          <Box sx={{ mt: '4px', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
            {thread.preview ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  minWidth: 0,
                  lineHeight: 1.3,
                }}
                title={
                  thread.lastMessageKind
                    ? `${thread.lastMessageKind === 'Q' ? 'Question voyageur' : 'Réponse manuelle'}${thread.time ? ` · ${thread.time}` : ''} · ${thread.preview}`
                    : thread.preview
                }
              >
                {thread.lastMessageKind ? (
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      px: '5px',
                      py: '1px',
                      borderRadius: '4px',
                      bgcolor: thread.lastMessageKind === 'Q' ? '#fff7ed' : T.greenBg,
                      color: thread.lastMessageKind === 'Q' ? '#c2410c' : '#0e8c4d',
                      border: `1px solid ${thread.lastMessageKind === 'Q' ? '#fdba74' : 'rgba(14,140,77,0.25)'}`,
                    }}
                  >
                    {thread.lastMessageKind}
                  </Box>
                ) : null}
                {thread.time && thread.lastMessageKind ? (
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      color: unread ? T.text2 : T.text3,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {thread.time}
                  </Box>
                ) : null}
                <Typography
                  component="span"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11,
                    color: thread.lastMessageKind
                      ? unread
                        ? T.text2
                        : T.text3
                      : '#57534e',
                    fontWeight: thread.lastMessageKind ? (unread ? 500 : 400) : 550,
                    fontStyle: thread.lastMessageKind ? 'normal' : 'italic',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {thread.preview}
                </Typography>
              </Box>
            ) : null}

            {/* A = plan auto uniquement avec un vrai Q/R (pas seul sur « Aucun message ») */}
            {thread.programmedAuto && thread.lastMessageKind ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  minWidth: 0,
                  lineHeight: 1.3,
                }}
                title={`Auto plan · ${thread.programmedAuto.label}${thread.programmedAuto.time ? ` · ${thread.programmedAuto.time}` : ''}`}
              >
                <Box
                  component="span"
                  sx={{
                    flexShrink: 0,
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    px: '5px',
                    py: '1px',
                    borderRadius: '4px',
                    bgcolor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #93c5fd',
                  }}
                >
                  A
                </Box>
                {thread.programmedAuto.time ? (
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      color: T.text3,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {thread.programmedAuto.time}
                  </Box>
                ) : null}
                <Typography
                  component="span"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11,
                    color: '#1d4ed8',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {thread.programmedAuto.label}
                </Typography>
              </Box>
            ) : null}
          </Box>
        )}
      </Box>
    </Box>
  );
}
