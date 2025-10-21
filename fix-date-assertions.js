const fs = require('fs');
const path = require('path');

// Function to fix Date object comparisons in test files
function fixDateAssertions(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: Fix toEqual comparisons with mock objects containing dates
  // When comparing the full mock objects, the dates should be strings
  const dateComparisonPattern = /expect\(data\.data\)\.toEqual\(mock[A-Za-z]+\)/g;
  if (dateComparisonPattern.test(content)) {
    console.log(`Fixing date comparisons in ${filePath}`);

    // Replace createdAt: new Date() with ISO string in mock data that will be compared
    content = content.replace(
      /const mock([A-Za-z]+) = ((?:\[[\s\S]*?\]|\{[\s\S]*?\}))/g,
      (match, varName, obj) => {
        if (obj.includes('createdAt: new Date()') || obj.includes('updatedAt: new Date()')) {
          const fixedObj = obj
            .replace(/createdAt: new Date\(\)/g, 'createdAt: new Date().toISOString()')
            .replace(/updatedAt: new Date\(\)/g, 'updatedAt: new Date().toISOString()');
          modified = true;
          return `const mock${varName} = ${fixedObj}`;
        }
        return match;
      }
    );
  }

  // Pattern 2: For mock data used in API responses, convert dates to ISO strings
  const apiTestPattern = /expect\(response\.status\)\.toBe\(20[01]\)/g;
  if (apiTestPattern.test(content)) {
    // For test data that will be returned in API responses
    content = content.replace(
      /(const mock[A-Za-z]+\s*=\s*(?:\[[\s\S]*?\]|\{[\s\S]*?\}))/g,
      (match) => {
        if (match.includes('expect(data.data)')) {
          return match
            .replace(/createdAt: new Date\(\)/g, 'createdAt: new Date().toISOString()')
            .replace(/updatedAt: new Date\(\)/g, 'updatedAt: new Date().toISOString()');
        }
        return match;
      }
    );
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed date assertions in ${filePath}`);
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
  if (fixDateAssertions(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed date assertions in ${fixedCount} files`);