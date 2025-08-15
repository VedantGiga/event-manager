const fs = require('fs');
const path = require('path');

const securityCheck = () => {
  console.log('🔒 Security Configuration Check\n');

  // Check .env file exists
  const envPath = path.join(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found - copy .env.example to .env');
    return false;
  }
  console.log('✅ .env file exists');

  // Check .gitignore includes .env
  const gitignorePath = path.join(__dirname, '../../.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignore.includes('.env')) {
      console.log('✅ .env is in .gitignore');
    } else {
      console.log('❌ Add .env to .gitignore');
      return false;
    }
  }

  // Load and validate environment variables
  require('dotenv').config();
  
  const checks = [
    {
      name: 'JWT_SECRET',
      test: () => process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
      message: 'JWT_SECRET must be at least 32 characters'
    },
    {
      name: 'MONGODB_URI',
      test: () => process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('mongodb'),
      message: 'MONGODB_URI must be a valid MongoDB connection string'
    },
    {
      name: 'NODE_ENV',
      test: () => ['development', 'production', 'test'].includes(process.env.NODE_ENV),
      message: 'NODE_ENV should be development, production, or test'
    }
  ];

  let allPassed = true;
  checks.forEach(check => {
    if (check.test()) {
      console.log(`✅ ${check.name} configured correctly`);
    } else {
      console.log(`❌ ${check.name}: ${check.message}`);
      allPassed = false;
    }
  });

  // Security recommendations
  console.log('\n🛡️  Security Recommendations:');
  console.log('• Use HTTPS in production');
  console.log('• Regularly rotate JWT secrets');
  console.log('• Monitor failed authentication attempts');
  console.log('• Keep dependencies updated (npm audit)');
  console.log('• Use strong passwords (8+ chars, mixed case, numbers, symbols)');

  return allPassed;
};

if (require.main === module) {
  const passed = securityCheck();
  process.exit(passed ? 0 : 1);
}

module.exports = securityCheck;