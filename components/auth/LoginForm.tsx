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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Successful login - redirect to main app
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
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      {/* Signup Link */}
      <div className="text-center text-sm text-[var(--muted)]">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded"
        >
          Sign up
        </Link>
      </div>
    </form>
  );
}
