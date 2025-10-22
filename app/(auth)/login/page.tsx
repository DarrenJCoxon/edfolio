import { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Login | Edfolio',
  description: 'Sign in to your Edfolio account',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-[var(--spacing-md)]">
      <div className="w-full max-w-md space-y-[var(--spacing-lg)]">
        <div className="text-center space-y-[var(--spacing-sm)]">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Welcome back
          </h1>
          <p className="text-[var(--muted)]">
            Sign in to your Edfolio account
          </p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
