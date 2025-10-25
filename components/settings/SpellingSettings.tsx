'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { SpellingPreference } from '@/types';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';

export function SpellingSettings() {
  const [preference, setPreference] = useState<SpellingPreference>('UK');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current preference on mount
  useEffect(() => {
    async function fetchPreference() {
      try {
        const response = await fetch('/api/settings/spelling');
        if (!response.ok) {
          throw new Error('Failed to fetch spelling preference');
        }
        const data = await response.json();
        setPreference(data.data.spellingPreference);
      } catch (error) {
        console.error('Fetch preference error:', error);
        toast.error('Failed to load spelling preference');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreference();
  }, []);

  // Save preference when changed
  const handlePreferenceChange = async (value: SpellingPreference) => {
    setIsSaving(true);
    setPreference(value);

    try {
      const response = await fetchWithCsrf('/api/settings/spelling', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spellingPreference: value })
      });

      if (!response.ok) {
        throw new Error('Failed to update spelling preference');
      }

      toast.success('Spelling preference updated');
    } catch (error) {
      console.error('Update preference error:', error);
      toast.error('Failed to update spelling preference');
      // Revert to previous value on error
      const response = await fetch('/api/settings/spelling');
      const data = await response.json();
      setPreference(data.data.spellingPreference);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-[var(--spacing-sm)] text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading spelling preference...</span>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--spacing-md)]">
      <div>
        <h3 className="text-base font-medium text-[var(--foreground)]">
          Spelling Preference
        </h3>
        <p className="text-sm text-[var(--muted)] mt-[var(--spacing-xs)]">
          Choose your preferred spelling variant for all AI features (rephrase, summarize, and grammar corrections)
        </p>
      </div>

      <RadioGroup
        value={preference}
        onValueChange={(value) => handlePreferenceChange(value as SpellingPreference)}
        disabled={isSaving}
        className="space-y-[var(--spacing-sm)]"
      >
        <div className="flex items-center space-x-[var(--spacing-sm)]">
          <RadioGroupItem value="UK" id="uk-spelling" />
          <Label
            htmlFor="uk-spelling"
            className="text-sm font-normal cursor-pointer"
          >
            UK English (colour, realise, analyse)
          </Label>
        </div>
        <div className="flex items-center space-x-[var(--spacing-sm)]">
          <RadioGroupItem value="US" id="us-spelling" />
          <Label
            htmlFor="us-spelling"
            className="text-sm font-normal cursor-pointer"
          >
            US English (color, realize, analyze)
          </Label>
        </div>
      </RadioGroup>

      {isSaving && (
        <div className="flex items-center gap-[var(--spacing-xs)] text-[var(--muted)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Saving...</span>
        </div>
      )}
    </div>
  );
}
