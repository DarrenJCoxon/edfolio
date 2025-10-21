const fs = require('fs');
const path = require('path');

// Valid CUID-like IDs that match Zod validation
const replacements = [
  // User IDs
  ['user-123', 'clh0e8r5k0000jw0c8y5d6usr1'],
  ['user-1', 'clh0e8r5k0000jw0c8y5d6usr1'],
  ['user-2', 'clh0e8r5k0000jw0c8y5d6usr2'],

  // Folio IDs
  ['folio-1', 'clh0e8r5k0000jw0c8y5d6fol1'],
  ['folio-2', 'clh0e8r5k0000jw0c8y5d6fol2'],
  ['\'1\'', '\'clh0e8r5k0000jw0c8y5d6fol1\''],
  ['\'2\'', '\'clh0e8r5k0000jw0c8y5d6fol2\''],

  // Folder IDs
  ['folder-1', 'clh0e8r5k0000jw0c8y5d6fld1'],
  ['folder-2', 'clh0e8r5k0000jw0c8y5d6fld2'],
  ['folder1', 'clh0e8r5k0000jw0c8y5d6fld1'],
  ['folder2', 'clh0e8r5k0000jw0c8y5d6fld2'],
  ['parent', 'clh0e8r5k0000jw0c8y5parent'],
  ['child', 'clh0e8r5k0000jw0c8y5dchild'],

  // Note IDs
  ['note-1', 'clh0e8r5k0000jw0c8y5d6not1'],
  ['note-2', 'clh0e8r5k0000jw0c8y5d6not2'],
  ['note-123', 'clh0e8r5k0000jw0c8y5d6not1'],
  ['note1', 'clh0e8r5k0000jw0c8y5d6not1'],
  ['note2', 'clh0e8r5k0000jw0c8y5d6not2'],
  ['n1', 'clh0e8r5k0000jw0c8y5d6not1'],
  ['n2', 'clh0e8r5k0000jw0c8y5d6not2'],

  // Other IDs
  ['\'f1\'', '\'clh0e8r5k0000jw0c8y5d6fol1\''],
  ['user1', 'clh0e8r5k0000jw0c8y5d6usr1'],
  ['ownerId: \'user1\'', 'ownerId: \'clh0e8r5k0000jw0c8y5d6usr1\''],
];

const testFiles = [
  'app/api/notes/[id]/route.test.ts',
  'app/api/folios/route.test.ts',
  'app/api/folios/[id]/route.test.ts',
  'app/api/folders/route.test.ts',
  'app/api/folders/[id]/route.test.ts',
  'app/api/auth/signup/route.test.ts',
  'app/api/user/preferences/route.test.ts',
  'lib/stores/folios-store.test.ts',
  'components/navigation/NoteItem.test.tsx',
];

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  replacements.forEach(([oldId, newId]) => {
    const regex = new RegExp(`\\b${oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const before = content.length;
    content = content.replace(regex, newId);
    if (content.length !== before) {
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${file}`);
  } else {
    console.log(`No changes needed: ${file}`);
  }
});

console.log('Done!');