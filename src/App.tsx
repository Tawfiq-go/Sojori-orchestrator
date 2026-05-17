import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { DevRuntimeLogPanel } from './components/DevRuntimeLogPanel';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
const RequestsPage = lazy(() =>
  import('./pages/RequestsPage').then((module) => ({ default: module.RequestsPage }))
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
const StaffWhatsAppPage = lazy(() =>
  import('./pages/StaffWhatsAppPage').then((module) => ({ default: module.StaffWhatsAppPage }))
);
const OTAMessagesPage = lazy(() =>
  import('./pages/OTAMessagesPage').then((module) => ({ default: module.OTAMessagesPage }))
);
const PricingPage = lazy(() =>
  import('./pages/PricingSnapshotPage').then((module) => ({ default: module.PricingSnapshotPage }))
);
const ChannelsPage = lazy(() =>
  import('./pages/ChannelsPage').then((module) => ({ default: module.ChannelsPage }))
);
const ClientsPage = lazy(() =>
  import('./pages/ClientsPage').then((module) => ({ default: module.ClientsPage }))
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
const MessagesOTAPage = lazy(() =>
  import('./pages/MessagesOTAPageV2').then((module) => ({ default: module.default }))
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
const OnboardingPage = lazy(() =>
  import('./pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage }))
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
              <Route path="/orchestration" element={<LazyRoute><OrchestrationPage /></LazyRoute>} />
              <Route path="/orchestration/plans" element={<LazyRoute><OrchestrationPlansPageV2 /></LazyRoute>} />
              <Route path="/orchestrator" element={<LazyRoute><OrchestrationReservationsPage /></LazyRoute>} />
              <Route path="/orchestration/timeline/:id" element={<LazyRoute><OrchestrationTimelinePageV2 /></LazyRoute>} />
              <Route path="/orchestration/events" element={<LazyRoute><OrchestrationEventsPage /></LazyRoute>} />
              <Route path="/orchestration/daily-ops" element={<LazyRoute><OrchestrationDailyOpsPage /></LazyRoute>} />
              <Route path="/orchestration/config" element={<LazyRoute><OrchestrationConfigPage /></LazyRoute>} />

              <Route path="/calendar" element={<LazyRoute><CalendarInventoryPageV3 /></LazyRoute>} />
              <Route path="/calendar-v2" element={<LazyRoute><CalendarInventoryPage /></LazyRoute>} />

              <Route path="/reservations" element={<LazyRoute><ReservationsPage /></LazyRoute>} />
              <Route path="/reservations/planning" element={<LazyRoute><ReservationsPlanningPage /></LazyRoute>} />
              <Route path="/reservations/:id" element={<LazyRoute><ReservationSejourPage /></LazyRoute>} />

              <Route path="/tasks" element={<LazyRoute><TasksListPage /></LazyRoute>} />
              <Route path="/tasks/list" element={<LazyRoute><TasksListPage /></LazyRoute>} />
              <Route path="/tasks/team" element={<LazyRoute><TasksTeamPage /></LazyRoute>} />
              <Route path="/tasks/planning" element={<LazyRoute><TasksPlanningPage /></LazyRoute>} />
              <Route path="/tasks/staff-whatsapp" element={<LazyRoute><StaffWhatsAppPage /></LazyRoute>} />

              {/* Communications Hub - Page principale avec onglets */}
              <Route path="/communications" element={<LazyRoute><CommunicationsHubPage /></LazyRoute>} />

              {/* Unified Inbox - Nouveau design Claude */}
              <Route path="/communications/unified-inbox" element={<LazyRoute><UnifiedInboxPage /></LazyRoute>} />

              {/* Anciennes routes - gardées pour compatibilité */}
              <Route path="/communications/whatsapp" element={<LazyRoute><CommsPage /></LazyRoute>} />
              <Route path="/communications/whatsapp-guests" element={<LazyRoute><WhatsAppGuestsPage /></LazyRoute>} />
              <Route path="/communications/whatsapp-staff" element={<LazyRoute><WhatsAppStaffPage /></LazyRoute>} />
              <Route path="/communications/messages-ota" element={<LazyRoute><MessagesOTAPage /></LazyRoute>} />
              <Route path="/communications/staff" element={<LazyRoute><StaffWhatsAppPage /></LazyRoute>} />
              <Route path="/communications/ota" element={<LazyRoute><OTAMessagesPage /></LazyRoute>} />

              <Route path="/requests" element={<LazyRoute><RequestsPage /></LazyRoute>} />
              <Route path="/reviews" element={<LazyRoute><ReviewsPage /></LazyRoute>} />

              <Route path="/listings" element={<LazyRoute><ListingsPage /></LazyRoute>} />
              <Route path="/listings/new" element={<LazyRoute><ListingCreatePage /></LazyRoute>} />
              <Route path="/listings/:id" element={<LazyRoute><ListingFormV2Page /></LazyRoute>} />
              <Route path="/listings/:id/old" element={<LazyRoute><NewListingFormPage /></LazyRoute>} />
              <Route path="/pricing" element={<LazyRoute><PricingPage /></LazyRoute>} />
              <Route path="/channels" element={<LazyRoute><ChannelsPage /></LazyRoute>} />
              <Route path="/catalogue/listings" element={<LazyRoute><ListingsPage /></LazyRoute>} />
              <Route path="/catalogue/listings/new" element={<LazyRoute><ListingCreatePage /></LazyRoute>} />
              <Route path="/catalogue/listings/:id" element={<LazyRoute><ListingDetailPage /></LazyRoute>} />
              <Route path="/catalogue/channels" element={<LazyRoute><ChannelsPage /></LazyRoute>} />
              <Route path="/catalogue/pricing" element={<LazyRoute><PricingPage /></LazyRoute>} />
              <Route path="/clients" element={<LazyRoute><ClientsPage /></LazyRoute>} />
              <Route path="/clients/contacts" element={<LazyRoute><WhatsAppContactsPage /></LazyRoute>} />
              <Route path="/crm" element={<LazyRoute><CRMPage /></LazyRoute>} />
              <Route path="/onboarding" element={<LazyRoute><OnboardingPage /></LazyRoute>} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </AppErrorBoundary>
        <DevRuntimeLogPanel />
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
