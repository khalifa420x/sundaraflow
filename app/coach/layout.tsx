import AuthGuard from '@/components/auth/AuthGuard';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRole="coach">{children}</AuthGuard>;
}
