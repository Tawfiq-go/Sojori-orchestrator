import { useState } from 'react';
import { Box, Stack, Button, Chip, Typography, IconButton, Menu, MenuItem, Select, FormControl } from '@mui/material';
import { MoreVert as MoreVertIcon, ArrowUpward as ArrowUpIcon, ArrowDownward as ArrowDownIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, FilterBar, FilterChip, StatsRow, StatCard, DataTable, ListingCell, Badge, Panel,
  btnPrimarySx, btnGhostSx, btnAiSx, btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskFilters, applyTaskFilters, defaultTaskFilters, TaskFilterState } from '../components/tasks/TaskFilters';
import { mockTasks, Task } from '../data/mockTasks';

// ─── Tab Component ─────────────────────────────────────
function Tabs({ tabs, activeTab, onChange }: { tabs: { key: string; label: string }[]; activeTab: string; onChange: (key: string) => void }) {
  return (
    <Box sx={{
      display: 'flex',
      gap: 0.5,
      borderBottom: `1px solid ${t.border}`,
      mb: 2.5,
    }}>
      {tabs.map(tab => (
        <Box
          key={tab.key}
          onClick={() => onChange(tab.key)}
          sx={{
            px: 2,
            py: 1.25,
            fontSize: 13,
            fontWeight: activeTab === tab.key ? 700 : 500,
            color: activeTab === tab.key ? t.text : t.text3,
            borderBottom: activeTab === tab.key ? `2px solid ${t.primary}` : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              color: t.text,
              bgcolor: t.bg2,
            },
          }}
        >
          {tab.label}
        </Box>
      ))}
    </Box>
  );
}

// ─── Shared Helpers ─────────────────────────────────────
const AVAS: Record<string, string> = {
  YK: 'linear-gradient(135deg,#f9a8d4,#ec4899)',
  HM: 'linear-gradient(135deg,#67e8f9,#06b6d4)',
  MR: 'linear-gradient(135deg,#fde68a,#d97706)',
  FM: 'linear-gradient(135deg,#86efac,#16a34a)',
  KE: 'linear-gradient(135deg,#c4b5fd,#8b5cf6)',
  AI: 'linear-gradient(135deg,#fcd34d,#d97706)',
};

function Ava({ initials, size = 24 }: { initials: string; size?: number }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '50%',
      background: AVAS[initials] || t.bg3, color: '#fff',
      fontSize: size * 0.4, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>{initials}</Box>
  );
}

function Priority({ level }: { level: 'high' | 'med' | 'low' }) {
  const c = level === 'high' ? t.error : level === 'med' ? t.warning : t.info;
  const l = level === 'high' ? 'Haute' : level === 'med' ? 'Moyenne' : 'Basse';
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{
      fontFamily: 'Geist Mono', fontSize: 10.5, fontWeight: 700, color: c, letterSpacing: 0.3,
    }}>
      <Box sx={{ width: 7, height: 7, borderRadius: '2px', bgcolor: c }} />
      <span>{l}</span>
    </Stack>
  );
}

// ─── Liste View ─────────────────────────────────────────
type SortField = 'name' | 'type' | 'listing' | 'createdAt' | 'startDate' | 'priority' | 'status';
type SortDirection = 'asc' | 'desc';

function TasksListView({ tasks, onEditTask, onDeleteTask }: { tasks: Task[]; onEditTask: (task: Task) => void; onDeleteTask: (taskId: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTaskForMenu, setSelectedTaskForMenu] = useState<Task | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, task: Task) => {
    setAnchorEl(event.currentTarget);
    setSelectedTaskForMenu(task);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTaskForMenu(null);
  };

  const handleEditClick = () => {
    if (selectedTaskForMenu) {
      onEditTask(selectedTaskForMenu);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedTaskForMenu && window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      onDeleteTask(selectedTaskForMenu.id);
      toast.success('Tâche supprimée avec succès');
    }
    handleMenuClose();
  };

  const handleDuplicateClick = () => {
    if (selectedTaskForMenu) {
      const duplicate = { ...selectedTaskForMenu, id: `task-${Date.now()}`, itemNumber: `TASK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}` };
      toast.success('Tâche dupliquée avec succès (MOCK)');
    }
    handleMenuClose();
  };

  const handleMarkCompleted = () => {
    if (selectedTaskForMenu) {
      toast.success('Tâche marquée comme complétée (MOCK)');
    }
    handleMenuClose();
  };

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to asc
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to page 1 when sorting
  };

  const sortTasks = (tasksToSort: Task[]): Task[] => {
    return [...tasksToSort].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'type':
          aVal = `${a.type}-${a.subType}`.toLowerCase();
          bVal = `${b.type}-${b.subType}`.toLowerCase();
          break;
        case 'listing':
          aVal = a.listingName.toLowerCase();
          bVal = b.listingName.toLowerCase();
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'startDate':
          aVal = new Date(a.startDate).getTime();
          bVal = new Date(b.startDate).getTime();
          break;
        case 'priority':
          const priorityOrder = { 'Critical': 3, 'Urgent': 2, 'Normal': 1 };
          aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Pagination logic
  const sortedTasks = sortTasks(tasks);
  const totalPages = Math.ceil(sortedTasks.length / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTasks = sortedTasks.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to page 1 when changing limit
  };

  const getStatusBadge = (status: Task['status']) => {
    const map: Record<Task['status'], { v: string; label: string }> = {
      'CREATED': { v: 'info', label: 'Créée' },
      'ASSIGNED': { v: 'info', label: 'Assignée' },
      'ACCEPTED': { v: 'info', label: 'Acceptée' },
      'IN_PROGRESS': { v: 'warning', label: 'En cours' },
      'COMPLETED': { v: 'success', label: 'Complétée' },
      'CANCELLED_ADMIN': { v: 'error', label: 'Annulée' },
      'CANCELLED_CUSTOMER': { v: 'error', label: 'Annulée client' },
      'ARCHIVED': { v: 'default', label: 'Archivée' },
    };
    return map[status] || { v: 'default', label: status };
  };

  const getPriorityLevel = (priority: Task['priority']): 'high' | 'med' | 'low' => {
    if (priority === 'Critical' || priority === 'Urgent') return 'high';
    if (priority === 'Normal') return 'low';
    return 'med';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return 'Hier';
    if (date.toDateString() === tomorrow.toDateString()) return 'Demain';

    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const getListingColor = (name: string): 'gold' | 'blue' | 'purple' | 'pink' | 'green' => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors: Array<'gold' | 'blue' | 'purple' | 'pink' | 'green'> = ['gold', 'blue', 'purple', 'pink', 'green'];
    return colors[hash % colors.length];
  };
  // Helper to render sortable column header
  const SortableHeader = ({ field, label }: { field: SortField; label: string }) => (
    <Box
      onClick={() => handleSort(field)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { color: t.primary },
        transition: 'color 0.15s',
      }}
    >
      <span>{label}</span>
      {sortField === field && (
        sortDirection === 'asc' ? (
          <ArrowUpIcon sx={{ fontSize: 14, color: t.primary }} />
        ) : (
          <ArrowDownIcon sx={{ fontSize: 14, color: t.primary }} />
        )
      )}
    </Box>
  );

  const cols = [
    // Column 1: Tâche (title + itemNumber) - sortable by name
    {
      key: 'title',
      label: <SortableHeader field="name" label="Tâche" />,
      render: (r: Task) => (
        <Box>
          <strong>{r.name}</strong>
          <Box sx={{ fontSize: 10.5, color: t.text3, fontFamily: 'Geist Mono', mt: 0.25 }}>
            {r.itemNumber} {r.guestName && `· ${r.guestName}`}
          </Box>
        </Box>
      )
    },
    // Column 2: Type + SubType - sortable
    {
      key: 'type',
      label: <SortableHeader field="type" label="Type" />,
      render: (r: Task) => (
        <Box>
          <Box sx={{ fontSize: 11.5, color: t.text2, fontWeight: 500 }}>{r.type}</Box>
          <Box sx={{ fontSize: 10, color: t.text3, mt: 0.25 }}>{r.subType}</Box>
        </Box>
      )
    },
    // Column 3: Listing - sortable
    {
      key: 'listing',
      label: <SortableHeader field="listing" label="Listing" />,
      render: (r: Task) => <ListingCell name={r.listingName} color={getListingColor(r.listingName)} />
    },
    // Column 4: Date création - sortable
    {
      key: 'createdAt',
      label: <SortableHeader field="createdAt" label="Créée le" />,
      render: (r: Task) => (
        <Box sx={{ fontFamily: 'Geist Mono', fontSize: 11.5, color: t.text2 }}>
          {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Box>
      )
    },
    // Column 5: Échéance (startDate + startHour) - sortable by startDate
    {
      key: 'due',
      label: <SortableHeader field="startDate" label="Échéance" />,
      render: (r: Task) => {
        const isUrgent = r.priority === 'Urgent' || r.priority === 'Critical';
        return (
          <Box>
            <Box sx={{ color: isUrgent ? t.error : t.text2, fontWeight: isUrgent ? 600 : 400, fontFamily: 'Geist Mono', fontSize: 12 }}>
              {formatDate(r.startDate)} {r.startHour}
            </Box>
            {r.clientTimeslot && (
              <Box sx={{ fontSize: 10, color: t.ai, mt: 0.25 }}>Client: {r.clientTimeslot}</Box>
            )}
          </Box>
        );
      }
    },
    // Column 6: Réservation
    {
      key: 'reservation',
      label: 'Réservation',
      render: (r: Task) => (
        r.reservationNumber ? (
          <Box>
            <Box sx={{ fontSize: 11.5, color: t.primary, fontWeight: 600 }}>{r.reservationNumber}</Box>
            {r.guestName && <Box sx={{ fontSize: 10, color: t.text3, mt: 0.25 }}>{r.guestName}</Box>}
          </Box>
        ) : (
          <Box sx={{ fontSize: 11, color: t.text4, fontStyle: 'italic' }}>-</Box>
        )
      )
    },
    // Column 7: Assigné à (staff + avatar)
    {
      key: 'who',
      label: 'Assigné à',
      render: (r: Task) => {
        const initials = r.staffName ? r.staffName.split(' ').map(n => n[0]).join('').toUpperCase() : null;
        return (
          <Stack direction="row" alignItems="center" spacing={0.75}>
            {initials ? (
              <Ava initials={initials} />
            ) : (
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: t.bg3, color: t.text3, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                ?
              </Box>
            )}
            <span style={{ color: r.staffName ? t.text : t.text3 }}>{r.staffName || 'Non assigné'}</span>
          </Stack>
        );
      }
    },
    // Column 8: Prix + Paiement
    {
      key: 'pricing',
      label: 'Tarif',
      render: (r: Task) => (
        <Box>
          <Box sx={{ fontSize: 12, fontWeight: 600, color: t.text }}>
            {r.price} {r.currency}
          </Box>
          <Chip
            label={r.paid ? 'Payé' : 'Non payé'}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              bgcolor: r.paid ? t.successTint : t.warningTint,
              color: r.paid ? t.success : t.warning,
              mt: 0.5
            }}
          />
        </Box>
      )
    },
    // Column 9: Statut - sortable
    {
      key: 'status',
      label: <SortableHeader field="status" label="Statut" />,
      render: (r: Task) => {
        const statusBadge = getStatusBadge(r.status);
        return <Badge variant={statusBadge.v as any} dot>{statusBadge.label}</Badge>;
      }
    },
    // Column 10: Priorité - sortable
    {
      key: 'prio',
      label: <SortableHeader field="priority" label="Priorité" />,
      render: (r: Task) => <Priority level={getPriorityLevel(r.priority)} />
    },
    // Column 11: Actions (menu 3 points)
    {
      key: 'actions',
      label: '',
      render: (r: Task) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, r)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <StatsRow>
        <StatCard icon="📋" iconBg={t.infoTint}    iconColor={t.info}    value="14" label="En cours" />
        <StatCard icon="⚡" iconBg={t.warningTint} iconColor="#b45309"   value="7"  label="Urgent aujourd'hui" />
        <StatCard icon="🔴" iconBg={t.errorTint}   iconColor={t.error}   value="2"  label="En retard" trend="−3" />
        <StatCard icon="✓"  iconBg={t.successTint} iconColor={t.success} value="28" label="Complétées cette semaine" trend="12%" trendUp />
        <StatCard icon="✨" iconBg={t.aiTint}      iconColor={t.ai}      value="94%" label="Score AI qualité" />
      </StatsRow>

      <FilterBar>
        <FilterChip label="Toutes · 156" active />
        <FilterChip label="Urgent · 7" />
        <FilterChip label="Aujourd'hui · 12" />
        <FilterChip label="Cette semaine · 42" />
        <FilterChip label="Non assignées · 3" />
        <Box sx={{ width: 1, height: 18, bgcolor: t.border, mx: 0.5 }} />
        <FilterChip label="🧹 Ménage" />
        <FilterChip label="🔧 Maintenance" />
        <FilterChip label="🛬 Check-in" />
        <FilterChip label="📸 Photos" />
      </FilterBar>

      <DataTable
        columns={cols}
        rows={paginatedTasks}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        footer={<>
          {/* Left: Selection + Limit selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ fontSize: 12, color: t.text2 }}>
              {selected.length > 0 && `${selected.length} sélectionnée${selected.length > 1 ? 's' : ''} · `}
              {sortedTasks.length} tâche{sortedTasks.length > 1 ? 's' : ''}
            </Box>
            <Box sx={{ fontSize: 11, color: t.text3, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Afficher
              <FormControl size="small" sx={{ minWidth: 60 }}>
                <Select
                  value={limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  sx={{
                    fontSize: 11,
                    height: 24,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.primary },
                  }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
              par page
            </Box>
          </Box>

          {/* Center: Page buttons */}
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              style={{
                padding: '4px 8px',
                color: page === 1 ? t.text4 : t.text2,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                background: 'transparent',
                border: 'none',
                fontSize: 14,
              }}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  style={{
                    padding: '4px 10px',
                    background: page === pageNum ? t.text : 'transparent',
                    color: page === pageNum ? '#fff' : t.text2,
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: page === pageNum ? 600 : 400,
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              style={{
                padding: '4px 8px',
                color: page === totalPages ? t.text4 : t.text2,
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                background: 'transparent',
                border: 'none',
                fontSize: 14,
              }}
            >
              ›
            </button>
          </Box>

          {/* Right: Range display */}
          <Box sx={{ fontSize: 12, color: t.text3 }}>
            Affichage {startIndex + 1}-{Math.min(endIndex, sortedTasks.length)} sur {sortedTasks.length}
          </Box>
        </>}
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEditClick}>✏️ Modifier</MenuItem>
        <MenuItem onClick={handleDuplicateClick}>📋 Dupliquer</MenuItem>
        <MenuItem onClick={handleMarkCompleted}>✓ Marquer complétée</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: t.error }}>🗑️ Supprimer</MenuItem>
      </Menu>
    </>
  );
}

// ─── Calendrier View ─────────────────────────────────────
type DayEvent = { when: string; type: 'todo' | 'doing' | 'review' | 'done' | 'over'; label: string };
const TASKS_BY_DAY: Record<number, DayEvent[]> = {
  4: [{ when: '10:00', type: 'todo', label: '🛬 Check-in 2 résa' }],
  5: [{ when: '14:00', type: 'done', label: '🧹 Ménage Villa B' }],
  6: [{ when: '10:00', type: 'doing', label: '🧹 Mid-stay Atlas' }, { when: '15:00', type: 'todo', label: '🔧 Réparation' }],
  11: [{ when: '14:00', type: 'doing', label: '🧹 Pré-arrivée Villa B' }, { when: '16:30', type: 'todo', label: '🛬 Check-in Marco' }, { when: '18:00', type: 'review', label: '📸 Photos Médina' }, { when: '', type: 'over', label: '🔴 Retard fuite' }],
  12: [{ when: '11:00', type: 'todo', label: '🧹 Atlas Loft' }, { when: '14:00', type: 'todo', label: '🛬 James P.' }, { when: '16:00', type: 'review', label: '📸 Validation IA' }],
  13: [{ when: '10:00', type: 'todo', label: '🧹 Mid-stay Atlas' }, { when: '14:00', type: 'todo', label: '🛬 Yumi K.' }],
  14: [{ when: '09:00', type: 'todo', label: '🧹 Médina final' }, { when: '11:00', type: 'todo', label: '🛫 Check-out' }],
  21: [{ when: '10:00', type: 'todo', label: '🛬 Aisha K.' }, { when: '14:00', type: 'todo', label: '🧹 Pré-arrivée' }],
};

const EVENT_STYLES = {
  todo:   { bg: t.infoTint,    color: '#0e7490', border: t.info },
  doing:  { bg: t.warningTint, color: '#b45309', border: t.warning },
  review: { bg: t.aiTint,      color: t.ai,     border: t.ai },
  done:   { bg: t.successTint, color: '#047857', border: t.success, opacity: 0.7 },
  over:   { bg: t.errorTint,   color: '#b91c1c', border: t.error },
};

function TasksCalendarView() {
  const startOffset = 4;
  const lastDay = 31;
  const today = 13;
  const totalCells = Math.ceil((startOffset + lastDay) / 7) * 7;

  return (
    <>
      <FilterBar>
        <FilterChip label="Tous types" active />
        <FilterChip label="🧹 Ménage" />
        <FilterChip label="🔧 Maintenance" />
        <FilterChip label="🛬 Check-in" />
        <FilterChip label="📸 Photos" />
        <Box sx={{ width: 1, height: 18, bgcolor: t.border, mx: 0.5 }} />
        <FilterChip label="👤 Tout staff" />
        <Stack direction="row" spacing={1.5} sx={{ ml: 'auto', fontSize: 11.5, color: t.text3 }}>
          {([
            ['todo', 'À faire'],
            ['doing', 'En cours'],
            ['review', 'Review'],
            ['done', 'Complété'],
            ['over', 'Retard'],
          ] as const).map(([type, label]) => {
            const s = EVENT_STYLES[type];
            return (
              <Stack key={type} direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: s.bg, borderLeft: `2px solid ${s.border}` }} />
                <span>{label}</span>
              </Stack>
            );
          })}
        </Stack>
      </FilterBar>

      <Panel sx={{ p: 0, overflow: 'hidden' }}>
        {/* Weekday header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', bgcolor: t.bg2, borderBottom: `1px solid ${t.border}` }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((w, i) => (
            <Box key={w} sx={{
              p: '10px 0', textAlign: 'center',
              fontSize: 10.5, fontFamily: 'Geist Mono', fontWeight: 700,
              color: t.text3, letterSpacing: 1, textTransform: 'uppercase',
              borderLeft: i ? `1px solid ${t.border}` : 'none',
            }}>{w}</Box>
          ))}
        </Box>

        {/* Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '140px' }}>
          {Array.from({ length: totalCells }).map((_, i) => {
            const num = i - startOffset + 1;
            const inMonth = num >= 1 && num <= lastDay;
            const isToday = inMonth && num === today;
            const tasks = inMonth ? TASKS_BY_DAY[num] || [] : [];
            const show = tasks.slice(0, 3);

            return (
              <Box key={i} sx={{
                borderLeft: i % 7 ? `1px solid ${t.border}` : 'none',
                borderBottom: `1px solid ${t.border}`,
                p: 0.75,
                display: 'flex', flexDirection: 'column', gap: 0.5,
                overflow: 'hidden', cursor: inMonth ? 'pointer' : 'default',
                opacity: inMonth ? 1 : 0.35,
                bgcolor: isToday ? t.primaryTint : 'transparent',
                transition: 'background 0.12s',
                '&:hover': inMonth ? { bgcolor: t.bg2 } : {},
              }}>
                {inMonth && (
                  <>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.25 }}>
                      <Box sx={{
                        fontSize: 12, fontWeight: isToday ? 800 : 600,
                        fontFamily: 'Geist Mono',
                        color: isToday ? t.primaryDeep : t.text,
                      }}>{num}</Box>
                      {tasks.length > 0 && (
                        <Box sx={{ fontSize: 9, fontFamily: 'Geist Mono', color: t.text3 }}>{tasks.length}</Box>
                      )}
                    </Stack>
                    {show.map((tk, j) => {
                      const s = EVENT_STYLES[tk.type];
                      return (
                        <Box key={j} sx={{
                          p: '3px 6px', borderRadius: 0.625,
                          fontSize: 10, fontWeight: 600,
                          bgcolor: s.bg, color: s.color,
                          borderLeft: `2px solid ${s.border}`,
                          opacity: 'opacity' in s ? s.opacity : 1,
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {tk.when && <Box sx={{ fontFamily: 'Geist Mono', fontSize: 9, opacity: 0.85 }}>{tk.when}</Box>}
                          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tk.label}</Box>
                        </Box>
                      );
                    })}
                    {tasks.length > 3 && (
                      <Box sx={{
                        fontSize: 10, color: t.text3, p: '2px 6px',
                        bgcolor: t.bg2, borderRadius: 0.625, textAlign: 'center',
                      }}>+{tasks.length - 3} autres</Box>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Panel>
    </>
  );
}

// ─── Séjours View (Réservations + Tâches) ─────────────────
interface ReservationRow {
  id: string;
  guest: string;
  listing: string;
  listingColor: 'gold' | 'blue' | 'purple' | 'pink' | 'green';
  checkIn: string;
  checkOut: string;
  startDay: number;
  duration: number;
  status: 'confirmed' | 'checkin' | 'inprogress' | 'checkout' | 'completed';
  tasks: { type: string; time: string; assignee: string; status: 'todo' | 'done' | 'urgent' }[];
}

const RESERVATIONS_TIMELINE: ReservationRow[] = [
  {
    id: 'r1',
    guest: 'Sarah Johnson',
    listing: 'Villa Belvédère',
    listingColor: 'gold',
    checkIn: '13 mai',
    checkOut: '20 mai',
    startDay: 0,
    duration: 7,
    status: 'checkin',
    tasks: [
      { type: '🧹', time: '14:00', assignee: 'YK', status: 'urgent' },
      { type: '🛬', time: '16:00', assignee: 'HM', status: 'todo' },
    ],
  },
  {
    id: 'r2',
    guest: 'Marco Rossi',
    listing: 'Dar Sojori',
    listingColor: 'blue',
    checkIn: '13 mai',
    checkOut: '17 mai',
    startDay: 0,
    duration: 4,
    status: 'checkin',
    tasks: [
      { type: '🛬', time: '16:30', assignee: 'HM', status: 'todo' },
    ],
  },
  {
    id: 'r3',
    guest: 'James Peterson',
    listing: 'Villa Atlas',
    listingColor: 'purple',
    checkIn: '14 mai',
    checkOut: '21 mai',
    startDay: 1,
    duration: 7,
    status: 'confirmed',
    tasks: [
      { type: '🧹', time: '10:00', assignee: 'FM', status: 'todo' },
      { type: '🛬', time: '14:00', assignee: 'HM', status: 'todo' },
    ],
  },
  {
    id: 'r4',
    guest: 'Yumi Kobayashi',
    listing: 'Médina House',
    listingColor: 'pink',
    checkIn: '15 mai',
    checkOut: '19 mai',
    startDay: 2,
    duration: 4,
    status: 'confirmed',
    tasks: [
      { type: '🧹', time: '11:00', assignee: 'YK', status: 'todo' },
      { type: '📸', time: '18:00', assignee: 'AI', status: 'todo' },
    ],
  },
  {
    id: 'r5',
    guest: 'Aisha Khan',
    listing: 'Villa Belvédère',
    listingColor: 'gold',
    checkIn: '21 mai',
    checkOut: '28 mai',
    startDay: 8,
    duration: 7,
    status: 'confirmed',
    tasks: [
      { type: '🧹', time: '10:00', assignee: 'YK', status: 'todo' },
    ],
  },
];

function TasksSejoursView() {
  const days = 14; // Afficher 14 jours
  const today = new Date(2026, 4, 13); // 13 mai 2026

  return (
    <>
      <FilterBar>
        <FilterChip label="Tous listings" active />
        <FilterChip label="Villa Belvédère" />
        <FilterChip label="Dar Sojori" />
        <FilterChip label="Villa Atlas" />
        <Box sx={{ width: 1, height: 18, bgcolor: t.border, mx: 0.5 }} />
        <FilterChip label="Arrivées · 3" />
        <FilterChip label="Départs · 2" />
        <FilterChip label="Tâches urgentes · 7" />
        <Stack direction="row" spacing={1.5} sx={{ ml: 'auto', fontSize: 11.5, color: t.text3 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: t.error }} />
            <span>Urgent</span>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: t.info }} />
            <span>À faire</span>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: t.success }} />
            <span>Complété</span>
          </Stack>
        </Stack>
      </FilterBar>

      <Panel sx={{ p: 0, overflow: 'auto' }}>
        {/* Timeline grid */}
        <Box sx={{ minWidth: 1200 }}>
          {/* Header with dates */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '240px repeat(14, 1fr)', bgcolor: t.bg2, borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 2 }}>
            <Box sx={{ p: '12px 16px', fontWeight: 700, fontSize: 12, borderRight: `1px solid ${t.border}` }}>
              Réservations
            </Box>
            {Array.from({ length: days }).map((_, i) => {
              const date = new Date(today);
              date.setDate(today.getDate() + i);
              const isToday = i === 0;
              return (
                <Box key={i} sx={{
                  p: '8px 4px',
                  textAlign: 'center',
                  borderLeft: i > 0 ? `1px solid ${t.border}` : 'none',
                  bgcolor: isToday ? t.primaryTint : 'transparent',
                }}>
                  <Box sx={{ fontSize: 10, fontFamily: 'Geist Mono', color: t.text3, textTransform: 'uppercase' }}>
                    {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()]}
                  </Box>
                  <Box sx={{ fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? t.primaryDeep : t.text, mt: 0.25 }}>
                    {date.getDate()}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Reservation rows */}
          {RESERVATIONS_TIMELINE.map((resa) => (
            <Box key={resa.id} sx={{
              display: 'grid',
              gridTemplateColumns: '240px repeat(14, 1fr)',
              borderBottom: `1px solid ${t.border}`,
              minHeight: 72,
              transition: 'background 0.12s',
              '&:hover': { bgcolor: t.bg2 },
            }}>
              {/* Left column: Guest + Listing info */}
              <Box sx={{
                p: 2,
                borderRight: `1px solid ${t.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              }}>
                <Box sx={{ fontSize: 13, fontWeight: 700 }}>{resa.guest}</Box>
                <ListingCell name={resa.listing} color={resa.listingColor} />
                <Box sx={{ fontSize: 10.5, fontFamily: 'Geist Mono', color: t.text3, mt: 0.25 }}>
                  {resa.checkIn} → {resa.checkOut}
                </Box>
              </Box>

              {/* Timeline cells */}
              {Array.from({ length: days }).map((_, dayIndex) => {
                const isInStay = dayIndex >= resa.startDay && dayIndex < resa.startDay + resa.duration;
                const isCheckIn = dayIndex === resa.startDay;
                const isCheckOut = dayIndex === resa.startDay + resa.duration - 1;
                const dayTasks = isInStay ? resa.tasks.filter((_, i) => i === dayIndex - resa.startDay) : [];

                return (
                  <Box key={dayIndex} sx={{
                    borderLeft: dayIndex > 0 ? `1px solid ${t.border}` : 'none',
                    bgcolor: isInStay ? (resa.listingColor === 'gold' ? t.primaryTint : resa.listingColor === 'blue' ? 'rgba(6,182,212,0.08)' : resa.listingColor === 'purple' ? 'rgba(139,92,246,0.08)' : resa.listingColor === 'pink' ? 'rgba(236,72,153,0.08)' : t.successTint) : 'transparent',
                    position: 'relative',
                    p: 0.75,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {/* Check-in marker */}
                    {isCheckIn && (
                      <Box sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        bgcolor: t.success,
                      }} />
                    )}
                    {/* Check-out marker */}
                    {isCheckOut && (
                      <Box sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        bgcolor: t.error,
                      }} />
                    )}

                    {/* Tasks */}
                    {dayTasks.map((task, i) => (
                      <Box key={i} sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.25,
                      }}>
                        <Box sx={{
                          fontSize: 16,
                          filter: task.status === 'done' ? 'grayscale(1) opacity(0.5)' : 'none',
                        }}>
                          {task.type}
                        </Box>
                        <Box sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: task.status === 'urgent' ? t.error : task.status === 'done' ? t.success : t.info,
                        }} />
                        <Box sx={{ fontSize: 8, fontFamily: 'Geist Mono', color: t.text3 }}>
                          {task.time}
                        </Box>
                        <Ava initials={task.assignee} size={18} />
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Panel>
    </>
  );
}

// ─── Équipe View ─────────────────────────────────────────
interface Member {
  initials: string; name: string; role: string; meta: string;
  online: boolean;
  stats: { v: string; vColor?: string; l: string }[];
  load: number; loadStatus?: 'ok' | 'warn';
  tasks: { prio: 'high' | 'med' | 'low'; title: string; when: string }[];
  tasksTitle: string;
  emptyHint?: string;
  isAI?: boolean;
}

const MEMBERS: Member[] = [
  { initials: 'YK', name: 'Yasmine K.', role: 'Chef ménage', meta: '📍 Nice · 3 listings', online: true,
    stats: [{ v: '47', vColor: t.success, l: 'complétées' }, { v: '9.6', l: 'qualité' }, { v: '52m', l: 'durée moy.' }],
    load: 78, tasksTitle: 'Tâches en cours · 3',
    tasks: [
      { prio: 'high', title: 'Ménage pré-arrivée · Villa Belvédère', when: '14:00' },
      { prio: 'med',  title: 'Mid-stay clean · Atlas Loft',            when: 'Demain' },
      { prio: 'low',  title: 'Photos finales · Médina House',          when: 'Jeu.' },
    ]},
  { initials: 'HM', name: 'Hassan M.', role: 'Concierge', meta: '📍 Marrakech · 8 listings', online: true,
    stats: [{ v: '38', vColor: t.success, l: 'check-ins' }, { v: '9.4', l: 'satisfaction' }, { v: '12m', l: 'temps moy.' }],
    load: 92, loadStatus: 'warn', tasksTitle: 'Tâches en cours · 4',
    tasks: [
      { prio: 'high', title: 'Accueil Marco Rossi · Dar Sojori',  when: '16:30' },
      { prio: 'med',  title: 'Renouveler kit accueil',             when: 'Sem.' },
      { prio: 'med',  title: 'Check-in James P. · Atlas',          when: 'Demain' },
    ]},
  { initials: 'MR', name: 'Mehdi R.', role: 'Maintenance', meta: '📍 Marrakech · 12 listings', online: true,
    stats: [{ v: '22', vColor: t.success, l: 'interventions' }, { v: '9.1', l: 'qualité' }, { v: '1h12', l: 'durée moy.' }],
    load: 45, loadStatus: 'ok', tasksTitle: 'Tâches en cours · 1',
    tasks: [{ prio: 'med', title: 'Réparation thermostat · Villa Atlas', when: '14:30' }],
    emptyHint: '+ disponible pour urgences' },
  { initials: 'FM', name: 'Fatima M.', role: 'Ménage senior', meta: '📍 Marrakech · 6 listings', online: true,
    stats: [{ v: '41', vColor: t.success, l: 'complétées' }, { v: '9.7', l: 'qualité' }, { v: '48m', l: 'durée moy.' }],
    load: 68, tasksTitle: 'Tâches en cours · 2',
    tasks: [
      { prio: 'low', title: 'Mid-stay Villa Atlas',         when: 'Demain' },
      { prio: 'med', title: 'Ménage final Médina House',     when: 'Ven.' },
    ]},
  { initials: 'KE', name: 'Karim E.', role: 'Concierge night', meta: '📍 Marrakech · 5 listings', online: false,
    stats: [{ v: '19', vColor: t.success, l: 'check-ins' }, { v: '9.5', l: 'satisfaction' }, { v: '15m', l: 'temps moy.' }],
    load: 35, loadStatus: 'ok', tasksTitle: 'Reprise garde · Ce soir 18h',
    tasks: [], emptyHint: 'Offline jusqu\'à 18h' },
  { initials: 'AI', name: 'Sojori AI', role: 'Auto-screening', meta: '🌍 Tous listings · 24/7', online: true, isAI: true,
    stats: [{ v: '186', vColor: t.ai, l: 'analyses' }, { v: '94%', l: 'précision' }, { v: '2s', l: 'par photo' }],
    load: 100, tasksTitle: 'Tâches AI · 3 en attente',
    tasks: [
      { prio: 'med', title: 'Validation photos · Médina House', when: '2 min' },
      { prio: 'low', title: 'Auto-tri 24 photos · Atlas',       when: '5 min' },
    ]},
];

function MemberCard({ m }: { m: Member }) {
  const loadColor = m.loadStatus === 'warn' ? t.error : m.loadStatus === 'ok' ? t.success : t.text2;
  return (
    <Box sx={{
      bgcolor: t.bg1, border: `1px solid ${t.border}`,
      borderRadius: '12px', p: 2,
      transition: 'all 0.15s',
      '&:hover': { boxShadow: '0 8px 20px rgba(26,20,8,0.08)', borderColor: t.borderStrong, transform: 'translateY(-2px)' },
    }}>
      <Stack direction="row" alignItems="center" spacing={1.375} sx={{ mb: 1.75 }}>
        <Box sx={{ position: 'relative' }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '50%',
            background: AVAS[m.initials] || t.bg3,
            color: '#fff', fontWeight: 700, fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{m.initials}</Box>
          <Box sx={{
            position: 'absolute', bottom: 1, right: 1,
            width: 11, height: 11, borderRadius: '50%',
            bgcolor: m.online ? t.success : t.text4,
            border: `2px solid ${t.bg1}`,
          }} />
        </Box>
        <Box>
          <Box sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1 }}>{m.name}</Box>
          <Box sx={{
            fontSize: 10.5, color: t.ai, fontFamily: 'Geist Mono',
            fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', mt: 0.375,
          }}>{m.role}</Box>
          <Box sx={{ fontSize: 11, color: t.text3, mt: 0.375 }}>{m.meta}</Box>
        </Box>
      </Stack>

      <Box sx={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
        p: '10px 0', mb: 1.5,
        borderTop: `1px dashed ${t.border}`, borderBottom: `1px dashed ${t.border}`,
      }}>
        {m.stats.map((s, i) => (
          <Box key={i} sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'Geist Mono', letterSpacing: '-0.2px', color: s.vColor || t.text }}>{s.v}</Box>
            <Box sx={{ fontSize: 9.5, color: t.text3, fontFamily: 'Geist Mono', letterSpacing: 0.3, mt: 0.25, textTransform: 'uppercase' }}>{s.l}</Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ height: 6, bgcolor: t.bg2, borderRadius: '99px', overflow: 'hidden', mb: 0.625 }}>
        <Box sx={{
          height: '100%', borderRadius: '99px',
          background: m.isAI ? `linear-gradient(90deg, ${t.ai}, #a78bfa)` : `linear-gradient(90deg, ${t.success}, ${t.primary})`,
          width: `${m.load}%`, transition: 'width 0.6s ease',
        }} />
      </Box>
      <Stack direction="row" justifyContent="space-between" sx={{
        fontSize: 10.5, fontFamily: 'Geist Mono', color: t.text3, letterSpacing: 0.3,
      }}>
        <span>{m.isAI ? 'Disponibilité' : 'Charge cette semaine'}</span>
        <Box component="span" sx={{ color: loadColor, fontWeight: 700 }}>
          {m.load}%{m.loadStatus === 'warn' ? ' ⚠' : m.isAI ? ' · 24/7' : ''}
        </Box>
      </Stack>

      <Box sx={{ mt: 1.5, borderTop: `1px dashed ${t.border}`, pt: 1.375 }}>
        <Box sx={{
          fontSize: 9.5, fontFamily: 'Geist Mono', fontWeight: 700,
          color: t.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 0.875,
        }}>{m.tasksTitle}</Box>
        {m.tasks.length === 0 && m.emptyHint && (
          <Box sx={{ color: t.text4, fontStyle: 'italic', fontSize: 11.5 }}>{m.emptyHint}</Box>
        )}
        {m.tasks.map((tk, i) => (
          <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ py: 0.625, fontSize: 11.5 }}>
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              bgcolor: tk.prio === 'high' ? t.error : tk.prio === 'med' ? t.warning : t.info,
            }} />
            <Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.title}</Box>
            <Box sx={{ fontFamily: 'Geist Mono', fontSize: 10, color: t.text3 }}>{tk.when}</Box>
          </Stack>
        ))}
        {m.tasks.length > 0 && m.emptyHint && (
          <Box sx={{ color: t.text4, fontStyle: 'italic', fontSize: 11 }}>{m.emptyHint}</Box>
        )}
      </Box>

      <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }}>
        <Button sx={{ ...btnGhostSx, ...btnSmSx, flex: 1, justifyContent: 'center' }}>{m.isAI ? '⚙ Config' : '💬 Message'}</Button>
        <Button sx={{ ...btnGhostSx, ...btnSmSx, flex: 1, justifyContent: 'center' }}>{m.isAI ? '📊 Stats' : '📋 Voir tâches'}</Button>
      </Stack>
    </Box>
  );
}

function TasksTeamView() {
  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.25, mb: 2.5 }}>
        <StatCard icon="👥" iconBg={t.successTint} iconColor={t.success} value="8"     label="Membres actifs" />
        <StatCard icon="⚡" iconBg={t.infoTint}    iconColor={t.info}    value="23"    label="Tâches en cours" />
        <StatCard icon="⭐" iconBg={t.primaryTint} iconColor={t.primaryDeep} value="4.7/5" label="Note moyenne" />
        <StatCard icon="📊" iconBg={t.aiTint}      iconColor={t.ai}      value="87%"   label="Capacité utilisée" trend="−5pt" />
      </Box>

      <FilterBar>
        <FilterChip label="Tous" active />
        <FilterChip label="🟢 Online · 5" />
        <FilterChip label="⚪ Offline · 3" />
        <FilterChip label="🧹 Ménage" />
        <FilterChip label="🔧 Maintenance" />
        <FilterChip label="🛬 Concierge" />
      </FilterBar>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1.75 }}>
        {MEMBERS.map(m => <MemberCard key={m.initials} m={m} />)}
      </Box>
    </>
  );
}

// ─── Main Tasks Page ─────────────────────────────────────
export function TasksPage() {
  const [activeTab, setActiveTab] = useState('liste');
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilterState>(defaultTaskFilters);

  // Apply filters to tasks
  const filteredTasks = applyTaskFilters(tasks, filters);

  const tabs = [
    { key: 'liste', label: 'Liste' },
    { key: 'calendrier', label: 'Calendrier' },
    { key: 'sejours', label: 'Séjours' },
    { key: 'equipe', label: 'Équipe' },
  ];

  const handleOpenModal = (task?: Task) => {
    setSelectedTask(task || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedTask(null);
  };

  const handleSaveTask = (task: Task) => {
    if (selectedTask) {
      // Update existing task
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    } else {
      // Add new task
      setTasks((prev) => [...prev, task]);
    }
    handleCloseModal();
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleEditTask = (task: Task) => {
    handleOpenModal(task);
  };

  const handleResetFilters = () => {
    setFilters(defaultTaskFilters);
    toast.info('Filtres réinitialisés');
  };

  return (
    <DashboardWrapper breadcrumb={['Activité', 'Tâches']}>
      <PageHeader title="Tâches & opérations" count={`${filteredTasks.length}`}>
        <Button sx={btnGhostSx}>📤 Exporter</Button>
        <Button sx={btnAiSx}>✨ Auto-assigner</Button>
        <Button sx={btnPrimarySx} onClick={() => handleOpenModal()}>
          + Nouvelle tâche
        </Button>
      </PageHeader>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'liste' && (
        <>
          <TaskFilters
            filters={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
            taskCount={tasks.length}
            filteredCount={filteredTasks.length}
          />
          <TasksListView tasks={filteredTasks} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} />
        </>
      )}
      {activeTab === 'calendrier' && <TasksCalendarView />}
      {activeTab === 'sejours' && <TasksSejoursView />}
      {activeTab === 'equipe' && <TasksTeamView />}

      <CreateTaskModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        existingTask={selectedTask}
      />
    </DashboardWrapper>
  );
}
