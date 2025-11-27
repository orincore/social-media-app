/**
 * Auth layout for admin login page
 * No sidebar, no session check - just renders children directly
 */
export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
