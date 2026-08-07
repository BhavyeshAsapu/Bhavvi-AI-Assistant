import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import AppShell from '../components/layout/AppShell';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import DashboardPage from '../pages/DashboardPage';
import ChatPage from '../pages/ChatPage';
import DocumentsPage from '../pages/DocumentsPage';
import ImageUnderstandingPage from '../pages/ImageUnderstandingPage';
import DocumentSummarizerPage from '../pages/DocumentSummarizerPage';
import SettingsPage from '../pages/SettingsPage';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return !isAuthenticated ? children : <Navigate to="/chat" replace />;
}

// darkMode & onThemeToggle are passed in from App.jsx via RouterProvider context trick.
// We use a factory function so the router can be rebuilt when these change.
export function createAppRouter({ darkMode, onThemeToggle }) {
  return createBrowserRouter([
    // Public landing — shown to logged-out visitors
    { path: '/', element: <PublicRoute><LandingPage /></PublicRoute> },

    // Auth pages — redirect to /chat if already logged in
    { path: '/login', element: <PublicRoute><LoginPage /></PublicRoute> },
    { path: '/register', element: <PublicRoute><RegisterPage /></PublicRoute> },

    // Email verification — always accessible (no auth needed)
    { path: '/verify-email', element: <VerifyEmailPage /> },

    // Protected app shell — all dashboard routes
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <AppShell darkMode={darkMode} onThemeToggle={onThemeToggle} />
        </ProtectedRoute>
      ),
      children: [
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'chat', element: <ChatPage /> },
        { path: 'chat/:sessionId', element: <ChatPage /> },
        { path: 'documents', element: <DocumentsPage /> },
        { path: 'image-understanding', element: <ImageUnderstandingPage /> },
        { path: 'document-summarizer', element: <DocumentSummarizerPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },

    // Catch-all
    { path: '*', element: <Navigate to="/" replace /> },
  ]);
}

export default function AppRouter({ darkMode, onThemeToggle }) {
  const router = createAppRouter({ darkMode, onThemeToggle });
  return <RouterProvider router={router} />;
}
