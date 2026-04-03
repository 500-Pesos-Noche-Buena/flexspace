import { BrowserRouter as Router } from 'react-router-dom';
import { AppRoutes } from '@/routes/AppRoutes';
import { AppLayout } from './layouts/AppLayout';
import { AuthProvider } from './context/AuthContext'; 

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;