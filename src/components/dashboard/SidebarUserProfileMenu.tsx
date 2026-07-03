import { useCallback, useState, type MouseEvent } from 'react';
import {
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import { useTranslation } from 'react-i18next';
import { tokens as t } from './dashboardTokens';
import {
  UI_LANGUAGES,
  persistUiLanguage,
  type UiLanguageCode,
} from '../../utils/userLanguage';

export type SidebarProfileUser = {
  name: string;
  email?: string;
  role?: string;
  initials: string;
};

type Props = {
  user: SidebarProfileUser;
  onLogout?: () => void;
};

export function SidebarUserProfileMenu({ user, onLogout }: Props) {
  const { i18n, t: tr } = useTranslation('common', { keyPrefix: 'profile' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const langCode = (i18n.language || 'fr').split('-')[0] as UiLanguageCode;

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleLanguage = useCallback(
    (code: UiLanguageCode) => {
      if (code === langCode) return;
      void i18n.changeLanguage(code);
      persistUiLanguage(code);
    },
    [i18n, langCode],
  );

  return (
    <Box
      sx={{
        p: '14px 18px',
        borderTop: `1px solid ${t.border}`,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.8))',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={handleOpen}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : undefined}
        aria-label={tr('myAccount')}
        sx={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          width: '100%',
          borderRadius: '10px',
          p: '6px 8px',
          mx: -1,
          transition: 'background-color 0.18s ease',
          '&:hover': { bgcolor: 'rgba(23,19,13,0.04)' },
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: 11,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)',
            border: '2px solid rgba(255,255,255,0.5)',
            boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
          }}
        >
          {user.initials}
        </Avatar>
        <Box sx={{ lineHeight: 1.15, minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 700,
              color: t.text,
              letterSpacing: '-0.2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.name}
          </Typography>
          <Typography
            sx={{
              fontSize: 10,
              color: t.text3,
              fontFamily: 'Geist Mono, monospace',
              mt: 0.2,
              fontWeight: 600,
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
            }}
          >
            {user.role}
          </Typography>
        </Box>
        <ExpandMoreIcon
          sx={{
            fontSize: 18,
            color: t.text3,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 260,
              borderRadius: '12px',
              border: `1px solid ${t.border}`,
              boxShadow: '0 12px 40px rgba(20,17,10,0.12)',
              mt: -1,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text }}>{user.name}</Typography>
          {user.email ? (
            <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.25, wordBreak: 'break-all' }}>
              {user.email}
            </Typography>
          ) : null}
        </Box>

        <Divider />

        <Box sx={{ px: 2, py: 1 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
            <LanguageOutlinedIcon sx={{ fontSize: 16, color: t.text3 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tr('language')}
            </Typography>
          </Stack>
          {UI_LANGUAGES.map((lang) => {
            const selected = langCode === lang.code;
            return (
              <MenuItem
                key={lang.code}
                selected={selected}
                onClick={() => handleLanguage(lang.code)}
                sx={{ borderRadius: '8px', py: 0.75, fontSize: 13 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <span style={{ fontSize: 16 }}>{lang.flag}</span>
                </ListItemIcon>
                <ListItemText primary={lang.label} />
                {selected ? <CheckIcon sx={{ fontSize: 18, color: t.primaryDeep }} /> : null}
              </MenuItem>
            );
          })}
        </Box>

        {onLogout ? (
          <>
            <Divider />
            <Box sx={{ p: 1 }}>
              <MenuItem
                onClick={() => {
                  handleClose();
                  onLogout();
                }}
                sx={{
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: 13,
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(239,68,68,0.08)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                  <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText primary={tr('logout')} />
              </MenuItem>
            </Box>
          </>
        ) : null}
      </Menu>
    </Box>
  );
}
