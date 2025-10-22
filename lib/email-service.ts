import { readFile } from 'fs/promises';
import { join } from 'path';
import { Resend } from 'resend';
import {
  ShareInvitationEmailData,
  PermissionChangedEmailData,
  AccessRevokedEmailData,
} from '@/types';

/**
 * Email service configuration
 * Uses Resend (EU region: eu-west-1) for GDPR compliance
 */
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@edfolio.app';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Edfolio';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Initialize Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Load and render an email template
 * Simple template engine that replaces {{variable}} with data
 */
async function renderTemplate(
  templateName: string,
  data: Record<string, string | boolean | undefined>
): Promise<string> {
  const templatePath = join(process.cwd(), 'lib', 'email-templates', templateName);
  let template = await readFile(templatePath, 'utf-8');

  // Replace {{variable}} with data values
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(regex, String(value || ''));
  }

  // Handle conditional blocks {{#if variable}}...{{/if}}
  template = template.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
    return data[variable] ? content : '';
  });

  // Handle {{else}} blocks
  template = template.replace(/{{#if\s+(\w+)}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, (match, variable, ifContent, elseContent) => {
    return data[variable] ? ifContent : elseContent;
  });

  return template;
}

/**
 * Send email via console logging (development)
 */
function sendViaConsole(to: string, subject: string, html: string): void {
  console.log('\n=== EMAIL (Development Mode) ===');
  console.log(`To: ${to}`);
  console.log(`From: ${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`);
  console.log(`Subject: ${subject}`);
  console.log('---');
  console.log(html.substring(0, 500) + '...');
  console.log('================================\n');
}

/**
 * Send share invitation email
 */
export async function sendShareInvitation(
  data: ShareInvitationEmailData
): Promise<boolean> {
  try {
    const subject = `${data.fromUserName} shared "${data.pageTitle}" with you`;

    // Prepare template data - pass URL components separately to prevent double-encoding
    const templateData = {
      senderName: data.fromUserName,
      pageTitle: data.pageTitle,
      baseUrl: data.baseUrl,
      slug: data.slug,
      token: data.token,
      permission: data.permission === 'edit' ? 'Can Edit' : 'Can View',
      isEditPermission: (data.permission === 'edit').toString(),
      expiryDate: data.expiryDate
        ? new Date(data.expiryDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : undefined,
      unsubscribeLink: `${data.baseUrl}/unsubscribe`,
    };

    // Render HTML template
    const html = await renderTemplate('share-invitation.html', templateData);

    // Development mode: log to console
    if (process.env.NODE_ENV === 'development' && !resend) {
      sendViaConsole(data.toEmail, subject, html);
      return true;
    }

    // Production: Send via Resend
    if (!resend) {
      console.error('Resend client not initialized. Check RESEND_API_KEY environment variable.');
      return false;
    }

    const response = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      to: [data.toEmail],
      subject,
      html,
    });

    if (response.error) {
      console.error('Resend API error:', response.error);
      return false;
    }

    console.log(`✅ Share invitation email sent to ${data.toEmail} (ID: ${response.data?.id})`);
    return true;
  } catch (error) {
    console.error('Error sending share invitation email:', error);
    return false;
  }
}

/**
 * Send permission changed notification email
 */
export async function sendPermissionChanged(
  data: PermissionChangedEmailData
): Promise<boolean> {
  try {
    const subject = `Your permissions changed for "${data.pageTitle}"`;

    const templateData = {
      pageTitle: data.pageTitle,
      oldPermission: data.oldPermission === 'edit' ? 'Can Edit' : 'Can View',
      newPermission: data.newPermission === 'edit' ? 'Can Edit' : 'Can View',
      isOldPermissionEdit: (data.oldPermission === 'edit').toString(),
      isNewPermissionEdit: (data.newPermission === 'edit').toString(),
      pageLink: `${data.baseUrl}/public/${data.slug}`,
      unsubscribeLink: `${data.baseUrl}/unsubscribe`,
    };

    const html = await renderTemplate('permission-changed.html', templateData);

    // Development mode: log to console
    if (process.env.NODE_ENV === 'development' && !resend) {
      sendViaConsole(data.toEmail, subject, html);
      return true;
    }

    // Production: Send via Resend
    if (!resend) {
      console.error('Resend client not initialized. Check RESEND_API_KEY environment variable.');
      return false;
    }

    const response = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      to: [data.toEmail],
      subject,
      html,
    });

    if (response.error) {
      console.error('Resend API error:', response.error);
      return false;
    }

    console.log(`✅ Permission changed email sent to ${data.toEmail} (ID: ${response.data?.id})`);
    return true;
  } catch (error) {
    console.error('Error sending permission changed email:', error);
    return false;
  }
}

/**
 * Send access revoked notification email
 */
export async function sendAccessRevoked(
  data: AccessRevokedEmailData
): Promise<boolean> {
  try {
    const subject = `Access removed for "${data.pageTitle}"`;

    const templateData = {
      pageTitle: data.pageTitle,
      revokedBy: data.revokedBy,
      unsubscribeLink: `${data.baseUrl}/unsubscribe`,
    };

    const html = await renderTemplate('access-revoked.html', templateData);

    // Development mode: log to console
    if (process.env.NODE_ENV === 'development' && !resend) {
      sendViaConsole(data.toEmail, subject, html);
      return true;
    }

    // Production: Send via Resend
    if (!resend) {
      console.error('Resend client not initialized. Check RESEND_API_KEY environment variable.');
      return false;
    }

    const response = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      to: [data.toEmail],
      subject,
      html,
    });

    if (response.error) {
      console.error('Resend API error:', response.error);
      return false;
    }

    console.log(`✅ Access revoked email sent to ${data.toEmail} (ID: ${response.data?.id})`);
    return true;
  } catch (error) {
    console.error('Error sending access revoked email:', error);
    return false;
  }
}

/**
 * Send expiry notification email
 */
export async function sendExpiryNotification(
  toEmail: string,
  pageTitle: string
): Promise<boolean> {
  try {
    const subject = `Your access to "${pageTitle}" has expired`;
    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <h2>Access Expired</h2>
          <p>Your access to "<strong>${pageTitle}</strong>" has expired.</p>
          <p>If you need continued access, please contact the page owner.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            Powered by <a href="https://edfolio.app">Edfolio</a>
          </p>
        </body>
      </html>
    `;

    // Development mode: log to console
    if (process.env.NODE_ENV === 'development' && !resend) {
      sendViaConsole(toEmail, subject, html);
      return true;
    }

    // Production: Send via Resend
    if (!resend) {
      console.error('Resend client not initialized. Check RESEND_API_KEY environment variable.');
      return false;
    }

    const response = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      to: [toEmail],
      subject,
      html,
    });

    if (response.error) {
      console.error('Resend API error:', response.error);
      return false;
    }

    console.log(`✅ Expiry notification email sent to ${toEmail} (ID: ${response.data?.id})`);
    return true;
  } catch (error) {
    console.error('Error sending expiry notification:', error);
    return false;
  }
}
