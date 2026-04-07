
import { useMediaQuery, Box, Drawer, Avatar, Typography, Divider } from "@mui/material";
import SidebarItems from "./SidebarItems";
import Profile from "../header/Profile";
import { useEffect, useState } from "react";
import { getAppSettings } from '@/services/settings/settings.service';
import { supabase } from '@/lib/supabaseClient';

interface ItemType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
  isSidebarOpen: boolean;
}


const MSidebar = ({
  isMobileSidebarOpen,
  onSidebarClose,
  isSidebarOpen,
}: ItemType) => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up("lg"));
  const sidebarWidth = "270px";
  const scrollbarStyles = {
    '&::-webkit-scrollbar': {
      width: '7px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#eff2f7',
      borderRadius: '15px',
    },
  };

  // State for logo and user
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const SidebarHeader = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
      {logoUrl && (
        <Avatar src={logoUrl} alt="League Logo" sx={{ width: 80, height: 80, mb: 1 }} variant="rounded" />
      )}
      {leagueName && (
        <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
          {leagueName}
        </Typography>
      )}
      <Divider sx={{ width: '100%', my: 1 }} />
    </Box>
  );

  if (lgUp) {
    return (
      <Box sx={{ width: sidebarWidth, flexShrink: 0 }}>
        <Drawer
          anchor="left"
          open={isSidebarOpen}
          variant="permanent"
          slotProps={{
            paper: {
              sx: {
                boxSizing: "border-box",
                ...scrollbarStyles,
                width: sidebarWidth,
              },
            }
          }}
        >
          <Box sx={{ height: "100%" }}>
            <SidebarItems />
          </Box>
        </Drawer>
      </Box>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant="temporary"
      slotProps={{
        paper: {
          sx: {
            boxShadow: (theme) => theme.shadows[8],
            ...scrollbarStyles,
          },
        }
      }}
    >
      {SidebarHeader}
      <Box>
        <SidebarItems />
      </Box>
    </Drawer>
  );
};

export default MSidebar;





