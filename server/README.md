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

### Database (MongoDB + Mongoose 8)
- **Schema Design** – Users, Spaces, Districts, Bookings, Vouchers, Earnings, Settings
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
- Google users redirected to Google login (no password)

---

## 🛡️ Security System

### Authentication & Authorization
- **JWT Tokens** – Stateless authentication
- **Bcrypt Hashing** – Secure password storage
- **Role-Based Access** – User, Staff, Space, Admin roles

### Anti-DDOS Protection
| Protection Layer | Mechanism | Action |
|-----------------|-----------|--------|
| **Attack Detection** | 800+ requests/min total | Enables strict mode |
| **Rate Limiting** | 300 req/min (normal), 30 req/min (attack) | Temporary ban after violations |
| **Response Monitoring** | Tracks 500 errors | Temp ban after 10 strikes |
| **IP Blocking** | Permanent/temporary bans | 5 min temp ban, permanent for abuse |
| **Critical Routes** | Login/Register: 10 attempts/15 min | Stricter limits |

### Cloudflare Turnstile
- Bot protection on login and register pages
- Invisible verification for legitimate users
- Token validation on backend

---

## 📧 Queue System (Redis Bull)

### Email Queue
| Email Type | Trigger |
|------------|---------|
| Welcome Email | User registration |
| Booking Confirmation | Booking confirmed |
| Booking Completion | Checkout completed |
| Password Reset | Reset request |
| Space Approval | Application approved |
| Space Rejection | Application rejected |
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

---

## 🤖 AI Chatbot System (Flex Support)

### Language Detection & Response
| Language | Detection Keywords | Response Style |
|----------|-------------------|----------------|
| **Hiligaynon** | gid, subong, palihog, may ara, sin-o, diin | Natural Ilonggo with "gid" |
| **Tagalog** | po, opo, kumusta, magkano, saan | Respectful Tagalog |
| **English** | hello, hi, how, what, where | Professional English |

### Chat Features
- Multi-language support
- Space recommendations by district
- Price inquiries
- Booking assistance
- General FAQ

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
| **Space Specific** | Vouchers for specific spaces |
| **User Specific** | Points redemption vouchers |

### Points System
- Earn points per booking (₱20 = 1 point)
- Redeem points for discount vouchers
- Redemption ratio: 20 points = ₱1