const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'user_register',
      'user_login',
      'user_logout',
      'user_update',
      'user_delete',
      'event_create',
      'event_update',
      'event_delete',
      'event_publish',
      'event_cancel',
      'booking_create',
      'booking_confirm',
      'booking_cancel',
      'booking_checkin',
      'payment_success',
      'payment_failed',
      'admin_action'
    ]
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null // null for system actions
  },
  entityType: {
    type: String,
    enum: ['user', 'event', 'booking', 'category', 'system'],
    required: [true, 'Entity type is required']
  },
  entityId: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'Entity ID is required']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty IP
        // IPv4 or IPv6 (including ::1 for localhost)
        return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^::1$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v);
      },
      message: 'Please provide a valid IP address'
    }
  },
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot be more than 500 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  level: {
    type: String,
    enum: ['info', 'warning', 'error'],
    default: 'info'
  }
}, {
  timestamps: false // We use custom timestamp field
});

// Create indexes for performance
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ level: 1, timestamp: -1 });

// Static method to log an action
AuditLogSchema.statics.logAction = function(actionData) {
  const {
    action,
    userId = null,
    entityType,
    entityId,
    details = {},
    ipAddress = null,
    userAgent = null,
    level = 'info'
  } = actionData;

  return this.create({
    action,
    userId,
    entityType,
    entityId,
    details,
    ipAddress,
    userAgent,
    level,
    timestamp: new Date()
  });
};

// Static method to get user activity
AuditLogSchema.statics.getUserActivity = function(userId, options = {}) {
  const { limit = 50, page = 1 } = options;
  const skip = (page - 1) * limit;

  return this.find({ userId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'firstName lastName email');
};

// Static method to get entity audit trail
AuditLogSchema.statics.getEntityAuditTrail = function(entityType, entityId, options = {}) {
  const { limit = 50, page = 1 } = options;
  const skip = (page - 1) * limit;

  return this.find({ entityType, entityId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'firstName lastName email');
};

// Static method to get system statistics
AuditLogSchema.statics.getSystemStats = function(timeRange = 24) {
  const startTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);

  return this.aggregate([
    { $match: { timestamp: { $gte: startTime } } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$timestamp' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);