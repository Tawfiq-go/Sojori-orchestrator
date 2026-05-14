import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppErrorBoundary } from './components/AppErrorBoundary';
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
const CalendarInventoryPage = lazy(() =>
  import('./pages/CalendarInventoryPage').then((module) => ({ default: module.CalendarInventoryPage }))
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
const OrchestrationPlansPage = lazy(() =>
  import("./pages/OrchestrationPlansPage").then((module) => ({ default: module.default }))
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
  import('./pages/WhatsAppGuestsPage').then((module) => ({ default: module.default }))
);
const WhatsAppStaffPage = lazy(() =>
  import('./pages/WhatsAppStaffPage').then((module) => ({ default: module.default }))
);
const MessagesOTAPage = lazy(() =>
  import('./pages/MessagesOTAPage').then((module) => ({ default: module.default }))
);
const CRMPage = lazy(() =>
  import('./pages/CRMPage').then((module) => ({ default: module.CRMPage }))
);
const OnboardingPage = lazy(() =>
  import('./pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage }))
);
const ReservationsListPage = lazy(() =>
  import('./pages/ReservationsListPage').then((module) => ({ default: module.default }))
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
              <Route path="/orchestration/plans" element={<LazyRoute><OrchestrationPlansPage /></LazyRoute>} />
              <Route path="/orchestration/timeline/:id" element={<LazyRoute><OrchestrationPage /></LazyRoute>} />
              <Route path="/orchestration/events" element={<LazyRoute><OrchestrationEventsPage /></LazyRoute>} />
              <Route path="/orchestration/config" element={<LazyRoute><OrchestrationConfigPage /></LazyRoute>} />

              <Route path="/calendar" element={<LazyRoute><CalendarInventoryPage /></LazyRoute>} />

              <Route path="/reservations" element={<LazyRoute><ReservationsPage /></LazyRoute>} />
              <Route path="/reservations/:id" element={<LazyRoute><ReservationSejourPage /></LazyRoute>} />

              <Route path="/tasks" element={<LazyRoute><TasksListPage /></LazyRoute>} />
              <Route path="/tasks/list" element={<LazyRoute><TasksListPage /></LazyRoute>} />
              <Route path="/tasks/team" element={<LazyRoute><TasksTeamPage /></LazyRoute>} />
              <Route path="/tasks/planning" element={<LazyRoute><TasksPlanningPage /></LazyRoute>} />
              <Route path="/tasks/staff-whatsapp" element={<LazyRoute><StaffWhatsAppPage /></LazyRoute>} />

              <Route path="/communications/whatsapp" element={<LazyRoute><CommsPage /></LazyRoute>} />
              <Route path="/communications/whatsapp-guests" element={<LazyRoute><WhatsAppGuestsPage /></LazyRoute>} />
              <Route path="/communications/whatsapp-staff" element={<LazyRoute><WhatsAppStaffPage /></LazyRoute>} />
              <Route path="/communications/messages-ota" element={<LazyRoute><MessagesOTAPage /></LazyRoute>} />
              <Route path="/communications/staff" element={<LazyRoute><StaffWhatsAppPage /></LazyRoute>} />
              <Route path="/communications/ota" element={<LazyRoute><OTAMessagesPage /></LazyRoute>} />

              <Route path="/requests" element={<LazyRoute><RequestsPage /></LazyRoute>} />
              <Route path="/reviews" element={<LazyRoute><ReviewsPage /></LazyRoute>} />

              <Route path="/listings" element={<LazyRoute><ListingsPage /></LazyRoute>} />
              <Route path="/listings/:id" element={<LazyRoute><NewListingFormPage /></LazyRoute>} />
              <Route path="/pricing" element={<LazyRoute><PricingPage /></LazyRoute>} />
              <Route path="/channels" element={<LazyRoute><ChannelsPage /></LazyRoute>} />
              <Route path="/catalogue/listings" element={<LazyRoute><ListingsPage /></LazyRoute>} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
