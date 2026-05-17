/**
 * Task liée à une réservation (API interne srv-task).
 * GET /api/v1/internal/tasks/reservation/:reservationId
 */
export interface ReservationTask {
  taskId: string;
  taskCode: string;
  type: string;
  status: string;
  scheduledFor?: string;
  deadline?: string;
  assignedStaff?: {
    name: string;
    phone: string;
  } | null;
}

export interface ReservationTasksResult {
  success: boolean;
  data: {
    reservationId: string;
    total: number;
    tasks: ReservationTask[];
  };
}
