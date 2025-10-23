/**
 * Migration Script: Add "Shared with Me" System Folio to Existing Users
 *
 * This script creates the "Shared with Me" system folio for all existing users
 * who don't already have one. This is a one-time migration script.
 *
 * Usage: npx tsx scripts/add-shared-folio-to-existing-users.ts
 */

import { PrismaClient } from '@prisma/client';
import { createSystemFoliosForUser } from '../lib/system-folios';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Starting migration: Adding "Shared with Me" folio to existing users...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(`Found ${users.length} users\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of users) {
      try {
        console.log(`Processing user: ${user.email} (${user.id})`);

        // Create system folios for user
        await createSystemFoliosForUser(user.id);

        successCount++;
        console.log(`✅ Success for ${user.email}\n`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          skipCount++;
          console.log(`⏭️  Skipped ${user.email} (folio already exists)\n`);
        } else {
          errorCount++;
          console.error(`❌ Error for ${user.email}:`, error);
          console.log('');
        }
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log('========================================');
    console.log(`Total users: ${users.length}`);
    console.log(`Successfully created: ${successCount}`);
    console.log(`Skipped (already exists): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('========================================\n');

    if (errorCount > 0) {
      console.warn('⚠️  Some users had errors. Please review the logs above.');
      process.exit(1);
    } else {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
