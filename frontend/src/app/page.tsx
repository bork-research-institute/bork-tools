import { MainLayout } from '@/components/layouts/main-layout';
import { Dashboard } from '@/components/pages/dashboard';

export default async function Page() {
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
}
