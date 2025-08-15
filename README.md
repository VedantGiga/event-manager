# Event Management System

Production-ready Event Management System with React frontend and Node.js backend.

## Quick Start

**Single command to run everything:**

```bash
run.bat
```

**Or manually:**

```bash
# Install dependencies
npm run setup

# Start both servers
npm run dev
```

## What it does:
- ✅ Installs all dependencies automatically
- ✅ Starts backend server on http://localhost:5000
- ✅ Starts frontend server on http://localhost:3000
- ✅ Opens browser automatically

## Requirements:
- Node.js 16+
- MongoDB (local or Atlas)

## Environment Setup:
1. Copy `.env.example` to `.env`
2. Update MongoDB connection string if needed
3. Run `run.bat`

## Features:
- 🎫 Event creation and management
- 👥 User authentication and authorization
- 📱 Responsive design with dark mode
- 🔒 Security (rate limiting, input sanitization)
- 📊 Advanced pagination and search
- 💾 Offline support with service worker

## Tech Stack:
- **Frontend**: React 18, CSS Grid/Flexbox
- **Backend**: Node.js, Express, MongoDB
- **Security**: Helmet, bcrypt, JWT, rate limiting
- **State**: Zustand for global state management