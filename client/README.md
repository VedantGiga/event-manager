# Event Management System - Frontend

React frontend for the Event Management System.

## Features

- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox
- **Dark Mode**: Toggle between light and dark themes with localStorage persistence
- **Event Management**: Browse, search, filter, and book events
- **User Authentication**: Login/register with JWT tokens
- **Event Creation**: Organizers can create and manage events
- **Booking Management**: Users can view and cancel their bookings

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will run on http://localhost:3000 and proxy API requests to http://localhost:5000.

## Environment Variables

Create a `.env` file in the client directory:

```
REACT_APP_API_URL=http://localhost:5000/api
```

## Build for Production

```bash
npm run build
```

This creates an optimized build in the `build` folder.