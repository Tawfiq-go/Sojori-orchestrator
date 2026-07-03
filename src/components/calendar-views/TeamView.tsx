// ════════════════════════════════════════════════════════════════════
// TeamView.tsx — Vue Équipe redesignée
// • Ligne fixe 60px
// • Load bar 0-10 par cellule (couleur low/med/high)
// • Max 2 chips visibles + badge "+N"
// • Ligne "Non assigné" en tête (collapsible si vide)
// ════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Popover, IconButton } from '@mui/material';
import {
  T, TEAM, type TaskItem, type StaffMember, genDays,
  KpiPill, DayHeader, TaskChip, LoadBar, SOJORI_KEYFRAMES, initialsFrom,
} from './_shared';

export interface TeamViewProps {
  startDate: Date;
  daysCount?: number;
  staff: StaffMember[];
  tasks: TaskItem[];
  filteredTypes?: string[];
  onTaskClick?: (t: TaskItem) => void;
  onAssignTask?: (taskId: string, staffId: string) => void;
  onGoToday?: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onDateChange?: (date: Date) => void;
}

const STAFF_COLORS = [
  'linear-gradient(135deg,#a5f3fc,#0e7490)',  // cyan
  'linear-gradient(135deg,#86efac,#16a34a)',  // green
  'linear-gradient(135deg,#fde68a,#d97706)',  // amber
  'linear-gradient(135deg,#ddd6fe,#7c3aed)',  // violet
  'linear-gradient(135deg,#fda4af,#ec4899)',  // pink
  'linear-gradient(135deg,#bae6fd,#0284c7)',  // sky
];

const TYPE_FILTERS = [
  { key: 'arrival',      em: '🏠', label: 'Arrivée' },
  { key: 'departure',    em: '🚪', label: 'Départ' },
  { key: 'cleaning',     em: '🧹', label: 'Ménage' },
  { key: 'concierge',    em: '🛎', label: 'Concierge' },
  { key: 'support',      em: '🆘', label: 'Support' },
  { key: 'registration', em: '📝', label: 'Enreg.' },
];

export default function TeamView({
  startDate, daysCount = 14, staff, tasks, onTaskClick,
  onGoToday, onPrevDay, onNextDay, onPrevWeek, onNextWeek, onDateChange,
}: TeamViewProps) {
  const days = useMemo(() => genDays(startDate, daysCount), [startDate, daysCount]);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(['arrival', 'departure', 'cleaning']));
  const [unassignedCollapsed, setUnassignedCollapsed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Filtered tasks
  const filtered = useMemo(() =>
    tasks.filter(t => !t.type || activeTypes.has(t.type)),
    [tasks, activeTypes]);

  // Group by staff (+ Non assigné)
  const grouped = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    map.set('__unassigned__', []);
    staff.forEach(s => map.set(s._id, []));
    filtered.forEach(t => {
      const key = t.staffId || '__unassigned__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [filtered, staff]);

  const unassignedTasks = grouped.get('__unassigned__') || [];

  // KPI today
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let arr = 0, dep = 0, cln = 0, na = 0;
    filtered.forEach(t => {
      if ((t.startDate || '').slice(0, 10) !== today) return;
      if (t.type === 'arrival')   arr++;
      if (t.type === 'departure') dep++;
      if (t.type === 'cleaning')  cln++;
      if (!t.staffId && t.taskStatus !== 'COMPLETED') na++;
    });
    return { arr, dep, cln, na };
  }, [filtered]);

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: '20px 24px 50px' } }}>
      <style>{SOJORI_KEYFRAMES}</style>

      <Stack direction="row" gap={1.75} sx={{ alignItems: 'baseline',  mb: 1.75 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em' }}>Vue Équipe</Typography>
        <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
          {staff.length} staff · {daysCount} jours · {filtered.length} tâches · {unassignedTasks.length} non assignées
        </Typography>
      </Stack>

      <Stack direction="row" gap={1.25} sx={{ flexWrap: 'wrap',  mb: 1.5 }}>
        <KpiPill icon="🏠" count={kpis.arr} label="Arrivées auj." tone="success" />
        <KpiPill icon="🚪" count={kpis.dep} label="Départs auj." tone="warning" />
        <KpiPill icon="🧹" count={kpis.cln} label="Ménages" tone="primary" />
        <KpiPill icon="⚠" count={kpis.na} label="Non assignée" tone="error" alert={kpis.na > 0} />
      </Stack>

      {/* Toolbar - Navigation + Filtres types */}
      <Box sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5,
        p: '10px 14px', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        mb: 1.25, boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}>
        {/* Date range - cliquable */}
        <Box component="button" onClick={() => setShowDatePicker(true)} sx={{
          all: 'unset', cursor: 'pointer', fontFamily: '"Geist Mono", monospace',
          fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5,
          '&:hover': { color: T.primary },
        }}>
          {days[0]?.frShort || ''}<span style={{ color: T.text4, margin: '0 6px' }}>→</span>{days[days.length - 1]?.frShort || ''}
          <span style={{ fontSize: 10, marginLeft: 4 }}>📅</span>
        </Box>

        {/* Navigation pills */}
        <Box sx={{
          display: 'inline-flex', bgcolor: T.bg2, border: `1px solid ${T.border}`,
          borderRadius: '9px', p: '3px', gap: '2px',
        }}>
          <Box component="button" onClick={onPrevWeek} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, color: T.text2, '&:hover': { bgcolor: T.bg1 },
          }}>«</Box>
          <Box component="button" onClick={onPrevDay} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, color: T.text2, '&:hover': { bgcolor: T.bg1 },
          }}>‹</Box>
          <Box component="button" onClick={onGoToday} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, background: `linear-gradient(180deg,#cb9b2c,${T.primary})`,
            color: '#1a1408',
          }}>Auj.</Box>
          <Box component="button" onClick={onNextDay} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, color: T.text2, '&:hover': { bgcolor: T.bg1 },
          }}>›</Box>
          <Box component="button" onClick={onNextWeek} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, color: T.text2, '&:hover': { bgcolor: T.bg1 },
          }}>»</Box>
        </Box>

        {/* Date Picker Popover */}
        {showDatePicker && (
          <Popover
            open={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            anchorReference="anchorPosition"
            anchorPosition={{ top: 200, left: 400 }}
            PaperProps={{ sx: { p: 2, borderRadius: 1.5 } }}
          >
            <input
              type="date"
              defaultValue={startDate.toISOString().slice(0, 10)}
              onChange={(e) => {
                if (e.target.value && onDateChange) {
                  onDateChange(new Date(e.target.value));
                  setShowDatePicker(false);
                }
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                fontFamily: '"Geist Mono", monospace',
                fontSize: 13,
              }}
            />
          </Popover>
        )}

        {/* Type filters */}
        <Stack direction="row" gap={0.625} sx={{ flexWrap: 'wrap',  ml: 'auto' }}>
        {TYPE_FILTERS.map(tf => {
          const on = activeTypes.has(tf.key);
          return (
            <Box key={tf.key} component="button"
              onClick={() => setActiveTypes(s => {
                const next = new Set(s);
                if (next.has(tf.key)) next.delete(tf.key); else next.add(tf.key);
                return next;
              })}
              sx={{
                all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.625,
                px: 1.375, py: 0.625, borderRadius: '999px', fontSize: 11, fontWeight: on ? 700 : 600,
                bgcolor: on ? T.primaryTint : T.bg1, color: on ? T.primaryDeep : T.text2,
                border: `1px solid ${on ? T.primary : T.border}`,
                '&:hover': { borderColor: on ? T.primary : T.borderStrong },
              }}>
              <span style={{ fontSize: 12 }}>{tf.em}</span>{tf.label}
            </Box>
          );
        })}
        </Stack>
      </Box>

      {/* Grid */}
      <Box sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
        overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}>
        {/* Header */}
        <Box sx={{
          display: 'grid', gridTemplateColumns: `${TEAM.STICKY_W}px repeat(${days.length}, ${TEAM.CELL_W}px)`,
          bgcolor: T.bg2, borderBottom: `1px solid ${T.borderStrong}`,
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <Box sx={{
            p: '12px 14px', fontSize: 10.5, fontWeight: 700, color: T.text3,
            letterSpacing: '0.08em', textTransform: 'uppercase', borderRight: `1px solid ${T.border}`,
          }}>Staff</Box>
          {days.map(d => <DayHeader key={d.iso} day={d} width={TEAM.CELL_W} />)}
        </Box>

        {/* Non assigné row (toujours en tête) */}
        {(!unassignedCollapsed || unassignedTasks.length > 0) && (
          <StaffRow
            key="__unassigned__"
            staff={{ _id: '__unassigned__', staffCode: 'NA', username: 'Non assigné', memberRole: 'Staff' }}
            tasks={unassignedTasks}
            days={days}
            isUnassigned
            collapsed={unassignedCollapsed}
            onToggleCollapse={() => setUnassignedCollapsed(c => !c)}
            onTaskClick={onTaskClick}
          />
        )}

        {/* Staff rows */}
        {staff.map((s, i) => (
          <StaffRow key={s._id}
            staff={{ ...s, color: STAFF_COLORS[i % STAFF_COLORS.length] }}
            tasks={grouped.get(s._id) || []}
            days={days}
            onTaskClick={onTaskClick}
          />
        ))}
      </Box>

      {/* Charge legend */}
      <Stack direction="row" gap={1.75} sx={{ alignItems: 'center', 
        mt: 1.25, p: '10px 14px', bgcolor: T.bg1, border: `1px solid ${T.border}`,
        borderRadius: 1.4, fontSize: 11, color: T.text3,
      }}>
        <Typography sx={{
          fontFamily: '"Geist Mono", monospace', fontWeight: 700, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3,
        }}>Charge / jour</Typography>
        <ChargeLegend tone="low" label="0–3 tâches" />
        <ChargeLegend tone="med" label="4–6 tâches" />
        <ChargeLegend tone="high" label="7+ tâches" />
        <Typography sx={{ ml: 'auto', color: T.error, fontWeight: 600 }}>● = non assignée (clignote)</Typography>
      </Stack>
    </Box>
  );
}

function ChargeLegend({ tone, label }: { tone: 'low' | 'med' | 'high'; label: string }) {
  const grad = tone === 'high' ? `linear-gradient(180deg, ${T.error}, ${T.bg3} 90%)` :
               tone === 'med'  ? `linear-gradient(180deg, ${T.warning} 60%, ${T.bg3} 60%)` :
                                 `linear-gradient(180deg, ${T.primary} 30%, ${T.bg3} 30%)`;
  return (
    <Stack direction="row" gap={0.625} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 3, height: 18, borderRadius: '2px', background: grad }} />
      {label}
    </Stack>
  );
}

function StaffRow({ staff, tasks, days, isUnassigned, collapsed, onToggleCollapse, onTaskClick }: {
  staff: StaffMember;
  tasks: TaskItem[];
  days: ReturnType<typeof genDays>;
  isUnassigned?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onTaskClick?: (t: TaskItem) => void;
}) {
  const role = staff.memberRole || 'Staff';

  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: `${TEAM.STICKY_W}px repeat(${days.length}, ${TEAM.CELL_W}px)`,
      borderBottom: `1px solid ${T.border}`, height: collapsed ? 36 : TEAM.ROW_H,
      transition: 'height 0.2s',
      ...(isUnassigned ? {
        background: `linear-gradient(90deg, rgba(200,30,30,0.06), transparent 35%)`,
      } : {}),
    }}>
      {/* Sticky left */}
      <Stack direction="row" gap={1.125} sx={{ alignItems: 'center', 
        p: '8px 12px', borderRight: `1px solid ${T.border}`,
        bgcolor: isUnassigned ? `linear-gradient(135deg, rgba(200,30,30,0.06), ${T.bg1} 70%)` : T.bg1,
      }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: '50%', color: '#fff',
          fontFamily: '"Geist Mono", monospace', fontSize: 11.5, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 1px 3px rgba(20,17,10,0.10)',
          background: isUnassigned
            ? `linear-gradient(135deg, #fca5a5, ${T.error})`
            : (staff.color || STAFF_COLORS[0]),
        }}>{isUnassigned ? '⚠' : initialsFrom(staff.username)}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: 12.5, fontWeight: 700, lineHeight: 1.1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: isUnassigned ? T.error : T.text,
          }}>{isUnassigned ? 'Non assigné' : staff.username}</Typography>
          <Typography sx={{
            fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace',
            mt: '1px', letterSpacing: '0.02em',
          }}>{isUnassigned ? 'À répartir' : role}</Typography>
        </Box>
        <Box sx={{
          fontFamily: '"Geist Mono", monospace', fontSize: 10, fontWeight: 700,
          color: isUnassigned ? T.error : T.text2,
          bgcolor: isUnassigned ? T.errorTint : T.bg2,
          px: 0.875, py: '2px', borderRadius: 999, letterSpacing: '0.04em', flexShrink: 0,
        }}>{tasks.length}</Box>
        {isUnassigned && onToggleCollapse && (
          <IconButton size="small" onClick={onToggleCollapse} sx={{ width: 18, height: 18, color: T.text3, fontSize: 10,
            transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}>▾</IconButton>
        )}
      </Stack>

      {/* Day cells */}
      {!collapsed && days.map(d => {
        const dayTasks = tasks.filter(t => (t.startDate || '').slice(0, 10) === d.iso);
        return (
          <DayCellTeam key={d.iso} day={d} tasks={dayTasks} onTaskClick={onTaskClick} />
        );
      })}
    </Box>
  );
}

function DayCellTeam({ day, tasks, onTaskClick }: {
  day: ReturnType<typeof genDays>[0]; tasks: TaskItem[]; onTaskClick?: (t: TaskItem) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = tasks.slice(0, TEAM.MAX_CHIPS);
  const overflow = tasks.length - TEAM.MAX_CHIPS;

  return (
    <Box sx={{
      borderRight: `1px solid ${T.border}`, position: 'relative',
      bgcolor: day.isToday ? 'rgba(184,133,26,0.04)' : day.isWeekend ? T.bg2 : T.bg1,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {tasks.length > 0 && <LoadBar count={tasks.length} />}
      {tasks.length > 0 && (
        <Stack sx={{
          position: 'absolute', bottom: 3, left: 3, right: 8,
          flexDirection: 'column', gap: 0.25, zIndex: 1,
        }}>
          {visible.map((t) => (
            <Box key={t._id} onClick={() => onTaskClick?.(t)} sx={{ cursor: 'pointer' }}>
              <TaskChip item={t} />
            </Box>
          ))}
          {overflow > 0 && (
            <>
              <Box onClick={(e) => setAnchor(e.currentTarget)}
                sx={{
                  bgcolor: T.bg3, color: T.text2, fontWeight: 700,
                  fontFamily: '"Geist Mono", monospace', fontSize: 9,
                  textAlign: 'center', py: '1px', borderRadius: 0.75, cursor: 'pointer',
                  letterSpacing: '0.04em', border: `1px solid ${T.border}`,
                }}>+{overflow}</Box>
              <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}
                PaperProps={{ sx: { p: 1.25, borderRadius: 1.5, minWidth: 220 } }}>
                <Typography sx={{
                  fontSize: 10, fontWeight: 700, color: T.text3, fontFamily: '"Geist Mono", monospace',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  pb: 0.75, mb: 1, borderBottom: `1px solid ${T.border}`,
                }}>{tasks.length} tâches · {day.iso}</Typography>
                <Stack gap={0.5}>
                  {tasks.map((t) => (
                    <Box key={t._id} onClick={() => { onTaskClick?.(t); setAnchor(null); }} sx={{ cursor: 'pointer' }}>
                      <TaskChip item={t} />
                    </Box>
                  ))}
                </Stack>
              </Popover>
            </>
          )}
        </Stack>
      )}
    </Box>
  );
}
