# Event Management System

Production-ready Event Management System with React frontend and Node.js backend.

## Deployment on Render

This app is configured for deployment on Render using their Blueprint feature.

### Quick Deploy

1. Fork this repository
2. Connect your GitHub account to Render
3. Create a new Blueprint deployment
4. Upload the `render.yaml` file
5. Deploy!

### Manual Setup

If you prefer manual setup:

1. **Backend Service**:
   - Type: Web Service
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment: Node.js

2. **Frontend Service**:
   - Type: Static Site
   - Build Command: `cd client && npm install && npm run build`
   - Publish Directory: `./client/build`

3. **Database**:
   - Type: PostgreSQL (Free tier)
   - Or use MongoDB Atlas connection string

### Environment Variables

Set these in your Render dashboard:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your-super-secret-jwt-key-32chars-minimum
CORS_ORIGIN=https://your-frontend-url.onrender.com
REACT_APP_API_URL=https://your-backend-url.onrender.com
```

## Local Development

```bash
# Install dependencies
npm run setup

# Start both servers
npm run dev
```

## Features

- 🎫 Event creation and management
- 👥 User authentication and authorization
- 📱 Responsive design with dark mode
- 🔒 Security (rate limiting, input sanitization)
- 📊 Advanced pagination and search
- 💾 Offline support with service worker
- ♿ Accessibility compliant

## Tech Stack

- **Frontend**: React 18, CSS Grid/Flexbox
- **Backend**: Node.js, Express, MongoDB
- **Security**: Helmet, bcrypt, JWT, rate limiting
- **State**: Zustand for global state management
- **Deployment**: Render Blueprint