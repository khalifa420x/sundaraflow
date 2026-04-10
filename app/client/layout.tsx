import AuthGuard from '@/components/auth/AuthGuard';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRole="client">{children}</AuthGuard>;
}
