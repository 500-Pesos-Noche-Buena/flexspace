import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Pages
import LandingPage from '@/pages/Landing/Index';
import { NotFound } from '@/error/404';
import Profile from '@/pages/Profile/Index';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import Pending from '@/pages/Auth/Pending';

// Admin Pages
import AdminDashboard from '@/pages/Admin/Dashboard/Index';
import UserManagement from '@/pages/Admin/User/Index';
import SpaceManagement from '@/pages/Admin/Space/Index';
import SpaceApplication from '@/pages/Admin/Space/Application';

// Space Owner Pages
import SpaceDashboard from '@/pages/Space/Dashboard/Index';
import MySpaces from '@/pages/Space/MySpaces/Index';
import Bookings from '@/pages/Space/Bookings/Index';
import Walkins from '@/pages/Space/Walkins/Index';
import EarningsTracker from '@/pages/Space/Earnings/Index';

// Regular User Pages
import UserDashboard from '@/pages/User/Dashboard/Index';
import UserSpace from '@/pages/User/Space/Index';

export const AppRoutes = () => {
    return (
        <Routes>
            {/* 1. MAIN/USER ROUTES - Uses the High-End MainLayout */}
            <Route path="/" element={<MainLayout />}>
                <Route index element={<LandingPage />} />
                <Route path="dashboard" element={<UserDashboard />} />
                <Route path="user/space" element={<UserSpace />} />
                
                {/* Profile for Regular Users */}
                <Route path="profile" element={<Profile />} />
            </Route>

            {/* 2. AUTHENTICATION ROUTES */}
            <Route path="" element={<AuthLayout />}>
                <Route index element={<Navigate to="/auth/login" replace />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="registration-status" element={<Pending />} />
            </Route>

            <Route element={<DashboardLayout />}>
                                
                {/* Admin Section */}
                <Route path="/admin">
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="spaces" element={<SpaceManagement />} />
                    <Route path="space/applications" element={<SpaceApplication />} />
                    <Route path="profile" element={<Profile />} />
                </Route>

                {/* Space Owner Section */}
                <Route path="/space">
                    <Route index element={<Navigate to="/space/dashboard" replace />} />
                    <Route path="dashboard" element={<SpaceDashboard />} />
                    <Route path="my-spaces" element={<MySpaces />} />
                    <Route path="bookings" element={<Bookings />} />
                    <Route path="walkins" element={<Walkins />} />
                    <Route path="earnings" element={<EarningsTracker />} />
                    <Route path="profile" element={<Profile />} />
                </Route>
            </Route>

            {/* 4. ERROR HANDLING */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};