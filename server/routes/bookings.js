const express = require('express');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const { bookingValidation, paramValidation } = require('../utils/validation');
const { bookingLimiter } = require('../middleware/security');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
router.post('/', protect, bookingLimiter, bookingValidation.create, async (req, res, next) => {
  try {
    const { eventId, quantity, attendeeInfo, ticketType } = req.body;

    // Check if event exists and is bookable
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    if (!event.isBookable()) {
      return res.status(400).json({
        error: 'Event is not available for booking',
        code: 'EVENT_NOT_BOOKABLE'
      });
    }

    // Check for duplicate booking
    const isDuplicate = await Booking.checkDuplicateBooking(eventId, req.user.id);
    if (isDuplicate) {
      return res.status(400).json({
        error: 'You have already booked this event',
        code: 'DUPLICATE_BOOKING'
      });
    }

    // Check capacity
    if (event.capacity.available < quantity) {
      return res.status(400).json({
        error: `Only ${event.capacity.available} tickets available`,
        code: 'INSUFFICIENT_CAPACITY'
      });
    }

    // Validate attendee info count matches quantity
    if (attendeeInfo.length !== quantity) {
      return res.status(400).json({
        error: 'Number of attendees must match booking quantity',
        code: 'ATTENDEE_COUNT_MISMATCH'
      });
    }

    // Calculate total amount
    const ticketPrice = event.pricing.isFree ? 0 : event.pricing.ticketPrice;
    const totalAmount = ticketPrice * quantity;

    // Create booking
    const booking = await Booking.create({
      eventId,
      userId: req.user.id,
      quantity,
      attendeeInfo,
      ticketType: ticketType || 'regular',
      totalAmount,
      status: event.requiresApproval ? 'pending' : 'confirmed',
      paymentStatus: event.pricing.isFree ? 'paid' : 'pending'
    });

    // Populate references
    await booking.populate([
      { path: 'eventId', select: 'title dateTime venue pricing' },
      { path: 'userId', select: 'firstName lastName email' }
    ]);

    // Log booking creation
    await AuditLog.logAction({
      action: 'booking_create',
      userId: req.user.id,
      entityType: 'booking',
      entityId: booking._id,
      details: {
        eventTitle: event.title,
        quantity,
        totalAmount,
        status: booking.status
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Booking created: ${booking.bookingReference} for event ${event.title}`);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's bookings
// @route   GET /api/bookings/my
// @access  Private
router.get('/my', protect, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sort = '-createdAt'
    } = req.query;

    const filters = { userId: req.user.id };
    if (status) filters.status = status;

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filters)
      .populate('eventId', 'title dateTime venue status category images')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filters);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
router.get('/:id', protect, paramValidation.mongoId, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('eventId', 'title dateTime venue pricing organizerId')
      .populate('userId', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check access rights
    const canAccess = booking.userId._id.toString() === req.user.id ||
                     booking.eventId.organizerId.toString() === req.user.id ||
                     req.user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        error: 'Not authorized to view this booking',
        code: 'BOOKING_ACCESS_DENIED'
      });
    }

    res.status(200).json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get booking by reference
// @route   GET /api/bookings/reference/:reference
// @access  Private
router.get('/reference/:reference', protect, async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ bookingReference: req.params.reference })
      .populate('eventId', 'title dateTime venue pricing organizerId')
      .populate('userId', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check access rights
    const canAccess = booking.userId._id.toString() === req.user.id ||
                     booking.eventId.organizerId.toString() === req.user.id ||
                     req.user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        error: 'Not authorized to view this booking',
        code: 'BOOKING_ACCESS_DENIED'
      });
    }

    res.status(200).json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
router.put('/:id', protect, paramValidation.mongoId, bookingValidation.update, async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id)
      .populate('eventId', 'organizerId');

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check permissions
    const canUpdate = booking.userId.toString() === req.user.id ||
                     booking.eventId.organizerId.toString() === req.user.id ||
                     req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({
        error: 'Not authorized to update this booking',
        code: 'BOOKING_UPDATE_DENIED'
      });
    }

    // Users can only update certain fields
    let allowedFields = ['notes'];
    if (booking.eventId.organizerId.toString() === req.user.id || req.user.role === 'admin') {
      allowedFields = ['status', 'notes', 'paymentStatus'];
    }

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'eventId', select: 'title dateTime venue' },
      { path: 'userId', select: 'firstName lastName email' }
    ]);

    // Log booking update
    await AuditLog.logAction({
      action: 'booking_update',
      userId: req.user.id,
      entityType: 'booking',
      entityId: booking._id,
      details: {
        updatedFields: Object.keys(updateData),
        bookingReference: booking.bookingReference
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, paramValidation.mongoId, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('eventId', 'title dateTime organizerId');

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check permissions
    const canCancel = booking.userId.toString() === req.user.id ||
                     booking.eventId.organizerId.toString() === req.user.id ||
                     req.user.role === 'admin';

    if (!canCancel) {
      return res.status(403).json({
        error: 'Not authorized to cancel this booking',
        code: 'BOOKING_CANCEL_DENIED'
      });
    }

    if (!booking.canBeCancelled()) {
      return res.status(400).json({
        error: 'Booking cannot be cancelled',
        code: 'BOOKING_CANNOT_BE_CANCELLED'
      });
    }

    // Check if event has already started (24 hour cancellation policy)
    const eventStart = new Date(booking.eventId.dateTime.start);
    const now = new Date();
    const hoursUntilEvent = (eventStart - now) / (1000 * 60 * 60);

    if (hoursUntilEvent < 24 && booking.userId.toString() === req.user.id) {
      return res.status(400).json({
        error: 'Cannot cancel booking less than 24 hours before event',
        code: 'CANCELLATION_DEADLINE_PASSED'
      });
    }

    const cancelReason = req.body.reason || 'Cancelled by user';
    await booking.cancel(cancelReason);

    // Log booking cancellation
    await AuditLog.logAction({
      action: 'booking_cancel',
      userId: req.user.id,
      entityType: 'booking',
      entityId: booking._id,
      details: {
        bookingReference: booking.bookingReference,
        eventTitle: booking.eventId.title,
        reason: cancelReason
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Confirm booking
// @route   PUT /api/bookings/:id/confirm
// @access  Private (Organizer/Admin)
router.put('/:id/confirm', protect, authorize('organizer', 'admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('eventId', 'title organizerId');

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check permissions
    if (req.user.role === 'organizer' && booking.eventId.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Not authorized to confirm this booking',
        code: 'BOOKING_CONFIRM_DENIED'
      });
    }

    await booking.confirm();

    // Log booking confirmation
    await AuditLog.logAction({
      action: 'booking_confirm',
      userId: req.user.id,
      entityType: 'booking',
      entityId: booking._id,
      details: {
        bookingReference: booking.bookingReference,
        eventTitle: booking.eventId.title
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Check in booking
// @route   PUT /api/bookings/:id/checkin
// @access  Private (Organizer/Admin)
router.put('/:id/checkin', protect, authorize('organizer', 'admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('eventId', 'title dateTime organizerId');

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check permissions
    if (req.user.role === 'organizer' && booking.eventId.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Not authorized to check in this booking',
        code: 'BOOKING_CHECKIN_DENIED'
      });
    }

    // Check if event has started (can only check in on event day)
    const eventStart = new Date(booking.eventId.dateTime.start);
    const now = new Date();
    const eventDate = eventStart.toDateString();
    const currentDate = now.toDateString();

    if (eventDate !== currentDate) {
      return res.status(400).json({
        error: 'Check-in is only available on the event day',
        code: 'CHECKIN_NOT_AVAILABLE'
      });
    }

    await booking.checkIn();

    // Log check-in
    await AuditLog.logAction({
      action: 'booking_checkin',
      userId: req.user.id,
      entityType: 'booking',
      entityId: booking._id,
      details: {
        bookingReference: booking.bookingReference,
        eventTitle: booking.eventId.title,
        checkInTime: booking.checkInTime
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get event bookings (for organizers)
// @route   GET /api/bookings/event/:eventId
// @access  Private (Organizer/Admin)
router.get('/event/:eventId', protect, authorize('organizer', 'admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const {
      page = 1,
      limit = 50,
      status,
      checkInStatus,
      sort = '-createdAt'
    } = req.query;

    // Check if event exists and user has permission
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    if (req.user.role === 'organizer' && event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Not authorized to view bookings for this event',
        code: 'EVENT_BOOKINGS_ACCESS_DENIED'
      });
    }

    const filters = { eventId };
    if (status) filters.status = status;
    if (checkInStatus) filters.checkInStatus = checkInStatus;

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filters)
      .populate('userId', 'firstName lastName email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filters);

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event._id,
          title: event.title,
          dateTime: event.dateTime
        },
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;