import { AppShell } from "@/components/AppShell";
import { getImpersonator, requireUser } from "@/lib/auth";

export default async function CalendarLayout({ children }: { children: React.ReactNode }) {
  const [user, impersonator] = await Promise.all([requireUser(), getImpersonator()]);
  return (
    <AppShell user={user} impersonator={impersonator}>
      {children}
    </AppShell>
  );
}
