import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import { MEDIA_GRID_THEME as T } from '../listing/upload/mediaGridConstants';
import {
  resolveMappingHref,
  type MappingEntry,
  type MappingGroup,
} from '../../config/mappingTypes';
import { getLegacyDashboardBaseUrl } from '../../utils/legacyDashboardUrl';

const DB_LABELS: Record<string, string> = {
  'srv-listing': 'Mongo srv-listing',
  'srv-admin': 'Mongo srv-admin',
  'srv-channels': 'Mongo srv-channels',
  'srv-calendar': 'Mongo srv-calendar',
};

function MappingPreviewPanel({
  entry,
  onOpenNative,
}: {
  entry: MappingEntry | null;
  onOpenNative?: (slug: string) => void;
}) {
  const href = entry ? resolveMappingHref(entry) : '';

  if (!entry) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 420,
          border: `1px dashed ${T.border}`,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.text3,
          p: 3,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: 14 }}>Sélectionnez un mapping à gauche.</Typography>
      </Box>
    );
  }

  const isLegacy = entry.target === 'legacy';

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: 2, mb: 1.5, bgcolor: T.bg1 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: T.text, mb: 0.5 }}>
          {entry.label}
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.text2, mb: 1 }}>{entry.description}</Typography>
        <Chip
          label={DB_LABELS[entry.database] || entry.database}
          size="small"
          sx={{ mb: 1, fontSize: 10, height: 22, fontWeight: 700 }}
        />
        {entry.legacyTabHint && (
          <Typography sx={{ fontSize: 12, color: T.text3, mb: 1 }}>{entry.legacyTabHint}</Typography>
        )}
        {entry.apiHint && (
          <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: 'monospace', mb: 1 }}>
            API : {entry.apiHint}
          </Typography>
        )}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          {(entry.tags || []).map((tag) => (
            <Chip key={tag} label={tag} size="small" sx={{ fontSize: 10, height: 22 }} />
          ))}
          <Chip
            label={isLegacy ? 'Legacy dashboard' : 'Orchestrator'}
            size="small"
            color={isLegacy ? 'warning' : 'primary'}
            variant="outlined"
            sx={{ fontSize: 10, height: 22 }}
          />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {entry.nativeSlug && onOpenNative && (
            <Button
              variant="contained"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onOpenNative(entry.nativeSlug!)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Ouvrir (natif)
            </Button>
          )}
          <Button
            variant={entry.nativeSlug ? 'outlined' : 'contained'}
            size="small"
            endIcon={<OpenInNewIcon />}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Ouvrir
          </Button>
          <Typography
            component="code"
            sx={{ fontSize: 11, color: T.text3, alignSelf: 'center', wordBreak: 'break-all' }}
          >
            {entry.path}
          </Typography>
        </Stack>
      </Box>

      {isLegacy ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 480,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: '#fff',
          }}
        >
          <Box sx={{ px: 1.5, py: 0.75, bgcolor: T.bg2, borderBottom: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 11, color: T.text3 }}>
              Aperçu legacy ({getLegacyDashboardBaseUrl()})
            </Typography>
          </Box>
          <Box
            component="iframe"
            src={href}
            title={entry.label}
            sx={{ width: '100%', height: 'calc(100% - 32px)', minHeight: 440, border: 0 }}
          />
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 200, p: 2, border: `1px solid ${T.border}`, borderRadius: 2, bgcolor: T.bg2 }}>
          <Typography sx={{ fontSize: 13, color: T.text2, mb: 1 }}>
            Écran déjà dans l’orchestrator — utilisez le lien ci-dessus.
          </Typography>
          <Link href={href} underline="hover" sx={{ fontSize: 13, fontWeight: 600 }}>
            {href}
          </Link>
        </Box>
      )}
    </Box>
  );
}

export interface MappingHubViewProps {
  title: string;
  subtitle: string;
  groups: MappingGroup[];
  searchPlaceholder?: string;
  onOpenNative?: (slug: string) => void;
}

export function MappingHubView({
  title,
  subtitle,
  groups,
  searchPlaceholder = 'Rechercher…',
  onOpenNative,
}: MappingHubViewProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(groups[0]?.items[0]?.id ?? '');

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.path.toLowerCase().includes(q) ||
            item.database.toLowerCase().includes(q) ||
            (item.tags || []).some((t) => t.toLowerCase().includes(q)) ||
            (item.apiHint || '').toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const selectedEntry = useMemo(() => {
    for (const g of groups) {
      const hit = g.items.find((i) => i.id === selectedId);
      if (hit) return hit;
    }
    return null;
  }, [groups, selectedId]);

  const totalCount = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Box sx={{ px: { xs: 1, md: 0 }, pb: 4 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: T.text, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: 13, color: T.text3, mb: 2, maxWidth: 800 }}>
        {subtitle} {totalCount} écran(s) recensé(s).
      </Typography>

      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2, maxWidth: 420 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(280px, 340px) 1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Box
          sx={{
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            overflow: 'hidden',
            maxHeight: { lg: 'calc(100vh - 220px)' },
            overflowY: 'auto',
            bgcolor: T.bg1,
          }}
        >
          {filteredGroups.map((group) => (
            <Box key={group.id} sx={{ borderBottom: `1px solid ${T.border}` }}>
              <Box sx={{ px: 1.5, py: 1.25, bgcolor: T.bg2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.text }}>{group.label}</Typography>
                <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.25 }}>{group.description}</Typography>
              </Box>
              {group.items.map((item) => {
                const active = item.id === selectedId;
                return (
                  <Button
                    key={item.id}
                    fullWidth
                    onClick={() => setSelectedId(item.id)}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      textTransform: 'none',
                      borderRadius: 0,
                      py: 1.25,
                      px: 1.5,
                      bgcolor: active ? 'rgba(212,165,116,0.18)' : 'transparent',
                      borderLeft: active ? `3px solid ${T.primary}` : '3px solid transparent',
                      color: T.text,
                      '&:hover': { bgcolor: 'rgba(212,165,116,0.1)' },
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        {item.label}
                        {item.nativeSlug ? (
                          <Chip
                            label="Natif"
                            size="small"
                            color="primary"
                            sx={{ ml: 1, height: 18, fontSize: 9, verticalAlign: 'middle' }}
                          />
                        ) : null}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.25 }}>
                        {DB_LABELS[item.database]} · {item.path}
                      </Typography>
                    </Box>
                  </Button>
                );
              })}
            </Box>
          ))}
        </Box>

        <MappingPreviewPanel entry={selectedEntry} onOpenNative={onOpenNative} />
      </Box>
    </Box>
  );
}

export default MappingHubView;
