const express = require('express');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { eventValidation, paramValidation } = require('../utils/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get all events with filtering, sorting, and pagination
// @route   GET /api/events
// @access  Public
router.get('/', optionalAuth, eventValidation.list, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      cursor,
      category,
      city,
      startDate,
      endDate,
      tags,
      search,
      sort = '-dateTime.start',
      status = 'published'
    } = req.query;

    const limitNum = Math.min(parseInt(limit), 50);

    // Build filter object
    const filters = { status };
    
    // Only show published events to non-organizers/admins
    if (!req.user || (req.user.role !== 'organizer' && req.user.role !== 'admin')) {
      filters.status = 'published';
      filters.isPublic = true;
    }

    if (category) filters.category = category;
    if (city) filters['venue.city'] = new RegExp(city, 'i');
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      filters.tags = { $in: tagArray };
    }

    // Date range filter
    if (startDate || endDate) {
      filters['dateTime.start'] = {};
      if (startDate) filters['dateTime.start'].$gte = new Date(startDate);
      if (endDate) filters['dateTime.start'].$lte = new Date(endDate);
    }

    // Text search
    if (search) {
      filters.$text = { $search: search };
    }

    // Cursor-based pagination for better performance
    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        if (sort === '-dateTime.start') {
          filters['dateTime.start'] = { ...filters['dateTime.start'], $lt: new Date(cursorData.dateTime) };
        }
      } catch (e) {
        // Invalid cursor, ignore
      }
    }

    // Execute query with one extra item to check if there's a next page
    const events = await Event.find(filters)
      .populate('organizerId', 'firstName lastName email')
      .populate('bookingCount')
      .sort(sort)
      .limit(limitNum + 1)
      .lean();

    const hasNextPage = events.length > limitNum;
    if (hasNextPage) events.pop();

    // Generate next cursor
    let nextCursor = null;
    if (hasNextPage && events.length > 0) {
      const lastEvent = events[events.length - 1];
      nextCursor = Buffer.from(JSON.stringify({
        dateTime: lastEvent.dateTime.start,
        id: lastEvent._id
      })).toString('base64');
    }

    // For backward compatibility, also support offset pagination
    let total = null;
    let pages = null;
    if (!cursor) {
      total = await Event.countDocuments(filters);
      pages = Math.ceil(total / limitNum);
    }

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          hasNextPage,
          nextCursor,
          ...(total !== null && { total, pages })
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
router.get('/:id', paramValidation.mongoId, optionalAuth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'firstName lastName email phone')
      .populate('bookingCount')
      .populate('confirmedAttendeesCount');

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check if user can view this event
    if (event.status !== 'published' || !event.isPublic) {
      if (!req.user || (req.user.id !== event.organizerId._id.toString() && req.user.role !== 'admin')) {
        return res.status(403).json({
          error: 'Not authorized to view this event',
          code: 'EVENT_ACCESS_DENIED'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { event }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Organizer/Admin)
router.post('/', protect, authorize('organizer', 'admin'), eventValidation.create, async (req, res, next) => {
  try {
    // Add organizer ID to request body
    req.body.organizerId = req.user.id;

    // Calculate available capacity
    req.body.capacity.available = req.body.capacity.total - (req.body.capacity.reserved || 0);

    const event = await Event.create(req.body);

    // Populate organizer info
    await event.populate('organizerId', 'firstName lastName email');

    // Log event creation
    await AuditLog.logAction({
      action: 'event_create',
      userId: req.user.id,
      entityType: 'event',
      entityId: event._id,
      details: {
        title: event.title,
        category: event.category,
        dateTime: event.dateTime
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Event created: ${event.title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer/Admin)
router.put('/:id', protect, authorize('organizer', 'admin'), paramValidation.mongoId, eventValidation.update, async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check ownership (organizers can only edit their own events)
    if (req.user.role === 'organizer' && event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Not authorized to update this event',
        code: 'EVENT_UPDATE_DENIED'
      });
    }

    // Don't allow updating capacity if there are confirmed bookings
    if (req.body.capacity && req.body.capacity.total) {
      const confirmedBookings = await Booking.aggregate([
        {
          $match: {
            eventId: event._id,
            status: { $in: ['confirmed', 'pending'] }
          }
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ]);

      const bookedQuantity = confirmedBookings.length > 0 ? confirmedBookings[0].totalQuantity : 0;
      
      if (req.body.capacity.total < bookedQuantity) {
        return res.status(400).json({
          error: `Cannot reduce capacity below ${bookedQuantity} (current bookings)`,
          code: 'CAPACITY_REDUCTION_DENIED'
        });
      }
    }

    // Store original values for audit log
    const originalValues = {
      title: event.title,
      dateTime: event.dateTime,
      capacity: event.capacity,
      status: event.status
    };

    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('organizerId', 'firstName lastName email');

    // Update available capacity
    await event.updateAvailableCapacity();

    // Log event update
    await AuditLog.logAction({
      action: 'event_update',
      userId: req.user.id,
      entityType: 'event',
      entityId: event._id,
      details: {
        originalValues,
        updatedFields: Object.keys(req.body)
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer/Admin)
router.delete('/:id', protect, authorize('organizer', 'admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check ownership (organizers can only delete their own events)
    if (req.user.role === 'organizer' && event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Not authorized to delete this event',
        code: 'EVENT_DELETE_DENIED'
      });
    }

    // Check if event has bookings
    const bookingCount = await Booking.countDocuments({
      eventId: event._id,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (bookingCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete event with active bookings. Cancel the event instead.',
        code: 'EVENT_HAS_BOOKINGS'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    // Log event deletion
    await AuditLog.logAction({
      action: 'event_delete',
      userId: req.user.id,
      entityType: 'event',
      entityId: event._id,
      details: {
        title: event.title,
        category: event.category
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Publish event
// @route   PUT /api/events/:id/publish
// @access  Private (Organizer/Admin)
router.put('/:id/publish', protect, authorize('organizer', 'admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check ownership
    if (req.user.role === 'organizer' && event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Not authorized to publish this event',
        code: 'EVENT_PUBLISH_DENIED'
      });
    }

    if (event.status === 'published') {
      return res.status(400).json({
        error: 'Event is already published',
        code: 'EVENT_ALREADY_PUBLISHED'
      });
    }

    event.status = 'published';
    event.publishedAt = new Date();
    await event.save();

    // Log event publication
    await AuditLog.logAction({
      action: 'event_publish',
      userId: req.user.id,
      entityType: 'event',
      entityId: event._id,
      details: {
        title: event.title
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Event published successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel event
// @route   PUT /api/events/:id/cancel
// @access  Private (Organizer/Admin)
router.put('/:id/cancel', protect, authorize('organizer', 'admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check ownership
    if (req.user.role === 'organizer' && event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Not authorized to cancel this event',
        code: 'EVENT_CANCEL_DENIED'
      });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({
        error: 'Event is already cancelled',
        code: 'EVENT_ALREADY_CANCELLED'
      });
    }

    event.status = 'cancelled';
    await event.save();

    // Cancel all pending/confirmed bookings
    await Booking.updateMany(
      {
        eventId: event._id,
        status: { $in: ['pending', 'confirmed'] }
      },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'Event cancelled by organizer'
      }
    );

    // Log event cancellation
    await AuditLog.logAction({
      action: 'event_cancel',
      userId: req.user.id,
      entityType: 'event',
      entityId: event._id,
      details: {
        title: event.title,
        reason: req.body.reason || 'No reason provided'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Event cancelled successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get event statistics
// @route   GET /api/events/:id/stats
// @access  Private (Organizer/Admin)
router.get('/:id/stats', protect, authorize('organizer', 'admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check ownership
    if (req.user.role === 'organizer' && event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Not authorized to view event statistics',
        code: 'EVENT_STATS_DENIED'
      });
    }

    // Get booking statistics
    const bookingStats = await Booking.getEventStats(event._id);
    
    // Get check-in statistics
    const checkInStats = await Booking.aggregate([
      { $match: { eventId: event._id, status: 'confirmed' } },
      {
        $group: {
          _id: '$checkInStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event._id,
          title: event.title,
          capacity: event.capacity
        },
        bookingStats,
        checkInStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get my events (for organizers)
// @route   GET /api/events/my/events
// @access  Private (Organizer/Admin)
router.get('/my/events', protect, authorize('organizer', 'admin'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      cursor,
      status,
      sort = '-createdAt'
    } = req.query;

    const limitNum = Math.min(parseInt(limit), 50);
    const filters = { organizerId: req.user.id };
    if (status) filters.status = status;

    // Cursor-based pagination
    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        filters.createdAt = { $lt: new Date(cursorData.createdAt) };
      } catch (e) {
        // Invalid cursor, ignore
      }
    }

    const events = await Event.find(filters)
      .populate('bookingCount')
      .populate('confirmedAttendeesCount')
      .sort(sort)
      .limit(limitNum + 1)
      .lean();

    const hasNextPage = events.length > limitNum;
    if (hasNextPage) events.pop();

    let nextCursor = null;
    if (hasNextPage && events.length > 0) {
      const lastEvent = events[events.length - 1];
      nextCursor = Buffer.from(JSON.stringify({
        createdAt: lastEvent.createdAt,
        id: lastEvent._id
      })).toString('base64');
    }

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          hasNextPage,
          nextCursor
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;