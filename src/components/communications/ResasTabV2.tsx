// ════════════════════════════════════════════════════════════════════
// ResasTabV2 — onglet « Résas » de l'Inbox Guest : écrire, pas répondre.
// Une ligne = une résa, avec l'état des 2 canaux (WhatsApp / OTA) et
// l'initiation d'une conversation WhatsApp par template Meta approuvé
// (mécanisme officiel hors fenêtre 24 h). Maquette validée.
// Fils sans résa : visibles admin/superadmin uniquement (owner inconnu).
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import messagesService from '../../services/messagesService';
import { fetchInboxResas, initiateWhatsAppForResa, type InboxResaRow } from '../../services/inboxResasService';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { useAuth } from '../../hooks/useAuth';
import { Roles } from '../../constants/roles';
import { last9Phone, otaInboxUrl, waInboxUrl } from '../../utils/commsDeepLinks';

const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const C = {
  gold: '#F4CF5E', goldDeep: '#c79b22', goldTint: 'rgba(244,207,94,0.14)',
  border: 'rgba(20,17,10,0.10)', borderStrong: 'rgba(20,17,10,0.16)',
  bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.12)',
  info: '#0673b3', infoTint: 'rgba(6,115,179,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.12)',
  error: '#dc2626', errorTint: 'rgba(220,38,38,0.10)',
  wa: '#128C4B', waTint: 'rgba(37,211,102,0.12)',
};

type WaState =
  | { kind: 'actif' }
  | { kind: 'jamais' }
  | { kind: 'nonum' }
  | { kind: 'envoye'; at: string }
  | { kind: 'refuse'; error: string; notWhatsApp: boolean };

type FilterKey = 'contact' | 'arrivals7' | 'instay' | 'all';

const TEMPLATES = [
  { id: 'welcome_sojori_v2', label: '👋 Bienvenue (welcome_sojori_v2)' },
];

function phoneSourceLabel(source?: InboxResaRow['phoneSource']): string | null {
  if (source === 'whatsapp') return 'WhatsApp';
  if (source === 'ota') return 'OTA';
  if (source === 'admin') return 'Admin';
  return null;
}

function frShort(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

function StatePill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700, fontSize: 11.5,
      borderRadius: '99px', px: 1.25, py: 0.375, bgcolor: bg, color, width: 'fit-content', whiteSpace: 'nowrap',
    }}>
      {children}
    </Box>
  );
}

export default function ResasTabV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const isPlatformAdmin =
    user?.role === Roles.Admin || user?.role === Roles.SuperAdmin ||
    ['admin', 'superadmin'].includes(String(user?.role || '').toLowerCase());

  const [rows, setRows] = useState<InboxResaRow[]>([]);
  const [waPhones, setWaPhones] = useState<Set<string>>(new Set());
  const [waResaNumbers, setWaResaNumbers] = useState<Set<string>>(new Set());
  /** phone by reservation_number from WA inbox (fallback si résa sans phone) */
  const [waPhoneByResa, setWaPhoneByResa] = useState<Map<string, string>>(new Map());
  const [orphanThreads, setOrphanThreads] = useState<Array<{ phone: string; name?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const deepLinkQ =
    searchParams.get('q') ||
    searchParams.get('reservation') ||
    searchParams.get('res') ||
    '';
  const [search, setSearch] = useState(deepLinkQ);
  const [openResaId, setOpenResaId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [sending, setSending] = useState(false);
  const [sendState, setSendState] = useState<Record<string, WaState>>({});

  const load = useCallback(async () => {
    if (!scopeFetchReady) return;
    setLoading(true);
    setError(null);
    try {
      const [resas, convRes, orphansRes] = await Promise.all([
        fetchInboxResas(requestOwnerId || undefined),
        messagesService
          .getConversations({ filter: 'smart', hasReservation: true, limit: 200, owner_id: requestOwnerId || undefined, silent: true })
          .catch(() => null),
        isPlatformAdmin
          ? messagesService
              .getConversations({ filter: 'smart', hasReservation: false, limit: 50, silent: true })
              .catch(() => null)
          : Promise.resolve(null),
      ]);
      setRows(resas);
      const phones = new Set<string>();
      const resaNums = new Set<string>();
      const phoneByResa = new Map<string, string>();
      if (convRes?.status === 'success') {
        for (const c of convRes.data.conversations as Array<{ phone?: string; name?: string; reservation_number?: string }>) {
          if (c.phone) phones.add(last9Phone(String(c.phone)));
          if (c.reservation_number) {
            resaNums.add(String(c.reservation_number));
            if (c.phone && !phoneByResa.has(String(c.reservation_number))) {
              phoneByResa.set(String(c.reservation_number), String(c.phone));
            }
          }
        }
      }
      setWaPhones(phones);
      setWaResaNumbers(resaNums);
      setWaPhoneByResa(phoneByResa);
      if (orphansRes?.status === 'success') {
        setOrphanThreads(
          (orphansRes.data.conversations as Array<{ phone?: string; name?: string }>)
            .filter((c) => c.phone)
            .slice(0, 20)
            .map((c) => ({ phone: String(c.phone), name: c.name })),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [scopeFetchReady, requestOwnerId, isPlatformAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (deepLinkQ) setSearch(deepLinkQ);
  }, [deepLinkQ]);

  const waStateFor = useCallback(
    (r: InboxResaRow): WaState => {
      const local = sendState[r.id];
      if (local) return local;
      const phone =
        r.phone ||
        (r.reservationNumber ? waPhoneByResa.get(r.reservationNumber) : undefined) ||
        '';
      if (!phone) return { kind: 'nonum' };
      if (waPhones.has(last9Phone(phone)) || (r.reservationNumber && waResaNumbers.has(r.reservationNumber))) {
        return { kind: 'actif' };
      }
      return { kind: 'jamais' };
    },
    [sendState, waPhones, waResaNumbers, waPhoneByResa],
  );

  const enriched = useMemo(
    () =>
      rows.map((r) => {
        const waPhoneFallback =
          !r.phone && r.reservationNumber ? waPhoneByResa.get(r.reservationNumber) : undefined;
        const phone = r.phone || waPhoneFallback || '';
        const phoneSource = r.phoneSource || (waPhoneFallback ? 'whatsapp' : null);
        const wa = waStateFor({ ...r, phone, phoneSource });
        const jm = daysUntil(r.arrivalDate);
        const neverContacted = wa.kind !== 'actif' && !r.ota.exists;
        return { ...r, phone, phoneSource, wa, jm, urgent: neverContacted && !r.inStay && jm <= 7 };
      }),
    [rows, waStateFor, waPhoneByResa],
  );

  const counts = useMemo(
    () => ({
      contact: enriched.filter((r) => r.urgent).length,
      arrivals7: enriched.filter((r) => !r.inStay && r.jm <= 7).length,
      instay: enriched.filter((r) => r.inStay).length,
      all: enriched.length,
    }),
    [enriched],
  );

  const visible = useMemo(() => {
    let list = enriched;
    if (filter === 'contact') list = list.filter((r) => r.urgent);
    else if (filter === 'arrivals7') list = list.filter((r) => !r.inStay && r.jm <= 7);
    else if (filter === 'instay') list = list.filter((r) => r.inStay);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.guestName, r.reservationNumber, r.listingName, r.phone].some((v) =>
          String(v || '').toLowerCase().includes(q),
        ),
      );
    }
    return list;
  }, [enriched, filter, search]);

  const doInitiate = useCallback(
    async (r: InboxResaRow) => {
      setSending(true);
      const result = await initiateWhatsAppForResa(r.id, templateId);
      setSending(false);
      if (result.success) {
        setSendState((prev) => ({
          ...prev,
          [r.id]: { kind: 'envoye', at: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
        }));
        setOpenResaId(null);
      } else {
        setSendState((prev) => ({
          ...prev,
          [r.id]: { kind: 'refuse', error: result.error || 'Envoi refusé', notWhatsApp: result.notWhatsApp === true },
        }));
      }
    },
    [templateId],
  );

  const previewText = (r: InboxResaRow) =>
    `Bonjour ${r.guestName.split(' ')[0]} 👋 Bienvenue ! Votre réservation ${r.reservationNumber || '—'} à ${r.listingName || 'votre logement'} est confirmée du ${frShort(r.arrivalDate)} au ${frShort(r.departureDate)}. Je suis votre conciergerie Sojori — répondez à ce message pour toute question 😊`;

  const filterChip = (key: FilterKey, label: string) => (
    <Button
      key={key}
      onClick={() => setFilter(key)}
      sx={{
        textTransform: 'none', fontWeight: 700, fontSize: 11.5, borderRadius: '99px', px: 1.75, py: 0.625,
        border: `1.5px solid ${filter === key ? C.goldDeep : C.borderStrong}`,
        bgcolor: filter === key ? C.goldTint : C.bg1,
        color: filter === key ? C.goldDeep : C.text3,
      }}
    >
      {label} <Box component="span" sx={{ fontFamily: MONO, fontSize: 10, ml: 0.625 }}>{counts[key]}</Box>
    </Button>
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 1.5, md: 2.5 } }}>
      {/* Filtres */}
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Guest, code résa, bien, téléphone…"
          sx={{ minWidth: 240, flex: '1 1 240px', maxWidth: 380, '& input': { fontSize: 12.5, py: 0.875 } }}
        />
        {filterChip('contact', '🔥 À contacter')}
        {filterChip('arrivals7', '🛬 Arrivées 7 j')}
        {filterChip('instay', '🏠 En séjour')}
        {filterChip('all', 'Toutes')}
        <Button onClick={() => void load()} sx={{ textTransform: 'none', fontSize: 11.5, fontWeight: 700, color: C.goldDeep }}>
          ↻ Actualiser
        </Button>
      </Stack>

      {loading ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress size={24} sx={{ color: C.goldDeep }} />
        </Stack>
      ) : error ? (
        <Typography sx={{ color: C.error, fontSize: 13 }}>{error}</Typography>
      ) : (
        <>
          {visible.length === 0 ? (
            <Typography sx={{ color: C.text3, fontSize: 13, fontStyle: 'italic', py: 3 }}>
              Aucune réservation dans ce filtre.
            </Typography>
          ) : null}

          {visible.map((r) => {
            const open = openResaId === r.id;
            return (
              <Box
                key={r.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'minmax(180px,1.2fr) minmax(150px,1fr) 170px 150px minmax(180px,auto)' },
                  gap: 1.5,
                  alignItems: 'center',
                  p: '11px 14px',
                  mb: 1,
                  border: `1px solid ${r.urgent ? C.error : C.border}`,
                  boxShadow: r.urgent ? `0 0 0 2px ${C.errorTint}` : 'none',
                  borderRadius: '12px',
                  bgcolor: C.bg1,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{r.guestName}</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: C.text3 }}>
                    {r.reservationNumber || '—'} · {r.channelName || '—'}
                  </Typography>
                </Box>
                <Box sx={{ fontSize: 12, color: C.text2 }}>
                  {r.listingName || '—'}
                  {r.inStay ? <Box component="b" sx={{ color: C.success, ml: 0.75 }}>en séjour</Box> : null}
                  <br />
                  <Box component="span" sx={{ fontFamily: MONO, fontWeight: 800 }}>
                    {frShort(r.arrivalDate)} → {frShort(r.departureDate)}
                  </Box>
                  {!r.inStay && r.jm >= 0 ? (
                    <Box component="span" sx={{
                      fontFamily: MONO, fontSize: 10, borderRadius: '99px', px: 0.875, py: 0.125, ml: 0.75,
                      bgcolor: r.jm <= 7 ? C.errorTint : C.warningTint, color: r.jm <= 7 ? C.error : C.warning,
                    }}>
                      J−{r.jm}
                    </Box>
                  ) : null}
                </Box>
                <Stack sx={{ gap: 0.375 }}>
                  <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: C.text4 }}>WHATSAPP</Typography>
                  {r.wa.kind === 'actif' ? (
                    <StatePill bg={C.successTint} color={C.success}>✓ fil actif</StatePill>
                  ) : r.wa.kind === 'jamais' ? (
                    <StatePill bg={C.errorTint} color={C.error}>∅ jamais contacté</StatePill>
                  ) : r.wa.kind === 'nonum' ? (
                    <StatePill bg={C.bg3} color={C.text3}>⚠ pas de numéro</StatePill>
                  ) : r.wa.kind === 'envoye' ? (
                    <StatePill bg={C.infoTint} color={C.info}>⏳ template envoyé · {r.wa.at}</StatePill>
                  ) : (
                    <StatePill bg={C.errorTint} color={C.error}>
                      {r.wa.notWhatsApp ? '✗ pas de WhatsApp' : '✗ envoi refusé'}
                    </StatePill>
                  )}
                  {r.phone ? (
                    <Typography sx={{ fontFamily: MONO, fontSize: 10, color: C.text3, fontWeight: 600 }}>
                      +{r.phone.replace(/\D/g, '')}
                      {phoneSourceLabel(r.phoneSource) ? (
                        <Box component="span" sx={{ color: C.text4 }}> · {phoneSourceLabel(r.phoneSource)}</Box>
                      ) : null}
                    </Typography>
                  ) : null}
                </Stack>
                <Stack sx={{ gap: 0.375 }}>
                  <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: C.text4 }}>
                    OTA ({r.channelName || '—'})
                  </Typography>
                  {r.ota.exists ? (
                    <StatePill bg={C.successTint} color={C.success}>
                      ✓ fil actif{r.ota.unread ? ` · ${r.ota.unread} non lu` : ''}
                    </StatePill>
                  ) : (
                    <StatePill bg={C.errorTint} color={C.error}>∅ jamais contacté</StatePill>
                  )}
                </Stack>
                <Stack direction="row" sx={{ gap: 0.75, justifyContent: { md: 'flex-end' }, flexWrap: 'wrap' }}>
                  {(r.wa.kind === 'jamais' || r.wa.kind === 'refuse') && r.phone ? (
                    <Button
                      onClick={() => setOpenResaId(open ? null : r.id)}
                      sx={{ textTransform: 'none', bgcolor: C.wa, color: '#fff', fontWeight: 700, fontSize: 11.5, borderRadius: '9px', px: 1.75, '&:hover': { bgcolor: '#0d6e3a' } }}
                    >
                      💬 Initier WhatsApp
                    </Button>
                  ) : null}
                  {r.wa.kind === 'actif' || r.wa.kind === 'envoye' ? (
                    <Button
                      onClick={() =>
                        navigate(
                          waInboxUrl({ phone: r.phone, reservationNumber: r.reservationNumber }),
                        )
                      }
                      sx={{ textTransform: 'none', border: `1.5px solid ${C.borderStrong}`, color: C.text2, fontWeight: 700, fontSize: 11.5, borderRadius: '9px', px: 1.5 }}
                    >
                      Ouvrir le fil
                    </Button>
                  ) : null}
                  <Button
                    onClick={() =>
                      navigate(
                        otaInboxUrl({
                          threadId: r.ota.threadId,
                          reservationNumber: r.reservationNumber,
                        }),
                      )
                    }
                    sx={{
                      textTransform: 'none', fontWeight: 700, fontSize: 11.5, borderRadius: '9px', px: 1.5,
                      ...(r.ota.exists || r.wa.kind === 'nonum'
                        ? r.wa.kind === 'nonum' && !r.ota.exists
                          ? { bgcolor: C.info, color: '#fff' }
                          : { border: `1.5px solid ${C.borderStrong}`, color: C.text2 }
                        : { border: `1.5px solid ${C.borderStrong}`, color: C.text2 }),
                    }}
                  >
                    ✉️ OTA
                  </Button>
                </Stack>

                {/* Panneau initiation */}
                {open ? (
                  <Box sx={{ gridColumn: '1 / -1', bgcolor: C.bg2, border: `1px solid ${C.border}`, borderRadius: '10px', p: 2, display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 230 }}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: C.text3, mb: 0.5 }}>
                        Template Meta approuvé (hors fenêtre 24 h)
                      </Typography>
                      <TextField select size="small" value={templateId} onChange={(e) => setTemplateId(e.target.value)} sx={{ width: '100%', '& .MuiSelect-select': { fontSize: 12.5, fontWeight: 600 } }}>
                        {TEMPLATES.map((tpl) => (
                          <MenuItem key={tpl.id} value={tpl.id} sx={{ fontSize: 12.5 }}>{tpl.label}</MenuItem>
                        ))}
                      </TextField>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: C.text3, mt: 1.5, mb: 0.25 }}>
                        Numéro
                        {phoneSourceLabel(r.phoneSource) ? ` · source ${phoneSourceLabel(r.phoneSource)}` : ' (résa / whitelist)'}
                      </Typography>
                      <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 800 }}>+{r.phone.replace(/\D/g, '')}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 280 }}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: C.text3, mb: 0.5 }}>
                        Aperçu — variables pré-remplies depuis la résa
                      </Typography>
                      <Box sx={{ bgcolor: '#e7ffd9', border: '1px solid rgba(18,140,75,0.18)', borderRadius: '12px 12px 12px 3px', p: '10px 14px', fontSize: 12.5, lineHeight: 1.55, maxWidth: 440 }}>
                        {previewText(r)}
                      </Box>
                      <Typography sx={{ fontSize: 10.5, color: C.text3, mt: 0.75 }}>
                        Sa réponse ouvre la fenêtre 24 h · si le numéro n'a pas WhatsApp l'envoi est refusé et on te le dit.
                      </Typography>
                      {sendState[r.id]?.kind === 'refuse' ? (
                        <Typography sx={{ fontSize: 11.5, color: C.error, fontWeight: 700, mt: 0.75 }}>
                          {(sendState[r.id] as Extract<WaState, { kind: 'refuse' }>).error}
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack direction="row" sx={{ gap: 1, alignSelf: 'flex-end' }}>
                      <Button onClick={() => setOpenResaId(null)} sx={{ textTransform: 'none', fontSize: 12, color: C.text3 }}>
                        Annuler
                      </Button>
                      <Button
                        disabled={sending}
                        onClick={() => void doInitiate(r)}
                        sx={{ textTransform: 'none', bgcolor: C.wa, color: '#fff', fontWeight: 700, fontSize: 12.5, borderRadius: '9px', px: 2.25, '&:hover': { bgcolor: '#0d6e3a' }, '&.Mui-disabled': { bgcolor: C.bg3, color: C.text4 } }}
                      >
                        {sending ? 'Envoi…' : 'Envoyer le template →'}
                      </Button>
                    </Stack>
                  </Box>
                ) : null}
              </Box>
            );
          })}

          {/* Sans résa — admin seulement */}
          {isPlatformAdmin && orphanThreads.length > 0 ? (
            <Box sx={{ mt: 3 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: C.text2, mb: 1 }}>
                🔒 Fils sans réservation ({orphanThreads.length}) — visibles admin uniquement
              </Typography>
              {orphanThreads.map((t) => (
                <Box key={t.phone} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: '9px 14px', mb: 0.75, border: `1px dashed ${C.borderStrong}`, borderRadius: '12px', bgcolor: C.bg1, opacity: 0.85 }}>
                  <Typography sx={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800 }}>{t.name || t.phone}</Typography>
                  <Typography sx={{ fontSize: 11, color: C.text4, flex: 1 }}>aucune résa rattachée — owner inconnu</Typography>
                  <Button
                    onClick={() => navigate(waInboxUrl({ phone: t.phone }))}
                    sx={{ textTransform: 'none', border: `1.5px solid ${C.borderStrong}`, color: C.text2, fontWeight: 700, fontSize: 11, borderRadius: '9px', px: 1.5 }}
                  >
                    Ouvrir le fil
                  </Button>
                </Box>
              ))}
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}
