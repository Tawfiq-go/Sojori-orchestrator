import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { DevRuntimeLogPanel } from './components/DevRuntimeLogPanel';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/monitoring-theme.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';

const ReservationsPage = lazy(() =>
  import('./pages/ReservationsPage').then((module) => ({ default: module.ReservationsPage }))
);
const ReservationSejourPage = lazy(() =>
  import('./pages/ReservationSejourPage').then((module) => ({ default: module.ReservationSejourPage }))
);
const ReservationsPlanningPage = lazy(() =>
  import('./pages/ReservationsPlanningPage').then((module) => ({ default: module.ReservationsPlanningPage }))
);
const PaymentsPage = lazy(() =>
  import('./pages/PaymentsPage').then((module) => ({ default: module.PaymentsPage }))
);
const CalendarInventoryPage = lazy(() =>
  import('./pages/CalendarInventoryPageV2').then((module) => ({ default: module.CalendarInventoryPageV2 }))
);
const CalendarInventoryPageV3 = lazy(() =>
  import('./pages/CalendarInventoryPageV3').then((module) => ({ default: module.CalendarInventoryPageV3 }))
);
const TasksListPage = lazy(() =>
  import('./pages/TasksListPage').then((module) => ({ default: module.TasksListPage }))
);
const OrchestrationPage = lazy(() =>
  import('./pages/OrchestrationPage').then((module) => ({ default: module.OrchestrationPage }))
);
const OrchestrationEventsPage = lazy(() =>
  import('./pages/OrchestrationEventsPage').then((module) => ({ default: module.OrchestrationEventsPage }))
);
const OrchestrationConfigPage = lazy(() =>
  import('./pages/OrchestrationConfigPage').then((module) => ({ default: module.OrchestrationConfigPage }))
);
const OrchestrationDailyOpsPage = lazy(() =>
  import('./pages/OrchestrationDailyOpsPage').then((module) => ({ default: module.default }))
);
const OrchestrationPlansPageV2 = lazy(() =>
  import("./pages/OrchestrationPlansPageV2").then((module) => ({ default: module.default }))
);
const OrchestrationTimelinePageV2 = lazy(() =>
  import("./pages/OrchestrationTimelinePageV2").then((module) => ({ default: module.OrchestrationTimelinePageV2 }))
);
const OrchestrationReservationsPage = lazy(() =>
  import('./pages/OrchestrationReservationsPage').then((module) => ({
    default: module.OrchestrationReservationsPage,
  }))
);
const CommsPage = lazy(() =>
  import('./pages/CommsPage').then((module) => ({ default: module.CommsPage }))
);
const ListingsPage = lazy(() =>
  import('./pages/ListingsOverviewPage').then((module) => ({ default: module.ListingsOverviewPage }))
);
const ListingDetailPage = lazy(() =>
  import('./pages/ListingDetailPage').then((module) => ({ default: module.ListingDetailPage }))
);
const NewListingFormPage = lazy(() =>
  import('./pages/NewListingFormPage').then((module) => ({ default: module.NewListingFormPage }))
);
const ListingFormV2Page = lazy(() =>
  import('./pages/ListingFormV2Page').then((module) => ({ default: module.ListingFormV2Page }))
);
const ListingCreatePage = lazy(() =>
  import('./pages/ListingCreatePage').then((module) => ({ default: module.ListingCreatePage }))
);
const ReviewsPage = lazy(() =>
  import('./pages/ReviewsPage').then((module) => ({ default: module.ReviewsPage }))
);
const TasksTeamPage = lazy(() =>
  import('./pages/TasksTeamPage').then((module) => ({ default: module.TasksTeamPage }))
);
const TasksPlanningPage = lazy(() =>
  import('./pages/TasksPlanningPage').then((module) => ({ default: module.TasksPlanningPage }))
);
const TasksPlanningPageV2 = lazy(() =>
  import('./pages/TasksPlanningPageV2').then((module) => ({ default: module.default }))
);
const TasksTeamPageV2 = lazy(() =>
  import('./pages/TasksTeamPageV2').then((module) => ({ default: module.default }))
);
const TasksKanbanPage = lazy(() =>
  import('./pages/TasksKanbanPage').then((module) => ({ default: module.default }))
);
const TasksStaffFulltaskPage = lazy(() =>
  import('./pages/TasksStaffFulltaskPage').then((module) => ({ default: module.default }))
);
const TasksOrchestrationFulltaskPage = lazy(() =>
  import('./pages/TasksOrchestrationFulltaskPage').then((module) => ({ default: module.default }))
);
const OwnerOrchestrationModelPage = lazy(() =>
  import('./pages/OwnerOrchestrationModelPage').then((module) => ({
    default: module.default,
  }))
);
const TasksWhatsAppMessagesPage = lazy(() =>
  import('./pages/TasksWhatsAppMessagesPage').then((module) => ({ default: module.default }))
);
const ChatbotWhitelistPage = lazy(() =>
  import('./pages/ChatbotWhitelistPage').then((module) => ({ default: module.default }))
);
const ChatbotWhitelistDetailPage = lazy(() =>
  import('./pages/ChatbotWhitelistDetailPage').then((module) => ({ default: module.default }))
);
const ChatbotListingSnapshotPage = lazy(() =>
  import('./pages/ChatbotListingSnapshotPage').then((module) => ({ default: module.default }))
);
const PlansReservationPage = lazy(() =>
  import('./pages/PlansReservationPage').then((module) => ({ default: module.default }))
);
const StaffWhatsAppPage = lazy(() =>
  import('./pages/StaffWhatsAppPage').then((module) => ({ default: module.StaffWhatsAppPage }))
);
const OTAMessagesPage = lazy(() =>
  import('./pages/OTAMessagesPage').then((module) => ({ default: module.OTAMessagesPage }))
);
const PricingPage = lazy(() =>
  import('./pages/PricingSnapshotPage').then((module) => ({ default: module.PricingSnapshotPage }))
);
const DynamicPricingPage = lazy(() =>
  import('./pages/DynamicPricingPage').then((module) => ({ default: module.DynamicPricingPage }))
);
const PricingAuditPage = lazy(() =>
  import('./features/dynamic-pricing/PricingAuditView').then((module) => ({
    default: module.PricingAuditView,
  }))
);
const ChannelsPage = lazy(() =>
  import('./pages/ChannelsPage').then((module) => ({ default: module.ChannelsPage }))
);
const ClientsPage = lazy(() =>
  import('./pages/ClientsPage').then((module) => ({ default: module.ClientsPage }))
);
const BookingClientsPage = lazy(() =>
  import('./pages/BookingClientsPage').then((module) => ({ default: module.BookingClientsPage }))
);
const WhatsAppContactsPage = lazy(() =>
  import('./pages/WhatsAppContactsPage').then((module) => ({ default: module.WhatsAppContactsPage }))
);
const WhatsAppGuestsPage = lazy(() =>
  import('./pages/WhatsAppGuestsPageV2').then((module) => ({ default: module.default }))
);
const WhatsAppStaffPage = lazy(() =>
  import('./pages/WhatsAppStaffPageV2').then((module) => ({ default: module.default }))
);
const UnifiedInboxPage = lazy(() =>
  import('./pages/UnifiedInboxPage').then((module) => ({ default: module.default }))
);
const CommunicationsHubPage = lazy(() =>
  import('./pages/CommunicationsHubPage').then((module) => ({ default: module.default }))
);
const CRMPage = lazy(() =>
  import('./pages/CRMPage').then((module) => ({ default: module.CRMPage }))
);
const ChannelsAdminPage = lazy(() =>
  import('./pages/ChannelsAdminPage').then((module) => ({ default: module.ChannelsAdminPage }))
);
const ChannelsLegacyRedirect = lazy(() =>
  import('./pages/ChannelsAdminPage').then((module) => ({ default: module.ChannelsLegacyRedirect }))
);
const ChannelManagerHubPage = lazy(() =>
  import('./pages/ChannelManagerHubPage').then((module) => ({
    default: module.ChannelManagerHubPage,
  }))
);
const TeamRolesHubPage = lazy(() =>
  import('./pages/TeamRolesHubPage').then((module) => ({ default: module.TeamRolesHubPage }))
);
const TeamLegacyRedirect = lazy(() =>
  import('./pages/TeamRolesHubPage').then((module) => ({ default: module.TeamLegacyRedirect }))
);
const SettingsHubPage = lazy(() =>
  import('./pages/SettingsHubPage').then((module) => ({ default: module.SettingsHubPage }))
);
const SettingsLegacyRedirect = lazy(() =>
  import('./pages/SettingsHubPage').then((module) => ({ default: module.SettingsLegacyRedirect }))
);
const OnboardingPage = lazy(() =>
  import('./pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage }))
);
const MonitoringHubPage = lazy(() =>
  import('./pages/Monitor/MonitoringHubPage').then((module) => ({ default: module.default }))
);
const SojoriLogsAdminPage = lazy(() =>
  import('./pages/SojoriLogsAdminPage').then((module) => ({ default: module.default }))
);

function RouteLoader() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#fbfaf6',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              {/* Route principale: système complet avec onglets (Plans, Chronologie, Config legacy) */}
              <Route path="/orchestrator" element={<LazyRoute><OrchestrationReservationsPage /></LazyRoute>} />
              <Route path="/orchestration" element={<LazyRoute><OrchestrationReservationsPage /></LazyRoute>} />

              {/* Routes alternatives */}
              <Route path="/orchestration/plans" element={<LazyRoute><OrchestrationPlansPageV2 /></LazyRoute>} />
              <Route path="/orchestration/mockup" element={<LazyRoute><OrchestrationPage /></LazyRoute>} />
              <Route path="/orchestration/timeline/:id" element={<LazyRoute><OrchestrationTimelinePageV2 /></LazyRoute>} />
              <Route path="/orchestration/events" element={<LazyRoute><OrchestrationEventsPage /></LazyRoute>} />
              <Route path="/tasks/ops" element={<LazyRoute><OrchestrationDailyOpsPage /></LazyRoute>} />
              <Route path="/orchestration/daily-ops" element={<Navigate to="/tasks/ops" replace />} />
              <Route path="/orchestration/config" element={<LazyRoute><OrchestrationConfigPage /></LazyRoute>} />

              <Route path="/calendar" element={<LazyRoute><CalendarInventoryPageV3 /></LazyRoute>} />
              <Route path="/calendar-v2" element={<LazyRoute><CalendarInventoryPage /></LazyRoute>} />

              <Route path="/reservations" element={<LazyRoute><ReservationsPage /></LazyRoute>} />
              <Route path="/reservations/planning" element={<LazyRoute><ReservationsPlanningPage /></LazyRoute>} />
              <Route path="/paiements" element={<LazyRoute><PaymentsPage /></LazyRoute>} />
              <Route path="/reservations/:id" element={<LazyRoute><ReservationSejourPage /></LazyRoute>} />

              <Route path="/tasks" element={<LazyRoute><TasksListPage /></LazyRoute>} />
              <Route path="/tasks/list" element={<LazyRoute><TasksListPage /></LazyRoute>} />

              {/* Claude Design V2 - Remplace les anciennes vues */}
              <Route path="/tasks/team" element={<LazyRoute><TasksStaffFulltaskPage /></LazyRoute>} />
              <Route path="/tasks/planning" element={<LazyRoute><TasksPlanningPageV2 /></LazyRoute>} />
              <Route path="/tasks/kanban" element={<LazyRoute><TasksKanbanPage /></LazyRoute>} />
              <Route
                path="/tasks/orchestration-config"
                element={<LazyRoute><TasksOrchestrationFulltaskPage /></LazyRoute>}
              />
              <Route
                path="/tasks/whatsapp-messages"
                element={<LazyRoute><TasksWhatsAppMessagesPage /></LazyRoute>}
              />
              <Route path="/tasks/plans" element={<LazyRoute><PlansReservationPage /></LazyRoute>} />

              <Route path="/chatbot/whitelist/:reservationId" element={<LazyRoute><ChatbotWhitelistDetailPage /></LazyRoute>} />
              <Route path="/chatbot/whitelist" element={<LazyRoute><ChatbotWhitelistPage /></LazyRoute>} />
              <Route path="/chatbot/listing" element={<LazyRoute><ChatbotListingSnapshotPage /></LazyRoute>} />

              {/* Anciennes vues (backup) */}
              <Route path="/tasks/team-legacy" element={<LazyRoute><TasksTeamPage /></LazyRoute>} />
              <Route path="/tasks/planning-legacy" element={<LazyRoute><TasksPlanningPage /></LazyRoute>} />

              {/* Communications Hub - Page principale avec onglets */}
              <Route path="/communications" element={<LazyRoute><CommunicationsHubPage /></LazyRoute>} />

              {/* Unified Inbox - Nouveau design Claude */}
              <Route path="/communications/unified-inbox" element={<LazyRoute><UnifiedInboxPage /></LazyRoute>} />

              {/* Anciennes routes - gardées pour compatibilité */}
              <Route path="/communications/whatsapp" element={<LazyRoute><CommsPage /></LazyRoute>} />
              <Route path="/communications/whatsapp-guests" element={<LazyRoute><WhatsAppGuestsPage /></LazyRoute>} />
              <Route path="/communications/whatsapp-staff" element={<LazyRoute><WhatsAppStaffPage /></LazyRoute>} />
              <Route path="/communications/messages-ota" element={<Navigate to="/communications?tab=ota" replace />} />
              <Route path="/communications/staff" element={<LazyRoute><StaffWhatsAppPage /></LazyRoute>} />
              <Route path="/communications/ota" element={<LazyRoute><OTAMessagesPage /></LazyRoute>} />

              <Route path="/requests" element={<Navigate to="/crm?tab=requests" replace />} />
              <Route path="/reviews" element={<LazyRoute><ReviewsPage /></LazyRoute>} />

              <Route path="/listings" element={<LazyRoute><ListingsPage /></LazyRoute>} />
              <Route path="/listings/orchestration-model" element={<LazyRoute><OwnerOrchestrationModelPage /></LazyRoute>} />
              <Route path="/listings/new" element={<LazyRoute><ListingCreatePage /></LazyRoute>} />
              <Route path="/listings/:id" element={<LazyRoute><ListingFormV2Page /></LazyRoute>} />
              <Route path="/listings/:id/old" element={<LazyRoute><NewListingFormPage /></LazyRoute>} />
              <Route path="/pricing" element={<LazyRoute><PricingPage /></LazyRoute>} />
              <Route path="/dynamic-pricing" element={<Navigate to="/dynamic-pricing/portefeuille" replace />} />
              <Route path="/dynamic-pricing/portefeuille" element={<LazyRoute><DynamicPricingPage /></LazyRoute>} />
              <Route path="/dynamic-pricing/bien" element={<Navigate to="/dynamic-pricing/portefeuille" replace />} />
              <Route path="/dynamic-pricing/bien/:listingId" element={<LazyRoute><DynamicPricingPage /></LazyRoute>} />
              <Route path="/dynamic-pricing/audit" element={<LazyRoute><PricingAuditPage /></LazyRoute>} />
              <Route path="/catalogue/dynamic-pricing" element={<Navigate to="/dynamic-pricing/portefeuille" replace />} />
              <Route path="/catalogue/dynamic-pricing/portefeuille" element={<LazyRoute><DynamicPricingPage /></LazyRoute>} />
              <Route path="/catalogue/dynamic-pricing/bien" element={<Navigate to="/dynamic-pricing/portefeuille" replace />} />
              <Route path="/catalogue/dynamic-pricing/bien/:listingId" element={<LazyRoute><DynamicPricingPage /></LazyRoute>} />
              <Route path="/catalogue/dynamic-pricing/audit" element={<LazyRoute><PricingAuditPage /></LazyRoute>} />
              <Route path="/channels" element={<LazyRoute><ChannelsAdminPage /></LazyRoute>} />
              <Route path="/catalogue/listings" element={<LazyRoute><ListingsPage /></LazyRoute>} />
              <Route path="/catalogue/listings/new" element={<LazyRoute><ListingCreatePage /></LazyRoute>} />
              <Route path="/catalogue/listings/:id" element={<LazyRoute><ListingDetailPage /></LazyRoute>} />
              <Route path="/catalogue/channels" element={<LazyRoute><ChannelsPage /></LazyRoute>} />
              <Route path="/catalogue/pricing" element={<LazyRoute><PricingPage /></LazyRoute>} />
              <Route
                path="/catalogue/listing-orchestration-v2"
                element={<Navigate to="/listings/orchestration-model" replace />}
              />
              <Route
                path="/catalogue/listing-orchestration-v3"
                element={<Navigate to="/listings/orchestration-model" replace />}
              />
              <Route
                path="/catalogue/listing-orchestration"
                element={<Navigate to="/listings/orchestration-model" replace />}
              />
              <Route path="/clients" element={<LazyRoute><ClientsPage /></LazyRoute>} />
              <Route path="/clients/contacts" element={<LazyRoute><WhatsAppContactsPage /></LazyRoute>} />
              <Route path="/temp/booking-clients" element={<LazyRoute><BookingClientsPage /></LazyRoute>} />
              <Route
                path="/admin/User/clients"
                element={<Navigate to="/temp/booking-clients" replace />}
              />
              <Route path="/crm" element={<LazyRoute><CRMPage /></LazyRoute>} />
              <Route path="/monitor" element={<LazyRoute><MonitoringHubPage /></LazyRoute>} />
              <Route path="/admin/monitor" element={<LazyRoute><MonitoringHubPage /></LazyRoute>} />
              <Route path="/admin/sojori-logs" element={<LazyRoute><SojoriLogsAdminPage /></LazyRoute>} />
              <Route path="/admin/channels" element={<LazyRoute><ChannelsAdminPage /></LazyRoute>} />
              <Route path="/admin/Channels" element={<LazyRoute><ChannelsLegacyRedirect /></LazyRoute>} />
              <Route path="/admin/ChannelManager" element={<LazyRoute><ChannelManagerHubPage /></LazyRoute>} />
              <Route path="/admin/equipe" element={<LazyRoute><TeamRolesHubPage /></LazyRoute>} />
              <Route path="/admin/equipe/owners" element={<LazyRoute><TeamRolesHubPage /></LazyRoute>} />
              <Route path="/admin/User/team" element={<LazyRoute><TeamLegacyRedirect /></LazyRoute>} />
              <Route path="/admin/User/owner" element={<LazyRoute><TeamLegacyRedirect /></LazyRoute>} />
              <Route path="/admin/User/owner/*" element={<LazyRoute><TeamLegacyRedirect /></LazyRoute>} />
              <Route path="/admin/settings" element={<LazyRoute><SettingsHubPage /></LazyRoute>} />
              <Route path="/admin/Settings" element={<LazyRoute><SettingsLegacyRedirect /></LazyRoute>} />
              <Route path="/admin/setting/currency" element={<LazyRoute><SettingsHubPage /></LazyRoute>} />
              <Route path="/admin/settings/currency" element={<LazyRoute><SettingsLegacyRedirect /></LazyRoute>} />
              <Route path="/onboarding" element={<LazyRoute><OnboardingPage /></LazyRoute>} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </AppErrorBoundary>
        <DevRuntimeLogPanel />
        <ToastContainer
          position="top-right"
          autoClose={6000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
          limit={4}
          // Explicit z-index above MUI Dialog (1300) and Tooltip (1500) so toasts surface over modals.
          style={{ zIndex: 99999 }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
