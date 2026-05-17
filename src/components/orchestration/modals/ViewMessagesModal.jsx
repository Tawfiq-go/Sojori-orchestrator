// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Modale Historique Messages
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import axios from 'axios';
import { API_BASE_URL as API_URL } from '../../../config/backendServer.config';
import { formatCasablancaDateTime } from '../../../utils/dateFormatting';

const ViewMessagesModal = ({ open, onClose, actionId, reservationNumber }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !actionId) return;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Appel API pour récupérer l'historique des messages
        const url = `${API_URL}/api/v1/orchestrator/actions/${actionId}/messages`;
        const response = await axios.get(url, {
          params: { reservationNumber },
          timeout: 10000,
        });

        if (response.data?.success) {
          setMessages(response.data.data || []);
        } else {
          setError(response.data?.error || 'Erreur lors du chargement');
        }
      } catch (err) {
        console.error('[ViewMessagesModal] Error fetching messages:', err);
        setError(err.response?.data?.error || err.message || 'Erreur réseau');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [open, actionId, reservationNumber]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getChannelLabel = (channel) => {
    switch (channel) {
      case 'whatsapp':
        return '📱 WhatsApp';
      case 'email':
        return '📧 Email';
      case 'sms':
        return '💬 SMS';
      default:
        return channel || 'N/A';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'var(--bg-paper, #fff)',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: 1, borderColor: 'var(--border, #e0e0e0)', pb: 2 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>
          📝 Historique des messages
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--text-muted)', mt: 0.5 }}>
          Réservation {reservationNumber}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'var(--text-muted)' }}>
            <Typography sx={{ fontSize: 14 }}>
              Aucun message trouvé
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map((msg, index) => (
              <Box
                key={msg.id || index}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'var(--border, #e0e0e0)',
                  borderRadius: 1.5,
                  bgcolor: 'var(--bg, #fafafa)',
                }}
              >
                {/* En-tête du message */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>
                      {getChannelLabel(msg.channel)}
                    </Typography>
                    <Chip
                      label={msg.status || 'UNKNOWN'}
                      color={getStatusColor(msg.status)}
                      size="small"
                      sx={{ height: 20, fontSize: 10.5, fontWeight: 600 }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace' }}>
                    {msg.sentAt ? formatCasablancaDateTime(msg.sentAt) : 'N/A'}
                  </Typography>
                </Box>

                {/* Contenu du message */}
                <Typography sx={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, mb: 1 }}>
                  {msg.content || 'Pas de contenu'}
                </Typography>

                {/* Métadonnées */}
                {msg.template && (
                  <Typography sx={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Template: {msg.template}
                  </Typography>
                )}

                {/* Erreur si échec */}
                {msg.status === 'FAILED' && msg.error && (
                  <Alert severity="error" sx={{ mt: 1, fontSize: 11 }}>
                    {msg.error}
                  </Alert>
                )}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: 1, borderColor: 'var(--border, #e0e0e0)', p: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewMessagesModal;
