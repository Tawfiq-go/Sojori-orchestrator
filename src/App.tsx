import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { ReservationSejourPage } from './pages/ReservationSejourPage';
import { CalendarInventoryPage } from './pages/CalendarInventoryPage';
import { TasksPage } from './pages/TasksPage';
import { OrchestrationPage } from './pages/OrchestrationPage';
import { OrchestrationEventsPage } from './pages/OrchestrationEventsPage';
import { OrchestrationConfigPage } from './pages/OrchestrationConfigPage';
import { CommsPage } from './pages/CommsPage';
import { ListingsPage } from './pages/ListingsPage';
import { NewListingFormPage } from './pages/NewListingFormPage';
import { RequestsPage } from './pages/RequestsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { TeamPage } from './pages/TeamPage';
import { PlanningPage } from './pages/PlanningPage';
import { StaffWhatsAppPage } from './pages/StaffWhatsAppPage';
import { OTAMessagesPage } from './pages/OTAMessagesPage';
import { PricingPage } from './pages/PricingPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { ClientsPage } from './pages/ClientsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
            <Route path="/orchestration" element={<OrchestrationPage />} />
            <Route path="/orchestration/timeline/:id" element={<OrchestrationPage />} />
            <Route path="/orchestration/events" element={<OrchestrationEventsPage />} />
            <Route path="/orchestration/config" element={<OrchestrationConfigPage />} />

            <Route path="/calendar" element={<CalendarInventoryPage />} />

            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/reservations/:id" element={<ReservationSejourPage />} />

            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/team" element={<TeamPage />} />
            <Route path="/tasks/planning" element={<PlanningPage />} />
            <Route path="/tasks/staff-whatsapp" element={<StaffWhatsAppPage />} />

            <Route path="/communications/whatsapp" element={<CommsPage />} />
            <Route path="/communications/staff" element={<StaffWhatsAppPage />} />
            <Route path="/communications/ota" element={<OTAMessagesPage />} />

            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />

            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/listings/:id" element={<NewListingFormPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/channels" element={<ChannelsPage />} />
            <Route path="/clients" element={<ClientsPage />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
