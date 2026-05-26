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
import GoogleCallback from '@/pages/Auth/GoogleCallback';
import Register from '@/pages/Auth/Register';
import Pending from '@/pages/Auth/Pending';
import Spaces from '@/pages/Landing/Spaces';
import Contact from "@/pages/Landing/Contact";
import PrivacyPolicy from '@/pages/Landing/PrivacyPolicy';
import TermsOfService from '@/pages/Landing/TermsOfService';
import FAQ from '@/pages/Landing/FAQ';
import SpaceDetails from '@/pages/Landing/SpaceDetails';
import Blogs from '@/pages/Landing/Blogs';
import BlogDetail from '@/pages/Landing/BlogDetail';

// Admin & Space Owner Pages
import AdminDashboard from '@/pages/Admin/Dashboard/Index';
import UserManagement from '@/pages/Admin/User/Index';
import SpaceManagement from '@/pages/Admin/Space/Index';
import SpaceApplication from '@/pages/Admin/Space/Application';
import AdminSettings from '@/pages/Admin/Settings/Index';
import AdminEarnings from '@/pages/Admin/Earnings/Index';
import AdminVoucher from '@/pages/Admin/Voucher/Index'; 
import Insights from '@/pages/Admin/Insights/Index';
import QueueDashboard from '@/pages/Admin/Queue/Index';
import Logs from '@/pages/Admin/Logs/Index';
import Location from '@/pages/Admin/Locations/Index';

import SpaceDashboard from '@/pages/Space/Dashboard/Index';
import MySpaces from '@/pages/Space/MySpaces/Index';
import Bookings from '@/pages/Space/Bookings/Index';
import Walkins from '@/pages/Space/Walkins/Index';
import EarningsTracker from '@/pages/Space/Earnings/Index';
import StaffManagement from '@/pages/Space/Staff/Index';
import Vouchers from '@/pages/Space/Voucher/Index';
import SpaceReviewList from '@/pages/Space/Reviews/Index';
import POS from '@/pages/Space/Pos/Index';
import Inventory from '@/pages/Space/Pos/Inventory';
import Income from '@/pages/Space/Pos/Income';
import Orders from '@/pages/Space/Pos/Orders';
import Products from '@/pages/Space/Pos/Products';
import PaymentSettings from '@/pages/Space/PaymentSettings/Index';
// Regular User Pages
import UserDashboard from '@/pages/User/Dashboard/Index';
import UserSpace from '@/pages/User/Space/Index';
import UserBookings from '@/pages/User/Bookings/Index';
import UserRedeem from '@/pages/User/Redeem/Index';


import ReviewPage from '@/pages/Public/ReviewPage';
import AlreadyReviewedPage from '@/pages/Public/AlreadyReviewedPage';
import InvalidQrPage from '@/pages/Public/InvalidQrPage';
import NotCompletedPage from '@/pages/Public/NotCompletedPage';
import PaymentSuccess from '@/pages/Payment/Success';
import PaymentFailed from '@/pages/Payment/Failed';
import { i } from 'framer-motion/client';

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/review/booking/:bookingId" element={<ReviewPage />} />
            <Route path="/review/already-reviewed" element={<AlreadyReviewedPage />} />
            <Route path="/review/invalid" element={<InvalidQrPage />} />
            <Route path="/review/not-completed" element={<NotCompletedPage />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failed" element={<PaymentFailed />} />

            {/* 1. MAIN/USER ROUTES - Uses MainLayout */}
            <Route path="/" element={<MainLayout />}>
                <Route index element={<LandingPage />} />
                <Route path="spaces" element={<Spaces />} />
                <Route path="/explore/:id" element={<SpaceDetails />} />
                <Route path="contact" element={<Contact />} />
                <Route path="privacy" element={<PrivacyPolicy />} />\
                <Route path="terms" element={<TermsOfService />} />\
                <Route path="/faq" element={<FAQ />} />
                <Route path="/blogs" element={<Blogs />} />
                <Route path="/blog/:slug" element={<BlogDetail />} />
                
                {/* Regular User Dashboard Area */}
                <Route path="dashboard" element={<UserDashboard />} />
                <Route path="user/space" element={<UserSpace />} />
                <Route path="user/bookings" element={<UserBookings />} />
                <Route path="user/redeem" element={<UserRedeem />} />
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
                    <Route path="queues" element={<QueueDashboard />} />
                    <Route path="logs" element={<Logs />} />
                    <Route path="locations" element={<Location />} />
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
                    <Route path="reviews" element={<SpaceReviewList />} />
                    <Route path="pos" element={<POS />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="income" element={<Income />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="products" element={<Products />} />
                    <Route path="payment-settings" element={<PaymentSettings />} />
                </Route>
            </Route>

            {/* 3. AUTH ROUTES */}
            <Route path="" element={<AuthLayout />}>
                <Route index element={<Navigate to="login" replace />} />
                <Route path="login" element={<Login />} />
                <Route path="/auth/google-callback" element={<GoogleCallback />} />
                <Route path="register" element={<Register />} />
                <Route path="registration-status" element={<Pending />} />
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};