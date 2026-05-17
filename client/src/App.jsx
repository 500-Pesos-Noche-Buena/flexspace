import { BrowserRouter as Router } from 'react-router-dom';
import { AppRoutes } from '@/routes/AppRoutes';
import { AppLayout } from './layouts/AppLayout';
import { AuthProvider } from './context/AuthContext'; 
import AnalyticsTracker from '@/components/ui/AnalyticsTracker';
import TokenExpiryChecker from '@/components/ui/TokenExpiryChecker';
import DevConsoleDetector from '@/components/DevConsoleDetector';

// Only import Analytics in production
const Analytics = process.env.NODE_ENV === 'production' 
  ? require('@vercel/analytics/react').Analytics 
  : () => null;

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppLayout>
          <TokenExpiryChecker />
          <AppRoutes />
          <AnalyticsTracker />
          <DevConsoleDetector />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </AppLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;