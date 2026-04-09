'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Sidebar from './layout/sidebar/Sidebar';
import Header from './layout/header/Header';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleMobileSidebarOpen = () => setMobileSidebarOpen(true);
  const handleMobileSidebarClose = () => setMobileSidebarOpen(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onSidebarClose={handleMobileSidebarClose}
      />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header toggleMobileSidebar={handleMobileSidebarOpen} />
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
