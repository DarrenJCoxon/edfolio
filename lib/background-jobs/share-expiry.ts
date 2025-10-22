import { prisma } from '@/lib/prisma';
import { sendExpiryNotification } from '@/lib/email-service';

/**
 * Check for expired shares and revoke them
 * Sends notification emails to affected users
 */
export async function expireShares(): Promise<{ expired: number }> {
  try {
    // Find all active shares that have expired
    const expiredShares = await prisma.pageShare.findMany({
      where: {
        status: 'active',
        expiresAt: {
          not: null,
          lt: new Date(),
        },
      },
      include: {
        page: {
          include: {
            note: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (expiredShares.length === 0) {
      console.log('No expired shares found');
      return { expired: 0 };
    }

    console.log(`Found ${expiredShares.length} expired shares`);

    // Update all expired shares to 'revoked' status
    const shareIds = expiredShares.map((share) => share.id);

    await prisma.pageShare.updateMany({
      where: {
        id: {
          in: shareIds,
        },
      },
      data: {
        status: 'revoked',
      },
    });

    // Send notification emails
    const emailPromises = expiredShares.map((share) =>
      sendExpiryNotification(share.invitedEmail, share.page.note.title)
    );

    await Promise.allSettled(emailPromises);

    console.log(`Successfully expired ${expiredShares.length} shares`);

    return { expired: expiredShares.length };
  } catch (error) {
    console.error('Error expiring shares:', error);
    throw error;
  }
}
