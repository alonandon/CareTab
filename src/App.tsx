import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { DashboardPage } from './pages/DashboardPage'
import { HouseholdDetailPage } from './pages/HouseholdDetailPage'
import { NannyInstanceDetailPage } from './pages/NannyInstanceDetailPage'
import { HoursPage } from './pages/HoursPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { HistoryPage } from './pages/HistoryPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes — redirect to dashboard if already signed in */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* Invitation — works for both authed and unauthed users */}
          <Route path="/invite/:token" element={<AcceptInvitePage />} />

          {/* Protected routes — redirect to login if not signed in */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/household/:id" element={<HouseholdDetailPage />} />
              <Route path="/nanny-instance/:id" element={<NannyInstanceDetailPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/hours" element={<HoursPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
