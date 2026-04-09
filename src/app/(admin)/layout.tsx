import '../global.css';
import AdminMuiProvider from './AdminMuiProvider';
import AdminLayoutClient from './AdminLayoutClient';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminMuiProvider>
      <AdminLayoutClient>
        {children}
      </AdminLayoutClient>
    </AdminMuiProvider>
  );
}
