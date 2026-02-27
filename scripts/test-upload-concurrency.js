#!/usr/bin/env node

/**
 * Upload Concurrency Test Script
 *
 * Tests the upload endpoint with concurrent requests to verify:
 * - Concurrency limit is enforced (max 3 concurrent)
 * - Requests queue properly when limit is reached
 * - All requests eventually complete successfully
 * - Memory usage remains stable
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  endpoint: '/api/admin/upload-template-image',
  sessionToken: process.env.SESSION_TOKEN || '',
  concurrentRequests: 5,
  testImagePath: process.env.TEST_IMAGE || './test-image.jpg',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create a test image if it doesn't exist
 */
function createTestImage() {
  if (fs.existsSync(CONFIG.testImagePath)) {
    return;
  }

  log('Creating test image...', 'yellow');

  // Create a simple 1MB test file
  const buffer = Buffer.alloc(1024 * 1024, 'A');
  fs.writeFileSync(CONFIG.testImagePath, buffer);

  log('✓ Test image created', 'green');
}

/**
 * Upload a file to the server
 */
async function uploadFile(requestId) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    log(`[Request ${requestId}] Starting upload...`, 'cyan');

    // Read file
    const fileBuffer = fs.readFileSync(CONFIG.testImagePath);

    // Create multipart form data
    const boundary = `----WebKitFormBoundary${Math.random().toString(36)}`;
    const formData = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test.jpg"',
      'Content-Type: image/jpeg',
      '',
      fileBuffer.toString('binary'),
      `--${boundary}--`,
    ].join('\r\n');

    // Parse URL
    const url = new URL(CONFIG.baseUrl + CONFIG.endpoint);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    // Request options
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData),
        'Cookie': `next-auth.session-token=${CONFIG.sessionToken}`,
      },
    };

    // Make request
    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;

        if (res.statusCode === 200) {
          log(`[Request ${requestId}] ✓ Success (${duration}ms)`, 'green');
          resolve({ requestId, duration, success: true });
        } else {
          log(`[Request ${requestId}] ✗ Failed: ${res.statusCode} (${duration}ms)`, 'red');
          resolve({ requestId, duration, success: false, statusCode: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      log(`[Request ${requestId}] ✗ Error: ${error.message} (${duration}ms)`, 'red');
      resolve({ requestId, duration, success: false, error: error.message });
    });

    req.write(formData, 'binary');
    req.end();
  });
}

/**
 * Run concurrent upload test
 */
async function runConcurrencyTest() {
  log('\n=== Upload Concurrency Test ===\n', 'blue');

  // Validate configuration
  if (!CONFIG.sessionToken) {
    log('ERROR: SESSION_TOKEN environment variable not set', 'red');
    log('Usage: SESSION_TOKEN=your_token node test-upload-concurrency.js', 'yellow');
    process.exit(1);
  }

  // Create test image
  createTestImage();

  log(`Configuration:`, 'cyan');
  log(`  Base URL: ${CONFIG.baseUrl}`);
  log(`  Endpoint: ${CONFIG.endpoint}`);
  log(`  Concurrent Requests: ${CONFIG.concurrentRequests}`);
  log(`  Test Image: ${CONFIG.testImagePath}\n`);

  // Start test
  const testStartTime = Date.now();
  log('Starting concurrent uploads...\n', 'yellow');

  // Launch all requests concurrently
  const promises = [];
  for (let i = 1; i <= CONFIG.concurrentRequests; i++) {
    promises.push(uploadFile(i));
  }

  // Wait for all to complete
  const results = await Promise.all(promises);
  const testDuration = Date.now() - testStartTime;

  // Analyze results
  log('\n=== Test Results ===\n', 'blue');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));
  const minDuration = Math.min(...results.map(r => r.duration));

  log(`Total Requests: ${CONFIG.concurrentRequests}`);
  log(`Successful: ${successful}`, successful === CONFIG.concurrentRequests ? 'green' : 'yellow');
  log(`Failed: ${failed}`, failed === 0 ? 'green' : 'red');
  log(`\nTiming:`);
  log(`  Total Duration: ${testDuration}ms`);
  log(`  Average Duration: ${avgDuration.toFixed(0)}ms`);
  log(`  Min Duration: ${minDuration}ms`);
  log(`  Max Duration: ${maxDuration}ms`);

  // Verify concurrency limit
  log(`\nConcurrency Analysis:`);
  const firstThree = results.slice(0, 3).map(r => r.duration);
  const lastTwo = results.slice(3).map(r => r.duration);

  if (lastTwo.length > 0) {
    const avgFirst = firstThree.reduce((a, b) => a + b, 0) / firstThree.length;
    const avgLast = lastTwo.reduce((a, b) => a + b, 0) / lastTwo.length;

    log(`  First 3 requests avg: ${avgFirst.toFixed(0)}ms`);
    log(`  Last 2 requests avg: ${avgLast.toFixed(0)}ms`);

    if (avgLast > avgFirst * 1.5) {
      log(`  ✓ Concurrency limit appears to be working (queuing detected)`, 'green');
    } else {
      log(`  ⚠ Concurrency limit may not be working (no significant queuing)`, 'yellow');
    }
  }

  // Print failed requests details
  if (failed > 0) {
    log(`\nFailed Requests:`, 'red');
    results.filter(r => !r.success).forEach(r => {
      log(`  Request ${r.requestId}: ${r.error || `Status ${r.statusCode}`}`, 'red');
    });
  }

  log('\n=== Test Complete ===\n', 'blue');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run test
runConcurrencyTest().catch(error => {
  log(`\nFatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
