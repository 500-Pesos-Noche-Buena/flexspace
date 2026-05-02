# FlexSpace 🚀

**FlexSpace** is a modern coworking space booking platform designed for Iloilo City. It connects users with available coworking spaces across different districts, allowing seamless browsing, booking, and management of workspaces.

---

## 🏗️ System Architecture

### Backend (Node.js + Express 5)
- **RESTful API** – Clean, scalable API architecture
- **MVC Pattern** – Models, Views, Controllers separation
- **Service Layer** – Business logic abstraction (chat, email, OTP, rewards)
- **Middleware Stack** – Authentication, rate limiting, DDOS protection, logging
- **Module Aliases** – Clean imports using `@/` paths

### Frontend (React 19 + Vite)
- **Component-Based** – Reusable UI components
- **SPA Architecture** – Smooth client-side routing
- **Real-time Updates** – Socket.io for live notifications
- **PWA Support** – Installable as native app
- **QR Integration** – HTML5 QR code scanning for check-in/out

### Database (MongoDB + Mongoose 8)
- **Schema Design** – Users, Spaces, Districts, Bookings, Vouchers, Earnings
- **Relationships** – Population for districts, user references
- **Indexes** – Optimized queries for search and filtering
- **Geospatial** – Location-based queries (lat/lng)

---

## 🤖 AI Chatbot System (Flex Support)

### Language Detection & Response
| Language | Detection Keywords | Response Style |
|----------|-------------------|----------------|
| **Hiligaynon** | gid, subong, palihog, may ara, sin-o, diin | Natural Ilonggo with "gid" |
| **Tagalog** | po, opo, kumusta, magkano, saan | Respectful Tagalog |
| **English** | hello, hi, how, what, where | Professional English |

### System Instruction Architecture
- **Dynamic Context Building** – Real-time database queries for spaces
- **District Grouping** – Spaces organized by district
- **Formatting Rules** – Bold districts, bold prices, markdown support
- **Conditional Responses** – Different responses for booking vs space queries
- **Location Integration** – Google Maps links from lat/lng coordinates

### Chat Features
- **Typing Effect** – 1-second delay for welcome message
- **Markdown Rendering** – Bold text, bullet points, numbered lists
- **Online/Offline Detection** – Real-time connection status
- **Auto-scroll** – Always shows latest message
- **Responsive Design** – Mobile-friendly chat interface

---

## 🛡️ Security System

### Authentication & Authorization
- **JWT Tokens** – Stateless authentication
- **Bcrypt Hashing** – Secure password storage
- **Role-Based Access** – User vs Admin permissions
- **Token Expiry** – Automatic session timeout

### DDOS Protection
| Protection Layer | Mechanism | Action |
|-----------------|-----------|--------|
| **Rate Limiting** | 150 requests per minute | Temporary ban after 3 violations |
| **Response Monitoring** | Tracks 500 errors | Temporary ban after 10 strikes |
| **IP Blocking** | Permanent/ temporary bans | 5 min temp ban, permanent for abuse |
| **Health Check Skip** | `/health` endpoint excluded | Prevents false positives |

### Data Validation
- **Input Sanitization** – XSS prevention
- **Request Validation** – All endpoints validated
- **SQL Injection Prevention** – Mongoose parameterization

---

## 📡 API System

### Response Format
```json
{
  "status": "success|error",
  "data": {},
  "message": "Optional message",
  "reply": "Chat response"
}