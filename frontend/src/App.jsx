import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import AdminDashboardPage from './components/Admin/AdminDashboardPage';
import VideoFeed from './components/Feed/VideoFeed';
import SingleVideoPage from './components/Feed/SingleVideoPage';
import BottomNavigation from './components/Layout/BottomNavigation';
import ProfilePage from './components/Profile/ProfilePage';
import UploadModal from './components/Upload/UploadModal';

export const isAdminUser = (user) => user?.is_admin === 1;

const AuthLoadingState = () => (
  <div className="min-h-screen flex items-center justify-center bg-dark">
    <div className="text-center">
      <div className="loading-spinner mx-auto mb-4" />
      <p className="text-gray-400">正在验证登录状态...</p>
    </div>
  </div>
);

const RoleHomeRedirect = () => {
  const { token, user, checkingAuth } = useAuthContext();

  if (checkingAuth) {
    return <AuthLoadingState />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={isAdminUser(user) ? '/admin/dashboard' : '/'} replace />;
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { token, user, checkingAuth } = useAuthContext();

  if (checkingAuth) {
    return <AuthLoadingState />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = isAdminUser(user);
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!adminOnly && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

function AppContent() {
  const [authMode, setAuthMode] = useState('login');
  const { token } = useAuthContext();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            token ? (
              <RoleHomeRedirect />
            ) : (
              <LoginPage mode={authMode} onModeChange={setAuthMode} />
            )
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <>
                <VideoFeed />
                <BottomNavigation onUpload={() => setIsUploadOpen(true)} />
                <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/me"
          element={
            <ProtectedRoute>
              <>
                <ProfilePage />
                <BottomNavigation onUpload={() => setIsUploadOpen(true)} />
                <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/video/:id"
          element={
            <ProtectedRoute>
              <SingleVideoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/:id"
          element={
            <ProtectedRoute>
              <>
                <ProfilePage />
                <BottomNavigation onUpload={() => setIsUploadOpen(true)} />
                <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
              </>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<RoleHomeRedirect />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}