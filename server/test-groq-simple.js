/**
 * Simple Groq API Test
 * Run with: node test-groq-simple.js
 */

require('dotenv').config();
const OpenAI = require('openai');

const groq = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

async function testGroq() {
  console.log('🧪 Testing Groq API...\n');
  
  console.log('API Key:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
  console.log('Model:', process.env.AI_MODEL || 'llama-3.3-70b-versatile');
  console.log('');

  try {
    console.log('📤 Sending test message to Groq...');
    
    const response = await groq.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Groq!" in one short sentence.'
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    console.log('✅ SUCCESS! Groq API is working!\n');
    console.log('Response:', response.choices[0].message.content);
    console.log('\n✅ Your Groq integration is working perfectly!');
    
  } catch (error) {
    console.error('❌ FAILED! Groq API error:\n');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.status) {
      console.error('HTTP Status:', error.status);
    }
    
    if (error.error) {
      console.error('API Error:', JSON.stringify(error.error, null, 2));
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your Groq API key at: https://console.groq.com/keys');
    console.log('2. Make sure the key starts with "gsk_"');
    console.log('3. Verify the model name is correct');
    console.log('4. Check if you have API quota remaining');
    
    process.exit(1);
  }
}

testGroq();
