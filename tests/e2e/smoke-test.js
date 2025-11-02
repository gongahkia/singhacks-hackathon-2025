/**
 * Quick Smoke Test
 * 
 * Minimal test to verify backend is accessible and basic endpoints work.
 * Use this for quick validation before running full e2e suite.
 * 
 * Run with: node tests/e2e/smoke-test.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TIMEOUT = 5000; // 5 seconds

async function smokeTest() {
  console.log('🔥 Running Smoke Tests...\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
      return true;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
      return false;
    }
  }

  // Test 1: Backend Health
  await test('Backend Health Check', async () => {
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: TIMEOUT });
    if (response.data.status !== 'healthy') {
      throw new Error('Backend not healthy');
    }
  });

  // Test 2: Get All Agents
  await test('Get All Agents', async () => {
    const response = await axios.get(`${BASE_URL}/api/agents`, { timeout: TIMEOUT });
    if (!Array.isArray(response.data.agents)) {
      throw new Error('Invalid response format');
    }
  });

  // Test 3: Agent Search
  await test('Agent Search Endpoint', async () => {
    const response = await axios.get(`${BASE_URL}/api/agents/search?capability=payments`, { timeout: TIMEOUT });
    if (!Array.isArray(response.data.agents)) {
      throw new Error('Invalid search response format');
    }
  });

  // Summary
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('❌ Smoke tests failed. Please check backend configuration.');
    process.exit(1);
  } else {
    console.log('✅ All smoke tests passed! Backend is ready for full e2e tests.');
    process.exit(0);
  }
}

smokeTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

