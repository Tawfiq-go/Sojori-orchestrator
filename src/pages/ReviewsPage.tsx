import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ColumnSelector, { type ColumnDef } from '../components/filters/ColumnSelector';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, DataTable, StatCard, StatsRow, Badge, SourcePill, AIChip,
  btnPrimarySx, btnGhostSx, btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import {
  Alert, Box, Button, Snackbar, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Rating,
} from '@mui/material';

// ═══════════════════════════════════════════════════════════════
// MOCK DATA - Realistic Reviews
// ═══════════════════════════════════════════════════════════════

type ReviewRow = {
  id: string;
  date: string;
  listingName: string;
  listingPhoto: string;
  guestName: string;
  ota: 'Airbnb' | 'Booking.com' | 'Vrbo';
  rating: number;
  comment: string;
  replied: boolean;
  urgent: boolean;
  response: string;
  flagged: boolean;
  reservationNumber: string;
};

const MOCK_REVIEWS: ReviewRow[] = [
  { id: 'rv1', date: '2026-05-13', listingName: 'Villa Belvédère', listingPhoto: '🏡', guestName: 'Sarah Johnson', ota: 'Airbnb', rating: 5, comment: 'Absolutely stunning property! The views are breathtaking and the villa exceeded all expectations. Perfect for a family vacation.', replied: false, urgent: true, response: '', flagged: false, reservationNumber: 'RES-2026-001' },
  { id: 'rv2', date: '2026-05-12', listingName: 'Dar Sojori', listingPhoto: '🏘️', guestName: 'Marco Rossi', ota: 'Booking.com', rating: 4, comment: 'Great location and beautiful riad. Only minor issue was the wifi speed, but overall wonderful experience.', replied: true, urgent: false, response: 'Thank you Marco! We appreciate your feedback. We have upgraded our wifi since your stay. Hope to welcome you again soon!', flagged: false, reservationNumber: 'RES-2026-002' },
  { id: 'rv3', date: '2026-05-11', listingName: 'Villa Atlas', listingPhoto: '⛰️', guestName: 'Aisha Khalil', ota: 'Airbnb', rating: 5, comment: 'Perfect mountain retreat. Clean, well-equipped, and the host was incredibly responsive. Highly recommend!', replied: true, urgent: false, response: 'Thank you Aisha! It was our pleasure to host you. Welcome back anytime!', flagged: false, reservationNumber: 'RES-2026-003' },
  { id: 'rv4', date: '2026-05-10', listingName: 'Riad Jasmine', listingPhoto: '🌸', guestName: 'Pierre Dubois', ota: 'Vrbo', rating: 3, comment: 'Decent property but had some maintenance issues. Hot water was inconsistent and some lights were not working.', replied: false, urgent: true, response: '', flagged: false, reservationNumber: 'RES-2026-004' },
  { id: 'rv5', date: '2026-05-09', listingName: 'Villa Belvédère', listingPhoto: '🏡', guestName: 'Emma Watson', ota: 'Airbnb', rating: 5, comment: 'Magical experience! The infinity pool at sunset is pure bliss. Communication was excellent throughout.', replied: true, urgent: false, response: 'Thank you Emma! Your kind words mean the world to us. We hope to host you again!', flagged: false, reservationNumber: 'RES-2026-005' },
  { id: 'rv6', date: '2026-05-08', listingName: 'Dar Sojori', listingPhoto: '🏘️', guestName: 'Ahmed Hassan', ota: 'Booking.com', rating: 4, comment: 'Beautiful traditional riad in the medina. Some noise from the street but overall great stay.', replied: false, urgent: false, response: '', flagged: false, reservationNumber: 'RES-2026-006' },
  { id: 'rv7', date: '2026-05-07', listingName: 'Villa Atlas', listingPhoto: '⛰️', guestName: 'Sophie Martin', ota: 'Airbnb', rating: 5, comment: 'Breathtaking views and pristine property. The concierge service was exceptional. Will definitely return!', replied: true, urgent: false, response: 'Merci Sophie! We loved hosting you and your family. À bientôt!', flagged: false, reservationNumber: 'RES-2026-007' },
  { id: 'rv8', date: '2026-05-06', listingName: 'Riad Jasmine', listingPhoto: '🌸', guestName: 'Carlos Mendez', ota: 'Booking.com', rating: 2, comment: 'Property did not match photos. Several amenities were not available and cleanliness was subpar.', replied: false, urgent: true, response: '', flagged: false, reservationNumber: 'RES-2026-008' },
  { id: 'rv9', date: '2026-05-05', listingName: 'Villa Belvédère', listingPhoto: '🏡', guestName: 'Lisa Anderson', ota: 'Vrbo', rating: 5, comment: 'Paradise! Everything was perfect from check-in to check-out. The staff went above and beyond.', replied: true, urgent: false, response: 'Thank you Lisa! Your satisfaction is our priority. Hope to welcome you back soon!', flagged: false, reservationNumber: 'RES-2026-009' },
  { id: 'rv10', date: '2026-05-04', listingName: 'Dar Sojori', listingPhoto: '🏘️', guestName: 'Mohammed Aziz', ota: 'Airbnb', rating: 4, comment: 'Authentic Moroccan experience. Loved the rooftop terrace. Some minor wear and tear but overall great.', replied: false, urgent: false, response: '', flagged: false, reservationNumber: 'RES-2026-010' },
];

// Calculate stats from reviews
const calculateStats = (reviews: typeof MOCK_REVIEWS) => {
  const totalReviews = reviews.length;
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  const repliedCount = reviews.filter(r => r.replied).length;
  const replyRate = (repliedCount / totalReviews) * 100;
  const urgentCount = reviews.filter(r => !r.replied && (r.rating < 4 || r.urgent)).length;

  // By OTA
  const byOTA = reviews.reduce((acc, r) => {
    if (!acc[r.ota]) acc[r.ota] = { count: 0, totalRating: 0 };
    acc[r.ota].count++;
    acc[r.ota].totalRating += r.rating;
    return acc;
  }, {} as Record<string, { count: number; totalRating: number }>);

  // By listing
  const byListing = reviews.reduce((acc, r) => {
    if (!acc[r.listingName]) acc[r.listingName] = { count: 0, totalRating: 0 };
    acc[r.listingName].count++;
    acc[r.listingName].totalRating += r.rating;
    return acc;
  }, {} as Record<string, { count: number; totalRating: 0 }>);

  return { totalReviews, avgRating, replyRate, urgentCount, byOTA, byListing };
};

// AI suggestions for responses
const AI_RESPONSE_TEMPLATES = [
  "Thank you for your wonderful feedback! We're delighted you enjoyed your stay. We hope to welcome you back soon!",
  "We appreciate your review and are glad you had a great experience. Looking forward to hosting you again!",
  "Thank you for sharing your experience. We're thrilled you loved the property and our service!",
  "We're sorry to hear about the issues you encountered. We take your feedback seriously and have addressed these concerns. We'd love the opportunity to host you again.",
  "Thank you for your honest feedback. We've made improvements based on your suggestions. Hope to see you again!",
];

export function ReviewsPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewRow[]>(MOCK_REVIEWS);
  const [selectedReview, setSelectedReview] = useState<ReviewRow | null>(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'warning' | 'info' } | null>(null);
  const [filters, setFilters] = useState({ ota: 'all', rating: 'all', listing: 'all', status: 'all' });
  const [visibleColumns, setVisibleColumns] = useState(['date', 'listing', 'guest', 'ota', 'rating', 'comment', 'status', 'actions']);
  const [columnOrder, setColumnOrder] = useState(['date', 'listing', 'guest', 'ota', 'rating', 'comment', 'status', 'actions']);

  const stats = useMemo(() => calculateStats(reviews), [reviews]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const matchesSearch =
        !searchTerm ||
        r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.listingName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (filters.ota !== 'all' && r.ota !== filters.ota) return false;
      if (filters.rating !== 'all' && r.rating !== Number(filters.rating)) return false;
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

  const handleSubmitReply = () => {
    if (!selectedReview) return;

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
    setToast({ message: 'Avis signalé', severity: 'warning' });
  };

  const handleNavigateCrossChannel = (review: ReviewRow) => {
    navigate(`/communications/whatsapp?reservation=${review.reservationNumber}`);
  };

  // DataTable columns
  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (row: ReviewRow) => (
        <Typography sx={{ fontSize: 13, fontFamily: 'Geist Mono' }}>
          {new Date(row.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
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
      render: (row: ReviewRow) => (
        <Typography sx={{ fontSize: 13 }}>{row.guestName}</Typography>
      ),
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
          <Rating value={row.rating} readOnly size="small" />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {row.rating}/5
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'comment',
      label: 'Commentaire',
      render: (row: ReviewRow) => (
        <Typography sx={{
          fontSize: 13,
          color: t.text2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 300,
        }}>
          {row.comment}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row: ReviewRow) => (
        <Stack spacing={0.5}>
          {row.flagged ? (
            <Badge color="error" size="sm">⚑ Signalé</Badge>
          ) : null}
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
            <Button
              sx={{ ...btnSmSx, ...btnPrimarySx }}
              onClick={() => handleReply(row)}
            >
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
      { id: 'date', label: 'Date' },
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
    <DashboardWrapper breadcrumb={['Service Client', 'Avis & Reviews']}>
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
        <Button sx={btnGhostSx} onClick={handleExport}>📊 Export CSV</Button>
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

      {/* Stats Row */}
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
        <StatCard
          label="À répondre"
          value={`${stats.urgentCount}`}
          icon="🔥"
          trend="Urgent"
          color="error"
        />
        <StatCard
          label="Airbnb"
          value={`${(stats.byOTA['Airbnb']?.totalRating / stats.byOTA['Airbnb']?.count || 0).toFixed(1)}/5`}
          icon="🅰️"
          trend={`${stats.byOTA['Airbnb']?.count || 0} avis`}
        />
        <StatCard
          label="Booking.com"
          value={`${(stats.byOTA['Booking.com']?.totalRating / stats.byOTA['Booking.com']?.count || 0).toFixed(1)}/5`}
          icon="🅱️"
          trend={`${stats.byOTA['Booking.com']?.count || 0} avis`}
        />
      </StatsRow>

      {/* Filters */}
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
          {Object.keys(stats.byListing).map(listing => (
            <MenuItem key={listing} value={listing}>{listing}</MenuItem>
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

      {/* DataTable */}
      <DataTable
        columns={visibleOrderedColumns}
        rows={filteredReviews}
      />

      {/* Reply Modal */}
      <Dialog
        open={replyModalOpen}
        onClose={() => setReplyModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack spacing={1}>
            <Typography variant="h6">Répondre à l'avis</Typography>
            {selectedReview && (
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 14, color: t.text2 }}>
                    {selectedReview.guestName} • {selectedReview.listingName}
                  </Typography>
                  <Rating value={selectedReview.rating} readOnly size="small" />
                </Stack>
                <Typography sx={{
                  fontSize: 13,
                  color: t.text3,
                  fontStyle: 'italic',
                  bgcolor: t.bg2,
                  p: 1.5,
                  borderRadius: '8px',
                  borderLeft: `3px solid ${t.primary}`,
                }}>
                  "{selectedReview.comment}"
                </Typography>
              </Stack>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            {/* AI Suggestions */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: t.text2 }}>
                ✨ Suggestions AI
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {AI_RESPONSE_TEMPLATES.map((template, idx) => (
                  <AIChip
                    key={idx}
                    label={`Suggestion ${idx + 1}`}
                    onClick={() => handleAISuggestion(template)}
                  />
                ))}
              </Stack>
            </Box>

            {/* Response textarea */}
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
          <Button onClick={() => setReplyModalOpen(false)} sx={btnGhostSx}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmitReply}
            sx={btnPrimarySx}
            disabled={!replyText.trim()}
          >
            📤 Publier la réponse
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
