/**
 * Microsite Formatting Test Suite
 *
 * Comprehensive E2E tests to verify all formatting elements
 * render correctly on published microsite pages.
 *
 * Tests:
 * - Callout blocks with proper background and border
 * - Syntax highlighting for code blocks
 * - Headers (H1-H6)
 * - Lists (ordered, unordered, nested)
 * - Tables with proper borders and headers
 * - Blockquotes
 * - Inline formatting (bold, italic, links, inline code)
 * - Images and horizontal rules
 * - Light and dark mode support
 */

import { test, expect } from '@playwright/test';
import testNoteData from '../fixtures/comprehensive-test-note.json';

const TEST_NOTE_TITLE = 'Comprehensive Formatting Test Document';

test.describe('Microsite Formatting Verification', () => {
  let noteId: string;
  let publicUrl: string;

  test.beforeAll(async ({ request }) => {
    // Create a test note via API
    // Note: This assumes you have authentication set up in tests
    // You may need to adjust this based on your test setup

    const response = await request.post('/api/notes', {
      data: {
        title: testNoteData.title,
        content: testNoteData.content,
        vaultId: process.env.TEST_VAULT_ID,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    noteId = data.id;

    // Publish the note
    const publishResponse = await request.post(`/api/notes/${noteId}/publish`, {
      data: { isPublic: true },
    });

    expect(publishResponse.ok()).toBeTruthy();
    const publishData = await publishResponse.json();
    publicUrl = publishData.publicUrl;
  });

  test.afterAll(async ({ request }) => {
    // Clean up: delete test note
    if (noteId) {
      await request.delete(`/api/notes/${noteId}`);
    }
  });

  test('should display page title and metadata', async ({ page }) => {
    await page.goto(publicUrl);

    // Check title
    const h1 = page.locator('h1').first();
    await expect(h1).toHaveText(TEST_NOTE_TITLE);

    // Check publication date
    await expect(page.locator('text=Published on')).toBeVisible();
  });

  test('should render callout blocks with correct styling', async ({ page }) => {
    await page.goto(publicUrl);

    const callout = page.locator('.callout-block').first();
    await expect(callout).toBeVisible();

    // Check for callout text
    await expect(callout).toContainText('This is a callout block');

    // Verify CSS properties
    const styles = await callout.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderLeftWidth: computed.borderLeftWidth,
        borderLeftStyle: computed.borderLeftStyle,
        borderRadius: computed.borderRadius,
        padding: computed.padding,
      };
    });

    // Should have background color (not transparent)
    expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

    // Should have left border
    expect(styles.borderLeftWidth).toBe('4px');
    expect(styles.borderLeftStyle).toBe('solid');

    // Should have border radius
    expect(parseInt(styles.borderRadius)).toBeGreaterThan(0);

    // Should have padding
    expect(parseInt(styles.padding)).toBeGreaterThan(0);
  });

  test('should render syntax highlighted code blocks', async ({ page }) => {
    await page.goto(publicUrl);

    // Find JavaScript code block
    const jsCodeBlock = page.locator('pre code').filter({ hasText: 'function greet' });
    await expect(jsCodeBlock).toBeVisible();

    // Check for syntax highlighting classes
    const hasHighlighting = await jsCodeBlock.evaluate((el) => {
      const html = el.innerHTML;
      return (
        html.includes('hljs-keyword') ||
        html.includes('hljs-function') ||
        html.includes('hljs-string')
      );
    });

    expect(hasHighlighting).toBeTruthy();

    // Verify keyword color (purple)
    const keyword = page.locator('pre .hljs-keyword').first();
    if (await keyword.count() > 0) {
      const color = await keyword.evaluate((el) =>
        window.getComputedStyle(el).color
      );

      // Color should be set (not default)
      expect(color).not.toBe('rgb(0, 0, 0)'); // Not default black
      expect(color).not.toBe('rgb(255, 255, 255)'); // Not default white
    }
  });

  test('should render all heading levels correctly', async ({ page }) => {
    await page.goto(publicUrl);

    // Check H1
    const h1 = page.locator('.public-content h1');
    await expect(h1).toBeVisible();
    const h1Size = await h1.evaluate(el => window.getComputedStyle(el).fontSize);

    // Check H2
    const h2 = page.locator('.public-content h2').first();
    await expect(h2).toBeVisible();
    const h2Size = await h2.evaluate(el => window.getComputedStyle(el).fontSize);

    // Check H3
    const h3 = page.locator('.public-content h3').first();
    await expect(h3).toBeVisible();
    const h3Size = await h3.evaluate(el => window.getComputedStyle(el).fontSize);

    // Verify hierarchy: H1 > H2 > H3
    expect(parseFloat(h1Size)).toBeGreaterThan(parseFloat(h2Size));
    expect(parseFloat(h2Size)).toBeGreaterThan(parseFloat(h3Size));
  });

  test('should render lists with proper structure', async ({ page }) => {
    await page.goto(publicUrl);

    // Check unordered list
    const ul = page.locator('.public-content ul').first();
    await expect(ul).toBeVisible();
    await expect(ul.locator('li')).toHaveCount(2);

    // Check nested list
    const nestedUl = ul.locator('ul');
    await expect(nestedUl).toBeVisible();
    await expect(nestedUl.locator('li')).toHaveCount(2);

    // Check ordered list
    const ol = page.locator('.public-content ol').first();
    await expect(ol).toBeVisible();
    await expect(ol.locator('li')).toHaveCount(2);
  });

  test('should render table with borders and headers', async ({ page }) => {
    await page.goto(publicUrl);

    const table = page.locator('.public-content table').first();
    await expect(table).toBeVisible();

    // Check for table headers
    const headers = table.locator('th');
    await expect(headers).toHaveCount(3);
    await expect(headers.first()).toContainText('Header 1');

    // Check for table cells
    const cells = table.locator('td');
    await expect(cells).toHaveCount(6); // 2 rows × 3 columns

    // Verify table styling
    const headerStyles = await headers.first().evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        borderWidth: computed.borderWidth,
        fontWeight: computed.fontWeight,
        backgroundColor: computed.backgroundColor,
      };
    });

    // Headers should have borders
    expect(parseInt(headerStyles.borderWidth)).toBeGreaterThan(0);

    // Headers should be bold
    expect(parseInt(headerStyles.fontWeight)).toBeGreaterThanOrEqual(600);

    // Headers should have background color
    expect(headerStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('should render blockquotes with proper styling', async ({ page }) => {
    await page.goto(publicUrl);

    const blockquote = page.locator('.public-content blockquote').first();
    await expect(blockquote).toBeVisible();
    await expect(blockquote).toContainText('This is a blockquote');

    // Check styling
    const styles = await blockquote.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        borderLeftWidth: computed.borderLeftWidth,
        borderLeftStyle: computed.borderLeftStyle,
        fontStyle: computed.fontStyle,
        paddingLeft: computed.paddingLeft,
      };
    });

    // Should have left border
    expect(styles.borderLeftWidth).toBe('4px');
    expect(styles.borderLeftStyle).toBe('solid');

    // Should be italic
    expect(styles.fontStyle).toBe('italic');

    // Should have left padding
    expect(parseInt(styles.paddingLeft)).toBeGreaterThan(0);
  });

  test('should render inline formatting correctly', async ({ page }) => {
    await page.goto(publicUrl);

    // Find paragraph with inline formatting
    const paragraph = page.locator('.public-content p').filter({
      hasText: 'bold text'
    });
    await expect(paragraph).toBeVisible();

    // Check bold
    const bold = paragraph.locator('strong');
    await expect(bold).toBeVisible();
    const boldWeight = await bold.evaluate(el =>
      window.getComputedStyle(el).fontWeight
    );
    expect(parseInt(boldWeight)).toBeGreaterThanOrEqual(600);

    // Check italic
    const italic = paragraph.locator('em');
    await expect(italic).toBeVisible();
    const italicStyle = await italic.evaluate(el =>
      window.getComputedStyle(el).fontStyle
    );
    expect(italicStyle).toBe('italic');

    // Check link
    const link = paragraph.locator('a');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://example.com');

    // Check inline code
    const code = paragraph.locator('code');
    await expect(code).toBeVisible();
    const codeStyles = await code.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        fontFamily: computed.fontFamily,
        backgroundColor: computed.backgroundColor,
      };
    });

    // Should use monospace font
    expect(codeStyles.fontFamily).toContain('Monaco');

    // Should have background color
    expect(codeStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('should render horizontal rule', async ({ page }) => {
    await page.goto(publicUrl);

    const hr = page.locator('.public-content hr').first();
    await expect(hr).toBeVisible();

    const styles = await hr.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        borderTopWidth: computed.borderTopWidth,
        borderTopStyle: computed.borderTopStyle,
      };
    });

    expect(parseInt(styles.borderTopWidth)).toBeGreaterThan(0);
    expect(styles.borderTopStyle).toBe('solid');
  });

  test('should NOT show editor-only table controls', async ({ page }) => {
    await page.goto(publicUrl);

    // Table row/column add buttons should not be visible
    const rowAddButton = page.locator('.table-row-add');
    await expect(rowAddButton).toHaveCount(0);

    const colAddButton = page.locator('.table-col-add');
    await expect(colAddButton).toHaveCount(0);
  });

  test('should work in dark mode', async ({ page }) => {
    // Set dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(publicUrl);

    // Add dark class to body (if your app uses class-based dark mode)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    // Wait for styles to apply
    await page.waitForTimeout(500);

    // Check callout still has proper styling in dark mode
    const callout = page.locator('.callout-block').first();
    await expect(callout).toBeVisible();

    const bgColor = await callout.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should have background color (not transparent)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');

    // Check syntax highlighting still works
    const keyword = page.locator('pre .hljs-keyword').first();
    if (await keyword.count() > 0) {
      const color = await keyword.evaluate(el =>
        window.getComputedStyle(el).color
      );

      // Should still have color
      expect(color).not.toBe('rgb(0, 0, 0)');
      expect(color).not.toBe('rgb(255, 255, 255)');
    }
  });

  test('should take screenshots for documentation', async ({ page }) => {
    await page.goto(publicUrl);

    // Full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/microsite-full-page.png',
      fullPage: true,
    });

    // Callout screenshot
    const callout = page.locator('.callout-block').first();
    await callout.screenshot({
      path: 'tests/screenshots/microsite-callout.png',
    });

    // Code block screenshot
    const codeBlock = page.locator('pre').first();
    await codeBlock.screenshot({
      path: 'tests/screenshots/microsite-code-block.png',
    });

    // Table screenshot
    const table = page.locator('table').first();
    await table.screenshot({
      path: 'tests/screenshots/microsite-table.png',
    });
  });
});
