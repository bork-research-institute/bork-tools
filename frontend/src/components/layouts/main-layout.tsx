import type { PropsWithChildren } from 'react';
import { Header } from '../header/header';

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
