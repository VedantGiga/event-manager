const express = require('express');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const { paramValidation } = require('../utils/validation');

const router = express.Router();

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      sort = '-createdAt'
    } = req.query;

    const filters = {};
    if (role) filters.role = role;
    if (search) {
      filters.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filters)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filters);

    res.status(200).json({
      success: true,
      data: {
        users,
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

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
router.get('/:id', protect, authorize('admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private (Admin)
router.put('/:id/role', protect, authorize('admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!role || !['user', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Please provide a valid role (user, organizer, admin)',
        code: 'INVALID_ROLE'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Log role change
    await AuditLog.logAction({
      action: 'admin_action',
      userId: req.user.id,
      entityType: 'user',
      entityId: user._id,
      details: {
        action: 'role_change',
        oldRole,
        newRole: role,
        targetUser: user.email
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete your own account',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    // Log user deletion
    await AuditLog.logAction({
      action: 'admin_action',
      userId: req.user.id,
      entityType: 'user',
      entityId: user._id,
      details: {
        action: 'user_delete',
        deletedUser: user.email
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (Admin)
router.get('/stats/overview', protect, authorize('admin'), async (req, res, next) => {
  try {
    // Get user count by role
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get total users
    const totalUsers = await User.countDocuments();

    // Get verified users count
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        recentRegistrations,
        usersByRole: userStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user activity
// @route   GET /api/users/:id/activity
// @access  Private (Admin)
router.get('/:id/activity', protect, authorize('admin'), paramValidation.mongoId, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const activity = await AuditLog.getUserActivity(req.params.id, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const total = await AuditLog.countDocuments({ userId: req.params.id });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        activity,
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