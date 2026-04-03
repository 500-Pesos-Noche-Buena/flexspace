import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Pages: Public & Landing
import LandingPage from '@/pages/Landing/Index';
import { NotFound } from '@/error/404';

// Pages: Auth
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import Pending from '@/pages/Auth/Pending';

// Pages: Admin
import AdminDashboard from '@/pages/Admin/Dashboard/Index';
import UserManagement from '@/pages/Admin/User/Index';
import SpaceManagement from '@/pages/Admin/Space/Index';
import SpaceApplication from '@/pages/Admin/Space/Application';

// Pages: Space Owner
import SpaceDashboard from '@/pages/Space/Dashboard/Index';
import MySpaces from '@/pages/Space/MySpaces/Index';

export const AppRoutes = () => {
    return (
        <Routes>
            {/* 1. PUBLIC ROUTES (Landing) */}
            <Route path="/" element={<MainLayout />}>
                <Route index element={<LandingPage />} />
            </Route>

            {/* 2. AUTHENTICATION ROUTES */}
            <Route path="" element={<AuthLayout />}>
                <Route index element={<Navigate to="/auth/login" replace />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="pending" element={<Pending />} />
            </Route>

            {/* 3. MANAGEMENT ROUTES (Shared Dashboard Layout) */}
            {/* This one layout handles the Sidebar/Nav for both Admin and Space */}
            <Route element={<DashboardLayout />}>
                
                {/* Admin Section */}
                <Route path="/admin">
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="spaces" element={<SpaceManagement />} />
                    <Route path="space/applications" element={<SpaceApplication />} />
                </Route>

                {/* Space Owner Section */}
                <Route path="/space">
                    <Route index element={<Navigate to="/space/dashboard" replace />} />
                    <Route path="dashboard" element={<SpaceDashboard />} />
                    <Route path="my-spaces" element={<MySpaces />} />
                </Route>
                
            </Route>

            {/* 4. USER ROUTES (Standard Client) */}
            <Route path="/dashboard">
                {/* <Route index element={<UserDashboard />} /> */}
            </Route>

            {/* 5. ERROR HANDLING */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};