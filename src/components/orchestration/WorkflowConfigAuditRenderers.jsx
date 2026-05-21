// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Atelier 2026
// WorkflowConfigAuditRenderers.jsx — Renderers Config/Audit par type
// Migration logique de NewWorkflowTimeline.jsx (sojori-dashboard)
// ════════════════════════════════════════════════════════════════════
import React from 'react';

/**
 * Composant KV (Key-Value) pour afficher les paires clé-valeur
 */
function KV({ k, v }) {
  let displayValue = v;
  if (typeof v === 'object' && v !== null) {
    displayValue = JSON.stringify(v);
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, padding: '3px 0' }}>
      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
      <span style={{ color: 'var(--text-h)', fontFamily: '"Geist Mono", monospace', fontSize: 10.5, fontWeight: 500, textAlign: 'right' }}>{displayValue}</span>
    </div>
  );
}

/**
 * Renderer Config pour type 'notification' (messages WhatsApp/Email)
 */
export function renderNotificationConfig(config) {
  return (
    <>
      {/* Section ⚙️ Règle */}
      {(config.moment || config.trigger || config.condition || config.timing) && (
        <div style={{
          backgroundColor: 'white',
          padding: 12,
          borderRadius: 8,
          border: '1px solid #ce93d8',
        }}>
          <div style={{
            fontWeight: 700,
            color: '#6a1b9a',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}>
            <span>⚙️</span>
            <span>Règle</span>
          </div>
          <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 4, color: '#555' }}>
            {config.moment && (
              <div>• <strong>Moment:</strong> {config.moment} {config.scheduledFor && <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: 10, color: '#666' }}>({config.scheduledFor})</span>}</div>
            )}
            {config.trigger && !config.moment && (
              <div>• <strong>Déclencheur:</strong> {config.trigger}</div>
            )}
            {config.condition && (
              <div>• <strong>Condition:</strong> {config.condition === 'ALWAYS' ? 'Toujours' : config.condition}</div>
            )}
            {(config.reminderStart || config.reminderDeadline) && (
              <div>• <strong>Rappels:</strong> J-{config.reminderStart || '?'} à J-{config.reminderDeadline || '?'} avant échéance</div>
            )}
            {config.preferredHours && (
              <div>• <strong>Heures envoi:</strong> {config.preferredHours}h</div>
            )}
          </div>
        </div>
      )}

      {/* Section 📨 Canal & Message */}
      {(config.channel || config.messageLabel || config.channelSource) && (
        <div style={{
          backgroundColor: 'white',
          padding: 12,
          borderRadius: 8,
          border: '1px solid #81c784',
        }}>
          <div style={{
            fontWeight: 700,
            color: '#2e7d32',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}>
            <span>📨</span>
            <span>Canal & Message</span>
          </div>
          <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 4, color: '#555' }}>
            {config.channel && (
              <div>• <strong>Canal:</strong> {config.channel}</div>
            )}
            {config.channelSource && (
              <div>• <strong>Source réelle:</strong> <span style={{ color: '#1976d2' }}>{config.channelSource}</span></div>
            )}
            {config.messageLabel && (
              <div>• <strong>Message:</strong> {config.messageLabel}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Renderer Config pour type 'registration' (formulaire d'enregistrement)
 */
export function renderRegistrationConfig(config) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: 12,
      borderRadius: 8,
      border: '1px solid #64b5f6',
    }}>
      <div style={{
        fontWeight: 700,
        color: '#1976d2',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <span>🔐</span>
        <span>Configuration Registration</span>
      </div>
      <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 4, color: '#555' }}>
        {config.formType && (
          <div>• <strong>Type de formulaire:</strong> {config.formType}</div>
        )}
        {config.deadline && (
          <div>• <strong>Deadline:</strong> {config.deadline}</div>
        )}
        {config.requiredFields && (
          <div>• <strong>Champs requis:</strong> {config.requiredFields.join(', ')}</div>
        )}
        {config.reminderFrequency && (
          <div>• <strong>Fréquence relances:</strong> {config.reminderFrequency}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Renderer Config pour type 'timeslot' (choix de créneau horaire)
 */
export function renderTimeslotConfig(config) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: 12,
      borderRadius: 8,
      border: '1px solid #ffb74d',
    }}>
      <div style={{
        fontWeight: 700,
        color: '#e65100',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <span>🎫</span>
        <span>Configuration Timeslot</span>
      </div>
      <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 4, color: '#555' }}>
        {config.taskType && (
          <div>• <strong>Type de tâche:</strong> {config.taskType}</div>
        )}
        {config.slotsAvailable && (
          <div>• <strong>Créneaux disponibles:</strong> {config.slotsAvailable}</div>
        )}
        {config.duration && (
          <div>• <strong>Durée:</strong> {config.duration}</div>
        )}
        {config.deadline && (
          <div>• <strong>Deadline choix:</strong> {config.deadline}</div>
        )}
        {config.reminderFrequency && (
          <div>• <strong>Relances:</strong> {config.reminderFrequency}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Renderer Config pour type 'staff' (assignation de staff)
 */
export function renderStaffConfig(config) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: 12,
      borderRadius: 8,
      border: '1px solid #42a5f5',
    }}>
      <div style={{
        fontWeight: 700,
        color: '#1565c0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <span>👤</span>
        <span>Configuration Staff</span>
      </div>
      <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 4, color: '#555' }}>
        {config.assignmentMode && (
          <div>• <strong>Mode d'assignation:</strong> {config.assignmentMode}</div>
        )}
        {config.maxRetries && (
          <div>• <strong>Tentatives max:</strong> {config.maxRetries}</div>
        )}
        {config.criteria && (
          <div>• <strong>Critères:</strong> {config.criteria}</div>
        )}
        {config.fallbackStrategy && (
          <div>• <strong>Stratégie fallback:</strong> {config.fallbackStrategy}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Renderer Config pour type 'createTask' (création de tâche)
 */
export function renderCreateTaskConfig(config) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: 12,
      borderRadius: 8,
      border: '1px solid #ab47bc',
    }}>
      <div style={{
        fontWeight: 700,
        color: '#6a1b9a',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <span>📋</span>
        <span>Configuration Tâche</span>
      </div>
      <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 4, color: '#555' }}>
        {config.taskType && (
          <div>• <strong>Type de tâche:</strong> {config.taskType}</div>
        )}
        {config.priority && (
          <div>• <strong>Priorité:</strong> {config.priority}</div>
        )}
        {config.assignTo && (
          <div>• <strong>Assigné à:</strong> {config.assignTo}</div>
        )}
        {config.dueDate && (
          <div>• <strong>Date d'échéance:</strong> {config.dueDate}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Renderer Config pour type 'declareArrival' (déclaration d'arrivée)
 */
export function renderDeclareArrivalConfig(config) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: 12,
      borderRadius: 8,
      border: '1px solid #66bb6a',
    }}>
      <div style={{
        fontWeight: 700,
        color: '#2e7d32',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <span>✈️</span>
        <span>Configuration Arrivée</span>
      </div>
      <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 4, color: '#555' }}>
        {config.arrivalWindow && (
          <div>• <strong>Fenêtre d'arrivée:</strong> {config.arrivalWindow}</div>
        )}
        {config.requiresConfirmation && (
          <div>• <strong>Confirmation requise:</strong> {config.requiresConfirmation ? 'Oui' : 'Non'}</div>
        )}
        {config.notifyStaff && (
          <div>• <strong>Notifier le staff:</strong> {config.notifyStaff ? 'Oui' : 'Non'}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Renderer Config générique (fallback pour types non spécifiques)
 */
export function renderGenericConfig(config) {
  const filteredEntries = Object.entries(config).filter(([k]) =>
    !['moment', 'trigger', 'condition', 'timing', 'scheduledFor', 'reminderStart', 'reminderDeadline', 'preferredHours', 'channel', 'channelSource', 'messageLabel'].includes(k)
  );

  if (filteredEntries.length === 0) return null;

  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      padding: 12,
      borderRadius: 8,
      border: '1px solid #ddd',
    }}>
      <div style={{ fontWeight: 700, color: '#666', marginBottom: 8 }}>Configuration</div>
      {filteredEntries.map(([k, v]) => v ? <KV key={k} k={k} v={v} /> : null)}
    </div>
  );
}

/**
 * Router principal qui rend le bon Config selon le type
 */
export function renderConfigByType(workflowType, actionType, config) {
  // Déterminer le type réel
  const type = actionType || workflowType || 'generic';

  switch (type) {
    case 'notification':
    case 'sendEmail':
    case 'sendWhatsApp':
      return renderNotificationConfig(config);

    case 'registration':
    case 'requestRegistration':
      return renderRegistrationConfig(config);

    case 'timeslot':
    case 'requestTimeslot':
      return renderTimeslotConfig(config);

    case 'staff':
    case 'assignStaff':
      return renderStaffConfig(config);

    case 'createTask':
      return renderCreateTaskConfig(config);

    case 'declareArrival':
      return renderDeclareArrivalConfig(config);

    default:
      // Fallback: essayer d'afficher la structure notification par défaut + generic
      return (
        <>
          {renderNotificationConfig(config)}
          {renderGenericConfig(config)}
        </>
      );
  }
}

export default renderConfigByType;
