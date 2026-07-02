export interface SocketLogEntry {
  _id?: string;
  logId?: string;
  timestamp?: string;
  service?: string;
  severity?: string;
  message?: string;
  ownerId?: string;
  reservationNumber?: string;
  listingId?: string;
  threadId?: string;
  phone?: string;
  problemType?: string;
  socketRoom?: string;
  socketEvent?: string;
}

const PROBLEM_LABELS: Record<string, string> = {
  auth_rejected: 'Auth refusée',
  auth_error: 'Erreur auth',
  emit_dropped: 'Message non diffusé (ioInstance)',
  emit_room_failed: 'Échec room socket',
  emit_unexpected: 'Erreur consumer',
  rabbitmq_disconnect: 'RabbitMQ déconnecté',
  rabbitmq_error: 'Erreur RabbitMQ',
  connection: 'Connexion client',
  emit_ok: 'Émission OK',
};

export function socketProblemLabel(type?: string): string {
  if (!type) return 'Problème socket';
  return PROBLEM_LABELS[type] || type.replace(/_/g, ' ');
}

/** Titre lisible — extrait le texte humain avant le JSON de contexte. */
export function socketLogTitle(entry: SocketLogEntry): string {
  const msg = entry.message || '';
  const human = msg.split(' {"')[0].split(' {')[0].trim();
  if (human) return human.replace(/^\[srv-sockets\]\[[^\]]+\]\s*(CRITICAL:\s*)?/i, '').trim() || human;
  if (entry.problemType) return socketProblemLabel(entry.problemType);
  return 'Événement socket';
}

export function socketLogContextLine(entry: SocketLogEntry): string {
  const parts: string[] = [];
  if (entry.problemType && entry.problemType !== 'emit_ok') {
    parts.push(socketProblemLabel(entry.problemType));
  }
  if (entry.socketEvent) parts.push(`event ${entry.socketEvent}`);
  if (entry.socketRoom) parts.push(`room ${entry.socketRoom}`);
  if (entry.phone) parts.push(`tel ${entry.phone}`);
  if (entry.threadId) parts.push(`thread ${entry.threadId}`);
  if (entry.reservationNumber) parts.push(`résa ${entry.reservationNumber}`);
  return parts.join(' · ');
}

export function isSocketProblemEntry(entry: SocketLogEntry): boolean {
  if (entry.problemType === 'emit_ok' || entry.problemType === 'connection') return false;
  if (entry.severity === 'critical' || entry.severity === 'error') return true;
  return Boolean(
    entry.problemType &&
      !['emit_ok', 'connection'].includes(entry.problemType),
  );
}
