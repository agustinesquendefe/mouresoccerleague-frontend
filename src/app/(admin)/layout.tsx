
"use client";
import { useState } from "react";
import { baselightTheme } from "@/utils/theme/DefaultColors";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import '../global.css';
import Sidebar from "./layout/sidebar/Sidebar";
import Header from "./layout/header/Header";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleMobileSidebarOpen = (event: React.MouseEvent<HTMLElement>) => setMobileSidebarOpen(true);
  const handleMobileSidebarClose = (event: React.MouseEvent<HTMLElement>) => setMobileSidebarOpen(false);

  return (
    <ThemeProvider theme={baselightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        {/* Sidebar */}
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onSidebarClose={handleMobileSidebarClose}
        />
        {/* Main content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Header */}
          <Header toggleMobileSidebar={handleMobileSidebarOpen} />
          {/* Page content */}
          <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
            {children}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
