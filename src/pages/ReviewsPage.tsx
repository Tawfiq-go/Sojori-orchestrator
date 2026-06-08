import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ColumnSelector, { type ColumnDef } from '../components/filters/ColumnSelector';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  DataTable,
  StatCard,
  StatsRow,
  Badge,
  SourcePill,
  AIChip,
  btnPrimarySx,
  btnGhostSx,
  btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import {
  Alert,
  Box,
  Button,
  Snackbar,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Rating,
  CircularProgress,
} from '@mui/material';
import messagesService from '../services/messagesService';

type ReviewRow = {
  id: string;
  threadId: string;
  date: string;
  checkInDate: string;
  checkOutDate: string;
  listingName: string;
  listingPhoto: string;
  guestName: string;
  ota: string;
  rating: number;
  comment: string;
  replied: boolean;
  urgent: boolean;
  response: string;
  flagged: boolean;
  reservationNumber: string;
};

function formatStayDate(raw?: string | Date | null): string {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function resolveListingName(reservation: Record<string, unknown>, threadData: Record<string, unknown>): string {
  const sojori = reservation.sojoriId;
  if (sojori && typeof sojori === 'object' && sojori !== null && 'name' in sojori && sojori.name) {
    return String(sojori.name);
  }
  if (typeof sojori === 'string' && sojori.trim()) return sojori;
  const fromReservation =
    reservation.listingName || reservation.listingTitle || reservation.propertyName;
  if (fromReservation) return String(fromReservation);
  if (threadData.listingName) return String(threadData.listingName);
  return '—';
}

function parseReview(messages: unknown[]) {
  let rating = 5;
  let message = '';
  let response = '';
  for (const msg of messages || []) {
    const parsed = (msg as { parsedReview?: Record<string, unknown> })?.parsedReview;
    if (parsed) {
      if (parsed.Rating != null && parsed.Rating !== '') rating = Number(parsed.Rating) || rating;
      if (parsed.Message) message = message || String(parsed.Message);
      if (parsed.Response) response = String(parsed.Response);
      continue;
    }
    const body = (msg as { body?: unknown })?.body;
    if (!body) continue;
    if (typeof body === 'string' && body.trim().startsWith('<')) {
      const plain = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain.length > 12) message = message || plain;
      continue;
    }
    try {
      const data = typeof body === 'string' ? JSON.parse(body) : (body as Record<string, unknown>);
      if (data.Rating != null && data.Rating !== '') rating = Number(data.Rating) || rating;
      if (data.Message) message = message || String(data.Message);
      if (data.Response) response = String(data.Response);
    } catch {
      const plain = String(body)
        .replace(/<[^>]+>/g, ' ')
        .trim();
      if (plain.length > 12) message = message || plain;
    }
  }
  return { rating, message, response };
}

function normalizeOta(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('booking')) return 'Booking.com';
  if (lower.includes('vrbo')) return 'Vrbo';
  if (lower.includes('airbnb')) return 'Airbnb';
  return raw || 'Airbnb';
}

function listingEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('villa')) return '🏡';
  if (n.includes('riad')) return '🌸';
  if (n.includes('dar')) return '🏘️';
  if (n.includes('atlas')) return '⛰️';
  return '🏠';
}

function mapApiToRows(items: unknown[], flaggedIds: Set<string>): ReviewRow[] {
  return items.map((item: any) => {
    const threadData = item.thread || item;
    const reservation = item.reservation || {};
    const messages = item.messages || [];
    const review = parseReview(messages);
    const listingName = resolveListingName(reservation, threadData);
    const reviewStatus = String(threadData.reviewStatus || '');
    const replied =
      reviewStatus === 'responded' ||
      reviewStatus === 'replied' ||
      !!review.response;
    const rating = review.rating;
    const id = String(threadData._id || threadData.threadId || threadData.id);
    const threadId = String(threadData.threadId || threadData._id || id);
    const dateRaw =
      threadData.lastMessageAt || reservation.departureDate || reservation.arrivalDate || new Date().toISOString();
    const checkIn = reservation.arrivalDate || reservation.checkInDate || null;
    const checkOut = reservation.departureDate || reservation.checkOutDate || null;

    return {
      id,
      threadId,
      date: String(dateRaw).slice(0, 10),
      checkInDate: checkIn ? String(checkIn) : '',
      checkOutDate: checkOut ? String(checkOut) : '',
      listingName,
      listingPhoto: listingEmoji(listingName),
      guestName: reservation.guestName || threadData.recipientName || 'Guest',
      ota: normalizeOta(threadData.communicationChannel || reservation.channelName || 'Airbnb'),
      rating,
      comment: review.message || threadData.preview || '',
      replied,
      urgent: !replied && rating < 4,
      response: review.response,
      flagged: flaggedIds.has(id),
      reservationNumber: reservation.reservationNumber || '—',
    };
  });
}

const calculateStats = (reviews: ReviewRow[]) => {
  const totalReviews = reviews.length;
  const avgRating = totalReviews ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
  const repliedCount = reviews.filter((r) => r.replied).length;
  const replyRate = totalReviews ? (repliedCount / totalReviews) * 100 : 0;
  const urgentCount = reviews.filter((r) => !r.replied && (r.rating < 4 || r.urgent)).length;

  const byOTA = reviews.reduce(
    (acc, r) => {
      if (!acc[r.ota]) acc[r.ota] = { count: 0, totalRating: 0 };
      acc[r.ota].count++;
      acc[r.ota].totalRating += r.rating;
      return acc;
    },
    {} as Record<string, { count: number; totalRating: number }>,
  );

  const byListing = reviews.reduce(
    (acc, r) => {
      if (!acc[r.listingName]) acc[r.listingName] = { count: 0, totalRating: 0 };
      acc[r.listingName].count++;
      acc[r.listingName].totalRating += r.rating;
      return acc;
    },
    {} as Record<string, { count: number; totalRating: number }>,
  );

  return { totalReviews, avgRating, replyRate, urgentCount, byOTA, byListing };
};

const AI_RESPONSE_TEMPLATES = [
  "Thank you for your wonderful feedback! We're delighted you enjoyed your stay. We hope to welcome you back soon!",
  'We appreciate your review and are glad you had a great experience. Looking forward to hosting you again!',
  "Thank you for sharing your experience. We're thrilled you loved the property and our service!",
  "We're sorry to hear about the issues you encountered. We take your feedback seriously and have addressed these concerns. We'd love the opportunity to host you again.",
  "Thank you for your honest feedback. We've made improvements based on your suggestions. Hope to see you again!",
];

export function ReviewsPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewRow | null>(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'warning' | 'info' | 'error' } | null>(
    null,
  );
  const [filters, setFilters] = useState({ ota: 'all', rating: 'all', listing: 'all', status: 'all' });
  const [visibleColumns, setVisibleColumns] = useState([
    'date',
    'checkin',
    'checkout',
    'listing',
    'guest',
    'ota',
    'rating',
    'comment',
    'status',
    'actions',
  ]);
  const [columnOrder, setColumnOrder] = useState([
    'date',
    'checkin',
    'checkout',
    'listing',
    'guest',
    'ota',
    'rating',
    'comment',
    'status',
    'actions',
  ]);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await messagesService.getReviews({ limit: 100, msgLimit: 30 });
      const threadsData = response.threads || response.data || [];
      setReviews((prev) => {
        const flagged = new Set(prev.filter((r) => r.flagged).map((r) => r.id));
        return mapApiToRows(threadsData, flagged);
      });
    } catch (err) {
      console.error('[ReviewsPage] load error:', err);
      setLoadError(err instanceof Error ? err.message : 'Erreur chargement avis');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const stats = useMemo(() => calculateStats(reviews), [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.listingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reservationNumber.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (filters.ota !== 'all' && r.ota !== filters.ota) return false;
      if (filters.rating !== 'all' && Math.round(r.rating) !== Number(filters.rating)) return false;
      if (filters.listing !== 'all' && r.listingName !== filters.listing) return false;
      if (filters.status === 'replied' && !r.replied) return false;
      if (filters.status === 'pending' && r.replied) return false;
      if (filters.status === 'urgent' && (!r.urgent || r.replied)) return false;
      if (filters.status === 'flagged' && !r.flagged) return false;
      return true;
    });
  }, [reviews, filters, searchTerm]);

  const handleReply = (review: ReviewRow) => {
    setSelectedReview(review);
    setReplyText(review.response || '');
    setReplyModalOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    setSending(true);
    try {
      await messagesService.replyToReview(selectedReview.threadId, replyText.trim());
      setReviews((prev) =>
        prev.map((review) =>
          review.id === selectedReview.id
            ? { ...review, replied: true, response: replyText.trim(), urgent: false }
            : review,
        ),
      );
      setReplyModalOpen(false);
      setSelectedReview(null);
      setReplyText('');
      setToast({ message: 'Réponse publiée', severity: 'success' });
    } catch (err) {
      console.error('[ReviewsPage] reply error:', err);
      setToast({
        message: err instanceof Error ? err.message : 'Erreur lors de la publication',
        severity: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  const handleAISuggestion = (template: string) => {
    setReplyText(template);
  };

  const handleExport = () => {
    const header = 'date,listing,guest,ota,rating,status\n';
    const body = filteredReviews
      .map((review) =>
        [
          review.date,
          review.listingName,
          review.guestName,
          review.ota,
          review.rating,
          review.replied ? 'replied' : review.flagged ? 'flagged' : review.urgent ? 'urgent' : 'pending',
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reviews-export.csv';
    link.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'Export téléchargé', severity: 'info' });
  };

  const handleFlag = (reviewId: string) => {
    setReviews((prev) => prev.map((review) => (review.id === reviewId ? { ...review, flagged: true } : review)));
    setToast({ message: 'Avis signalé (local)', severity: 'warning' });
  };

  const handleNavigateCrossChannel = (review: ReviewRow) => {
    navigate(`/communications?tab=messages&reservation=${encodeURIComponent(review.reservationNumber)}`);
  };

  const columns = [
    {
      key: 'date',
      label: 'Date avis',
      render: (row: ReviewRow) => (
        <Typography sx={{ fontSize: 13, fontFamily: 'Geist Mono' }}>
          {new Date(row.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </Typography>
      ),
    },
    {
      key: 'checkin',
      label: 'Check-in',
      render: (row: ReviewRow) => (
        <Typography sx={{ fontSize: 13, fontFamily: 'Geist Mono', whiteSpace: 'nowrap' }}>
          {formatStayDate(row.checkInDate)}
        </Typography>
      ),
    },
    {
      key: 'checkout',
      label: 'Check-out',
      render: (row: ReviewRow) => (
        <Typography sx={{ fontSize: 13, fontFamily: 'Geist Mono', whiteSpace: 'nowrap' }}>
          {formatStayDate(row.checkOutDate)}
        </Typography>
      ),
    },
    {
      key: 'listing',
      label: 'Listing',
      render: (row: ReviewRow) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 18 }}>{row.listingPhoto}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{row.listingName}</Typography>
        </Stack>
      ),
    },
    {
      key: 'guest',
      label: 'Guest',
      render: (row: ReviewRow) => <Typography sx={{ fontSize: 13 }}>{row.guestName}</Typography>,
    },
    {
      key: 'ota',
      label: 'OTA',
      render: (row: ReviewRow) => <SourcePill source={row.ota} />,
    },
    {
      key: 'rating',
      label: 'Note',
      render: (row: ReviewRow) => (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Rating value={row.rating} readOnly size="small" precision={0.5} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.rating}/5</Typography>
        </Stack>
      ),
    },
    {
      key: 'comment',
      label: 'Commentaire',
      render: (row: ReviewRow) => (
        <Typography
          sx={{
            fontSize: 13,
            color: t.text2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 300,
          }}
        >
          {row.comment}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row: ReviewRow) => (
        <Stack spacing={0.5}>
          {row.flagged ? <Badge color="error" size="sm">⚑ Signalé</Badge> : null}
          {row.replied ? (
            <Badge color="success" size="sm">✓ Répondu</Badge>
          ) : (
            <Badge color={row.urgent ? 'error' : 'warning'} size="sm">
              {row.urgent ? '🔥 Urgent' : '⏳ En attente'}
            </Badge>
          )}
        </Stack>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: ReviewRow) => (
        <Stack direction="row" spacing={0.5}>
          {!row.replied && (
            <Button sx={{ ...btnSmSx, ...btnPrimarySx }} onClick={() => handleReply(row)}>
              💬 Répondre
            </Button>
          )}
          {!row.flagged && (
            <Button sx={{ ...btnSmSx, ...btnGhostSx }} onClick={() => handleFlag(row.id)}>
              ⚑ Signaler
            </Button>
          )}
          <Button sx={{ ...btnSmSx, ...btnGhostSx }} onClick={() => handleNavigateCrossChannel(row)}>
            🔗 Canal
          </Button>
        </Stack>
      ),
    },
  ];

  const columnDefs = useMemo<ColumnDef[]>(
    () => [
      { id: 'date', label: 'Date avis' },
      { id: 'checkin', label: 'Check-in' },
      { id: 'checkout', label: 'Check-out' },
      { id: 'listing', label: 'Listing' },
      { id: 'guest', label: 'Guest', required: true },
      { id: 'ota', label: 'OTA' },
      { id: 'rating', label: 'Note' },
      { id: 'comment', label: 'Commentaire' },
      { id: 'status', label: 'Statut' },
      { id: 'actions', label: 'Actions', required: true },
    ],
    [],
  );

  const visibleOrderedColumns = useMemo(
    () =>
      columnOrder
        .filter((columnId) => visibleColumns.includes(columnId))
        .map((columnId) => columns.find((column) => column.key === columnId))
        .filter(Boolean),
    [columnOrder, columns, visibleColumns],
  );

  return (
    <DashboardWrapper breadcrumb={['CRM', 'Avis & Reviews']}>
      <PageHeader title="Avis & Reviews" count={`${filteredReviews.length}`}>
        <ColumnSelector
          columns={columnDefs}
          visible={visibleColumns}
          order={columnOrder}
          onChange={(nextVisible, nextOrder) => {
            setVisibleColumns(nextVisible);
            setColumnOrder(nextOrder);
          }}
        />
        <Button sx={btnGhostSx} onClick={() => void loadReviews()} disabled={loading}>
          🔄 Actualiser
        </Button>
        <Button sx={btnGhostSx} onClick={handleExport} disabled={!filteredReviews.length}>
          📊 Export CSV
        </Button>
        <Button
          sx={btnPrimarySx}
          onClick={() => {
            setFilters({ ota: 'all', rating: 'all', listing: 'all', status: 'all' });
            setSearchTerm('');
          }}
        >
          ⭐ Tous les avis
        </Button>
      </PageHeader>

      <StatsRow>
        <StatCard
          label="Moyenne globale"
          value={`${stats.avgRating.toFixed(1)}/5`}
          icon="⭐"
          trend={`${stats.totalReviews} avis`}
        />
        <StatCard
          label="Taux de réponse"
          value={`${stats.replyRate.toFixed(0)}%`}
          icon="💬"
          trend={`${stats.totalReviews - stats.urgentCount} répondus`}
          trendUp={stats.replyRate > 80}
        />
        <StatCard label="À répondre" value={`${stats.urgentCount}`} icon="🔥" trend="Urgent" color="error" />
        <StatCard
          label="Airbnb"
          value={`${stats.byOTA['Airbnb']?.count ? (stats.byOTA['Airbnb'].totalRating / stats.byOTA['Airbnb'].count).toFixed(1) : '—'}/5`}
          icon="🅰️"
          trend={`${stats.byOTA['Airbnb']?.count || 0} avis`}
        />
        <StatCard
          label="Booking.com"
          value={`${stats.byOTA['Booking.com']?.count ? (stats.byOTA['Booking.com'].totalRating / stats.byOTA['Booking.com'].count).toFixed(1) : '—'}/5`}
          icon="🅱️"
          trend={`${stats.byOTA['Booking.com']?.count || 0} avis`}
        />
      </StatsRow>

      <Stack
        direction="row"
        spacing={2}
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          bgcolor: t.bg1,
          borderRadius: '12px',
          border: `1px solid ${t.border}`,
          mb: 2,
        }}
      >
        <TextField
          size="small"
          label="Recherche"
          placeholder="Guest, commentaire, listing..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 240 }}
        />

        <TextField
          select
          size="small"
          label="OTA"
          value={filters.ota}
          onChange={(e) => setFilters({ ...filters, ota: e.target.value })}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="Airbnb">Airbnb</MenuItem>
          <MenuItem value="Booking.com">Booking.com</MenuItem>
          <MenuItem value="Vrbo">Vrbo</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Note"
          value={filters.rating}
          onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="all">Toutes</MenuItem>
          <MenuItem value="5">⭐⭐⭐⭐⭐</MenuItem>
          <MenuItem value="4">⭐⭐⭐⭐</MenuItem>
          <MenuItem value="3">⭐⭐⭐</MenuItem>
          <MenuItem value="2">⭐⭐</MenuItem>
          <MenuItem value="1">⭐</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Listing"
          value={filters.listing}
          onChange={(e) => setFilters({ ...filters, listing: e.target.value })}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          {Object.keys(stats.byListing).map((listing) => (
            <MenuItem key={listing} value={listing}>
              {listing}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Statut"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="pending">En attente</MenuItem>
          <MenuItem value="replied">Répondus</MenuItem>
          <MenuItem value="urgent">Urgent</MenuItem>
          <MenuItem value="flagged">Signalés</MenuItem>
        </TextField>
      </Stack>

      {loadError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: t.primary }} />
        </Box>
      ) : (
        <DataTable columns={visibleOrderedColumns} rows={filteredReviews} />
      )}

      <Dialog open={replyModalOpen} onClose={() => setReplyModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack spacing={1}>
            <Typography variant="h6">Répondre à l'avis</Typography>
            {selectedReview && (
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 14, color: t.text2 }}>
                    {selectedReview.guestName} • {selectedReview.listingName}
                  </Typography>
                  <Rating value={selectedReview.rating} readOnly size="small" precision={0.5} />
                </Stack>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: t.text3,
                    fontStyle: 'italic',
                    bgcolor: t.bg2,
                    p: 1.5,
                    borderRadius: '8px',
                    borderLeft: `3px solid ${t.primary}`,
                  }}
                >
                  "{selectedReview.comment}"
                </Typography>
              </Stack>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: t.text2 }}>
                ✨ Suggestions AI
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {AI_RESPONSE_TEMPLATES.map((template, idx) => (
                  <AIChip key={idx} label={`Suggestion ${idx + 1}`} onClick={() => handleAISuggestion(template)} />
                ))}
              </Stack>
            </Box>

            <TextField
              multiline
              rows={6}
              fullWidth
              label="Votre réponse publique"
              placeholder="Rédigez votre réponse qui sera publiée sur la plateforme OTA..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              helperText={`${replyText.length} caractères • Cette réponse sera visible publiquement`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyModalOpen(false)} sx={btnGhostSx} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={() => void handleSubmitReply()} sx={btnPrimarySx} disabled={!replyText.trim() || sending}>
            {sending ? 'Publication…' : '📤 Publier la réponse'}
          </Button>
        </DialogActions>
      </Dialog>

      {toast ? (
        <Snackbar open autoHideDuration={2500} onClose={() => setToast(null)}>
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        </Snackbar>
      ) : null}
    </DashboardWrapper>
  );
}
