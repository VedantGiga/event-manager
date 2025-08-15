# MongoDB Indexes Documentation

## Performance Indexes for Event Management System

### Users Collection
```javascript
// Unique index for authentication
{ email: 1 } // UNIQUE - Login queries, duplicate prevention
{ role: 1 } // Role-based access control queries
{ createdAt: -1 } // User registration analytics, recent users
```

### Events Collection
```javascript
// Core query indexes
{ organizerId: 1, status: 1 } // Organizer's event management
{ status: 1, 'dateTime.start': 1 } // Public event listings by date
{ category: 1, status: 1 } // Category filtering
{ 'venue.city': 1, status: 1 } // Location-based searches
{ tags: 1 } // Tag-based searches
{ 'dateTime.start': 1 } // Date range queries
{ createdAt: -1 } // Recent events
{ title: 'text', description: 'text' } // Full-text search

// Compound indexes for complex queries
{ status: 1, isPublic: 1, 'dateTime.start': 1 } // Public event listings
{ organizerId: 1, createdAt: -1 } // Organizer's events by date
```

### Bookings Collection
```javascript
// Core operational indexes
{ eventId: 1, status: 1 } // Event attendee management
{ userId: 1, status: 1 } // User's booking history
{ eventId: 1, userId: 1 } // UNIQUE - Prevent duplicate bookings
{ bookingReference: 1 } // UNIQUE - Booking lookup
{ paymentStatus: 1 } // Payment processing queries
{ createdAt: -1 } // Recent bookings

// Performance indexes
{ eventId: 1, createdAt: -1 } // Event bookings by date
{ userId: 1, createdAt: -1 } // User bookings by date
```

### AuditLogs Collection
```javascript
{ timestamp: -1 } // Recent logs (TTL index recommended)
{ userId: 1, timestamp: -1 } // User activity tracking
{ action: 1, timestamp: -1 } // Action-based queries
{ entityType: 1, entityId: 1, timestamp: -1 } // Entity audit trails
{ level: 1, timestamp: -1 } // Error/warning log queries
```

### Categories Collection
```javascript
{ name: 1 } // UNIQUE - Category lookup
{ isActive: 1, sortOrder: 1 } // Active categories display
```

## Index Performance Benefits

1. **Event Listings**: Compound indexes support complex filtering with O(log n) performance
2. **Search Queries**: Text indexes enable full-text search across title/description
3. **User Management**: Email index ensures fast authentication
4. **Booking Operations**: Prevents duplicate bookings and enables fast lookups
5. **Analytics**: Time-based indexes support reporting and audit trails

## Query Optimization Examples

```javascript
// Optimized event listing query
db.events.find({
  status: 'published',
  isPublic: true,
  'dateTime.start': { $gte: new Date() }
}).sort({ 'dateTime.start': 1 }).limit(12)
// Uses: { status: 1, isPublic: 1, 'dateTime.start': 1 }

// Optimized booking lookup
db.bookings.findOne({
  eventId: ObjectId('...'),
  userId: ObjectId('...')
})
// Uses: { eventId: 1, userId: 1 } (unique constraint)
```