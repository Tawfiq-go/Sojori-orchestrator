import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import type { BookingInboxExchange, BookingSearchAudit } from '../../services/bookingInboxService';

type Props = {
  exchange: BookingInboxExchange | null;
  phone?: string;
  language?: string;
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <Box sx={{ mb: 1.25 }}>
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: '#0f766e',
          textTransform: 'uppercase',
          mb: 0.35,
          fontFamily: '"Geist Mono", monospace',
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
        {value}
      </Typography>
    </Box>
  );
}

function CriteriaBlock({ audit }: { audit: BookingSearchAudit }) {
  const c = audit.criteria || {};
  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 1, color: '#134e4a' }}>
        Filtres utilisés
      </Typography>
      <Field label="Ville" value={c.city} />
      <Field label="Arrivée" value={c.checkIn} />
      <Field label="Départ" value={c.checkOut} />
      <Field
        label="Voyageurs"
        value={
          c.adults != null || c.children != null || c.guests != null
            ? `${c.adults ?? c.guests ?? '—'} adulte(s)${
                c.children ? ` · ${c.children} enfant(s)` : ''
              }${c.guests != null && c.adults == null ? ` (total ${c.guests})` : ''}`
            : null
        }
      />
      <Field label="Budget" value={c.budget} />
      <Field
        label="Équipements"
        value={c.amenities?.length ? c.amenities.join(' · ') : null}
      />
      <Field label="Langue" value={c.language} />
    </Box>
  );
}

export default function BookingDemandDetail({ exchange, phone, language }: Props) {
  if (!exchange) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>Détail demande</Typography>
        <Typography sx={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
          Cliquez sur un message client (surtout la 1ʳᵉ demande vocale) pour voir la transcription
          complète, les filtres appliqués et les résultats.
        </Typography>
        {(phone || language) && (
          <Box sx={{ mt: 2 }}>
            <Field label="Téléphone" value={phone} />
            <Field label="Langue fil" value={language} />
          </Box>
        )}
      </Box>
    );
  }

  const audit = exchange.search_audit;
  const transcript = exchange.transcript || audit?.transcript || exchange.user_message || '';
  const isClient = Boolean(exchange.user_message?.trim());

  return (
    <Box sx={{ p: 2, overflow: 'auto', height: '100%' }}>
      <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 0.25, color: '#0f172a' }}>
        {isClient ? 'Demande client' : 'Réponse bot / admin'}
      </Typography>
      <Typography sx={{ fontSize: 11, color: '#64748b', mb: 1.5, fontFamily: '"Geist Mono", monospace' }}>
        {exchange.timestamp ? new Date(exchange.timestamp).toLocaleString('fr-FR') : ''}
      </Typography>

      {!!exchange.tags?.length && (
        <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          {exchange.tags.map((tag) => (
            <Chip
              key={tag}
              size="small"
              label={tag}
              sx={{
                height: 22,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: 'rgba(13,148,136,0.12)',
                color: '#0f766e',
              }}
            />
          ))}
        </Stack>
      )}

      <Field label="Transcription complète" value={transcript} />
      {!isClient && (
        <Field label="Message" value={exchange.ai_response || exchange.summary} />
      )}

      {audit && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <CriteriaBlock audit={audit} />
          <Divider sx={{ my: 1.5 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 1, color: '#134e4a' }}>
            Résultat du filtre ({audit.resultCount})
          </Typography>
          {(audit.results || []).length === 0 ? (
            <Typography sx={{ fontSize: 12, color: '#64748b' }}>Aucun logement trouvé.</Typography>
          ) : (
            <Stack spacing={1}>
              {audit.results.map((r, i) => (
                <Box
                  key={r.id || i}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid rgba(13,148,136,0.25)',
                    bgcolor: 'rgba(13,148,136,0.04)',
                  }}
                >
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                    {i + 1}. {r.title}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#475569', mt: 0.25 }}>
                    {[r.neighborhood || r.city, r.nightly != null ? `${Math.round(r.nightly)} MAD/nuit` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}

      {!audit && isClient && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography sx={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
            Pas encore de filtres/résultats attachés à ce message (nouveaux échanges après déploiement
            uniquement).
          </Typography>
        </>
      )}
    </Box>
  );
}
