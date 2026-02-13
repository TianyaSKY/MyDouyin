import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import VideoFeed from './components/Feed/VideoFeed';
import BottomNavigation from './components/Layout/BottomNavigation';
import ProfilePage from './components/Profile/ProfilePage';
import UploadModal from './components/Upload/UploadModal';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, checkingAuth } = useAuthContext();

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-gray-400">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Home Page (Placeholder for future feed)


// Main App Component
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
              <Navigate to="/" replace />
            ) : (
              <LoginPage mode={authMode} onModeChange={setAuthMode} />
            )
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

// Main App Export
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}