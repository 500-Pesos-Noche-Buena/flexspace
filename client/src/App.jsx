import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppRoutes } from '@/routes/AppRoutes';
import { AppLayout } from './layouts/AppLayout';
import { AuthProvider } from './context/AuthContext'; 
import AnalyticsTracker from '@/components/ui/AnalyticsTracker';
import TokenExpiryChecker from '@/components/ui/TokenExpiryChecker';
import DevConsoleDetector from '@/components/DevConsoleDetector';
import OrderNotificationListener from '@/components/ui/OrderNotificationListener';
import NotificationPermission from '@/components/ui/NotificationPermission';
import { useAuth } from '@/context/AuthContext';

// Only import Analytics in production
const Analytics = process.env.NODE_ENV === 'production' 
  ? require('@vercel/analytics/react').Analytics 
  : () => null;

// Inner component to use useAuth hook
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  return (
    <>
      <TokenExpiryChecker />
      <AppRoutes />
      <AnalyticsTracker />
      <DevConsoleDetector />
      <OrderNotificationListener />
      {isAuthenticated && !notificationsEnabled && (
        <NotificationPermission onPermissionGranted={setNotificationsEnabled} />
      )}
      {process.env.NODE_ENV === 'production' && <Analytics />}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppLayout>
          <AppContent />
        </AppLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;