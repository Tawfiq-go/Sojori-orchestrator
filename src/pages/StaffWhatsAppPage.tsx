import React, { useState, useMemo } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { CommunicationsSectionToggle } from '../components/CommunicationsSectionToggle';
import {
  PageHeader,
  btnPrimarySx,
  ChatLayout,
  ConversationList,
  ChatThread,
  ChatAside,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import {
  Box,
  Alert,
  Button,
  Stack,
  Snackbar,
  Typography,
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

// MOCK DATA - Staff conversations
const STAFF_LIST = [
  { id: 'STAFF001', name: 'Fatima El Amrani', role: 'Femme de menage', phone: '+33612345678', avatar: 'https://i.pravatar.cc/150?img=1', online: true },
  { id: 'STAFF002', name: 'Youssef Bennani', role: 'Maintenance', phone: '+33623456789', avatar: 'https://i.pravatar.cc/150?img=11', online: false },
  { id: 'STAFF003', name: 'Khadija Moussaoui', role: 'Femme de menage', phone: '+33634567890', avatar: 'https://i.pravatar.cc/150?img=5', online: true },
  { id: 'STAFF004', name: 'Mohamed Alaoui', role: 'Chauffeur', phone: '+33645678901', avatar: 'https://i.pravatar.cc/150?img=12', online: true },
  { id: 'STAFF005', name: 'Amina Chakir', role: 'Conciergerie', phone: '+33656789012', avatar: 'https://i.pravatar.cc/150?img=9', online: false },
  { id: 'STAFF006', name: 'Rachid Tazi', role: 'Maintenance', phone: '+33667890123', avatar: 'https://i.pravatar.cc/150?img=13', online: true },
  { id: 'STAFF007', name: 'Sanaa Idrissi', role: 'Femme de menage', phone: '+33678901234', avatar: 'https://i.pravatar.cc/150?img=20', online: false },
  { id: 'STAFF008', name: 'Hassan Berrada', role: 'Chauffeur', phone: '+33689012345', avatar: 'https://i.pravatar.cc/150?img=15', online: true },
  { id: 'STAFF009', name: 'Nadia Azzouzi', role: 'Conciergerie', phone: '+33690123456', avatar: 'https://i.pravatar.cc/150?img=23', online: true },
  { id: 'STAFF010', name: 'Omar Benali', role: 'Maintenance', phone: '+33601234567', avatar: 'https://i.pravatar.cc/150?img=14', online: false },
];

const GROUPS = [
  { id: 'GROUP_ALL', name: 'Tous les staff', icon: '👥', members: STAFF_LIST.map(s => s.id), unread: 2 },
  { id: 'GROUP_MENAGE', name: 'Equipe Menage', icon: '🧹', members: STAFF_LIST.filter(s => s.role === 'Femme de menage').map(s => s.id), unread: 0 },
  { id: 'GROUP_MAINTENANCE', name: 'Equipe Maintenance', icon: '🔧', members: STAFF_LIST.filter(s => s.role === 'Maintenance').map(s => s.id), unread: 1 },
  { id: 'GROUP_CHAUFFEURS', name: 'Equipe Chauffeurs', icon: '🚗', members: STAFF_LIST.filter(s => s.role === 'Chauffeur').map(s => s.id), unread: 0 },
  { id: 'GROUP_CONCIERGERIE', name: 'Equipe Conciergerie', icon: '🎯', members: STAFF_LIST.filter(s => s.role === 'Conciergerie').map(s => s.id), unread: 0 },
];

// Generate mock messages
const MOCK_MESSAGES: any[] = [];
const now = new Date();

// Individual conversations
STAFF_LIST.forEach((staff, idx) => {
  const msgCount = 3 + Math.floor(Math.random() * 10);
  for (let i = 0; i < msgCount; i++) {
    const isFromMe = i % 3 !== 0;
    const date = new Date(now);
    date.setHours(date.getHours() - (msgCount - i) * 2);

    const templates = isFromMe
      ? [
        'Bonjour, pouvez-vous me confirmer votre disponibilite pour demain?',
        'Merci pour votre travail! Tout est parfait.',
        'Nouvelle tache assignee: Menage Appt Marrakech Centre 14h',
        'N\'oubliez pas de prendre les cles a la reception.',
        'Rappelez-vous de verifier la liste avant de partir.',
      ]
      : [
        'Oui, je suis disponible demain de 9h a 17h',
        'Merci! Je ferai de mon mieux.',
        'Tache recue, je la commence a 14h',
        'Entendu, je passerai les prendre.',
        'Pas de probleme, c\'est note!',
      ];

    MOCK_MESSAGES.push({
      id: `MSG_${staff.id}_${i}`,
      conversationId: staff.id,
      conversationType: 'individual',
      sender: isFromMe ? 'me' : staff.id,
      senderName: isFromMe ? 'Vous' : staff.name,
      senderAvatar: isFromMe ? null : staff.avatar,
      text: templates[Math.floor(Math.random() * templates.length)],
      timestamp: date.toISOString(),
      status: isFromMe ? (i === msgCount - 1 && idx < 2 ? 'sent' : 'delivered') : undefined,
      read: i < msgCount - (idx % 3),
    });
  }
});

// Group conversations
GROUPS.forEach((group, gIdx) => {
  const msgCount = 5 + Math.floor(Math.random() * 15);
  for (let i = 0; i < msgCount; i++) {
    const isFromMe = i % 4 === 0;
    const sender = isFromMe ? 'me' : group.members[Math.floor(Math.random() * group.members.length)];
    const senderStaff = STAFF_LIST.find(s => s.id === sender);
    const date = new Date(now);
    date.setHours(date.getHours() - (msgCount - i));

    const templates = isFromMe
      ? [
        'Rappel: Reunion d\'equipe demain a 9h',
        'Nouveau planning disponible pour la semaine prochaine',
        'Merci a tous pour votre excellent travail cette semaine!',
        'N\'oubliez pas de remplir vos rapports de fin de journee',
      ]
      : [
        'Ok, merci pour l\'info!',
        'Je serai la.',
        'Recu, je regarderai ce soir.',
        'Parfait, a demain!',
        'D\'accord, merci!',
      ];

    MOCK_MESSAGES.push({
      id: `MSG_${group.id}_${i}`,
      conversationId: group.id,
      conversationType: 'group',
      sender: isFromMe ? 'me' : sender,
      senderName: isFromMe ? 'Vous' : senderStaff?.name || 'Unknown',
      senderAvatar: isFromMe ? null : senderStaff?.avatar,
      text: templates[Math.floor(Math.random() * templates.length)],
      timestamp: date.toISOString(),
      status: isFromMe ? 'delivered' : undefined,
      read: i < msgCount - (gIdx % 2),
    });
  }
});

const INITIAL_MESSAGES_BY_CONVERSATION = MOCK_MESSAGES.reduce<Record<string, any[]>>((acc, message) => {
  if (!acc[message.conversationId]) {
    acc[message.conversationId] = [];
  }
  acc[message.conversationId].push(message);
  return acc;
}, {});

export function StaffWhatsAppPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(STAFF_LIST[0].id);
  const [conversationType, setConversationType] = useState<'individual' | 'group'>('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastRecipients, setBroadcastRecipients] = useState<string[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, any[]>>(INITIAL_MESSAGES_BY_CONVERSATION);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'info' } | null>(null);

  // Get conversations list
  const conversations = useMemo(() => {
    if (conversationType === 'individual') {
      return STAFF_LIST.map(staff => {
        const messages = messagesByConversation[staff.id] || [];
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(m => !m.read && m.sender !== 'me').length;

        return {
          id: staff.id,
          type: 'individual' as const,
          name: staff.name,
          subtitle: staff.role,
          avatar: staff.avatar,
          lastMessage: lastMessage?.text || '',
          lastMessageTime: lastMessage?.timestamp || new Date().toISOString(),
          unreadCount,
          online: staff.online,
        };
      }).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    } else {
      return GROUPS.map(group => {
        const messages = messagesByConversation[group.id] || [];
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(m => !m.read && m.sender !== 'me').length;

        return {
          id: group.id,
          type: 'group' as const,
          name: group.name,
          subtitle: `${group.members.length} membres`,
          avatar: group.icon,
          lastMessage: lastMessage?.text || '',
          lastMessageTime: lastMessage?.timestamp || new Date().toISOString(),
          unreadCount,
        };
      }).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    }
  }, [conversationType, messagesByConversation]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    return conversations.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Get current conversation messages
  const currentMessages = useMemo(() => {
    if (!selectedConversation) return [];
    return (messagesByConversation[selectedConversation] || [])
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messagesByConversation, selectedConversation]);

  // Get conversation info
  const currentConversationInfo = useMemo(() => {
    if (!selectedConversation) return null;
    if (conversationType === 'individual') {
      return STAFF_LIST.find(s => s.id === selectedConversation);
    } else {
      const group = GROUPS.find(g => g.id === selectedConversation);
      if (!group) return null;
      return {
        ...group,
        membersList: STAFF_LIST.filter(s => group.members.includes(s.id)),
      };
    }
  }, [selectedConversation, conversationType]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const trimmed = messageInput.trim();
    const nextMessage = {
      id: `MSG_${selectedConversation}_${Date.now()}`,
      conversationId: selectedConversation,
      conversationType,
      sender: 'me',
      senderName: 'Vous',
      senderAvatar: null,
      text: trimmed,
      timestamp: new Date().toISOString(),
      status: 'sent',
      read: true,
    };

    setMessagesByConversation((prev) => ({
      ...prev,
      [selectedConversation]: [...(prev[selectedConversation] || []), nextMessage],
    }));
    setMessageInput('');
    setToast({ message: 'Message envoyé', severity: 'success' });
  };

  const handleBroadcast = () => {
    if (!broadcastMessage.trim() || broadcastRecipients.length === 0) return;

    const trimmed = broadcastMessage.trim();
    const sentAt = new Date().toISOString();

    setMessagesByConversation((prev) => {
      const next = { ...prev };

      broadcastRecipients.forEach((staffId) => {
        const nextMessage = {
          id: `MSG_BROADCAST_${staffId}_${Date.now()}`,
          conversationId: staffId,
          conversationType: 'individual',
          sender: 'me',
          senderName: 'Vous',
          senderAvatar: null,
          text: trimmed,
          timestamp: sentAt,
          status: 'sent',
          read: true,
        };

        next[staffId] = [...(next[staffId] || []), nextMessage];
      });

      return next;
    });
    setShowBroadcastModal(false);
    setBroadcastRecipients([]);
    setBroadcastMessage('');
    setToast({
      message: `Message diffusé à ${broadcastRecipients.length} personne${broadcastRecipients.length > 1 ? 's' : ''}`,
      severity: 'info',
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 48) {
      return 'Hier ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <DashboardWrapper breadcrumb={['Communications', 'WhatsApp Staff']}>
      <PageHeader title="WhatsApp Staff" count={totalUnread > 0 ? `${totalUnread} non lu${totalUnread > 1 ? 's' : ''}` : ''}>
        <CommunicationsSectionToggle />
        <Button sx={btnPrimarySx} onClick={() => setShowBroadcastModal(true)}>📢 Broadcast</Button>
      </PageHeader>

      <Box sx={{ px: { xs: 0, md: 3 }, pb: 4, height: 'calc(100vh - 200px)' }}>
        <Box sx={{
          height: '100%',
          bgcolor: t.bg1,
          border: `1px solid ${t.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '320px 1fr 280px',
        }}>
          {/* Left: Conversations List */}
          <Box sx={{ borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <Tabs
              value={conversationType}
              onChange={(_, v) => {
                setConversationType(v);
                setSelectedConversation(null);
              }}
              sx={{ borderBottom: `1px solid ${t.border}`, minHeight: 48 }}
            >
              <Tab label="Individuels" value="individual" />
              <Tab label={<Badge badgeContent={GROUPS.reduce((sum, g) => sum + g.unread, 0)} color="error">Groupes</Badge>} value="group" />
            </Tabs>

            {/* Search */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}` }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
                }}
              />
            </Box>

            {/* List */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {filteredConversations.map(conv => (
                <Box
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv.id);
                  }}
                  sx={{
                    p: 2,
                    borderBottom: `1px solid ${t.border}`,
                    cursor: 'pointer',
                    bgcolor: selectedConversation === conv.id ? t.bg2 : 'transparent',
                    '&:hover': { bgcolor: t.bg2 },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Badge
                      variant="dot"
                      color="success"
                      invisible={conv.type === 'group' || !conv.online}
                      overlap="circular"
                    >
                      {conv.type === 'group' ? (
                        <Box sx={{
                          width: 40,
                          height: 40,
                          bgcolor: t.primary,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}>
                          {conv.avatar}
                        </Box>
                      ) : (
                        <Avatar src={conv.avatar} sx={{ width: 40, height: 40 }} />
                      )}
                    </Badge>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.name}
                        </Typography>
                        <Typography sx={{ fontSize: '11px', color: t.text3 }}>{formatTime(conv.lastMessageTime)}</Typography>
                      </Stack>
                      <Typography sx={{ fontSize: '12px', color: t.text3 }}>{conv.subtitle}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography sx={{
                          fontSize: '12px',
                          color: t.text3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}>
                          {conv.lastMessage}
                        </Typography>
                        {conv.unreadCount > 0 && (
                          <Chip
                            label={conv.unreadCount}
                            size="small"
                            sx={{ bgcolor: t.primary, color: 'white', height: 20, fontSize: '10px', fontWeight: 700 }}
                          />
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Center: Chat Thread */}
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {selectedConversation && currentConversationInfo ? (
              <>
                {/* Header */}
                <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}`, bgcolor: t.bg2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {conversationType === 'group' ? (
                      <Box sx={{
                        width: 40,
                        height: 40,
                        bgcolor: t.primary,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}>
                        {(currentConversationInfo as any).icon}
                      </Box>
                    ) : (
                      <Avatar src={(currentConversationInfo as any).avatar} sx={{ width: 40, height: 40 }} />
                    )}
                    <Box>
                      <Typography sx={{ fontSize: '15px', fontWeight: 600 }}>
                        {(currentConversationInfo as any).name}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: t.text3 }}>
                        {conversationType === 'group'
                          ? `${(currentConversationInfo as any).members.length} membres`
                          : (currentConversationInfo as any).role}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: t.bg0 }}>
                  <Stack spacing={2}>
                    {currentMessages.map(msg => (
                      <Box
                        key={msg.id}
                        sx={{
                          display: 'flex',
                          justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Stack direction={msg.sender === 'me' ? 'row-reverse' : 'row'} spacing={1} alignItems="flex-end" sx={{ maxWidth: '70%' }}>
                          {msg.sender !== 'me' && conversationType === 'group' && (
                            <Avatar src={msg.senderAvatar || ''} sx={{ width: 28, height: 28 }} />
                          )}
                          <Box>
                            {msg.sender !== 'me' && conversationType === 'group' && (
                              <Typography sx={{ fontSize: '11px', color: t.text3, mb: 0.5, px: 1 }}>
                                {msg.senderName}
                              </Typography>
                            )}
                            <Box
                              sx={{
                                bgcolor: msg.sender === 'me' ? t.primary : t.bg1,
                                color: msg.sender === 'me' ? 'white' : t.text,
                                p: 1.5,
                                borderRadius: '12px',
                                border: msg.sender === 'me' ? 'none' : `1px solid ${t.border}`,
                              }}
                            >
                              <Typography sx={{ fontSize: '13px' }}>{msg.text}</Typography>
                              <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ mt: 0.5 }}>
                                <Typography sx={{
                                  fontSize: '10px',
                                  color: msg.sender === 'me' ? 'rgba(255,255,255,0.7)' : t.text3,
                                }}>
                                  {formatTime(msg.timestamp)}
                                </Typography>
                                {msg.sender === 'me' && (
                                  <Typography sx={{ fontSize: '12px' }}>
                                    {msg.status === 'sent' ? '✓' : msg.status === 'delivered' ? '✓✓' : '✓✓'}
                                  </Typography>
                                )}
                              </Stack>
                            </Box>
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                {/* Input */}
                <Box sx={{ p: 2, borderTop: `1px solid ${t.border}`, bgcolor: t.bg2 }}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Ecrire un message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button variant="contained" sx={btnPrimarySx} onClick={handleSendMessage}>
                      Envoyer
                    </Button>
                  </Stack>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography sx={{ color: t.text3 }}>Selectionnez une conversation</Typography>
              </Box>
            )}
          </Box>

          {/* Right: Info Panel */}
          <Box sx={{ borderLeft: `1px solid ${t.border}`, p: 2, overflowY: 'auto', bgcolor: t.bg0 }}>
            {selectedConversation && currentConversationInfo && (
              <Stack spacing={2}>
                <Box sx={{ textAlign: 'center' }}>
                  {conversationType === 'group' ? (
                    <Box sx={{
                      width: 80,
                      height: 80,
                      bgcolor: t.primary,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '40px',
                      mx: 'auto',
                      mb: 1,
                    }}>
                      {(currentConversationInfo as any).icon}
                    </Box>
                  ) : (
                    <Avatar src={(currentConversationInfo as any).avatar} sx={{ width: 80, height: 80, mx: 'auto', mb: 1 }} />
                  )}
                  <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>{(currentConversationInfo as any).name}</Typography>
                  <Typography sx={{ fontSize: '13px', color: t.text3 }}>
                    {conversationType === 'group'
                      ? `${(currentConversationInfo as any).members.length} membres`
                      : (currentConversationInfo as any).phone}
                  </Typography>
                </Box>

                {conversationType === 'group' && (
                  <Box>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, mb: 1 }}>Membres du groupe</Typography>
                    <Stack spacing={1}>
                      {(currentConversationInfo as any).membersList.map((member: any) => (
                        <Stack key={member.id} direction="row" spacing={1} alignItems="center">
                          <Avatar src={member.avatar} sx={{ width: 32, height: 32 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>{member.name}</Typography>
                            <Typography sx={{ fontSize: '11px', color: t.text3 }}>{member.role}</Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </Box>

      {/* Broadcast Modal */}
      <Dialog open={showBroadcastModal} onClose={() => setShowBroadcastModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Message Broadcast</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>Destinataires:</Typography>
            <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {STAFF_LIST.map(staff => (
                <FormControlLabel
                  key={staff.id}
                  control={
                    <Checkbox
                      checked={broadcastRecipients.includes(staff.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBroadcastRecipients([...broadcastRecipients, staff.id]);
                        } else {
                          setBroadcastRecipients(broadcastRecipients.filter(id => id !== staff.id));
                        }
                      }}
                    />
                  }
                  label={`${staff.name} (${staff.role})`}
                />
              ))}
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Votre message..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBroadcastModal(false)}>Annuler</Button>
          <Button
            variant="contained"
            sx={btnPrimarySx}
            onClick={handleBroadcast}
            disabled={broadcastRecipients.length === 0 || !broadcastMessage.trim()}
          >
            Envoyer ({broadcastRecipients.length})
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(null)}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : null}
      </Snackbar>
    </DashboardWrapper>
  );
}
