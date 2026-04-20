import { BrowserRouter as Router } from 'react-router-dom';
import { AppRoutes } from '@/routes/AppRoutes';
import { AppLayout } from './layouts/AppLayout';
import { AuthProvider } from './context/AuthContext'; 

// Only import Analytics in production
const Analytics = process.env.NODE_ENV === 'production' 
  ? require('@vercel/analytics/react').Analytics 
  : () => null;

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppLayout>
          <AppRoutes />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </AppLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;