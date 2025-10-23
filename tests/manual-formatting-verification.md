# Manual Formatting Verification Guide

## Purpose
This guide helps you manually verify that all formatting elements render correctly on published microsite pages.

## Prerequisites
1. Start the development server: `pnpm run dev`
2. Have a test vault with at least one note

## Test Steps

### 1. Create Test Note

Create a new note with the following content:

#### Headers
```
# H1: Main Title
## H2: Secondary Title
### H3: Tertiary Title
```

#### Paragraph with Inline Formatting
```
This is a paragraph with **bold text**, *italic text*, and [a link](https://example.com). It also has `inline code`.
```

#### Callout Block
Use the slash command `/callout` and add:
```
This is a callout block. It should have a light blue background with a blue left border.
```

#### Lists
```
- Unordered list item 1
- Unordered list item 2
  - Nested item 1
  - Nested item 2

1. Ordered list item 1
2. Ordered list item 2
```

#### Code Blocks

JavaScript:
```javascript
function greet(name) {
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}

greet('World');
```

Python:
```python
def fibonacci(n):
    """Generate Fibonacci sequence"""
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

list(fibonacci(10))
```

#### Blockquote
```
> This is a blockquote. It should have a left border and italic text.
```

#### Table
Use the slash command `/table` and create:

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Row 1, Cell 1 | Row 1, Cell 2 | Row 1, Cell 3 |
| Row 2, Cell 1 | Row 2, Cell 2 | Row 2, Cell 3 |

#### Horizontal Rule
```
---
```

### 2. Publish the Note

1. Click the "Publish" button in the editor
2. Enable "Make this page public"
3. Copy the public URL

### 3. Verify Formatting in Public View

Open the public URL in a **new incognito/private window** and verify:

#### ✅ Callout Blocks
- [ ] Has light blue background (#EBF5FF)
- [ ] Has blue left border (4px solid #3B82F6)
- [ ] Has rounded corners
- [ ] Has proper padding
- [ ] Text is readable

#### ✅ Syntax Highlighting
- [ ] JavaScript keywords are purple (#C678DD) - e.g., `function`, `const`
- [ ] Strings are green (#98C379) - e.g., `'Hello, ${name}!'`
- [ ] Numbers are orange (#D19A66)
- [ ] Comments are gray (#5C6370) and italic
- [ ] Function names are blue (#61AFEF)

#### ✅ Headers
- [ ] H1 is largest (2.5rem)
- [ ] H2 is second largest (2rem)
- [ ] H3 is third largest (1.5rem)
- [ ] All headers are bold
- [ ] Proper hierarchy visible

#### ✅ Lists
- [ ] Unordered lists have bullet points
- [ ] Ordered lists have numbers
- [ ] Nested lists are indented
- [ ] Proper spacing between items

#### ✅ Table
- [ ] Has visible borders
- [ ] Header row has background color
- [ ] Headers are bold
- [ ] Cells are properly aligned
- [ ] **NO table row/column add buttons visible** (editor-only feature)

#### ✅ Blockquote
- [ ] Has left border (4px)
- [ ] Text is italic
- [ ] Text is gray/muted color
- [ ] Has left padding

#### ✅ Inline Formatting
- [ ] Bold text is bold (font-weight ≥600)
- [ ] Italic text is italic
- [ ] Links are blue and underlined
- [ ] Inline code has background color
- [ ] Inline code uses monospace font

#### ✅ Images & Horizontal Rules
- [ ] Horizontal rule is visible (1px line)
- [ ] Proper margin above and below

### 4. Test Dark Mode

1. Open browser DevTools (F12)
2. Run: `document.documentElement.classList.add('dark')`
3. Or use browser's dark mode preference

Verify:
- [ ] Callout has dark background (#374151)
- [ ] Callout border is still visible
- [ ] Syntax highlighting colors are still visible
- [ ] All text is readable (light color on dark background)
- [ ] No black text on black background

### 5. Test Responsiveness

Resize browser window to mobile size (< 768px):
- [ ] Content is still readable
- [ ] Tables scroll horizontally if needed
- [ ] Images scale down properly
- [ ] No horizontal overflow

## Expected Results Summary

### ✅ What Should Work
- All headers render with proper hierarchy
- Lists (ordered, unordered, nested) display correctly
- Tables have borders and proper structure
- Blockquotes have left border and italic text
- Bold, italic, links work
- Inline code has background and monospace font
- Horizontal rules are visible
- Images display and scale properly

### ✅ What Was Fixed
- **Callouts** now have background color and border
- **Syntax highlighting** now shows colored keywords, strings, etc.

### ❌ What Should NOT Appear
- Table row/column add buttons (editor-only)
- Any other editor controls

## Screenshots

Take screenshots of:
1. Full page view
2. Callout block (before/after CSS fix)
3. Code block with syntax highlighting (before/after)
4. Table with proper styling
5. Dark mode view

Save screenshots to: `tests/screenshots/`

## Troubleshooting

### Callout has no background
- Check browser console for CSS errors
- Verify `globals.css` has `.public-content .callout-block` styles
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)

### Syntax highlighting not working
- Check browser console for errors
- Verify code block is using `CodeBlockLowlight` extension
- Check that language is specified (e.g., `javascript`, `python`)
- Verify `globals.css` has `.public-content pre .hljs-*` styles

### Styles work in editor but not public page
- Verify HTML uses `.public-content` class wrapper
- Check that `generateHTML()` includes all extensions (Callout, CodeBlockLowlight, etc.)
- Clear browser cache

## Automated Testing

To run the full Playwright test suite:

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run tests
pnpm exec playwright test tests/e2e/microsite-formatting.spec.ts

# Run tests with UI
pnpm exec playwright test --ui

# View test report
pnpm exec playwright show-report
```

**Note:** Automated tests require authentication setup. Manual testing is sufficient for verification.
