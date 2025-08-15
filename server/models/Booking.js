const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const BookingSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event',
    required: [true, 'Booking must be associated with an event']
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must be associated with a user']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'waitlisted'],
    default: 'pending'
  },
  ticketType: {
    type: String,
    enum: ['regular', 'vip', 'student', 'early_bird'],
    default: 'regular'
  },
  quantity: {
    type: Number,
    required: [true, 'Please specify quantity'],
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Maximum 10 tickets per booking']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    default: null
  },
  bookingReference: {
    type: String,
    unique: true,
    default: function() {
      return `BK-${Date.now()}-${uuidv4().substr(0, 8).toUpperCase()}`;
    }
  },
  attendeeInfo: [{
    firstName: {
      type: String,
      required: [true, 'Attendee first name is required'],
      trim: true,
      maxlength: [50, 'First name cannot be more than 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Attendee last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot be more than 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Attendee email is required'],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    phone: {
      type: String,
      match: [
        /^\+?[\d\s\-\(\)]+$/,
        'Please add a valid phone number'
      ]
    },
    dietaryRestrictions: {
      type: String,
      maxlength: [200, 'Dietary restrictions cannot be more than 200 characters']
    },
    specialRequests: {
      type: String,
      maxlength: [500, 'Special requests cannot be more than 500 characters']
    }
  }],
  checkInStatus: {
    type: String,
    enum: ['not_checked_in', 'checked_in'],
    default: 'not_checked_in'
  },
  checkInTime: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelReason: {
    type: String,
    maxlength: [500, 'Cancel reason cannot be more than 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes
BookingSchema.index({ eventId: 1, status: 1 });
BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ eventId: 1, userId: 1 }, { unique: true }); // Prevent duplicate bookings
BookingSchema.index({ bookingReference: 1 }, { unique: true });
BookingSchema.index({ paymentStatus: 1 });
BookingSchema.index({ createdAt: -1 });

// Performance indexes for pagination
BookingSchema.index({ eventId: 1, createdAt: -1 }); // Event bookings by date
BookingSchema.index({ userId: 1, createdAt: -1 }); // User bookings by date

// Virtual for attendee count
BookingSchema.virtual('attendeeCount').get(function() {
  return this.attendeeInfo.length;
});

// Pre-save validation
BookingSchema.pre('save', function(next) {
  // Ensure attendee info matches quantity
  if (this.attendeeInfo.length !== this.quantity) {
    return next(new Error('Number of attendees must match booking quantity'));
  }
  
  // Set cancelled date when status changes to cancelled
  if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
  
  next();
});

// Pre-save middleware to prevent booking past events
BookingSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Event = mongoose.model('Event');
    const event = await Event.findById(this.eventId);
    
    if (!event) {
      return next(new Error('Event not found'));
    }
    
    if (event.dateTime.start <= new Date()) {
      return next(new Error('Cannot book past events'));
    }
    
    if (event.status !== 'published') {
      return next(new Error('Cannot book unpublished events'));
    }
  }
  
  next();
});

// Post-save middleware to update event capacity
BookingSchema.post('save', async function(doc) {
  const Event = mongoose.model('Event');
  const event = await Event.findById(doc.eventId);
  if (event) {
    await event.updateAvailableCapacity();
  }
});

// Post-remove middleware to update event capacity
BookingSchema.post('remove', async function(doc) {
  const Event = mongoose.model('Event');
  const event = await Event.findById(doc.eventId);
  if (event) {
    await event.updateAvailableCapacity();
  }
});

// Method to check if booking can be cancelled
BookingSchema.methods.canBeCancelled = function() {
  return this.status === 'confirmed' || this.status === 'pending';
};

// Method to cancel booking
BookingSchema.methods.cancel = function(reason) {
  if (!this.canBeCancelled()) {
    throw new Error('Booking cannot be cancelled');
  }
  
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  
  return this.save();
};

// Method to confirm booking
BookingSchema.methods.confirm = function() {
  if (this.status !== 'pending') {
    throw new Error('Only pending bookings can be confirmed');
  }
  
  this.status = 'confirmed';
  return this.save();
};

// Method to check in attendee
BookingSchema.methods.checkIn = function() {
  if (this.status !== 'confirmed') {
    throw new Error('Only confirmed bookings can be checked in');
  }
  
  this.checkInStatus = 'checked_in';
  this.checkInTime = new Date();
  
  return this.save();
};

// Static method to get booking statistics for an event
BookingSchema.statics.getEventStats = function(eventId) {
  return this.aggregate([
    { $match: { eventId: mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
};

// Static method to check for duplicate booking
BookingSchema.statics.checkDuplicateBooking = async function(eventId, userId) {
  const existingBooking = await this.findOne({
    eventId,
    userId,
    status: { $in: ['pending', 'confirmed'] }
  });
  
  return !!existingBooking;
};

module.exports = mongoose.model('Booking', BookingSchema);