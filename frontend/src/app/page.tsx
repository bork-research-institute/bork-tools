import { MainLayout } from '@/components/layouts/main-layout';
import { Home } from '@/components/pages/home';
import { auth } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  return (
    <MainLayout>
      <Home />
    </MainLayout>
  );
}
