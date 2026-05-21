/**
 * Contenu des boutons info pour chaque onglet de monitoring
 * Utilisé par le composant InfoButton
 */

export const MONITORING_TABS_INFO = {
  Summary: {
    title: 'Vue Unifiée - Summary',
    description:
      'Tableau de bord consolidé affichant tous les événements (logs, metrics, RabbitMQ, alerts) en temps réel dans une timeline unifiée. Permet une vue d\'ensemble rapide de la santé du système.',
    graphs: [
      {
        name: 'Stats Summary',
        description: 'Ligne de statistiques (Total, Logs, Metrics, RabbitMQ, Alerts, Critical/Error/Warning/Info)',
      },
      {
        name: 'Timeline by Severity',
        description: 'Graphique en barres empilées montrant la répartition des événements par sévérité dans le temps',
      },
      {
        name: 'Events Timeline',
        description: 'Liste déroulante des derniers événements avec détails expandables',
      },
    ],
    dataSources: [
      {
        name: 'Events + Stats',
        endpoint: 'GET /api/monitoring/unified-overview',
        collection: 'unified_monitoring',
        service: 'srv-logs-proxy',
        type: 'MongoDB',
      },
      {
        name: 'Timeline Stats',
        endpoint: 'GET /api/monitoring/unified-timeline-stats',
        collection: 'unified_monitoring (agrégation)',
        service: 'srv-logs-proxy',
        type: 'MongoDB',
      },
    ],
    filters: [
      'Time Range (1h, Today, Yesterday, 7d)',
      'Category (API, DB, AI, WhatsApp, RabbitMQ, RU, etc.)',
      'Types (Logs, Metrics, RMQ, Alerts)',
      'Severity (Critical, Error, Warning, Info)',
      'Service',
      'Limit (100, 200, 500, 1000)',
    ],
    refreshInterval: 'Toutes les 30 secondes (toggle ON/OFF)',
  },

  Logs: {
    title: 'Logs Applicatifs',
    description:
      'Affichage détaillé des logs applicatifs avec filtrage avancé par service, niveau de log, et recherche full-text. Permet de débugger rapidement les erreurs et suivre les traces de requêtes.',
    graphs: [
      {
        name: 'Logs Timeline',
        description: 'Graphique en barres avec répartition par niveau de log (Error, Warning, Info, Debug)',
      },
      {
        name: 'Logs Table',
        description: 'Tableau détaillé avec colonnes: Timestamp, Service, Level, Message, Context (JSON expandable)',
      },
    ],
    dataSources: [
      {
        name: 'Logs List',
        endpoint: 'GET /api/logs',
        collection: 'logs',
        service: 'srv-logs-proxy',
        type: 'MongoDB',
      },
      {
        name: 'Timeline Stats',
        endpoint: 'GET /api/logs/timeline-stats',
        collection: 'logs (agrégation)',
        service: 'srv-logs-proxy',
        type: 'MongoDB',
      },
    ],
    filters: [
      'Time Range (1h, 6h, Today, Yesterday, 7d)',
      'Service (srv-reservations, srv-user, srv-chatbot, etc.)',
      'Level (Error, Warning, Info, Debug)',
      'Search (full-text dans message)',
      'Trace ID (suivi de requête)',
    ],
    actions: [
      'Pagination (50 logs par page)',
      'Export CSV',
      'Copier le contexte JSON',
    ],
    refreshInterval: 'Manuel uniquement',
  },

  Metrics: {
    title: 'Métriques de Performance',
    description:
      'Visualisation des métriques de performance système et applicatives: CPU, mémoire, latence API, throughput. Sources de données combinées de Prometheus (métriques système) et MongoDB (métriques applicatives).',
    graphs: [
      {
        name: 'System Metrics Cards',
        description: 'CPU Usage, Memory Usage, Request Rate, Error Rate par service',
      },
      {
        name: 'API Latency',
        description: 'Line chart montrant la latence (ms) par service dans le temps',
      },
      {
        name: 'Throughput',
        description: 'Area chart empilé montrant les requêtes/minute par service',
      },
    ],
    dataSources: [
      {
        name: 'Overview Metrics',
        endpoint: 'GET /api/prometheus-proxy/overview',
        collection: 'Prometheus queries',
        service: 'srv-logs-proxy',
        type: 'Prometheus',
      },
      {
        name: 'Nodes Metrics',
        endpoint: 'GET /api/prometheus-proxy/nodes',
        collection: 'Prometheus queries',
        service: 'srv-logs-proxy',
        type: 'Prometheus',
      },
      {
        name: 'Pods Metrics',
        endpoint: 'GET /api/prometheus-proxy/pods',
        collection: 'Prometheus queries',
        service: 'srv-logs-proxy',
        type: 'Prometheus',
      },
      {
        name: 'Business Metrics',
        endpoint: 'GET /api/prometheus-proxy/business-metrics',
        collection: 'Prometheus queries',
        service: 'srv-logs-proxy',
        type: 'Prometheus',
      },
      {
        name: 'Time Series',
        endpoint: 'GET /api/prometheus-proxy/timeseries',
        collection: 'Prometheus queries',
        service: 'srv-logs-proxy',
        type: 'Prometheus',
      },
    ],
    filters: [
      'Time Range (15m, 1h, 6h, 24h, 7d)',
      'Service (multi-select)',
      'Metric Type (CPU, Memory, Latency, Throughput)',
      'Aggregation (Average, P50, P95, P99)',
    ],
    refreshInterval: 'Toutes les 60 secondes',
  },

  RabbitMQ: {
    title: 'Monitoring RabbitMQ',
    description:
      'Surveillance des queues RabbitMQ et détection d\'incidents: queues bloquées, consommateurs manquants, Dead Letter Queues (DLQ). Permet de rejouer ou purger les messages en DLQ.',
    graphs: [
      {
        name: 'Queue Health Status',
        description: 'Cards affichant le statut de chaque queue (✅ Healthy / ⚠️ Warning / 🔴 Critical)',
      },
      {
        name: 'Messages Timeline',
        description: 'Line chart montrant Messages ready, Messages unacked, et Total messages',
      },
      {
        name: 'DLQ Incidents',
        description: 'Table listant les Dead Letter Queues avec nombre de messages et actions (Replay, Purge)',
      },
    ],
    dataSources: [
      {
        name: 'Queue Stats',
        endpoint: 'GET /api/rabbitmq/queues',
        collection: 'rabbitmq_snapshots + RabbitMQ Management API',
        service: 'srv-logs-proxy',
        type: 'Hybrid',
      },
      {
        name: 'DLQ List',
        endpoint: 'GET /api/admin/rabbitmq/dlq/list',
        collection: 'RabbitMQ API direct',
        service: 'srv-admin',
        type: 'RabbitMQ API',
      },
      {
        name: 'Timeline',
        endpoint: 'GET /api/rabbitmq/timeline',
        collection: 'rabbitmq_snapshots',
        service: 'srv-logs-proxy',
        type: 'MongoDB',
      },
    ],
    filters: ['Time Range (1h, 6h, 24h)', 'Queue Name (search)', 'Incident Type (no_consumer, backlog, dlq, slow_processing)'],
    actions: [
      'Rejouer DLQ - Republier les messages vers la queue originale',
      'Purger DLQ - Vider complètement une DLQ (⚠️ irréversible)',
      'Export incidents CSV',
    ],
    refreshInterval: 'Toutes les 30 secondes',
  },

  RU: {
    title: 'Monitoring Rental United',
    description:
      'Monitoring des intégrations Rental United: appels API, webhooks, synchronisations. Affiche le taux de succès, latence, et statut de sync par owner.',
    graphs: [
      {
        name: 'API Call Success Rate',
        description: 'Pie chart montrant Success (200-299), Client Error (400-499), Server Error (500-599)',
      },
      {
        name: 'API Latency by Endpoint',
        description: 'Bar chart montrant la latence moyenne (ms) par endpoint RU (PushReservation, PullReservations, etc.)',
      },
      {
        name: 'Webhook Events Timeline',
        description: 'Area chart des webhooks RU reçus (NewReservation, UpdateReservation, CancelReservation, NewMessage, NewThread)',
      },
      {
        name: 'Sync Status',
        description: 'Table par owner montrant Last sync time, Synced reservations, Synced listings, Errors, Status',
      },
    ],
    dataSources: [
      {
        name: 'API Calls',
        endpoint: 'GET /api/monitoring/ru/api-calls',
        collection: 'ru_api_logs',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-channels DB)',
      },
      {
        name: 'Webhooks',
        endpoint: 'GET /api/monitoring/ru/webhooks',
        collection: 'rentals_webhooks',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-reservations DB)',
      },
      {
        name: 'Sync Status',
        endpoint: 'GET /api/monitoring/ru/sync-status',
        collection: 'ru_sync_metadata',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-channels DB)',
      },
    ],
    filters: ['Time Range (1h, 6h, 24h, 7d)', 'Owner ID', 'Endpoint (PushReservation, PullReservations, etc.)', 'Status (Success, Error)'],
    refreshInterval: 'Toutes les 60 secondes',
  },

  WhatsApp: {
    title: 'Monitoring WhatsApp Business',
    description:
      'Monitoring des communications WhatsApp Business: templates, flows, conversations, taux de livraison. Permet de suivre l\'engagement client et les taux de complétion des flows.',
    graphs: [
      {
        name: 'Message Delivery Rate',
        description: 'Donut chart montrant Delivered, Sent, Failed, Pending',
      },
      {
        name: 'Templates Usage',
        description: 'Bar chart horizontal des top 10 templates les plus utilisés',
      },
      {
        name: 'Flow Completion Rate',
        description: 'Stacked bar chart par flow (Checkin, Concierge, Support) montrant Started, Completed, Abandoned',
      },
      {
        name: 'Conversations Timeline',
        description: 'Line chart des conversations (Nouvelles, Actives, Fermées)',
      },
    ],
    dataSources: [
      {
        name: 'Messages',
        endpoint: 'GET /api/monitoring/whatsapp/messages',
        collection: 'whatsapp_messages',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-chatbot DB)',
      },
      {
        name: 'Templates',
        endpoint: 'GET /api/monitoring/whatsapp/templates',
        collection: 'whatsapp_templates',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-chatbot DB)',
      },
      {
        name: 'Flows',
        endpoint: 'GET /api/monitoring/whatsapp/flows',
        collection: 'whatsapp_flows',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-chatbot DB)',
      },
      {
        name: 'Conversations',
        endpoint: 'GET /api/monitoring/whatsapp/conversations',
        collection: 'conversations',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-chatbot DB)',
      },
    ],
    filters: [
      'Time Range (1h, 24h, 7d, 30d)',
      'Message Status (sent, delivered, read, failed)',
      'Template Name',
      'Flow Type (Checkin, Concierge, Support)',
      'Direction (inbound, outbound)',
    ],
    refreshInterval: 'Toutes les 60 secondes',
  },

  AI: {
    title: 'Monitoring Agents IA',
    description:
      'Monitoring des agents IA (chatbot, assistants): conversations, tokens utilisés, latence, coûts. Permet de suivre les performances et optimiser les coûts OpenAI/Anthropic.',
    graphs: [
      {
        name: 'Conversations Stats Cards',
        description: 'Total conversations, Active conversations, Avg messages per conversation, Completion rate',
      },
      {
        name: 'Token Usage',
        description: 'Stacked area chart montrant Input tokens, Output tokens, Total',
      },
      {
        name: 'AI Latency',
        description: 'Line chart avec P50, P95, P99 latency (ms)',
      },
      {
        name: 'Cost Tracker',
        description: 'Line chart + total montrant le coût cumulé en $ par jour',
      },
    ],
    dataSources: [
      {
        name: 'Conversations',
        endpoint: 'GET /api/monitoring/ai/conversations',
        collection: 'conversations',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-chatbot DB)',
      },
      {
        name: 'Tokens',
        endpoint: 'GET /api/monitoring/ai/tokens',
        collection: 'ai_metrics',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-chatbot DB)',
      },
      {
        name: 'Latency',
        endpoint: 'GET /api/monitoring/ai/latency',
        collection: 'ai_metrics',
        service: 'srv-logs-proxy',
        type: 'MongoDB (srv-chatbot DB)',
      },
      {
        name: 'Costs',
        endpoint: 'GET /api/monitoring/ai/costs',
        collection: 'ai_metrics (calculé)',
        service: 'srv-logs-proxy',
        type: 'MongoDB',
      },
    ],
    filters: [
      'Time Range (1h, 24h, 7d, 30d)',
      'Model (gpt-4, claude-3-5-sonnet, etc.)',
      'Conversation ID',
      'Success/Error',
    ],
    actions: [
      'Exporter les conversations coûteuses',
      'Voir le détail d\'une conversation',
      'Analyser les prompts inefficaces',
    ],
    refreshInterval: 'Toutes les 60 secondes',
  },

  Infrastructure: {
    title: 'Monitoring Infrastructure Kubernetes',
    description:
      'Monitoring de l\'infrastructure Kubernetes: pods, nodes, CPU, mémoire, restarts. Combine les données de l\'API Kubernetes et Prometheus pour une vue complète de l\'état du cluster.',
    graphs: [
      {
        name: 'Pods Status Cards',
        description: 'Par service: Pods Running, Failed/CrashLoopBackOff, Restarts, CPU usage (%), Memory usage (MB)',
      },
      {
        name: 'CPU Usage by Pod',
        description: 'Line chart montrant l\'utilisation CPU (%) de chaque pod',
      },
      {
        name: 'Memory Usage by Pod',
        description: 'Area chart empilé montrant la mémoire utilisée (MB) par pod',
      },
      {
        name: 'Pod Restarts',
        description: 'Bar chart horizontal montrant le nombre de restarts par pod (dernières 24h)',
      },
    ],
    dataSources: [
      {
        name: 'Pods Status',
        endpoint: 'GET /api/monitoring/infrastructure/pods',
        collection: 'Kubernetes API + Prometheus',
        service: 'srv-logs-proxy',
        type: 'Hybrid',
      },
      {
        name: 'CPU/Memory Metrics',
        endpoint: 'GET /api/monitoring/infrastructure/metrics',
        collection: 'Prometheus queries',
        service: 'srv-logs-proxy',
        type: 'Prometheus',
      },
      {
        name: 'Kubernetes Events',
        endpoint: 'GET /api/monitoring/infrastructure/events',
        collection: 'k8s_events',
        service: 'srv-logs-proxy',
        type: 'MongoDB + K8s API',
      },
    ],
    filters: [
      'Time Range (15m, 1h, 6h, 24h)',
      'Namespace (production, staging)',
      'Service (srv-reservations, srv-user, etc.)',
      'Event Type (Warning, Normal)',
    ],
    actions: [
      'Redémarrer un pod',
      'Voir les logs d\'un pod',
      'Scaler un deployment',
      'Voir les events Kubernetes',
    ],
    refreshInterval: 'Toutes les 30 secondes',
  },

  Security: {
    title: 'Monitoring Sécurité',
    description:
      'Alertes de sécurité et incidents: tentatives d\'accès non autorisées, modifications de secrets, pods suspects, trafic anormal. Basé sur les règles Prometheus et l\'analyse des logs.',
    graphs: [
      {
        name: 'Security Alerts Cards',
        description: 'Critical Alerts, High Priority, Medium Priority, Resolved',
      },
      {
        name: 'Alerts Timeline',
        description: 'Line chart montrant le nombre d\'alertes par type dans le temps',
      },
      {
        name: 'Incidents Table',
        description: 'Table des incidents de sécurité avec Timestamp, Type, Severity, Status, Actions',
      },
    ],
    dataSources: [
      {
        name: 'Security Alerts',
        endpoint: 'GET /api/monitoring/security/alerts',
        collection: 'security_alerts',
        service: 'srv-logs-proxy',
        type: 'MongoDB + Prometheus',
      },
      {
        name: 'Audit Logs',
        endpoint: 'GET /api/monitoring/security/audit',
        collection: 'audit_logs',
        service: 'srv-logs-proxy',
        type: 'MongoDB',
      },
    ],
    filters: [
      'Time Range (1h, 24h, 7d)',
      'Severity (Critical, High, Medium, Low)',
      'Alert Type (unauthorized_access, secret_modified, suspicious_pod, abnormal_traffic)',
      'Status (Open, Investigating, Resolved)',
    ],
    actions: [
      'Marquer comme résolu',
      'Créer un ticket incident',
      'Bloquer une IP',
      'Exporter les alertes',
    ],
    refreshInterval: 'Toutes les 30 secondes',
  },
};
