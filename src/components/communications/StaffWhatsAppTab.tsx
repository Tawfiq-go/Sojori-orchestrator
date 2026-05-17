/**
 * StaffWhatsAppTab - Staff messaging without reservations
 * Aligned with legacy StaffWhatsAppNew.jsx from sojori-dashboard
 *
 * CRITICAL:
 * - Uses /staff-whatsapp/get from srv-task (NOT /ai/debug/conversations)
 * - Shows role badges (Admin/Manager/Staff)
 * - Shows phone numbers and message counts
 * - Client-side filtering by role
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  List,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  IconButton,
  Chip,
  alpha,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';

// Services
import {
  getStaffWaThreads,
  sendStaffWaText,
} from '../../services/staffWhatsAppService';

// Design system
import { COLORS, SPACING, COMPONENT_SIZES, ROLE_COLORS } from '../../design/communications-theme';

// UI Components - Import from DashboardV2 if available, otherwise we'll use simple versions
import {
  ChatLayout,
  tokens as t,
} from '../dashboard/DashboardV2.components';

const SOJORI_ORANGE = COLORS.brand.primary;

const CONFIG = {
  INITIAL_LOAD: 100,
  PAGE_SIZE: 25,
  MESSAGES_LIMIT: 50,
};

interface StaffThread {
  _id: string;
  workerWaNumber: string;
  workerWaName?: string;
  workerRole?: string;
  messages: any[];
  lastMessageAt?: string;
  staffId?: string;
  staff?: any;
}

interface MappedThread {
  id: string;
  phone: string;
  guestName: string;
  channel: string;
  lastMessage: string;
  lastMessageTime: string;
  messages: any[];
  hasReplied: boolean;
  messagesCount: number;
  role: string;
  roleLabel: string;
  staffId: string | null;
  reservationNumber: null;
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: 'host' | 'guest';
  senderName: string;
  isIncoming: boolean;
  status: string;
  whatsappMessageId?: string | null;
  optimistic?: boolean;
}

/**
 * Normalize MongoDB ID (handle ObjectId objects)
 */
function normalizeMongoId(id: any): string | null {
  if (id == null || id === '') return null;
  if (typeof id === 'object' && id.$oid) return String(id.$oid);
  return String(id);
}

/**
 * Map staff thread from API to internal format
 */
function mapStaffThreadToThread(staffThread: StaffThread): MappedThread {
  const role = staffThread.workerRole?.toLowerCase() || 'staff';
  const displayName = staffThread.workerWaName || staffThread.workerWaNumber || 'Staff';
  const messages = staffThread.messages || [];
  const lastMsg = messages[messages.length - 1];
  const lastMessage = lastMsg?.body || '';
  const lastMessageTime = lastMsg?.createdAt || staffThread.lastMessageAt || '';
  const hasReplied = lastMsg ? !lastMsg.isIncoming : false;

  const staffId = normalizeMongoId(staffThread.staffId) || null;

  return {
    id: staffThread._id,
    phone: staffThread.workerWaNumber,
    guestName: displayName,
    channel: 'Staff',
    lastMessage,
    lastMessageTime,
    messages,
    hasReplied,
    messagesCount: messages.length,
    role,
    roleLabel: role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Staff',
    staffId,
    reservationNumber: null,
  };
}

/**
 * Simple ThreadListItem component
 */
function ThreadListItem({
  thread,
  isSelected,
  onClick,
  additionalChips = [],
}: {
  thread: MappedThread;
  isSelected: boolean;
  onClick: () => void;
  additionalChips?: any[];
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: `${SPACING.md}px`,
        borderBottom: `1px solid ${COLORS.border.light}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
        bgcolor: isSelected ? COLORS.background.tertiary : 'transparent',
        borderLeft: isSelected ? `3px solid ${SOJORI_ORANGE}` : 'none',
        pl: isSelected ? `${SPACING.md - 3}px` : `${SPACING.md}px`,
        '&:hover': {
          bgcolor: COLORS.background.hover,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {/* Avatar */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: ROLE_COLORS[thread.role] || SOJORI_ORANGE,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {thread.guestName.charAt(0).toUpperCase()}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {thread.guestName}
            </Typography>
            <Typography
              sx={{
                fontSize: 11,
                color: COLORS.text.tertiary,
                flexShrink: 0,
                ml: 1,
              }}
            >
              {formatRelativeTime(thread.lastMessageTime)}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: 12,
              color: COLORS.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mb: 1,
            }}
          >
            {thread.lastMessage || 'Aucun message'}
          </Typography>

          {/* Chips */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {additionalChips.map((chip, idx) => (
              <Chip
                key={idx}
                label={chip.label}
                icon={chip.icon}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  ...chip.sx,
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Simple MessageBubble component
 */
function MessageBubble({ message }: { message: Message }) {
  const isFromAdmin = message.sender === 'host';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isFromAdmin ? 'flex-end' : 'flex-start',
        mb: 1,
      }}
    >
      <Box
        sx={{
          maxWidth: '70%',
          bgcolor: isFromAdmin ? SOJORI_ORANGE : '#fff',
          color: isFromAdmin ? '#fff' : COLORS.text.primary,
          borderRadius: 2,
          p: 1.5,
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Typography>
        <Typography
          sx={{
            fontSize: 10,
            color: isFromAdmin ? 'rgba(255,255,255,0.8)' : COLORS.text.tertiary,
            mt: 0.5,
            textAlign: 'right',
          }}
        >
          {formatTime(message.timestamp)}
          {message.status && message.status !== 'sent' && ` • ${message.status}`}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Simple EmptyState component
 */
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        textAlign: 'center',
      }}
    >
      <PhoneIcon sx={{ fontSize: 48, color: COLORS.text.tertiary, mb: 2 }} />
      <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 13, color: COLORS.text.tertiary }}>
        {description}
      </Typography>
    </Box>
  );
}

/**
 * Simple FilterBar component
 */
function FilterBar({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}) {
  const filters = [
    { value: 'all', label: 'Tous', icon: '📋' },
    { value: 'admin', label: 'Admin', icon: '👑' },
    { value: 'manager', label: 'Manager', icon: '👔' },
    { value: 'staff', label: 'Staff', icon: '👷' },
    { value: 'unreplied', label: 'Non répondus', icon: '📬' },
    { value: 'recent', label: 'Récents (24h)', icon: '🕐' },
  ];

  return (
    <Box
      sx={{
        p: `${SPACING.sm}px ${SPACING.lg}px`,
        borderBottom: `1px solid ${COLORS.border.light}`,
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        bgcolor: COLORS.background.tertiary,
      }}
    >
      {filters.map((filter) => (
        <Chip
          key={filter.value}
          label={`${filter.icon} ${filter.label}`}
          onClick={() => onFilterChange(filter.value)}
          size="small"
          sx={{
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: activeFilter === filter.value ? SOJORI_ORANGE : COLORS.background.primary,
            color: activeFilter === filter.value ? '#fff' : COLORS.text.secondary,
            border: activeFilter === filter.value ? 'none' : `1px solid ${COLORS.border.medium}`,
            '&:hover': {
              bgcolor: activeFilter === filter.value ? SOJORI_ORANGE : COLORS.background.hover,
            },
          }}
        />
      ))}
    </Box>
  );
}

/**
 * Simple ThreadHeader component
 */
function ThreadHeader({
  thread,
  additionalChips = [],
}: {
  thread: MappedThread;
  additionalChips?: any[];
}) {
  return (
    <Box
      sx={{
        p: `${SPACING.lg}px`,
        borderBottom: `1px solid ${COLORS.border.light}`,
        bgcolor: SOJORI_ORANGE,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        {thread.guestName.charAt(0).toUpperCase()}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>
          {thread.guestName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {additionalChips.map((chip, idx) => (
            <Chip
              key={idx}
              label={chip.label}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                ...chip.sx,
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Format time
 */
function formatTime(timestamp?: string): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Main StaffWhatsAppTab component
 */
export default function StaffWhatsAppTab() {
  const [threads, setThreads] = useState<MappedThread[]>([]);
  const [allThreads, setAllThreads] = useState<MappedThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MappedThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchText, setSearchText] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  /**
   * Fetch threads from API
   */
  const fetchThreads = async (pageNum = 0, append = false) => {
    setIsLoading(true);
    try {
      const limit = pageNum === 0 ? CONFIG.INITIAL_LOAD : CONFIG.PAGE_SIZE;
      const query: any = {
        page: pageNum,
        limit,
        paged: true,
        messagesLimit: CONFIG.MESSAGES_LIMIT,
        sortBy: 'recent',
      };

      if (searchText) {
        query.search_text = searchText;
      }

      const response = await getStaffWaThreads(query);
      const { rows, total } = response;
      setHasMore(rows.length < total);

      const formatted = rows.map(mapStaffThreadToThread);

      if (append) {
        const updated = [...allThreads, ...formatted];
        setAllThreads(updated);
        applyLocalFilter(activeFilter, updated);
      } else {
        setAllThreads(formatted);
        applyLocalFilter(activeFilter, formatted);
        if (formatted.length > 0 && !selectedThread) {
          setSelectedThread(formatted[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching staff threads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch messages for a thread
   */
  const fetchMessages = (thread: MappedThread) => {
    if (!thread) return;

    const threadMessages = thread.messages || [];
    const formatted: Message[] = threadMessages.map((msg: any, index: number) => {
      const isFromAdmin = !msg.isIncoming;
      const msgStatus = msg.status || 'sent';

      return {
        id: msg._id || `msg-${index}-${msg.createdAt}`,
        content: msg.body || '',
        timestamp: msg.createdAt,
        sender: isFromAdmin ? 'host' : 'guest',
        senderName: isFromAdmin ? 'Vous' : thread.guestName,
        isIncoming: msg.isIncoming,
        status: msgStatus,
        whatsappMessageId: msg.wamid || null,
      };
    });

    const sorted = formatted.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    setMessages(sorted);

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    setIsSending(true);
    try {
      const text = newMessage.trim();
      const to = selectedThread.phone;
      const workerWaName = selectedThread.guestName;

      // Optimistic update
      const tempMsg: Message = {
        id: `optimistic-${Date.now()}`,
        content: text,
        timestamp: new Date().toISOString(),
        sender: 'host',
        senderName: 'Vous',
        isIncoming: false,
        status: 'queued',
        optimistic: true,
      };

      setMessages((prev) => [...prev, tempMsg]);
      setNewMessage('');
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });

      const response = await sendStaffWaText({ to, text, workerWaName });

      if (response?.ok) {
        const wamid = response?.wamid || null;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsg.id
              ? { ...m, status: 'sent', whatsappMessageId: wamid }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'failed' } : m))
        );
      }

      // Mark as replied
      setThreads((prev) =>
        prev.map((t) =>
          t.phone === selectedThread.phone ? { ...t, hasReplied: true } : t
        )
      );
      setAllThreads((prev) =>
        prev.map((t) =>
          t.phone === selectedThread.phone ? { ...t, hasReplied: true } : t
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      alert("Erreur lors de l'envoi du message");
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Apply local filter
   */
  const applyLocalFilter = useCallback(
    (filterType: string, threadsList: MappedThread[] = allThreads) => {
      let filtered = [...threadsList];

      if (filterType === 'admin') {
        filtered = filtered.filter((t) => t.role === 'admin');
      } else if (filterType === 'staff') {
        filtered = filtered.filter((t) => t.role === 'staff');
      } else if (filterType === 'manager') {
        filtered = filtered.filter((t) => t.role === 'manager');
      } else if (filterType === 'unreplied') {
        filtered = filtered.filter((t) => !t.hasReplied);
      } else if (filterType === 'recent') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = filtered.filter(
          (t) => new Date(t.lastMessageTime) >= yesterday
        );
      }

      filtered.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
      );
      setThreads(filtered);
    },
    [allThreads]
  );

  /**
   * Handle filter change
   */
  const handleFilterChange = (filterType: string) => {
    setActiveFilter(filterType);
    applyLocalFilter(filterType, allThreads);
  };

  /**
   * Handle thread selection
   */
  const handleSelectThread = (thread: MappedThread) => {
    setSelectedThread(thread);
  };

  /**
   * Load more threads
   */
  const loadMoreThreads = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchThreads(nextPage, true);
  };

  /**
   * Handle key press (Enter to send)
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initial load
  useEffect(() => {
    fetchThreads(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (allThreads.length > 0) {
        fetchThreads(0, false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Fetch messages when thread changes
  useEffect(() => {
    if (!selectedThread) {
      setMessages([]);
      return;
    }
    fetchMessages(selectedThread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages]);

  // Filter threads by search text
  const filteredThreads = threads.filter((thread) => {
    if (!searchText) return true;
    const name = String(thread.guestName || '').toLowerCase();
    const phone = String(thread.phone || '');
    const roleLabel = String(thread.roleLabel || '').toLowerCase();
    const q = searchText.toLowerCase();
    return name.includes(q) || phone.includes(searchText) || roleLabel.includes(q);
  });

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        bgcolor: COLORS.background.secondary,
        position: 'relative',
      }}
    >
      {/* Sidebar - Conversations List */}
      <Box
        sx={{
          width: COMPONENT_SIZES.layout.sidebarWidth,
          borderRight: `1px solid ${COLORS.border.light}`,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: COLORS.background.primary,
        }}
      >
        {/* Search */}
        <Box sx={{ p: `${SPACING.lg}px`, pb: `${SPACING.md}px` }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher staff (nom, téléphone, rôle)..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: COLORS.text.tertiary }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 3,
                bgcolor: COLORS.background.tertiary,
              },
            }}
          />
        </Box>

        {/* Filters */}
        <FilterBar activeFilter={activeFilter} onFilterChange={handleFilterChange} />

        {/* Threads List */}
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: SOJORI_ORANGE }} />
            </Box>
          ) : filteredThreads.length === 0 ? (
            <EmptyState
              title="Aucune conversation staff"
              description="Les conversations avec les membres de l'équipe apparaîtront ici."
            />
          ) : (
            filteredThreads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                isSelected={selectedThread?.id === thread.id}
                onClick={() => handleSelectThread(thread)}
                additionalChips={[
                  {
                    label: thread.roleLabel,
                    sx: {
                      bgcolor: ROLE_COLORS[thread.role] || SOJORI_ORANGE,
                      color: '#fff !important',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                    },
                  },
                  {
                    icon: <PhoneIcon sx={{ fontSize: 12 }} />,
                    label: thread.phone,
                    sx: {
                      bgcolor: COLORS.background.tertiary,
                      color: `${COLORS.text.secondary} !important`,
                      fontFamily: 'monospace',
                      fontSize: '0.65rem',
                    },
                  },
                  {
                    label: `${thread.messagesCount} msg`,
                    sx: {
                      bgcolor: alpha(SOJORI_ORANGE, 0.15),
                      color: `${SOJORI_ORANGE} !important`,
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      border: `1px solid ${alpha(SOJORI_ORANGE, 0.3)}`,
                    },
                  },
                ]}
              />
            ))
          )}
        </List>

        {/* Load More */}
        {!isLoading && hasMore && filteredThreads.length > 0 && (
          <Box
            sx={{
              p: `${SPACING.lg}px`,
              borderTop: `1px solid ${COLORS.border.light}`,
            }}
          >
            <Button
              variant="outlined"
              onClick={loadMoreThreads}
              fullWidth
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: SOJORI_ORANGE,
                color: SOJORI_ORANGE,
                '&:hover': {
                  borderColor: SOJORI_ORANGE,
                  bgcolor: alpha(SOJORI_ORANGE, 0.08),
                },
              }}
            >
              Charger plus
            </Button>
          </Box>
        )}
      </Box>

      {/* Main - Chat Thread */}
      {selectedThread ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          {/* Thread Header */}
          <ThreadHeader
            thread={selectedThread}
            additionalChips={[
              {
                label: selectedThread.roleLabel,
                sx: {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: COLORS.text.inverse,
                  fontWeight: 700,
                },
              },
              {
                label: selectedThread.phone || '',
                sx: {
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: COLORS.text.inverse,
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                },
              },
              {
                label: `${selectedThread.messagesCount} messages`,
                sx: {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: COLORS.text.inverse,
                },
              },
            ]}
          />

          {/* Messages */}
          <Box
            ref={messagesScrollRef}
            sx={{
              flex: 1,
              overflow: 'auto',
              p: `${SPACING.xl}px`,
              bgcolor: COLORS.background.secondary,
              display: 'flex',
              flexDirection: 'column',
              backgroundImage:
                'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
              backgroundSize: '412.5px 749.25px',
            }}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box
            sx={{
              p: `${SPACING.lg}px`,
              display: 'flex',
              gap: `${SPACING.sm}px`,
              alignItems: 'flex-end',
              borderTop: `1px solid ${COLORS.border.light}`,
              bgcolor: COLORS.background.tertiary,
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Envoyer un message au staff..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: COLORS.background.primary,
                },
              }}
            />
            <IconButton
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              sx={{
                bgcolor: SOJORI_ORANGE,
                color: COLORS.text.inverse,
                width: 48,
                height: 48,
                '&:hover': {
                  bgcolor: SOJORI_ORANGE,
                  opacity: 0.9,
                },
                '&.Mui-disabled': {
                  bgcolor: COLORS.gray[300],
                  color: COLORS.gray[500],
                },
              }}
            >
              {isSending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EmptyState
            title="Sélectionnez une conversation"
            description="Choisissez un membre de l'équipe dans la liste pour voir les messages."
          />
        </Box>
      )}
    </Box>
  );
}
