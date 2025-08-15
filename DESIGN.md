# Event Management System - Data Design & Architecture

## Overview
This document outlines the data model, API design, and architectural decisions for a production-ready Event Management System built with React, Node.js/Express, and MongoDB.

## Collections Design

### 1. Users Collection
**Purpose**: Store user account information for authentication and profile management.

```javascript
{
  _id: ObjectId,
  email: String, // unique, required
  password: String, // hashed, required
  firstName: String, // required
  lastName: String, // required
  phone: String, // optional
  role: String, // enum: ['user', 'organizer', 'admin'], default: 'user'
  profileImage: String, // URL to profile image
  isVerified: Boolean, // email verification status
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date
}
```

**Indexes**:
- `{ email: 1 }` - Unique index for login and duplicate prevention
- `{ role: 1 }` - For role-based queries
- `{ createdAt: -1 }` - For user registration analytics

### 2. Events Collection
**Purpose**: Store event information and metadata.

```javascript
{
  _id: ObjectId,
  title: String, // required
  description: String, // required
  organizerId: ObjectId, // ref: Users, required
  category: String, // enum: ['conference', 'workshop', 'meetup', 'concert', 'sports', 'other']
  venue: {
    name: String, // required
    address: String, // required
    city: String, // required
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  dateTime: {
    start: Date, // required
    end: Date, // required
    timezone: String // default: 'UTC'
  },
  capacity: {
    total: Number, // required, min: 1
    available: Number, // calculated field, updated on bookings
    reserved: Number // for VIP/special allocations
  },
  pricing: {
    isFree: Boolean, // default: true
    ticketPrice: Number, // required if not free
    currency: String // default: 'USD'
  },
  images: [String], // array of image URLs
  tags: [String], // for search and categorization
  status: String, // enum: ['draft', 'published', 'cancelled', 'completed'], default: 'draft'
  isPublic: Boolean, // default: true
  requiresApproval: Boolean, // default: false
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date
}
```

**Indexes**:
- `{ organizerId: 1, status: 1 }` - For organizer's event management
- `{ status: 1, dateTime.start: 1 }` - For public event listings
- `{ category: 1, status: 1 }` - For category-based filtering
- `{ "venue.city": 1, status: 1 }` - For location-based searches
- `{ tags: 1 }` - For tag-based searches
- `{ dateTime.start: 1 }` - For date range queries
- `{ createdAt: -1 }` - For recent events

### 3. Bookings Collection
**Purpose**: Track user registrations/RSVPs for events.

```javascript
{
  _id: ObjectId,
  eventId: ObjectId, // ref: Events, required
  userId: ObjectId, // ref: Users, required
  status: String, // enum: ['pending', 'confirmed', 'cancelled', 'waitlisted'], default: 'pending'
  ticketType: String, // enum: ['regular', 'vip', 'student', 'early_bird']
  quantity: Number, // default: 1, min: 1
  totalAmount: Number, // calculated based on quantity and price
  paymentStatus: String, // enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending'
  paymentId: String, // external payment processor ID
  bookingReference: String, // unique booking reference
  attendeeInfo: [{
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    dietaryRestrictions: String,
    specialRequests: String
  }],
  checkInStatus: String, // enum: ['not_checked_in', 'checked_in'], default: 'not_checked_in'
  checkInTime: Date,
  notes: String, // admin/organizer notes
  createdAt: Date,
  updatedAt: Date,
  cancelledAt: Date,
  cancelReason: String
}
```

**Indexes**:
- `{ eventId: 1, status: 1 }` - For event attendee management
- `{ userId: 1, status: 1 }` - For user's booking history
- `{ eventId: 1, userId: 1 }` - Compound unique index to prevent duplicate bookings
- `{ bookingReference: 1 }` - Unique index for booking lookup
- `{ paymentStatus: 1 }` - For payment processing queries
- `{ createdAt: -1 }` - For recent bookings

### 4. Categories Collection
**Purpose**: Manage event categories for better organization.

```javascript
{
  _id: ObjectId,
  name: String, // required, unique
  description: String,
  icon: String, // icon class or URL
  color: String, // hex color code
  isActive: Boolean, // default: true
  sortOrder: Number, // for display ordering
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ name: 1 }` - Unique index
- `{ isActive: 1, sortOrder: 1 }` - For active categories display

### 5. AuditLogs Collection
**Purpose**: Track important system actions for security and debugging.

```javascript
{
  _id: ObjectId,
  action: String, // required, e.g., 'user_login', 'event_created', 'booking_cancelled'
  userId: ObjectId, // ref: Users, optional for system actions
  entityType: String, // 'user', 'event', 'booking', etc.
  entityId: ObjectId, // ID of the affected entity
  details: Object, // flexible object for action-specific data
  ipAddress: String,
  userAgent: String,
  timestamp: Date, // required
  level: String // enum: ['info', 'warning', 'error'], default: 'info'
}
```

**Indexes**:
- `{ timestamp: -1 }` - For recent logs
- `{ userId: 1, timestamp: -1 }` - For user activity tracking
- `{ action: 1, timestamp: -1 }` - For action-based queries
- `{ entityType: 1, entityId: 1, timestamp: -1 }` - For entity audit trails

## Relationships

### One-to-Many Relationships
- **Users → Events**: One user (organizer) can create many events
- **Users → Bookings**: One user can have many bookings
- **Events → Bookings**: One event can have many bookings
- **Users → AuditLogs**: One user can have many audit log entries

### Many-to-Many Relationships
- **Users ↔ Events**: Through Bookings collection (users can attend multiple events, events can have multiple attendees)

## Business Rules & Constraints

### Event Capacity Management
- `events.capacity.available` must be calculated as `total - confirmed_bookings_count`
- Prevent overbooking: new bookings only allowed if `capacity.available > 0`
- Implement waitlist when capacity is full

### Booking Constraints
- Unique constraint on `(eventId, userId)` to prevent duplicate bookings
- Booking quantity cannot exceed event's available capacity
- Users cannot book past events (`event.dateTime.start > current_time`)
- Cancelled bookings should free up capacity

### User Authentication
- Email must be unique across all users
- Passwords must be hashed using bcrypt with minimum 10 rounds
- JWT tokens expire after 24 hours for security

### Data Validation Rules
- Event start date must be in the future
- Event end date must be after start date
- Booking quantity must be positive integer
- Email format validation for all email fields
- Phone number format validation

## Performance Considerations

### Database Optimization
1. **Connection Pooling**: Use MongoDB connection pooling (min: 5, max: 20 connections)
2. **Aggregation Pipeline**: Use for complex queries like event statistics
3. **Projection**: Only fetch required fields in API responses
4. **Pagination**: Implement cursor-based pagination for large datasets

### Caching Strategy
1. **Event Listings**: Cache popular event queries for 5 minutes
2. **User Sessions**: Store session data in Redis for faster access
3. **Static Data**: Cache categories and other reference data

### Query Optimization
1. Use compound indexes for multi-field queries
2. Implement text search indexes for event title/description search
3. Use aggregation pipelines for complex reporting queries

## Sample Documents

### Sample User Document
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "john.doe@example.com",
  "password": "$2b$10$N9qo8uLOickgx2ZMRZoMye.IjPeGvGzluCP4tCjz8kSq7qvFaJm6i",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1-555-123-4567",
  "role": "organizer",
  "profileImage": "https://example.com/profiles/john-doe.jpg",
  "isVerified": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:22:00Z",
  "lastLoginAt": "2024-01-20T14:22:00Z"
}
```

### Sample Event Document
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "React Conference 2024",
  "description": "Annual conference for React developers featuring latest trends and best practices",
  "organizerId": "507f1f77bcf86cd799439011",
  "category": "conference",
  "venue": {
    "name": "Tech Convention Center",
    "address": "123 Tech Street",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105",
    "coordinates": {
      "lat": 37.7749,
      "lng": -122.4194
    }
  },
  "dateTime": {
    "start": "2024-06-15T09:00:00Z",
    "end": "2024-06-15T18:00:00Z",
    "timezone": "America/Los_Angeles"
  },
  "capacity": {
    "total": 500,
    "available": 342,
    "reserved": 50
  },
  "pricing": {
    "isFree": false,
    "ticketPrice": 299.99,
    "currency": "USD"
  },
  "images": [
    "https://example.com/events/react-conf-2024-banner.jpg",
    "https://example.com/events/react-conf-2024-venue.jpg"
  ],
  "tags": ["react", "javascript", "frontend", "web development"],
  "status": "published",
  "isPublic": true,
  "requiresApproval": false,
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2024-01-18T12:30:00Z",
  "publishedAt": "2024-01-12T10:00:00Z"
}
```

### Sample Booking Document
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "eventId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439014",
  "status": "confirmed",
  "ticketType": "early_bird",
  "quantity": 2,
  "totalAmount": 479.98,
  "paymentStatus": "paid",
  "paymentId": "pi_1234567890",
  "bookingReference": "RC2024-AB123CD",
  "attendeeInfo": [
    {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "phone": "+1-555-987-6543",
      "dietaryRestrictions": "Vegetarian",
      "specialRequests": "Wheelchair accessible seating"
    },
    {
      "firstName": "Bob",
      "lastName": "Johnson",
      "email": "bob.johnson@example.com",
      "phone": "+1-555-456-7890",
      "dietaryRestrictions": "None",
      "specialRequests": ""
    }
  ],
  "checkInStatus": "not_checked_in",
  "notes": "",
  "createdAt": "2024-01-16T15:45:00Z",
  "updatedAt": "2024-01-16T15:47:00Z"
}
```

## API Design Principles

### RESTful Endpoints
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Consistent URL patterns: `/api/v1/resource` or `/api/v1/resource/:id`
- Use plural nouns for collections
- Implement proper HTTP status codes

### Error Handling
- Standardized error response format
- Meaningful error messages
- Proper HTTP status codes (400, 401, 403, 404, 422, 500)

### Security Considerations
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- JWT token validation
- Password hashing with bcrypt

This design provides a solid foundation for a scalable, production-ready Event Management System with proper data modeling, relationships, and performance considerations.