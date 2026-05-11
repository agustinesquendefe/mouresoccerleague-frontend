import '../global.css';
import AdminMuiProvider from '@/app/(admin)/AdminMuiProvider';
import RefereeLayoutClient from './RefereeLayoutClient';

export default function RefereeRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminMuiProvider>
      <RefereeLayoutClient>
        {children}
      </RefereeLayoutClient>
    </AdminMuiProvider>
  );
}
