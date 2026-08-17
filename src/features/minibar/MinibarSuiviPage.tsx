import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import {
  fetchMinibarExtras,
  fetchMinibarJournal,
  fetchMinibarOverview,
  fetchMinibarSessions,
  fetchMinibarStock,
  type MinibarEntryType,
  type MinibarJournalEntry,
  type MinibarRoomOverview,
  type MinibarSession,
  type MinibarStayExtra,
  type MinibarStockLine,
} from './minibarApi';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const fmtMoney = (n: number, currency = 'MAD') => `${(n ?? 0).toLocaleString('fr-FR')} ${currency}`;

const TYPE_LABEL: Record<MinibarEntryType, { label: string; color: 'success' | 'info' | 'warning' | 'default' }> = {
  consumption: { label: '🥤 Consommé', color: 'success' },
  stock_in: { label: '➕ Ajout', color: 'info' },
  restock: { label: '🔄 Réappro', color: 'info' },
  correction: { label: '➖ Correction', color: 'warning' },
};

function loadErr(e: unknown) {
  toast.error(e instanceof Error ? e.message : 'Chargement impossible');
}

/* ------------------------------------------------------------------ */
/* Onglet Villas — vue d'ensemble + stock détaillé dépliable           */
/* ------------------------------------------------------------------ */

function VillaRow({ room }: { room: MinibarRoomOverview }) {
  const [open, setOpen] = useState(false);
  const [stock, setStock] = useState<MinibarStockLine[] | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && stock === null) {
      try {
        setStock(await fetchMinibarStock(room.roomId));
      } catch (e) {
        loadErr(e);
        setStock([]);
      }
    }
  };

  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => void toggle()}>
        <TableCell padding="checkbox">
          <IconButton size="small">{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}</IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>{room.roomName || room.roomId}</TableCell>
        <TableCell align="right">{room.stockItems}</TableCell>
        <TableCell align="right">{room.products}</TableCell>
        <TableCell>
          {room.openExtra ? (
            <Chip
              size="small"
              color="success"
              label={`${room.openExtra.guestName || 'Client'} · ${fmtMoney(room.openExtra.totalToBill, room.openExtra.currency)}`}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">Libre</Typography>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2">{fmtDate(room.lastEntryAt)}</Typography>
          {room.lastEntryBy ? (
            <Typography variant="caption" color="text.secondary">{room.lastEntryBy}</Typography>
          ) : null}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ py: 1.5, pl: 6 }}>
              {stock === null ? (
                <Typography variant="body2" color="text.secondary">Chargement…</Typography>
              ) : stock.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Stock vide.</Typography>
              ) : (
                <Table size="small" sx={{ maxWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell align="right">Qté</TableCell>
                      <TableCell>Dernier mouvement</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stock.map((l) => (
                      <TableRow key={l.productId} sx={{ opacity: l.qty > 0 ? 1 : 0.45 }}>
                        <TableCell>{l.productName}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{l.qty}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {fmtDate(l.lastMoveAt)}
                            {l.lastMoveBy ? ` · ${l.lastMoveBy}` : ''}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function VillasTab() {
  const [rooms, setRooms] = useState<MinibarRoomOverview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRooms(await fetchMinibarOverview());
    } catch (e) {
      loadErr(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Chargement…' : `${rooms.length} mini-bar${rooms.length > 1 ? 's' : ''} suivis`}
        </Typography>
        <Button size="small" variant="text" onClick={() => void load()}>Actualiser</Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" />
            <TableCell>Villa</TableCell>
            <TableCell align="right">Articles en stock</TableCell>
            <TableCell align="right">Produits</TableCell>
            <TableCell>Client présent · à facturer</TableCell>
            <TableCell>Dernière activité</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rooms.map((r) => (
            <VillaRow key={r.roomId} room={r} />
          ))}
        </TableBody>
      </Table>
      {!loading && rooms.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Aucun mini-bar suivi pour l'instant — le suivi démarre au premier geste du contrôleur.
        </Typography>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet Extras séjours                                               */
/* ------------------------------------------------------------------ */

function ExtraRow({ extra }: { extra: MinibarStayExtra }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
        <TableCell padding="checkbox">
          <IconButton size="small">{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}</IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>{extra.roomName || extra.roomId}</TableCell>
        <TableCell>{extra.guestName || '—'}</TableCell>
        <TableCell>
          <Chip
            size="small"
            color={extra.status === 'open' ? 'success' : 'default'}
            label={extra.status === 'open' ? 'En séjour' : 'Clos'}
          />
        </TableCell>
        <TableCell align="right">{extra.lines.length}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 600 }}>
          {fmtMoney(extra.totalToBill, extra.currency)}
        </TableCell>
        <TableCell>{fmtDate(extra.openedAt)}</TableCell>
        <TableCell>{extra.closedAt ? fmtDate(extra.closedAt) : '—'}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ py: 1.5, pl: 6 }}>
              {extra.lines.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Aucune consommation déclarée.</Typography>
              ) : (
                <Table size="small" sx={{ maxWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell align="right">Qté</TableCell>
                      <TableCell align="right">PU</TableCell>
                      <TableCell align="right">Montant</TableCell>
                      <TableCell>Déclaré</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {extra.lines.map((l, i) => (
                      <TableRow key={`${l.productId}-${i}`}>
                        <TableCell>{l.productName}</TableCell>
                        <TableCell align="right">{l.qty}</TableCell>
                        <TableCell align="right">{fmtMoney(l.unitPrice, extra.currency)}</TableCell>
                        <TableCell align="right">{fmtMoney(l.amount, extra.currency)}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {fmtDate(l.declaredAt)}
                            {l.declaredBy ? ` · ${l.declaredBy}` : ''}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function ExtrasTab() {
  const [status, setStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [rows, setRows] = useState<MinibarStayExtra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchMinibarExtras(status)
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch(loadErr)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [status]);

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
        {(['all', 'open', 'closed'] as const).map((s) => (
          <Chip
            key={s}
            size="small"
            label={s === 'all' ? 'Tous' : s === 'open' ? 'En séjour' : 'Clos'}
            color={status === s ? 'primary' : 'default'}
            onClick={() => setStatus(s)}
          />
        ))}
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Chargement…' : `${rows.length} extra${rows.length > 1 ? 's' : ''}`}
        </Typography>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" />
            <TableCell>Villa</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="right">Lignes</TableCell>
            <TableCell align="right">À facturer</TableCell>
            <TableCell>Ouvert</TableCell>
            <TableCell>Clos</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((e) => (
            <ExtraRow key={e.reservationId} extra={e} />
          ))}
        </TableBody>
      </Table>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet Journal                                                      */
/* ------------------------------------------------------------------ */

function JournalTab() {
  const [rows, setRows] = useState<MinibarJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<MinibarEntryType | ''>('');
  const [room, setRoom] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchMinibarJournal({ type: type || undefined, roomId: room || undefined })
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch(loadErr)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [type, room]);

  const roomOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.roomId, r.roomName || r.roomId);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as MinibarEntryType | '')}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="consumption">🥤 Consommé client</MenuItem>
          <MenuItem value="stock_in">➕ Ajout stock</MenuItem>
          <MenuItem value="restock">🔄 Réappro</MenuItem>
          <MenuItem value="correction">➖ Correction / retrait</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Villa"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Toutes</MenuItem>
          {roomOptions.map(([id, name]) => (
            <MenuItem key={id} value={id}>{name}</MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Chargement…' : `${rows.length} mouvement${rows.length > 1 ? 's' : ''}`}
        </Typography>
      </Stack>
      <Box sx={{ overflow: 'auto', maxHeight: '65vh' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Villa</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Produit</TableCell>
              <TableCell align="right">Qté</TableCell>
              <TableCell align="right">Montant</TableCell>
              <TableCell>Facturation</TableCell>
              <TableCell>Par</TableCell>
              <TableCell>Note</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const t = TYPE_LABEL[r.type] || { label: r.type, color: 'default' as const };
              const billable = r.type === 'consumption' && r.billingStatus !== 'cancelled';
              return (
                <TableRow key={r._id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(r.declaredAt)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.roomName || r.roomId}</TableCell>
                  <TableCell><Chip size="small" color={t.color} label={t.label} /></TableCell>
                  <TableCell>{r.productName}</TableCell>
                  <TableCell align="right">{r.qty}</TableCell>
                  <TableCell align="right">
                    {billable ? fmtMoney(r.unitPrice * r.qty, r.currency) : '—'}
                  </TableCell>
                  <TableCell>
                    {billable ? (
                      <Chip size="small" variant="outlined" color="success" label={r.billingStatus} />
                    ) : (
                      <Typography variant="caption" color="text.secondary">non facturable</Typography>
                    )}
                  </TableCell>
                  <TableCell>{r.declaredByName || r.declaredByPhone || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{r.note || ''}</Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet Sessions — journal d'usage de l'outil                        */
/* ------------------------------------------------------------------ */

function SessionsTab() {
  const [rows, setRows] = useState<MinibarSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchMinibarSessions()
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch(loadErr)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {loading ? 'Chargement…' : `${rows.length} session${rows.length > 1 ? 's' : ''}`} — chaque
        ouverture du flow WhatsApp est tracée : gestes faits, envois vides du téléphone
        (défaillance réelle), sessions abandonnées.
      </Typography>
      <Box sx={{ overflow: 'auto', maxHeight: '65vh' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Ouverte</TableCell>
              <TableCell>Contrôleur</TableCell>
              <TableCell>Villa</TableCell>
              <TableCell align="right">Gestes</TableCell>
              <TableCell align="right">Envois vides</TableCell>
              <TableCell>Issue</TableCell>
              <TableCell>Dernière action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.token}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(s.openedAt)}</TableCell>
                <TableCell>{s.staffName || s.phone || '—'}</TableCell>
                <TableCell>{s.roomName || s.roomId || '—'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{s.gestures}</TableCell>
                <TableCell align="right">
                  {s.emptyPayloads > 0 ? (
                    <Chip size="small" color="warning" label={s.emptyPayloads} />
                  ) : (
                    0
                  )}
                </TableCell>
                <TableCell>
                  {s.saved || s.closedReason === 'saved' ? (
                    <Chip size="small" color="success" label="Enregistrée" />
                  ) : s.closedReason === 'quit' ? (
                    <Chip size="small" color="default" label="Quittée" />
                  ) : (
                    <Chip size="small" color="warning" label="Abandonnée" />
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(s.lastActionAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function MinibarSuiviPage() {
  const [tab, setTab] = useState(0);
  return (
    <DashboardWrapper breadcrumb={['Task', 'Extra', 'Suivi mini-bar']}>
      <Tabs value={tab} onChange={(_e, v: number) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Villas & stock" />
        <Tab label="Extras séjours" />
        <Tab label="Journal" />
        <Tab label="Sessions" />
      </Tabs>
      {tab === 0 ? <VillasTab /> : null}
      {tab === 1 ? <ExtrasTab /> : null}
      {tab === 2 ? <JournalTab /> : null}
      {tab === 3 ? <SessionsTab /> : null}
    </DashboardWrapper>
  );
}
