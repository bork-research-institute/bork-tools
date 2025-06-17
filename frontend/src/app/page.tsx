import { MainLayout } from '@/components/layouts/main-layout';
import { Dashboard } from '@/components/pages/dashboard';
import { auth } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
}
