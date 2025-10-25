'use client';

import { useState, useEffect } from 'react';
import { Link2, Mail, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PermissionBadge } from './PermissionBadge';
import { ShareManagementModalProps, PageShare, SharePermission } from '@/types';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export function ShareManagementModal({
  isOpen,
  onClose,
  noteId,
  noteTitle,
  publicSlug,
}: ShareManagementModalProps) {
  const [shares, setShares] = useState<PageShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] =
    useState<SharePermission>('read');
  const [expiryDate, setExpiryDate] = useState<string>('');

  // Fetch existing shares
  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
  }, [isOpen, noteId]);

  const fetchShares = async () => {
    try {
      const response = await fetch(`/api/notes/${noteId}/shares`);
      const result = await response.json();
      setShares(result.data || []);
    } catch (error) {
      console.error('Failed to fetch shares:', error);
    }
  };

  const handleCreateShare = async () => {
    if (!inviteEmail || !validateEmail(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithCsrf(`/api/notes/${noteId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitedEmail: inviteEmail,
          permission: invitePermission,
          expiresAt: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create share');
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInvitePermission('read');
      setExpiryDate('');
      fetchShares();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string, email: string) => {
    if (!confirm(`Revoke ${email}'s access to this page?`)) {
      return;
    }

    try {
      await fetchWithCsrf(`/api/notes/${noteId}/shares/${shareId}`, {
        method: 'DELETE',
      });
      toast.success(`Access revoked for ${email}`);
      fetchShares();
    } catch (error) {
      toast.error('Failed to revoke access');
    }
  };

  const handleChangePermission = async (
    shareId: string,
    newPermission: SharePermission
  ) => {
    try {
      await fetchWithCsrf(`/api/notes/${noteId}/shares/${shareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: newPermission }),
      });
      toast.success('Permission updated');
      fetchShares();
    } catch (error) {
      toast.error('Failed to update permission');
    }
  };

  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/public/${publicSlug}`
      : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share & Collaborate</DialogTitle>
        </DialogHeader>

        {/* Public URL Section */}
        <div className="bg-muted/30 p-4 rounded-md border border-border">
          <Label className="text-xs text-muted">Public URL</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              readOnly
              value={publicUrl}
              className="bg-background text-sm font-mono"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(publicUrl);
                toast.success('Link copied to clipboard');
              }}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Invitation Section */}
        <div className="space-y-4 border-b border-border pb-6">
          <h3 className="text-sm font-medium text-foreground">
            Invite Collaborators
          </h3>

          <div className="space-y-2">
            <Label htmlFor="inviteEmail">Email Address</Label>
            <Input
              id="inviteEmail"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="permission">Permission</Label>
              <Select
                value={invitePermission}
                onValueChange={(v) => setInvitePermission(v as SharePermission)}
              >
                <SelectTrigger id="permission">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <Button onClick={handleCreateShare} disabled={loading} className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>

        {/* Current Shares List */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">
            Current Shares ({shares.length})
          </h3>

          {shares.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <p className="text-sm">No shares yet</p>
              <p className="text-xs mt-1">
                Invite collaborators above to share this page
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {share.invitedEmail}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <PermissionBadge permission={share.permission} size="sm" />
                      {share.lastAccessedAt && (
                        <span className="text-xs text-muted">
                          Last accessed {formatRelativeTime(share.lastAccessedAt)}
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {share.accessCount}{' '}
                        {share.accessCount === 1 ? 'view' : 'views'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={share.permission}
                      onValueChange={(v) =>
                        handleChangePermission(share.id, v as SharePermission)
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Can view</SelectItem>
                        <SelectItem value="edit">Can edit</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeShare(share.id, share.invitedEmail)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
