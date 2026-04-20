import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Pages
import LandingPage from '@/pages/Landing/Index';
import { NotFound } from '@/error/404';
import Profile from '@/pages/Profile/Index'; // shared or admin/space profile
import UserProfile from '@/pages/User/Profile/Index'; // New dedicated user profile page
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import Pending from '@/pages/Auth/Pending';
import Spaces from '@/pages/Landing/Spaces';
import Contact from "@/pages/Landing/Contact";

// Admin & Space Owner Pages
import AdminDashboard from '@/pages/Admin/Dashboard/Index';
import UserManagement from '@/pages/Admin/User/Index';
import SpaceManagement from '@/pages/Admin/Space/Index';
import SpaceApplication from '@/pages/Admin/Space/Application';
import AdminSettings from '@/pages/Admin/Settings/Index';
import AdminEarnings from '@/pages/Admin/Earnings/Index';
import AdminVoucher from '@/pages/Admin/Voucher/Index'; 
import Insights from '@/pages/Admin/Insights/Index';

import SpaceDashboard from '@/pages/Space/Dashboard/Index';
import MySpaces from '@/pages/Space/MySpaces/Index';
import Bookings from '@/pages/Space/Bookings/Index';
import Walkins from '@/pages/Space/Walkins/Index';
import EarningsTracker from '@/pages/Space/Earnings/Index';
import StaffManagement from '@/pages/Space/Staff/Index';
import Vouchers from '@/pages/Space/Voucher/Index';

// Regular User Pages
import UserDashboard from '@/pages/User/Dashboard/Index';
import UserSpace from '@/pages/User/Space/Index';
import UserBookings from '@/pages/User/Bookings/Index';
import UserRedeem from '../pages/User/Redeem/Index';

export const AppRoutes = () => {
    return (
        <Routes>
            {/* 1. MAIN/USER ROUTES - Uses MainLayout */}
            <Route path="/" element={<MainLayout />}>
                <Route index element={<LandingPage />} />
                <Route path="spaces" element={<Spaces />} />
                <Route path="contact" element={<Contact />} />
                
                {/* Regular User Dashboard Area */}
                <Route path="dashboard" element={<UserDashboard />} />
                <Route path="user/space" element={<UserSpace />} />
                <Route path="user/bookings" element={<UserBookings />} />
                <Route path="user/redeem" element={<UserRedeem />} />
                {/* --- NEW SEPARATED ROUTE FOR USERS --- */}
                <Route path="account" element={<UserProfile />} />
            </Route>

            {/* 2. ADMIN & SPACE OWNER ROUTES - Uses DashboardLayout */}
            <Route element={<DashboardLayout />}>
                
                {/* Shared Profile for High-Level Roles */}
                <Route path="profile" element={<Profile />} />

                {/* Admin Section */}
                <Route path="/admin">
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="spaces" element={<SpaceManagement />} />
                    <Route path="space/applications" element={<SpaceApplication />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="earnings" element={<AdminEarnings />} />
                    <Route path="vouchers" element={<AdminVoucher />} />
                    <Route path="insights" element={<Insights />} />
                </Route>

                {/* Space Owner Section */}
                <Route path="/space">
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<SpaceDashboard />} />
                    <Route path="my-spaces" element={<MySpaces />} />
                    <Route path="bookings" element={<Bookings />} />
                    <Route path="walkins" element={<Walkins />} />
                    <Route path="earnings" element={<EarningsTracker />} />
                    <Route path="staff" element={<StaffManagement />} />
                    <Route path="vouchers" element={<Vouchers />} />
                </Route>
            </Route>

            {/* 3. AUTH ROUTES */}
            <Route path="" element={<AuthLayout />}>
                <Route index element={<Navigate to="login" replace />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="registration-status" element={<Pending />} />
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};