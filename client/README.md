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

## 🤖 AI Chatbot Features (Flex Support)

### Chat Features
- **Typing Effect** – 1-second delay for welcome message
- **Markdown Rendering** – Bold text, bullet points, numbered lists
- **Online/Offline Detection** – Real-time connection status
- **Auto-scroll** – Always shows latest message
- **Responsive Design** – Mobile-friendly chat interface
- **Multi-language** – Hiligaynon, Tagalog, English

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

## 👥 Contributors

| Role | Name |
|------|------|
| Lead Programmer | Josiah Danielle Gallenero |
| Project Manager | Neil Mar De Asis |
| UI/UX Designer | Jesmond Sardiniola |
| Documentation | Ferwin Khen Hautea & Jo Vincent Beldad |