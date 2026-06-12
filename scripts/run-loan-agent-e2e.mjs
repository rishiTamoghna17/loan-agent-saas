#!/usr/bin/env node

/**
 * run-loan-agent-e2e.mjs
 *
 * Driver script for the LeadHub Loan Agent SaaS web app.
 * Starts the dev server, launches Chromium via Playwright, navigates to key pages,
 * and takes screenshots for visual verification.
 *
 * Usage:
 *   npm run e2e:driver
 *   node scripts/run-loan-agent-e2e.mjs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);
const screenshotsDir = join(process.cwd(), 'screenshots');

async function ensureDevServer() {
  // Check if server is already running
  try {
    const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login');
    if (stdout.trim() === '200') {
      console.log('✓ Dev server already running on http://localhost:3000');
      return true;
    }
  } catch (e) {
    // Server not running
  }

  // Check if .env.local exists
  if (!existsSync(join(process.cwd(), '.env.local'))) {
    console.warn('⚠ .env.local not found. The app may not load correctly.');
  }

  // Start dev server
  console.log('Starting dev server...');
  const devServer = exec('npm run dev > /tmp/dev-server.log 2>&1', {
    shell: '/bin/bash'
  });

  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login');
      if (stdout.trim() === '200') {
        console.log('✓ Dev server ready on http://localhost:3000');
        return true;
      }
    } catch (e) {
      // Keep waiting
    }
  }
  throw new Error('Dev server failed to start within 30 seconds');
}

async function takeScreenshot(page, name) {
  const screenshotPath = join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✓ Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function main() {
  console.log('=== LeadHub Loan Agent SaaS E2E Driver ===\n');

  // Create screenshots directory
  const fs = await import('fs');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Ensure dev server is running
  await ensureDevServer();
  await new Promise(r => setTimeout(r, 2000)); // Give it a moment to settle

  // Launch Playwright browser
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    // Visit login page
    console.log('\n--- Visiting Login Page ---');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await takeScreenshot(page, '01-login');

    // Visit signup page
    console.log('\n--- Visiting Signup Page ---');
    await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle' });
    await takeScreenshot(page, '02-signup');

    // Visit campaign demo page (works without login)
    console.log('\n--- Visiting Campaign Demo Page ---');
    await page.goto('http://localhost:3000/demo?prospect_id=00000000-0000-0000-0000-000000000000', { waitUntil: 'networkidle' });
    await takeScreenshot(page, '03-campaign-demo');

    // Visit dashboard (may redirect to login if not authenticated)
    console.log('\n--- Visiting Dashboard ---');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await takeScreenshot(page, '04-dashboard');

    // Visit admin overview
    console.log('\n--- Visiting Admin Overview ---');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
    await takeScreenshot(page, '05-admin-overview');

    console.log('\n=== All Screenshots Captured ===');
  } finally {
    await browser.close();
    console.log('\n✓ Browser closed. Screenshots saved to ./screenshots/');
  }
}

main().catch(err => {
  console.error('Driver failed:', err);
  process.exit(1);
});
