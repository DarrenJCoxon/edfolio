const fs = require('fs');
const path = require('path');

// Function to fix API test assertions
function fixApiTestAssertions(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Only process API test files
  if (!filePath.includes('/api/')) {
    return false;
  }

  // Add import for expectApiResponse if not present
  if (content.includes('expect(data.data).toEqual(mock') &&
      !content.includes('expectApiResponse')) {

    // Add import after other test imports
    if (content.includes("from '@/__tests__/utils/test-data'")) {
      content = content.replace(
        "from '@/__tests__/utils/test-data';",
        `from '@/__tests__/utils/test-data';
import { expectApiResponse } from '@/__tests__/utils/test-helpers';`
      );
      modified = true;
    } else if (content.includes("from '@/__tests__/utils/prisma-mock'")) {
      content = content.replace(
        "from '@/__tests__/utils/prisma-mock';",
        `from '@/__tests__/utils/prisma-mock';
import { expectApiResponse } from '@/__tests__/utils/test-helpers';`
      );
      modified = true;
    }
  }

  // Replace expect(data.data).toEqual(mockXXX) with expectApiResponse
  const expectPattern = /expect\(data\.data\)\.toEqual\((mock[A-Za-z]+)\)/g;
  if (expectPattern.test(content)) {
    content = content.replace(expectPattern, 'expectApiResponse(data.data, $1)');
    modified = true;
  }

  // Also fix expect(data).toEqual(mockXXX) patterns
  const expectPattern2 = /expect\(data\)\.toEqual\((mock[A-Za-z]+)\)/g;
  if (expectPattern2.test(content)) {
    content = content.replace(expectPattern2, 'expectApiResponse(data, $1)');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed API test assertions in ${filePath}`);
  }

  return modified;
}

// Find all test files
function findTestFiles(dir) {
  const files = [];

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);

    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
        traverse(fullPath);
      } else if (stat.isFile() && item.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    });
  }

  traverse(dir);
  return files;
}

// Run the fix
const testFiles = findTestFiles(process.cwd());
let fixedCount = 0;

console.log(`Found ${testFiles.length} test files`);

testFiles.forEach(file => {
  if (fixApiTestAssertions(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed API test assertions in ${fixedCount} files`);