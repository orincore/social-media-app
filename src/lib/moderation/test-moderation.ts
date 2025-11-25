// Test file for content moderation
// Run this with: npx ts-node src/lib/moderation/test-moderation.ts

import { hybridModeration, basicKeywordFilter } from './gemini';

async function testModeration() {
  console.log('🧪 Testing Content Moderation System\n');

  const testCases = [
    {
      content: "Hello, this is a normal post about my day!",
      expected: "safe"
    },
    {
      content: "I hate this stupid platform and everyone on it",
      expected: "harassment"
    },
    {
      content: "Buy now! Click here for free money! Urgent offer!",
      expected: "spam"
    },
    {
      content: "This is just a regular tweet about technology",
      expected: "safe"
    },
    {
      content: "kill yourself you worthless person",
      expected: "harassment"
    }
  ];

  console.log('Testing Keyword Filter (Fallback):');
  console.log('=====================================');

  for (const testCase of testCases) {
    const result = basicKeywordFilter(testCase.content);
    const status = result.isViolation ? '❌ BLOCKED' : '✅ ALLOWED';
    
    console.log(`${status} "${testCase.content}"`);
    if (result.isViolation) {
      console.log(`   Type: ${result.violationType}, Confidence: ${result.confidence}%`);
      console.log(`   Reason: ${result.reason}`);
    }
    console.log('');
  }

  console.log('\nTesting Hybrid Moderation (AI + Keyword):');
  console.log('==========================================');

  for (const testCase of testCases) {
    try {
      const result = await hybridModeration(testCase.content);
      const status = result.isViolation ? '❌ BLOCKED' : '✅ ALLOWED';
      
      console.log(`${status} "${testCase.content}"`);
      if (result.isViolation) {
        console.log(`   Type: ${result.violationType}, Confidence: ${result.confidence}%`);
        console.log(`   Reason: ${result.reason}`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ERROR testing: "${testCase.content}"`);
      console.log(`   Error: ${error}`);
      console.log('');
    }
  }

  console.log('✅ Moderation testing complete!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testModeration().catch(console.error);
}

export { testModeration };
