# FlexSpace Frontend

React + Vite + Tailwind CSS frontend for FlexSpace coworking platform.

---

## 🏗️ System Architecture

### Frontend (React 19 + Vite)
- **Component-Based** – Reusable UI components
- **SPA Architecture** – Smooth client-side routing
- **Real-time Updates** – Socket.io for live notifications
- **PWA Support** – Installable as native app
- **QR Integration** – HTML5 QR code scanning for check-in/out and reviews

---

## ✨ Frontend Features

### Finding a Space
- See coworking spaces on an interactive map (Leaflet/Google Maps)
- Get driving directions to any space
- Find spaces near your current location
- Filter spaces by price, amenities, rating, and location
- Marker clustering for grouped space locations
- District filtering (Molo, Jaro, Mandurriao, etc.)

### Making a Booking
- Book a desk or room in real time
- See real-time availability instantly
- Get live updates when availability changes
- Walk-in booking (no reservation needed)
- Works on desktop, tablet, or phone (PWA)

### User Dashboard
- View upcoming and past bookings
- Track loyalty points earned
- View activity history

### Reviews & Ratings
- Rate spaces you've visited
- Leave written feedback
- Upload photos with reviews

### Loyalty Points & Vouchers
- Earn points per booking (₱20 = 1 point)
- Redeem points for discount vouchers (20 points = ₱1)
- Use vouchers on future bookings

### User Accounts
- Sign up with email and password
- Log in with Google account
- Reset password via email OTP
- Change password anytime
- Edit profile information

### Space Owner Features
- Add and manage spaces
- Upload space images
- List amenities (WiFi, parking, etc.)
- Create staff accounts
- Upload GCash/Maya QR codes
- View real-time occupancy and revenue
- Track payouts and transaction history
- Create promo vouchers
- Assign spaces to districts
- Manage user reviews

### Admin Features
- Platform-wide analytics (users, revenue, top spaces)
- Approve/reject space owner applications
- Approve/block users and space owners
- Create global vouchers
- Turn on maintenance mode
- Track platform commission earnings
- View system logs
- Monitor queue system (emails, image uploads)
- Manage locations and districts
- Change system settings

### Landing Page (Public)
- See featured spaces
- Learn how FlexSpace works
- View platform information before signing up

---

## 🤖 AI Chatbot Features (Flex Support)

### Chat Features
- **Typing Effect** – 1-second delay for welcome message
- **Markdown Rendering** – Bold text, bullet points, numbered lists
- **Online/Offline Detection** – Real-time connection status
- **Auto-scroll** – Always shows latest message
- **Responsive Design** – Mobile-friendly chat interface
- **Multi-language** – Hiligaynon, Tagalog, English
- **Follow-up Questions** – Understands conversation context

### Supported Queries
| Query Type | Example | AI Response |
|------------|---------|-------------|
| **Greeting** | "hi", "hello", "halo" | Friendly greeting in detected language |
| **Spaces by District** | "molo?", "jaro?" | Lists spaces in that district |
| **All Spaces** | "available space?" | Lists all spaces by district |
| **Location** | "diin location", "address" | Google Maps link |
| **Booking** | "how to book?" | 5-step booking process |
| **Team** | "team?" | Lists all team members |
| **Developer** | "developer?" | Lead programmer info |
| **Help** | "help", "menu" | Shows available options |

---

## 💬 Chat UI Components

- **Chat Bubble** – User and bot message styling
- **Typing Indicator** – Animated dots while AI responds
- **Online Status** – Real-time connection indicator
- **Markdown Renderer** – Bold, lists, paragraphs
- **Auto-scroll** – Smooth scroll to latest message

---

## 🗺️ Map Features

- **Interactive Maps** – Leaflet integration
- **Marker Clustering** – Grouped space markers
- **Location Popups** – Space details on click
- **District Filtering** – Filter spaces by area

---