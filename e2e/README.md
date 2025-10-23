# E2E Testing with Playwright

## Overview

This directory contains end-to-end tests for EdFolio, focusing on tab navigation performance and user experience.

## Prerequisites

```bash
# Install dependencies (if not already done)
pnpm install

# Install Playwright browsers (required first time)
pnpm run playwright:install
```

## Running Tests

### All Tests
```bash
# Run all e2e tests in headless mode
pnpm run test:e2e
```

### Interactive Mode
```bash
# Run tests with Playwright UI (recommended for development)
pnpm run test:e2e:ui
```

### Headed Mode
```bash
# Run tests with browser visible
pnpm run test:e2e:headed
```

### Debug Mode
```bash
# Run tests with debugging tools
pnpm run test:e2e:debug
```

### Specific Tests
```bash
# Run specific test file
pnpm exec playwright test e2e/tab-navigation.spec.ts

# Run specific test by name
pnpm exec playwright test -g "should not make duplicate API calls"

# Run tests in a specific browser
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit
```

## Test Organization

### `/e2e/tab-navigation.spec.ts`
Comprehensive test suite for tab navigation optimization:

**Performance Tests:**
- No page reloads during tab switches
- No duplicate API calls for cached notes
- Near-instant tab switching (<50ms average)
- Content preservation across switches
- Loading indicators only on first load
- Rapid switching without errors
- Scroll position management
- Edit caching validation

**Accessibility Tests:**
- Keyboard navigation support
- ARIA attribute management

## Test Requirements

Tests require a running development server. The Playwright config automatically starts the dev server if not already running:

```bash
# Manual server start (optional)
pnpm run dev

# Then run tests in another terminal
pnpm run test:e2e
```

## Test User Setup

Tests expect a test user to exist in the database:

```typescript
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};
```

**Setup:**
1. Run the application locally
2. Create a test user via signup
3. Create at least 2-3 test notes for comprehensive testing

## Viewing Test Reports

After running tests, view the HTML report:

```bash
# Generate and open HTML report
pnpm exec playwright show-report
```

## Debugging Failed Tests

1. **Screenshots:** Automatically captured on failure in `test-results/`
2. **Traces:** Enable with `--trace on` flag
3. **Video:** Add `video: 'on'` to playwright.config.ts
4. **Debug Mode:** Use `pnpm run test:e2e:debug` for step-through

## CI/CD Integration

Tests are configured for CI environments:

```yaml
# Example GitHub Actions
- name: Install dependencies
  run: pnpm install

- name: Install Playwright browsers
  run: pnpm run playwright:install --with-deps

- name: Run e2e tests
  run: pnpm run test:e2e
```

## Performance Benchmarks

Expected performance metrics:

- **First tab load:** 200-500ms (API required)
- **Cached tab load:** <10ms (target: <50ms)
- **Average tab switch:** <50ms
- **API calls per note:** 1 per session
- **Page reloads:** 0

## Troubleshooting

### Tests Failing Locally

1. Ensure dev server is running: `pnpm run dev`
2. Verify test user exists in database
3. Clear cache: `rm -rf test-results/`
4. Reinstall browsers: `pnpm run playwright:install`

### Timeouts

Increase timeout in test if needed:

```typescript
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

### Browser Not Found

```bash
# Reinstall Playwright browsers
pnpm run playwright:install --with-deps
```

## Documentation

For detailed implementation and performance analysis, see:
- `/docs/TAB-NAVIGATION-OPTIMIZATION-REPORT.md`
- [Playwright Documentation](https://playwright.dev)
