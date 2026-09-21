import { redirect } from 'next/navigation';

export default function TenantLoginPage({
  searchParams,
}: {
  searchParams: { return_to?: string };
}) {
  const returnTo = searchParams.return_to;
  const target = returnTo ? `/login?return_to=${encodeURIComponent(returnTo)}` : '/login';
  redirect(target);
}
