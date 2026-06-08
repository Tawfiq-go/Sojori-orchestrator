import { Stack, Typography } from '@mui/material';
import moment from 'moment';
import type { ReactNode } from 'react';
import {
  ReservationRegistrationActions,
  type RegistrationFieldPatch,
  type GuestMemberRecord,
} from '../reservations/ReservationRegistrationActions';
import {
  ReservationStayActions,
  type StayFieldPatch,
  type StayActionMode,
} from '../reservations/ReservationStayActions';
import { TaskGenericSlotEditor } from './TaskGenericSlotEditor';
import type { TaskListItem } from '../../types/tasks.types';

const T = { text3: '#7a756c' };

const STAY_MODE_BY_TYPE: Record<string, StayActionMode> = {
  arrival_choose: 'choose',
  arrival_declare: 'declare',
  departure_choose: 'choose',
  departure_declare: 'declare',
};

function taskTypeKey(task: TaskListItem): string {
  return String(task.subType || task.type || '').toLowerCase();
}

function formatPlannedDateLabel(iso?: string | null): string {
  if (!iso) return '—';
  const d = moment(iso);
  return d.isValid() ? d.format('DD MMM YY') : '—';
}

function plannedTimeLabel(task: TaskListItem): string | undefined {
  if (task.plannedTime) {
    const m = String(task.plannedTime).match(/^(\d{1,2})/);
    if (m) return `${m[1]}h`;
  }
  if (task.scheduledAt) {
    const m = String(task.scheduledAt).match(/^(\d{1,2})/);
    if (m) return `${m[1]}h`;
  }
  return undefined;
}

type Props = {
  task: TaskListItem;
  renderPlannedHourLine: (task: TaskListItem) => ReactNode;
  formatPlannedParts: (task: TaskListItem) => { date: string; time?: string } | null;
  onStayUpdated?: (reservationId: string, patch: StayFieldPatch) => void;
  onRegistrationUpdated?: (reservationId: string, patch: RegistrationFieldPatch) => void;
  onTaskUpdated?: (task: TaskListItem) => void;
};

export function TaskPlannedCell({
  task,
  renderPlannedHourLine,
  formatPlannedParts,
  onStayUpdated,
  onRegistrationUpdated,
  onTaskUpdated,
}: Props) {
  const typ = taskTypeKey(task);
  const reservationId = task.reservationId ? String(task.reservationId) : '';
  const stayMode = STAY_MODE_BY_TYPE[typ];

  if (reservationId && stayMode) {
    const isArrival = typ.startsWith('arrival_');
    const dateIso = isArrival
      ? task.reservationCheckIn || task.startDate
      : task.reservationCheckOut || task.startDate;
    return (
      <ReservationStayActions
        reservationId={reservationId}
        taskId={String(task._id)}
        mode={stayMode}
        kind={isArrival ? 'arrival' : 'departure'}
        dateLabel={formatPlannedDateLabel(dateIso)}
        chosenTime={isArrival ? task.checkInTime ?? task.plannedTime : task.checkOutTime ?? task.plannedTime}
        chosenConfirmed={isArrival ? task.confirmedCheckInTime : task.confirmedCheckOutTime}
        declaredTime={isArrival ? task.actualArrivalTime : task.actualDepartureTime}
        onStayUpdated={(patch) => onStayUpdated?.(reservationId, patch)}
      />
    );
  }

  if (reservationId && typ === 'registration') {
    const dateIso = task.reservationCheckIn || task.startDate;
    const registered =
      task.guestRegistration?.nbre_guest_registered ??
      task.nbreGuestValidated ??
      0;
    const total =
      task.guestRegistration?.nbre_guest_to_register ??
      task.adults ??
      task.reservationAdults ??
      0;
    return (
      <Stack spacing={0.25} sx={{ alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{formatPlannedDateLabel(dateIso)}</Typography>
        <ReservationRegistrationActions
          reservationId={reservationId}
          registered={registered}
          total={total}
          members={task.guestRegistration?.members as GuestMemberRecord[] | undefined}
          onRegistrationUpdated={(patch) => onRegistrationUpdated?.(reservationId, patch)}
        />
      </Stack>
    );
  }

  const parts = formatPlannedParts(task);
  if (!parts) {
    return <Typography sx={{ fontSize: 11, color: T.text3, textAlign: 'center' }}>—</Typography>;
  }

  if (reservationId && task._id) {
    return (
      <TaskGenericSlotEditor
        task={task}
        dateLabel={parts.date}
        timeLabel={plannedTimeLabel(task) || parts.time?.split(' ')[0]}
        onUpdated={onTaskUpdated}
      />
    );
  }

  const hourLine = renderPlannedHourLine(task);
  return (
    <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{parts.date}</Typography>
      {hourLine}
      {!hourLine && parts.time ? (
        <Typography sx={{ fontSize: 10, color: T.text3 }}>{parts.time}</Typography>
      ) : null}
    </Stack>
  );
}
