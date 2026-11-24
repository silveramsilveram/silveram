import { Outlet } from 'react-router';
import { loadIdentity } from '@/providers/authProvider';
import { useApiQuery } from '@/services/useApiQuery';
import { AppShell } from '@/ui/AppShell';

export function AdminLayout() {
  const me = useApiQuery(['me'], () => loadIdentity(), { staleTime: 60_000 });
  return (
    <AppShell me={me.data}>
      <Outlet />
    </AppShell>
  );
}
