const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add an event title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add an event description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  organizerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Event must have an organizer']
  },
  category: {
    type: String,
    required: [true, 'Please add an event category'],
    enum: ['conference', 'workshop', 'meetup', 'concert', 'sports', 'networking', 'seminar', 'other']
  },
  venue: {
    name: {
      type: String,
      required: [true, 'Please add a venue name'],
      trim: true,
      maxlength: [100, 'Venue name cannot be more than 100 characters']
    },
    address: {
      type: String,
      required: [true, 'Please add a venue address'],
      trim: true,
      maxlength: [200, 'Address cannot be more than 200 characters']
    },
    city: {
      type: String,
      required: [true, 'Please add a city'],
      trim: true,
      maxlength: [50, 'City cannot be more than 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot be more than 50 characters']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Zip code cannot be more than 20 characters']
    },
    coordinates: {
      lat: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      lng: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    }
  },
  dateTime: {
    start: {
      type: Date,
      required: [true, 'Please add a start date and time'],
      validate: {
        validator: function(value) {
          return value > new Date();
        },
        message: 'Start date must be in the future'
      }
    },
    end: {
      type: Date,
      required: [true, 'Please add an end date and time'],
      validate: {
        validator: function(value) {
          return value > this.dateTime.start;
        },
        message: 'End date must be after start date'
      }
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  capacity: {
    total: {
      type: Number,
      required: [true, 'Please add total capacity'],
      min: [1, 'Capacity must be at least 1']
    },
    available: {
      type: Number,
      default: function() {
        return this.capacity.total;
      }
    },
    reserved: {
      type: Number,
      default: 0,
      min: [0, 'Reserved capacity cannot be negative']
    }
  },
  pricing: {
    isFree: {
      type: Boolean,
      default: true
    },
    ticketPrice: {
      type: Number,
      min: [0, 'Ticket price cannot be negative'],
      validate: {
        validator: function(value) {
          if (!this.pricing.isFree && (value === undefined || value === null)) {
            return false;
          }
          return true;
        },
        message: 'Ticket price is required for paid events'
      }
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    }
  },
  images: [{
    type: String,
    validate: {
      validator: function(value) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(value);
      },
      message: 'Please provide a valid image URL'
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot be more than 30 characters']
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for performance
EventSchema.index({ organizerId: 1, status: 1 });
EventSchema.index({ status: 1, 'dateTime.start': 1 });
EventSchema.index({ category: 1, status: 1 });
EventSchema.index({ 'venue.city': 1, status: 1 });
EventSchema.index({ tags: 1 });
EventSchema.index({ 'dateTime.start': 1 });
EventSchema.index({ createdAt: -1 });
EventSchema.index({ title: 'text', description: 'text' }); // Text search

// Additional compound indexes for complex queries
EventSchema.index({ status: 1, isPublic: 1, 'dateTime.start': 1 }); // Public listings
EventSchema.index({ organizerId: 1, createdAt: -1 }); // Organizer's events by date
EventSchema.index({ status: 1, category: 1, 'dateTime.start': 1 }); // Category + date filtering

// Virtual for duration in hours
EventSchema.virtual('duration').get(function() {
  if (this.dateTime.start && this.dateTime.end) {
    return Math.round((this.dateTime.end - this.dateTime.start) / (1000 * 60 * 60));
  }
  return 0;
});

// Virtual for booking count
EventSchema.virtual('bookingCount', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'eventId',
  count: true,
  match: { status: { $in: ['confirmed', 'pending'] } }
});

// Virtual for confirmed attendees count
EventSchema.virtual('confirmedAttendeesCount', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'eventId',
  count: true,
  match: { status: 'confirmed' }
});

// Pre-save middleware to set publishedAt when status changes to published
EventSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Pre-save middleware to validate capacity
EventSchema.pre('save', function(next) {
  if (this.capacity.reserved > this.capacity.total) {
    next(new Error('Reserved capacity cannot exceed total capacity'));
  }
  
  if (this.capacity.available < 0) {
    next(new Error('Available capacity cannot be negative'));
  }
  
  next();
});

// Method to check if event is bookable
EventSchema.methods.isBookable = function() {
  return this.status === 'published' && 
         this.dateTime.start > new Date() && 
         this.capacity.available > 0;
};

// Method to update available capacity
EventSchema.methods.updateAvailableCapacity = async function() {
  const Booking = mongoose.model('Booking');
  const confirmedBookings = await Booking.aggregate([
    {
      $match: {
        eventId: this._id,
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
  this.capacity.available = this.capacity.total - this.capacity.reserved - bookedQuantity;
  
  return this.save();
};

// Static method to get events with filters
EventSchema.statics.getFilteredEvents = function(filters = {}, options = {}) {
  const {
    category,
    city,
    startDate,
    endDate,
    tags,
    search,
    organizerId,
    status = 'published'
  } = filters;

  const {
    page = 1,
    limit = 10,
    sort = '-dateTime.start'
  } = options;

  const query = { status };

  // Add filters
  if (category) query.category = category;
  if (city) query['venue.city'] = new RegExp(city, 'i');
  if (organizerId) query.organizerId = organizerId;
  if (tags && tags.length > 0) query.tags = { $in: tags };

  // Date range filter
  if (startDate || endDate) {
    query['dateTime.start'] = {};
    if (startDate) query['dateTime.start'].$gte = new Date(startDate);
    if (endDate) query['dateTime.start'].$lte = new Date(endDate);
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .populate('organizerId', 'firstName lastName email')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('Event', EventSchema);