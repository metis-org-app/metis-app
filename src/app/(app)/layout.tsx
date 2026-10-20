import { Suspense, type ReactNode } from 'react';
import { AppShell, UserMenu } from '@/components/shell';
import { requireUser } from '@/features/auth/server';

async function Account() {
  const user = await requireUser();
  return <UserMenu name={user.name} email={user.email} />;
}

function AccountPlaceholder() {
  return (
    <div aria-hidden className="flex items-center gap-3 px-2 py-2">
      <span className="size-9 rounded-full bg-paper/10" />
      <span className="grid flex-1 gap-1.5">
        <span className="h-3 w-24 rounded bg-paper/10" />
        <span className="h-2.5 w-32 rounded bg-paper/10" />
      </span>
    </div>
  );
}

// Every page under (app) also calls requireUser(); this layout only renders the account menu,
// streamed so it never delays the page content.
export default function SignedInLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      account={
        <Suspense fallback={<AccountPlaceholder />}>
          <Account />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
