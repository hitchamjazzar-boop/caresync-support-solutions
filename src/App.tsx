import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Announcements from "./pages/Announcements";
import AnnouncementAnalytics from "./pages/AnnouncementAnalytics";
import AnnouncementGallery from "./pages/AnnouncementGallery";
import Memos from "./pages/Memos";
import MemoAnalytics from "./pages/MemoAnalytics";
import OrgChart from "./pages/OrgChart";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import AttendanceAnalytics from "./pages/AttendanceAnalytics";
import Schedules from "./pages/Schedules";
import Reports from "./pages/Reports";
import Payroll from "./pages/Payroll";
import PayrollAnalytics from "./pages/PayrollAnalytics";
import WeeklySummary from "./pages/WeeklySummary";
import Profile from "./pages/Profile";
import Feedback from "./pages/Feedback";
import EmployeeVoting from "./pages/EmployeeVoting";
import VotingHistory from "./pages/VotingHistory";
import Achievements from "./pages/Achievements";
import SecretSanta from "./pages/SecretSanta";
import Calendar from "./pages/Calendar";
import CalendarSettings from "./pages/CalendarSettings";
import Notifications from "./pages/Notifications";
import EmployeeInvoices from "./pages/EmployeeInvoices";
import Shoutouts from "./pages/Shoutouts";
import AdminManagement from "./pages/AdminManagement";
import Diary from "./pages/Diary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Announcements />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcement-analytics"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AnnouncementAnalytics />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcement-gallery"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AnnouncementGallery />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/memos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Memos />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/memo-analytics"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MemoAnalytics />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org-chart"
              element={
                <ProtectedRoute>
                  <Layout>
                    <OrgChart />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Employees />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Attendance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance/analytics"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AttendanceAnalytics />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedules"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Schedules />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Payroll />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/analytics"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PayrollAnalytics />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/weekly-summary"
              element={
                <ProtectedRoute>
                  <Layout>
                    <WeeklySummary />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Feedback />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/voting"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeVoting />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/voting/history"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VotingHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Achievements />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/secret-santa"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SecretSanta />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Calendar />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar/settings"
              element={
                <ProtectedRoute>
                  <CalendarSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeInvoices />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shoutouts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Shoutouts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-management"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AdminManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/diary"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Diary />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
