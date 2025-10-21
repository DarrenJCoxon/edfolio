import { Metadata } from 'next';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Sign Up | Edfolio',
  description: 'Create your Edfolio account',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-[var(--spacing-md)]">
      <div className="w-full max-w-md space-y-[var(--spacing-lg)]">
        <div className="text-center space-y-[var(--spacing-sm)]">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Create an account
          </h1>
          <p className="text-[var(--muted)]">
            Start your journey with Edfolio
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
