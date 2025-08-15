const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Category = require('../models/Category');
const Event = require('../models/Event');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const seedCategories = async () => {
  const categories = [
    {
      name: 'Conference',
      description: 'Professional conferences and summits',
      icon: 'users',
      color: '#007bff',
      sortOrder: 1
    },
    {
      name: 'Workshop',
      description: 'Hands-on learning workshops',
      icon: 'tools',
      color: '#28a745',
      sortOrder: 2
    },
    {
      name: 'Meetup',
      description: 'Casual networking meetups',
      icon: 'coffee',
      color: '#ffc107',
      sortOrder: 3
    },
    {
      name: 'Concert',
      description: 'Music concerts and performances',
      icon: 'music',
      color: '#e83e8c',
      sortOrder: 4
    },
    {
      name: 'Sports',
      description: 'Sports events and competitions',
      icon: 'trophy',
      color: '#fd7e14',
      sortOrder: 5
    },
    {
      name: 'Networking',
      description: 'Professional networking events',
      icon: 'network-wired',
      color: '#6f42c1',
      sortOrder: 6
    },
    {
      name: 'Seminar',
      description: 'Educational seminars and lectures',
      icon: 'chalkboard-teacher',
      color: '#20c997',
      sortOrder: 7
    },
    {
      name: 'Other',
      description: 'Other types of events',
      icon: 'calendar-alt',
      color: '#6c757d',
      sortOrder: 8
    }
  ];

  try {
    await Category.deleteMany({});
    await Category.insertMany(categories);
    console.log('Categories seeded successfully');
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
};

const seedUsers = async () => {
  const users = [
    {
      email: 'admin@eventmanager.com',
      password: 'Admin123!',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isVerified: true
    },
    {
      email: 'organizer@eventmanager.com',
      password: 'Organizer123!',
      firstName: 'Event',
      lastName: 'Organizer',
      phone: '+1-555-123-4567',
      role: 'organizer',
      isVerified: true
    },
    {
      email: 'user@eventmanager.com',
      password: 'User123!',
      firstName: 'Regular',
      lastName: 'User',
      phone: '+1-555-987-6543',
      role: 'user',
      isVerified: true
    }
  ];

  try {
    await User.deleteMany({});
    
    // Hash passwords before inserting
    for (let user of users) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
    
    await User.insertMany(users);
    console.log('Users seeded successfully');
    console.log('Login credentials:');
    console.log('Admin: admin@eventmanager.com / Admin123!');
    console.log('Organizer: organizer@eventmanager.com / Organizer123!');
    console.log('User: user@eventmanager.com / User123!');
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const seedEvents = async () => {
  try {
    // Get the organizer user
    const organizer = await User.findOne({ email: 'organizer@eventmanager.com' });
    if (!organizer) {
      console.log('Organizer not found, skipping event seeding');
      return;
    }

    const events = [
      {
        title: 'React Conference 2024',
        description: 'Join us for the biggest React conference of the year! Learn about the latest features, best practices, and connect with fellow developers.',
        organizerId: organizer._id,
        category: 'conference',
        venue: {
          name: 'Tech Convention Center',
          address: '123 Tech Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          coordinates: {
            lat: 37.7749,
            lng: -122.4194
          }
        },
        dateTime: {
          start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 hours later
          timezone: 'America/Los_Angeles'
        },
        capacity: {
          total: 500,
          available: 500,
          reserved: 50
        },
        pricing: {
          isFree: false,
          ticketPrice: 299.99,
          currency: 'USD'
        },
        images: [
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
          'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800'
        ],
        tags: ['react', 'javascript', 'frontend', 'web development'],
        status: 'published',
        isPublic: true,
        requiresApproval: false
      },
      {
        title: 'JavaScript Workshop: Advanced Concepts',
        description: 'Deep dive into advanced JavaScript concepts including closures, prototypes, async/await, and more.',
        organizerId: organizer._id,
        category: 'workshop',
        venue: {
          name: 'Code Academy',
          address: '456 Learning Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        dateTime: {
          start: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
          timezone: 'America/New_York'
        },
        capacity: {
          total: 30,
          available: 30,
          reserved: 5
        },
        pricing: {
          isFree: false,
          ticketPrice: 99.99,
          currency: 'USD'
        },
        images: [
          'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=800'
        ],
        tags: ['javascript', 'workshop', 'programming', 'education'],
        status: 'published',
        isPublic: true,
        requiresApproval: false
      },
      {
        title: 'Tech Networking Meetup',
        description: 'Monthly networking event for tech professionals. Great opportunity to meet like-minded people and expand your network.',
        organizerId: organizer._id,
        category: 'networking',
        venue: {
          name: 'Innovation Hub',
          address: '789 Startup Blvd',
          city: 'Austin',
          state: 'TX',
          zipCode: '73301'
        },
        dateTime: {
          start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
          timezone: 'America/Chicago'
        },
        capacity: {
          total: 100,
          available: 100,
          reserved: 10
        },
        pricing: {
          isFree: true,
          currency: 'USD'
        },
        images: [
          'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800'
        ],
        tags: ['networking', 'tech', 'meetup', 'professional'],
        status: 'published',
        isPublic: true,
        requiresApproval: false
      }
    ];

    await Event.deleteMany({});
    await Event.insertMany(events);
    console.log('Events seeded successfully');
  } catch (error) {
    console.error('Error seeding events:', error);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('Starting database seeding...');
    
    await seedCategories();
    await seedUsers();
    await seedEvents();
    
    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  seedCategories,
  seedUsers,
  seedEvents
};