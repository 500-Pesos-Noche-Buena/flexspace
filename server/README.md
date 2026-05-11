# FlexSpace Backend

Node.js + Express + MongoDB backend for FlexSpace coworking platform.

---

## 🏗️ System Architecture

### Backend (Node.js + Express 5)
- **RESTful API** – Clean, scalable API architecture
- **MVC Pattern** – Models, Views, Controllers separation
- **Service Layer** – Business logic abstraction (chat, email, OTP, rewards, user)
- **Middleware Stack** – Authentication, rate limiting, DDOS protection, logging, queue processing
- **Module Aliases** – Clean imports using `@/` paths
- **Queue System** – Redis Bull for async email and Cloudinary uploads
- **API Versioning** – v1 (active) and v2 (future) support
- **Multi-Environment** – Local, staging, production ready

### Database (MongoDB + Mongoose 8)
- **Schema Design** – Users, Spaces, Districts, Bookings, Vouchers, Earnings, Settings, ActivityLog, Analytics, Blocklist, Payment, SpaceRequest
- **Relationships** – Population for districts, user references, space bookings
- **Indexes** – Optimized queries for search and filtering
- **Geospatial** – Location-based queries for nearby spaces (lat/lng)

---

## 🔐 Authentication System

### Login Methods
| Method | Description |
|--------|-------------|
| **Email/Password** | Traditional login with JWT |
| **Google OAuth** | Social login with Google |
| **Staff Login** | Staff members login via parent space owner |

### Registration Types
| Type | Description |
|------|-------------|
| **User Registration** | Regular member account |
| **Space Owner Application** | Business owner applying to list spaces |
| **Staff Creation** | Space owners create staff accounts |

### Password Management
- Forgot Password with OTP verification
- Reset password via email
- OTP generation and verification service
- Password reset confirmation email
- Google users redirected to Google login (no password)

### Profile Management
- View and edit profile information
- Change password anytime

---

## 🛡️ Security System

### Authentication & Authorization
- **JWT Tokens** – Stateless authentication with expiration
- **Bcrypt Hashing** – Secure password storage with salt rounds
- **Role-Based Access** – User, Staff, Space, Admin roles
- **Auto-Logger** – Every user action automatically recorded for audit trails

### Anti-DDOS Protection
| Protection Layer | Mechanism | Action |
|-----------------|-----------|--------|
| **Attack Detection** | 800+ requests/min total | Enables strict mode |
| **Rate Limiting** | 300 req/min (normal), 30 req/min (attack) | Temporary ban after violations |
| **Response Monitoring** | Tracks 500 errors | Temp ban after 10 strikes |
| **IP Blocking** | Permanent/temporary bans | 5 min temp ban, permanent for abuse |
| **Critical Routes** | Login/Register: 10 attempts/15 min | Stricter limits |

### Blocklist System
- Automatic IP blocking after violations
- Temporary bans (5 minutes default)
- Permanent bans for repeat offenders
- Admin manual block/unblock capability

### Cloudflare Turnstile
- Bot protection on login and register pages
- Invisible verification for legitimate users
- Token validation on backend

---

## 📧 Queue System (Redis Bull)

### Email Queue (10+ email types)
| Email Type | Trigger |
|------------|---------|
| Welcome Email | User registration |
| Booking Confirmation | Booking confirmed |
| Booking Completion | Checkout completed |
| Password Reset | Reset request |
| Password Reset Confirmation | After password changed |
| OTP Verification | One-time code for reset |
| Space Approval | Application approved |
| Space Rejection | Application rejected with reason |
| Voucher Email | Points redemption |

### Cloudinary Queue
| Upload Type | Description |
|-------------|-------------|
| Space Images | Multiple images per space |
| Business Permit | Space owner document |
| DTI/SEC Registration | Business verification |
| Payment QR Code | GCash/Maya QR for payments |

### Queue Features
- **Async Processing** – Non-blocking uploads and emails
- **Retry Mechanism** – 3 attempts with exponential backoff
- **Fallback Mode** – Sync processing if Redis unavailable
- **Queue Monitoring** – Admins can track queue status

---

## 🤖 AI Chatbot System (Flex Support)

### Language Detection & Response
| Language | Detection Keywords | Response Style |
|----------|-------------------|----------------|
| **Hiligaynon** | gid, subong, palihog, may ara, sin-o, diin | Natural Ilonggo with "gid" |
| **Tagalog** | po, opo, kumusta, magkano, saan | Respectful Tagalog |
| **English** | hello, hi, how, what, where | Professional English |

### Chat Features
- Multi-language support with auto-detection
- Space recommendations by district
- List all spaces grouped by district
- Price inquiries
- Booking assistance (5-step guide)
- Google Maps links for locations
- Team member names and roles
- Lead programmer information
- "Help" and "menu" command support
- Follow-up question understanding (limited)

---

## 💰 Payment & Voucher System

### Payment Methods
| Method | Description |
|--------|-------------|
| Cash | On-site payment |
| GCash | QR code payment |
| Maya | QR code payment |
| Bank Transfer | Manual bank transfer |

### Voucher Types
| Type | Description |
|------|-------------|
| **Global** | Platform-wide vouchers (admin created) |
| **Space Specific** | Vouchers for specific spaces (owner created) |
| **User Specific** | Points redemption vouchers |

### Points System
- Earn points per booking (₱20 = 1 point)
- Redeem points for discount vouchers
- Redemption ratio: 20 points = ₱1
- Reward service handles points calculation logic

---

## 📊 Admin Features

### Dashboard & Analytics
- System overview dashboard
- Platform earnings tracking
- Insights dashboard (user growth, revenue trends, top spaces)
- Real-time occupancy tracking

### Management
- User management (approve/block users and space owners)
- Space approval system (SpaceRequest model)
- Location and district management
- System settings configuration
- Maintenance mode toggle

### Monitoring
- Activity logs viewer (auto-logger data)
- Queue system monitoring
- Platform commission earnings tracking

---

## 📝 Activity Tracking (Auto-Logger)

- Every user action automatically recorded
- IP address tracking for all requests
- Admin viewable logs
- Helps resolve disputes and security audits
- ActivityLog model stores all events

---

## 🗺️ Location Features

- Spaces stored with latitude/longitude coordinates
- Geospatial queries for nearby spaces
- District-based organization (Molo, Jaro, Mandurriao, etc.)
- Location and district management via admin

---

## 🔄 API Versioning

- **v1** – Active production APIs
- **v2** – Future/placeholder for next version
- Allows new features without breaking existing integrations

---

## 🌐 Multi-Environment Support

| Environment | Purpose |
|-------------|---------|
| **Local** | Development and testing |
| **Staging** | Preview before production |
| **Production** | Live platform |

Each environment has its own database, API keys, and configuration settings.

---

## 📁 Core Controllers

### Admin Controllers
- Dashboard overview
- Earnings tracking
- Insights (growth, trends, top spaces)
- Location & district management
- Logs viewer
- Queue monitoring
- Settings management
- Space approvals
- User management
- Voucher creation (global)

### Space Controllers
- Booking management
- Dashboard for space owners
- District assignment
- Earnings per space
- Review management
- Space CRUD operations
- Staff management
- Vouchers per space
- Walk-in booking

### User Controllers
- Bookings (create, cancel, view)
- Dashboard
- Redeem points for vouchers
- Reviews
- Space viewing

### Auth Controller
- Email/password login
- Google OAuth login
- User registration
- Space owner application
- Staff login
- Forgot password with OTP
- Reset password
- Logout

### Chat Controller
- AI-powered responses via Google Gemini
- Language detection
- Space recommendations by district
- Team/developer info

### Profile Controller
- View/edit profile
- Change password

---

## 🛠️ Services Layer

| Service | Purpose |
|---------|---------|
| **chatService.js** | AI chatbot logic |
| **emailService.js** | Sending all email types |
| **otpService.js** | OTP generation and verification |
| **rewardService.js** | Points calculation and redemption |
| **userService.js** | User-related business logic |

---

## 🔧 Middleware Stack

| Middleware | Purpose |
|------------|---------|
| **antiDdos.js** | Blocks excessive requests |
| **autoLogger.js** | Logs every action automatically |
| **authMiddleware.js** | Verifies JWT tokens and roles |
| **errorHandler.js** | Catches and logs errors |
| **protectionMiddleware.js** | Additional security layer |
| **queueMiddleware.js** | Handles async processing |

---

## 🗄️ Database Models (Complete List)

| Model | Purpose |
|-------|---------|
| **ActivityLog** | Tracks every user action |
| **Analytics** | Platform statistics |
| **Blocklist** | Banned IPs and users |
| **Booking** | Reservation records |
| **District** | Location areas (Molo, Jaro, etc.) |
| **Earnings** | Money tracking |
| **Payment** | Transaction records |
| **Review** | Ratings and feedback |
| **Settings** | System configuration |
| **Space** | Coworking spaces |
| **SpaceRequest** | Owner applications |
| **User** | All user accounts |
| **Voucher** | Discount codes |

---

## 📧 Email Types (Complete List)

- BaseEmail (parent template)
- WelcomeEmail
- BookingConfirmationEmail
- BookingCompletionEmail
- PasswordResetEmail
- PasswordResetConfirmationEmail
- OTPEmail
- SpaceApprovalEmail
- SpaceRejectionEmail
- VoucherEmail

---