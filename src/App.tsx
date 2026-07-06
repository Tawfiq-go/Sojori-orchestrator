import { Suspense } from 'react';
import { lazyWithReload } from './utils/lazyWithReload';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RouteAccessGuard } from './components/RouteAccessGuard';
import { DashboardShellLayout } from './components/DashboardShellLayout';
import { AdminRoute } from './components/AdminRoute';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { DevRuntimeLogPanel } from './components/DevRuntimeLogPanel';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/monitoring-theme.css';
import './styles/pm-simulation-theme.css';
import './styles/pm-lifecycle.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import ForbiddenPage from './pages/ForbiddenPage';

const ReservationsPage = lazyWithReload(() =>
  import('./pages/ReservationsPage').then((module) => ({ default: module.ReservationsPage }))
);
const ReservationSejourPage = lazyWithReload(() =>
  import('./pages/ReservationSejourPage').then((module) => ({ default: module.ReservationSejourPage }))
);
const ReservationsPlanningPage = lazyWithReload(() =>
  import('./pages/ReservationsPlanningPage').then((module) => ({ default: module.ReservationsPlanningPage }))
);
const PaymentsPage = lazyWithReload(() =>
  import('./pages/PaymentsPage').then((module) => ({ default: module.PaymentsPage }))
);
const CalendarInventoryPage = lazyWithReload(() =>
  import('./pages/CalendarInventoryPageV2').then((module) => ({ default: module.CalendarInventoryPageV2 }))
);
const CalendarInventoryPageV3 = lazyWithReload(() =>
  import('./pages/CalendarInventoryPageV3').then((module) => ({ default: module.CalendarInventoryPageV3 }))
);
const TasksListPage = lazyWithReload(() =>
  import('./pages/TasksListPage').then((module) => ({ default: module.TasksListPage }))
);
const OrchestrationPage = lazyWithReload(() =>
  import('./pages/OrchestrationPage').then((module) => ({ default: module.OrchestrationPage }))
);
const OrchestrationEventsPage = lazyWithReload(() =>
  import('./pages/OrchestrationEventsPage').then((module) => ({ default: module.OrchestrationEventsPage }))
);
const OrchestrationConfigPage = lazyWithReload(() =>
  import('./pages/OrchestrationConfigPage').then((module) => ({ default: module.OrchestrationConfigPage }))
);
const OrchestrationDailyOpsPage = lazyWithReload(() =>
  import('./pages/OrchestrationDailyOpsPage').then((module) => ({ default: module.default }))
);
const OrchestrationPlansPageV2 = lazyWithReload(() =>
  import("./pages/OrchestrationPlansPageV2").then((module) => ({ default: module.default }))
);
const OrchestrationTimelinePageV2 = lazyWithReload(() =>
  import("./pages/OrchestrationTimelinePageV2").then((module) => ({ default: module.OrchestrationTimelinePageV2 }))
);
const CommsPage = lazyWithReload(() =>
  import('./pages/CommsPage').then((module) => ({ default: module.CommsPage }))
);
const ListingsPage = lazyWithReload(() =>
  import('./pages/ListingsOverviewPage').then((module) => ({ default: module.ListingsOverviewPage }))
);
const ListingsMappingHubPage = lazyWithReload(() =>
  import('./pages/ListingsMappingHubPage').then((module) => ({
    default: module.ListingsMappingHubPage,
  }))
);
const AdminGlobalMappingHubPage = lazyWithReload(() =>
  import('./pages/AdminGlobalMappingHubPage').then((module) => ({
    default: module.AdminGlobalMappingHubPage,
  }))
);
const ListingDetailPage = lazyWithReload(() =>
  import('./pages/ListingDetailPage').then((module) => ({ default: module.ListingDetailPage }))
);
const NewListingFormPage = lazyWithReload(() =>
  import('./pages/NewListingFormPage').then((module) => ({ default: module.NewListingFormPage }))
);
const ListingFormV2Page = lazyWithReload(() =>
  import('./pages/ListingFormV2Page').then((module) => ({ default: module.ListingFormV2Page }))
);
const ListingCreatePage = lazyWithReload(() =>
  import('./pages/ListingCreatePage').then((module) => ({ default: module.ListingCreatePage }))
);
const ReviewsPage = lazyWithReload(() =>
  import('./pages/ReviewsPage').then((module) => ({ default: module.ReviewsPage }))
);
const TasksTeamPage = lazyWithReload(() =>
  import('./pages/TasksTeamPage').then((module) => ({ default: module.TasksTeamPage }))
);
const TasksPlanningPage = lazyWithReload(() =>
  import('./pages/TasksPlanningPage').then((module) => ({ default: module.TasksPlanningPage }))
);
const TasksPlanningPageV2 = lazyWithReload(() =>
  import('./pages/TasksPlanningPageV2').then((module) => ({ default: module.default }))
);
const TasksTeamPageV2 = lazyWithReload(() =>
  import('./pages/TasksTeamPageV2').then((module) => ({ default: module.default }))
);
const TasksKanbanPage = lazyWithReload(() =>
  import('./pages/TasksKanbanPage').then((module) => ({ default: module.default }))
);
const TasksStaffFulltaskPage = lazyWithReload(() =>
  import('./pages/TasksStaffFulltaskPage').then((module) => ({ default: module.default }))
);
const TasksOrchestrationFulltaskPage = lazyWithReload(() =>
  import('./pages/TasksOrchestrationFulltaskPage').then((module) => ({ default: module.default }))
);
const OwnerOrchestrationModelPage = lazyWithReload(() =>
  import('./pages/OwnerOrchestrationModelPage').then((module) => ({
    default: module.default,
  }))
);
const TasksWhatsAppMessagesPage = lazyWithReload(() =>
  import('./pages/TasksWhatsAppMessagesPage').then((module) => ({ default: module.default }))
);
const ChatbotWhitelistPage = lazyWithReload(() =>
  import('./pages/ChatbotWhitelistPage').then((module) => ({ default: module.default }))
);
const ChatbotWhitelistDetailPage = lazyWithReload(() =>
  import('./pages/ChatbotWhitelistDetailPage').then((module) => ({ default: module.default }))
);
const ChatbotListingSnapshotPage = lazyWithReload(() =>
  import('./pages/ChatbotListingSnapshotPage').then((module) => ({ default: module.default }))
);
const PlansReservationPage = lazyWithReload(() =>
  import('./pages/PlansReservationPage').then((module) => ({ default: module.default }))
);
const StaffWhatsAppPage = lazyWithReload(() =>
  import('./pages/StaffWhatsAppPage').then((module) => ({ default: module.StaffWhatsAppPage }))
);
const OTAMessagesPage = lazyWithReload(() =>
  import('./pages/OTAMessagesPage').then((module) => ({ default: module.OTAMessagesPage }))
);
const PricingPage = lazyWithReload(() =>
  import('./pages/PricingSnapshotPage').then((module) => ({ default: module.PricingSnapshotPage }))
);
const DynamicPricingPage = lazyWithReload(() =>
  import('./pages/DynamicPricingPage').then((module) => ({ default: module.DynamicPricingPage }))
);
const PricingAuditPage = lazyWithReload(() =>
  import('./features/dynamic-pricing/PricingAuditView').then((module) => ({
    default: module.PricingAuditView,
  }))
);
const ChannelsPage = lazyWithReload(() =>
  import('./pages/ChannelsPage').then((module) => ({ default: module.ChannelsPage }))
);
const ClientsPage = lazyWithReload(() =>
  import('./pages/ClientsPage').then((module) => ({ default: module.ClientsPage }))
);
const BookingClientsPage = lazyWithReload(() =>
  import('./pages/BookingClientsPage').then((module) => ({ default: module.BookingClientsPage }))
);
const WhatsAppContactsPage = lazyWithReload(() =>
  import('./pages/WhatsAppContactsPage').then((module) => ({ default: module.WhatsAppContactsPage }))
);
const WhatsAppGuestsPage = lazyWithReload(() =>
  import('./pages/WhatsAppGuestsPageV2').then((module) => ({ default: module.default }))
);
const WhatsAppStaffPage = lazyWithReload(() =>
  import('./pages/WhatsAppStaffPageV2').then((module) => ({ default: module.default }))
);
const UnifiedInboxPage = lazyWithReload(() =>
  import('./pages/UnifiedInboxPage').then((module) => ({ default: module.default }))
);
const CommunicationsHubPage = lazyWithReload(() =>
  import('./pages/CommunicationsHubPage').then((module) => ({ default: module.default }))
);
const CRMPage = lazyWithReload(() =>
  import('./pages/CRMPage').then((module) => ({ default: module.CRMPage }))
);
const ChannelsAdminPage = lazyWithReload(() =>
  import('./pages/ChannelsAdminPage').then((module) => ({ default: module.ChannelsAdminPage }))
);
const ChannelsLegacyRedirect = lazyWithReload(() =>
  import('./pages/ChannelsAdminPage').then((module) => ({ default: module.ChannelsLegacyRedirect }))
);
const ChannelManagerHubPage = lazyWithReload(() =>
  import('./pages/ChannelManagerHubPage').then((module) => ({
    default: module.ChannelManagerHubPage,
  }))
);
const TeamRolesHubPage = lazyWithReload(() =>
  import('./pages/TeamRolesHubPage').then((module) => ({ default: module.TeamRolesHubPage }))
);
const TeamLegacyRedirect = lazyWithReload(() =>
  import('./pages/TeamRolesHubPage').then((module) => ({ default: module.TeamLegacyRedirect }))
);
const WorkerCreatePage = lazyWithReload(() =>
  import('./pages/WorkerAdminPages').then((module) => ({ default: module.WorkerCreatePage }))
);
const WorkerCreateOwnerPage = lazyWithReload(() =>
  import('./pages/WorkerAdminPages').then((module) => ({ default: module.WorkerCreateOwnerPage }))
);
const WorkerEditPage = lazyWithReload(() =>
  import('./pages/WorkerAdminPages').then((module) => ({ default: module.WorkerEditPage }))
);
const SettingsHubPage = lazyWithReload(() =>
  import('./pages/SettingsHubPage').then((module) => ({ default: module.SettingsHubPage }))
);
const SettingsLegacyRedirect = lazyWithReload(() =>
  import('./pages/SettingsHubPage').then((module) => ({ default: module.SettingsLegacyRedirect }))
);
const OnboardingPage = lazyWithReload(() =>
  import('./pages/PmOnboardingPage').then((module) => ({ default: module.PmOnboardingPage }))
);
const OnboardingSuitePage = lazyWithReload(() =>
  import('./features/onboarding/OnboardingSuitePage').then((module) => ({ default: module.OnboardingSuitePage }))
);
const MonitoringHubPage = lazyWithReload(() =>
  import('./pages/Monitor/MonitoringHubPage').then((module) => ({ default: module.default }))
);
const PmLifecycleHubPage = lazyWithReload(() =>
  import('./pages/PmLifecycleHubPage').then((module) => ({ default: module.PmLifecycleHubPage }))
);
const PmLifecycleDetailPage = lazyWithReload(() =>
  import('./pages/PmLifecycleDetailPage').then((module) => ({ default: module.PmLifecycleDetailPage }))
);
const SojoriLogsAdminPage = lazyWithReload(() =>
  import('./pages/SojoriLogsAdminPage').then((module) => ({ default: module.default }))
);
const FinancesLandlordsPage = lazyWithReload(() =>
  import('./features/finances/pages/FinancesLandlordsPage').then((module) => ({ default: module.default }))
);
const FinancesLedgerPage = lazyWithReload(() =>
  import('./features/finances/pages/FinancesLedgerPage').then((module) => ({ default: module.default }))
);
const FinancesReportsPage = lazyWithReload(() =>
  import('./features/finances/pages/FinancesReportsPage').then((module) => ({ default: module.default }))
);
const FinancesReportDetailPage = lazyWithReload(() =>
  import('./features/finances/pages/FinancesReportDetailPage').then((module) => ({ default: module.default }))
);
const LandlordCreatePage = lazyWithReload(() =>
  import('./pages/LandlordAdminPages').then((module) => ({ default: module.LandlordCreatePage }))
);
const LandlordEditPage = lazyWithReload(() =>
  import('./pages/LandlordAdminPages').then((module) => ({ default: module.LandlordEditPage }))
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
            <Route path="/accept-invite" element={<AcceptInvitePage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardShellLayout />}>
              <Route element={<RouteAccessGuard />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              {/* /orchestrator, /orchestration: ancienne interface V2, appelait srv-orchestrator
                  (service décommissionné, fusionné dans srv-fulltask — voir CLAUDE.md). Plus
                  jamais liées depuis le menu (navRoutes.ts redirige déjà vers /tasks/*), gardées
                  en redirection au cas où un favori/lien externe pointerait encore dessus. */}
              <Route path="/orchestrator" element={<Navigate to="/tasks/plans" replace />} />
              <Route path="/orchestration" element={<Navigate to="/tasks/plans" replace />} />

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
              <Route path="/communications/messages-ota" element={<Navigate to="/communications?section=guest&tab=ota" replace />} />
              <Route path="/communications/staff" element={<LazyRoute><StaffWhatsAppPage /></LazyRoute>} />
              <Route path="/communications/ota" element={<LazyRoute><OTAMessagesPage /></LazyRoute>} />

              <Route path="/requests" element={<Navigate to="/crm?tab=requests" replace />} />
              <Route path="/reviews" element={<LazyRoute><ReviewsPage /></LazyRoute>} />

              <Route path="/listings" element={<LazyRoute><ListingsPage /></LazyRoute>} />
              <Route element={<AdminRoute />}>
                <Route path="/listings/mapping/*" element={<LazyRoute><ListingsMappingHubPage /></LazyRoute>} />
              </Route>
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
              <Route element={<AdminRoute />}>
                <Route path="/admin/pm-lifecycle" element={<LazyRoute><PmLifecycleHubPage /></LazyRoute>} />
                <Route path="/admin/pm-lifecycle/:ownerId" element={<LazyRoute><PmLifecycleDetailPage /></LazyRoute>} />
              </Route>
              <Route path="/admin/User/create-user" element={<LazyRoute><WorkerCreatePage /></LazyRoute>} />
              <Route path="/admin/User/create-owner-user" element={<LazyRoute><WorkerCreateOwnerPage /></LazyRoute>} />
              <Route path="/admin/User/edit-user/:userId" element={<LazyRoute><WorkerEditPage /></LazyRoute>} />
              <Route path="/admin/User/team" element={<LazyRoute><TeamLegacyRedirect /></LazyRoute>} />
              <Route path="/admin/User/owner" element={<LazyRoute><TeamLegacyRedirect /></LazyRoute>} />
              <Route path="/admin/User/owner/*" element={<LazyRoute><TeamLegacyRedirect /></LazyRoute>} />
              <Route path="/admin/mapping" element={<LazyRoute><AdminGlobalMappingHubPage /></LazyRoute>} />
              <Route path="/admin/settings" element={<LazyRoute><SettingsHubPage /></LazyRoute>} />
              <Route path="/admin/Settings" element={<LazyRoute><SettingsLegacyRedirect /></LazyRoute>} />
              <Route path="/admin/setting/currency" element={<LazyRoute><SettingsHubPage /></LazyRoute>} />
              <Route path="/admin/settings/currency" element={<LazyRoute><SettingsLegacyRedirect /></LazyRoute>} />
              <Route path="/onboarding" element={<LazyRoute><OnboardingPage /></LazyRoute>} />
              <Route path="/onboarding/suite" element={<LazyRoute><OnboardingSuitePage /></LazyRoute>} />

              <Route path="/finances/landlords" element={<LazyRoute><FinancesLandlordsPage /></LazyRoute>} />
              <Route path="/finances/landlords/new" element={<LazyRoute><LandlordCreatePage /></LazyRoute>} />
              <Route path="/finances/landlords/:landlordId" element={<LazyRoute><LandlordEditPage /></LazyRoute>} />
              <Route path="/finances/ledger" element={<LazyRoute><FinancesLedgerPage /></LazyRoute>} />
              <Route path="/finances/reports" element={<LazyRoute><FinancesReportsPage /></LazyRoute>} />
              <Route path="/finances/reports/:id" element={<LazyRoute><FinancesReportDetailPage /></LazyRoute>} />

              <Route path="/forbidden" element={<ForbiddenPage />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
              </Route>
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
