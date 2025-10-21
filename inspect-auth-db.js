// Temporary script to inspect auth-related database tables
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL
    }
  }
});

async function inspectAuthTables() {
  try {
    console.log('🔍 Inspecting Authentication Database Tables\n');
    console.log('Using DATABASE URL:', process.env.DATABASE_PUBLIC_URL ? 'Railway (Production)' : 'Local');
    console.log('---\n');

    // Check User table
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            type: true,
            provider: true,
          }
        }
      },
      take: 5
    });
    console.log(`👤 Users: ${userCount} total`);
    console.log('Recent users:', JSON.stringify(users, null, 2));
    console.log('---\n');

    // Check Session table
    const sessionCount = await prisma.session.count();
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        sessionToken: true,
        userId: true,
        expires: true,
      },
      take: 5,
      orderBy: {
        expires: 'desc'
      }
    });
    console.log(`🔑 Sessions: ${sessionCount} total`);
    console.log('Recent sessions:', JSON.stringify(sessions, null, 2));
    console.log('---\n');

    // Check Account table
    const accountCount = await prisma.account.count();
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        type: true,
        provider: true,
        userId: true,
      },
      take: 5
    });
    console.log(`🔐 Accounts: ${accountCount} total`);
    console.log('Recent accounts:', JSON.stringify(accounts, null, 2));
    console.log('---\n');

    // Check VerificationToken table
    const tokenCount = await prisma.verificationToken.count();
    console.log(`🎫 Verification Tokens: ${tokenCount} total`);
    console.log('---\n');

    // Check database connection info
    const result = await prisma.$queryRaw`SELECT version(), current_database(), current_user`;
    console.log('📊 Database Info:', result);

  } catch (error) {
    console.error('❌ Error inspecting database:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

inspectAuthTables();
