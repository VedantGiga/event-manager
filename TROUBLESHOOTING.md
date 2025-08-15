# Troubleshooting Guide

## Network Error Solutions

### 1. Server Not Running
```bash
# Check if server is running
curl http://localhost:5000/health

# Start the server
npm run server:dev
```

### 2. Missing Dependencies
```bash
# Install all dependencies
npm run install:all

# Or install separately
npm install
cd client && npm install
```

### 3. Environment Variables
```bash
# Copy environment template
copy .env.example .env

# Edit .env with your values
JWT_SECRET=your-32-character-secret-key-here
MONGODB_URI=mongodb://localhost:27017/event-management
```

### 4. MongoDB Connection
```bash
# Start MongoDB (if local)
mongod

# Or use MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/event-management
```

### 5. Port Conflicts
```bash
# Check if port 5000 is in use
netstat -an | findstr :5000

# Change port in .env
PORT=5001
```

## Quick Start Commands

```bash
# Complete setup and start
start-dev.bat

# Or manual start
npm install
cd client && npm install && cd ..
npm run dev
```

## Common Issues

### CORS Errors
- Server: Check CORS_ORIGIN in .env
- Client: Verify proxy in package.json

### Authentication Issues
- Check JWT_SECRET length (32+ chars)
- Clear localStorage and try again

### Database Errors
- Verify MongoDB is running
- Check connection string format

### Rate Limiting
- Wait for rate limit window to reset
- Check console for rate limit headers