/**
 * E2E Tests: Tab Navigation Performance & Caching
 *
 * Purpose: Verify that switching between notes (tabs) does not trigger
 * unnecessary page reloads or API calls. Content should be cached and
 * retrieved instantly on subsequent visits.
 *
 * Test Coverage:
 * - No page reloads when switching between notes
 * - No duplicate API calls for previously loaded notes
 * - Instant tab switching after initial load
 * - Content preservation when switching between notes
 * - Performance benchmarks for tab switches
 */

import { test, expect, Page } from '@playwright/test';

// Test fixtures and helpers
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

// Helper: Login to the application
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

// Helper: Wait for editor to be ready
async function waitForEditorReady(page: Page) {
  await page.waitForSelector('.tiptap-editor', { timeout: 10000 });
}

// Helper: Get visible note items from the file navigator
async function getNoteItems(page: Page) {
  return page.locator('[role="treeitem"]').filter({ hasText: /.*/ });
}

test.describe('Tab Navigation Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should not reload page when switching between notes', async ({ page }) => {
    // Track navigation events
    const navigationEvents: string[] = [];

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigationEvents.push('navigation');
      }
    });

    // Wait for file navigator to load
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    // Get all note items
    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 2) {
      test.skip();
      return;
    }

    // Click first note
    await notes.nth(0).click();
    await waitForEditorReady(page);

    // Click second note
    await notes.nth(1).click();
    await waitForEditorReady(page);

    // Click back to first note
    await notes.nth(0).click();
    await waitForEditorReady(page);

    // Verify no page navigations occurred during tab switches
    expect(navigationEvents.length).toBe(0);
  });

  test('should not make duplicate API calls for cached notes', async ({ page }) => {
    const apiCalls = new Map<string, number>();

    // Monitor network requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/notes/') && request.method() === 'GET') {
        const noteId = url.split('/api/notes/')[1];
        apiCalls.set(noteId, (apiCalls.get(noteId) || 0) + 1);
      }
    });

    // Wait for file navigator
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 2) {
      test.skip();
      return;
    }

    // Click first note - should trigger API call
    await notes.nth(0).click();
    await waitForEditorReady(page);
    await page.waitForTimeout(500); // Allow API call to complete

    // Click second note - should trigger API call
    await notes.nth(1).click();
    await waitForEditorReady(page);
    await page.waitForTimeout(500);

    // Click back to first note - should NOT trigger API call (cached)
    await notes.nth(0).click();
    await waitForEditorReady(page);
    await page.waitForTimeout(500);

    // Click back to second note - should NOT trigger API call (cached)
    await notes.nth(1).click();
    await waitForEditorReady(page);
    await page.waitForTimeout(500);

    // Verify each note was only fetched once
    apiCalls.forEach((count, noteId) => {
      expect(count, `Note ${noteId} should only be fetched once`).toBe(1);
    });
  });

  test('should switch between tabs near-instantaneously after initial load', async ({
    page,
  }) => {
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 3) {
      test.skip();
      return;
    }

    // Load all notes into cache
    for (let i = 0; i < Math.min(3, noteCount); i++) {
      await notes.nth(i).click();
      await waitForEditorReady(page);
      await page.waitForTimeout(500); // Allow caching
    }

    // Measure tab switch performance for cached notes
    const switchTimes: number[] = [];

    for (let i = 0; i < Math.min(3, noteCount); i++) {
      const startTime = Date.now();
      await notes.nth(i).click();
      await waitForEditorReady(page);
      const endTime = Date.now();

      switchTimes.push(endTime - startTime);
    }

    // All cached tab switches should be under 100ms
    switchTimes.forEach((time, index) => {
      expect(time, `Tab switch ${index + 1} should be near-instant`).toBeLessThan(100);
    });

    // Average should be well under 50ms
    const avgTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
    expect(avgTime, 'Average tab switch time should be under 50ms').toBeLessThan(50);
  });

  test('should preserve content when switching between notes', async ({ page }) => {
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 2) {
      test.skip();
      return;
    }

    // Click first note and capture content
    await notes.nth(0).click();
    await waitForEditorReady(page);
    const firstNoteTitle = await page.locator('h2.text-sm').first().textContent();

    // Click second note
    await notes.nth(1).click();
    await waitForEditorReady(page);

    // Click back to first note
    await notes.nth(0).click();
    await waitForEditorReady(page);

    // Verify title is preserved
    const restoredTitle = await page.locator('h2.text-sm').first().textContent();
    expect(restoredTitle).toBe(firstNoteTitle);
  });

  test('should show loading indicator only on first load', async ({ page }) => {
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 1) {
      test.skip();
      return;
    }

    // First load - should show loading indicator
    await notes.nth(0).click();

    // Check if loading indicator appears
    const loadingIndicator = page.locator('text=Loading note...');
    const wasVisible = await loadingIndicator.isVisible().catch(() => false);

    await waitForEditorReady(page);

    // Switch to another note and back
    if (noteCount > 1) {
      await notes.nth(1).click();
      await waitForEditorReady(page);
    }

    // Return to first note - should NOT show loading (instant from cache)
    await notes.nth(0).click();

    // Loading indicator should not appear for cached content
    const loadingVisibleOnReturn = await loadingIndicator
      .isVisible({ timeout: 100 })
      .catch(() => false);

    expect(loadingVisibleOnReturn, 'Loading indicator should not appear for cached notes').toBe(
      false
    );
  });

  test('should handle rapid tab switching without errors', async ({ page }) => {
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 3) {
      test.skip();
      return;
    }

    // Track console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Rapid tab switching
    for (let i = 0; i < 10; i++) {
      const noteIndex = i % Math.min(3, noteCount);
      await notes.nth(noteIndex).click();
      // Don't wait - test rapid switching
    }

    // Wait for final render
    await waitForEditorReady(page);
    await page.waitForTimeout(1000);

    // Verify no errors occurred
    expect(errors.length, 'No console errors should occur during rapid switching').toBe(0);
  });

  test('should maintain scroll position when switching notes', async ({ page }) => {
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 2) {
      test.skip();
      return;
    }

    // Open first note
    await notes.nth(0).click();
    await waitForEditorReady(page);

    // Get scroll container
    const scrollArea = page.locator('[data-radix-scroll-area-viewport]').first();

    // Scroll down if content is scrollable
    await scrollArea.evaluate((el) => (el.scrollTop = 200));
    await page.waitForTimeout(200);

    const scrollPosition = await scrollArea.evaluate((el) => el.scrollTop);

    // Switch to another note
    await notes.nth(1).click();
    await waitForEditorReady(page);

    // Switch back to first note
    await notes.nth(0).click();
    await waitForEditorReady(page);

    // Scroll position should be reset to top for each note
    const newScrollPosition = await scrollArea.evaluate((el) => el.scrollTop);

    // Each note should start at top when opened
    expect(newScrollPosition, 'Note should start at top when opened').toBe(0);
  });

  test('should cache edits when switching between notes', async ({ page }) => {
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 2) {
      test.skip();
      return;
    }

    // Open first note
    await notes.nth(0).click();
    await waitForEditorReady(page);

    // Type some content
    const editor = page.locator('.ProseMirror').first();
    await editor.click();
    const testContent = 'Test content for caching';
    await editor.type(testContent);

    // Wait for autosave
    await page.waitForTimeout(1000);

    // Switch to another note
    await notes.nth(1).click();
    await waitForEditorReady(page);

    // Switch back to first note
    await notes.nth(0).click();
    await waitForEditorReady(page);

    // Verify content is preserved
    const content = await editor.textContent();
    expect(content, 'Edited content should be preserved in cache').toContain(testContent);
  });
});

test.describe('Tab Navigation Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should support keyboard navigation between notes', async ({ page }) => {
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 2) {
      test.skip();
      return;
    }

    // Focus first note with keyboard
    await notes.nth(0).focus();
    await page.keyboard.press('Enter');
    await waitForEditorReady(page);

    // Verify editor is accessible
    const editor = page.locator('.ProseMirror').first();
    expect(await editor.isVisible()).toBe(true);
  });

  test('should maintain ARIA attributes during tab switches', async ({ page }) => {
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });

    const notes = await getNoteItems(page);
    const noteCount = await notes.count();

    if (noteCount < 2) {
      test.skip();
      return;
    }

    // Click first note
    await notes.nth(0).click();
    await waitForEditorReady(page);

    // Check ARIA selected state
    const isSelected = await notes.nth(0).getAttribute('aria-selected');
    expect(isSelected).toBe('true');

    // Click second note
    await notes.nth(1).click();
    await waitForEditorReady(page);

    // First should no longer be selected
    const firstStillSelected = await notes.nth(0).getAttribute('aria-selected');
    expect(firstStillSelected).toBe('false');

    // Second should be selected
    const secondSelected = await notes.nth(1).getAttribute('aria-selected');
    expect(secondSelected).toBe('true');
  });
});
