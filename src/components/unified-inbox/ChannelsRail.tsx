import { Box, Stack } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import type { Channel, ChannelType } from '../../types/unifiedInbox.types';

interface ChannelsRailProps {
  channels: Channel[];
  activeChannel: ChannelType;
  onSelectChannel: (channelId: ChannelType) => void;
}

/**
 * ChannelsRail - Rail gauche avec icônes des canaux
 * Design: Unified Inbox - Claude Design
 */
export default function ChannelsRail({ channels, activeChannel, onSelectChannel }: ChannelsRailProps) {
  return (
    <Box
      sx={{
        width: 80,
        minWidth: 80,
        background: 'rgba(0,0,0,0.3)',
        borderRight: `1px solid ${t.border}`,
        p: '14px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        alignItems: 'center',
        minHeight: 0,  // ← Fix scroll
        overflow: 'hidden',
      }}
    >
      {channels.map((channel) => {
        const isActive = activeChannel === channel.id;
        return (
          <Box
            key={channel.id}
            onClick={() => onSelectChannel(channel.id)}
            sx={{
              width: 56,
              padding: '10px 6px',
              borderRadius: '10px',
              background: isActive ? t.primaryTint : 'transparent',
              border: `1px solid ${isActive ? t.primary : 'transparent'}`,
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s',
              '&:hover': {
                background: isActive ? t.primaryTint : t.bg2,
              },
            }}
          >
            {/* Icon container */}
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: channel.color || 'transparent',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              {channel.icon}
            </Box>

            {/* Label */}
            <Box
              sx={{
                fontSize: 9,
                color: t.text3,
                mt: 0.5,
                fontFamily: 'Geist Mono',
              }}
            >
              {channel.label}
            </Box>

            {/* Count badge */}
            {channel.count > 0 && (
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  fontSize: 9,
                  background: '#ef4444',
                  color: '#fff',
                  padding: '1px 5px',
                  borderRadius: '99px',
                  fontWeight: 700,
                  fontFamily: 'Geist Mono',
                }}
              >
                {channel.count}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
