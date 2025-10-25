'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { AuthResponse } from '@/types/auth';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';

const signupSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError('');

    try {
      // Call signup API
      const response = await fetchWithCsrf('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result: AuthResponse = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Auto-login after successful signup
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Account created but login failed. Please try logging in.');
        setIsLoading(false);
        return;
      }

      // Successful signup and login - redirect to main app
      router.push('/');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-[var(--spacing-lg)]">
      {/* Email Field */}
      <div className="space-y-[var(--spacing-sm)]">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@example.com"
          {...register('email')}
          className={cn(
            errors.email && 'border-[var(--destructive-border)] focus-visible:ring-[var(--destructive-border)]'
          )}
        />
        {errors.email && (
          <p className="text-sm text-[var(--destructive-foreground)]">{errors.email.message}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-[var(--spacing-sm)]">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          className={cn(
            errors.password && 'border-[var(--destructive-border)] focus-visible:ring-[var(--destructive-border)]'
          )}
        />
        {errors.password && (
          <p className="text-sm text-[var(--destructive-foreground)]">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-[var(--spacing-sm)]">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
          className={cn(
            errors.confirmPassword && 'border-[var(--destructive-border)] focus-visible:ring-[var(--destructive-border)]'
          )}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-[var(--destructive-foreground)]">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-[var(--spacing-sm)] bg-[var(--destructive-bg)] border border-[var(--destructive-border)] rounded">
          <p className="text-sm text-[var(--destructive-foreground)]">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </Button>

      {/* Login Link */}
      <div className="text-center text-sm text-[var(--muted)]">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded"
        >
          Log in
        </Link>
      </div>
    </form>
  );
}
