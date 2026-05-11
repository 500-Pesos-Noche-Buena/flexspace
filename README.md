# FlexSpace 🚀

**FlexSpace** is a modern coworking space booking platform designed for Iloilo City (expandable nationwide). It connects users with available coworking spaces across different districts, allowing seamless browsing, booking, and management of workspaces.

---

## 📋 Table of Contents

- [✨ Key Features](#-key-features)
- [🏗️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
- [📚 Documentation](#-documentation)
- [👥 Contributors](#-contributors)

---

## ✨ Key Features

### Core Features
- 🤖 **AI-Powered Chat Support** – Multi-language (Hiligaynon/Tagalog/English) with location assistance
- 🗺️ **Google Maps Integration** – Exact space locations with directions
- 📅 **Real-time Booking** – Instant reservations and availability updates
- 📱 **PWA Support** – Installable as native app on mobile devices
- 🔔 **Live Notifications** – Real-time updates via Socket.io
- 🛡️ **Enterprise Security** – JWT auth, rate limiting, DDOS protection

### Authentication & Security
- 🔐 **Google OAuth Login** – Sign in with Google account
- 👤 **Email/Password Registration** – Traditional authentication for space owners
- 🛡️ **Cloudflare Turnstile** – Bot protection on login/register
- 🔒 **Rate Limiting** – Anti-DDOS protection
- ⛔ **IP Blocking** – Automatic temp/permanent IP bans
- 🔑 **JWT Tokens** – Secure session management

### User Features
- 🏠 **User Dashboard** – Track bookings, points, and activity
- ⭐ **Review System** – Rate spaces, leave feedback with images
- 🎫 **Voucher System** – Redeem points for discounts
- 💰 **Loyalty Points** – Earn points per booking (₱20 = 1 point)
- 📍 **Nearby Spaces** – Find spaces by geolocation
- 🔍 **Advanced Filters** – Price, amenities, rating, location

### Space Owner Features
- 🏢 **Space Management** – Add/edit spaces, images, amenities
- 👥 **Staff Management** – Create staff accounts
- 📊 **Owner Dashboard** – Real-time occupancy, revenue tracking
- 💳 **Payment QR Setup** – Upload GCash/Maya QR codes
- 📈 **Earnings Tracker** – View payouts and transaction history
- 🎫 **Voucher Creation** – Create promo vouchers

### Admin Features
- 📊 **System Overview** – Platform-wide analytics dashboard
- 👤 **User Management** – Approve/block users and space owners
- 🏢 **Space Approvals** – Approve/reject space applications
- 🎫 **Global Vouchers** – Create platform-wide promos
- ⚙️ **System Settings** – Configure fees, maintenance mode
- 💰 **Platform Earnings** – Track commission revenue
- 📈 **Insights Dashboard** – User growth, revenue trends, top spaces
- 📋 **Activity Logs** – View all user actions and system events
- 🔍 **Queue Monitoring** – Track email and image upload jobs

### Security & Infrastructure
- 🔄 **Queue System** – Redis Bull for email & Cloudinary (async)
- ☁️ **Cloudinary CDN** – Image uploads and optimization
- 📧 **Email Service** – Nodemailer with Gmail SMTP (10+ email types)
- 🐳 **Docker Support** – Containerized deployment with Redis
- 🌐 **Multi-Environment** – Local, staging, production ready
- 📝 **Auto-Logging** – Every user action automatically recorded
- 🚫 **Blocklist System** – Automatic temp/permanent IP bans

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, Tailwind CSS 4, Leaflet |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose 8 |
| **AI** | Google Gemini API |
| **Real-time** | Socket.io |
| **Authentication** | JWT, Bcrypt, Google OAuth |
| **Security** | Cloudflare Turnstile, express-rate-limit |
| **Queue** | Bull, Redis |
| **Storage** | Cloudinary (images), MongoDB (data) |
| **Email** | Nodemailer, Gmail SMTP |
| **Container** | Docker, Redis inside container |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 👥 Contributors

| Role | Name |
|------|------|
| Lead Programmer | Josiah Danielle Gallenero |
| Project Manager | Neil Mar De Asis |
| UI/UX Designer | Jesmond Sardiniola |
| Documentation | Ferwin Khen Hautea & Jo Vincent Beldad |