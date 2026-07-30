/**
 * Test script for AI endpoints
 * Run with: node test-ai-endpoints.js
 * Make sure server is running on port 5000
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'http://localhost:5000/api/ai';

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

async function testRecommendations() {
  log.info('Testing AI Recommendations...');
  
  try {
    const response = await fetch(`${API_BASE}/recommend-parking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parkingOptions: [
          {
            _id: '123',
            name: 'CP Parking Hub',
            address: 'Connaught Place, Delhi',
            distance: 2500,
            pricePerHour: 30,
            carSlots: 10,
            bikeSlots: 5,
            availability: {
              carSlots: { available: 5, total: 10 },
              bikeSlots: { available: 3, total: 5 }
            }
          },
          {
            _id: '456',
            name: 'Karol Bagh Parking',
            address: 'Karol Bagh, Delhi',
            distance: 5000,
            pricePerHour: 25,
            carSlots: 8,
            bikeSlots: 4,
            availability: {
              carSlots: { available: 2, total: 8 },
              bikeSlots: { available: 4, total: 4 }
            }
          }
        ],
        userContext: {
          vehicleType: 'car',
          duration: 2,
          budget: 50,
          preferences: 'close proximity',
          location: 'Connaught Place',
          timeOfDay: 14
        }
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log.success('Recommendations endpoint working!');
      console.log('   Recommendations:', data.recommendations.length);
      console.log('   Summary:', data.summary?.substring(0, 80) + '...');
    } else {
      log.error(`Recommendations failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    log.error(`Recommendations test error: ${error.message}`);
  }
  console.log('');
}

async function testQueryParsing() {
  log.info('Testing Smart Query Parsing...');
  
  const testQueries = [
    'cheap parking near CP metro',
    'bike parking for 2 hours in Karol Bagh',
    'covered car parking under ₹50 per hour'
  ];

  for (const query of testQueries) {
    try {
      const response = await fetch(`${API_BASE}/parse-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        log.success(`Parsed: "${query}"`);
        console.log('   Location:', data.parsed.location || 'N/A');
        console.log('   Vehicle:', data.parsed.vehicleType || 'N/A');
        console.log('   Price Range:', JSON.stringify(data.parsed.priceRange || {}));
      } else {
        log.error(`Query parsing failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      log.error(`Query parsing test error: ${error.message}`);
    }
  }
  console.log('');
}

async function testChatbot() {
  log.info('Testing AI Chatbot...');
  
  const testMessages = [
    'How do I book a parking slot?',
    'What are the parking rates?',
    'I need help finding parking near me'
  ];

  for (const message of testMessages) {
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationHistory: []
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        log.success(`Chat response received`);
        console.log('   User:', message);
        console.log('   Bot:', data.reply?.substring(0, 100) + '...');
      } else {
        log.error(`Chat failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      log.error(`Chat test error: ${error.message}`);
    }
  }
  console.log('');
}

async function testPricing() {
  log.info('Testing AI Pricing Suggestions...');
  log.warning('Note: This endpoint requires authentication (skipping for now)');
  
  // This would need a valid JWT token
  // Just test if endpoint exists
  try {
    const response = await fetch(`${API_BASE}/suggest-pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyData: {
          address: 'Karol Bagh, Delhi',
          carSlots: 10,
          bikeSlots: 5,
          location: {
            coordinates: [77.19, 28.65]
          }
        }
      })
    });

    if (response.status === 401) {
      log.warning('Pricing endpoint exists (401 Unauthorized - expected without token)');
    } else if (response.ok) {
      log.success('Pricing endpoint working!');
      const data = await response.json();
      console.log('   Suggested Price:', data.pricing?.suggestedPrice);
    } else {
      const data = await response.json();
      log.error(`Pricing failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    log.error(`Pricing test error: ${error.message}`);
  }
  console.log('');
}

async function runAllTests() {
  console.log('\n🤖 AI Features Test Suite\n');
  console.log('='.repeat(50));
  console.log('');

  // Check if server is running
  try {
    await fetch('http://localhost:5000');
    log.success('Server is running on port 5000');
    console.log('');
  } catch (error) {
    log.error('Server is not running! Start it with: npm run dev');
    process.exit(1);
  }

  await testRecommendations();
  await testQueryParsing();
  await testChatbot();
  await testPricing();

  console.log('='.repeat(50));
  console.log('\n✅ All tests completed!\n');
}

// Run tests
runAllTests().catch(console.error);
