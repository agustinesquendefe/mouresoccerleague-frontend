import React, { useEffect, useState } from "react";
import Menuitems from "./MenuItems";
import { Box, Typography } from "@mui/material";
import {
  Logo,
  Sidebar as MUI_Sidebar,
  Menu,
  MenuItem,
  Submenu,
} from "react-mui-sidebar";
import { IconPoint } from '@tabler/icons-react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Upgrade } from "./Updrade";
import Profile from "../header/Profile";
import { getAppSettings } from '@/services/settings/settings.service';
import { supabase } from "@/lib/supabaseClient";
import { width } from "@mui/system";


const renderMenuItems = (items: any, pathDirect: any) => {

  return items.map((item: any) => {

    const Icon = item.icon ? item.icon : IconPoint;

    const itemIcon = <Icon stroke={1.5} size="1.3rem" />;

    if (item.subheader) {
      // Display Subheader
      return (
        <Menu
          subHeading={item.subheader}
          key={item.subheader}
        />
      );
    }

    //If the item has children (submenu)
    if (item.children) {
      return (
        <Submenu
          key={item.id}
          title={item.title}
          icon={itemIcon}
          borderRadius='7px'
        >
          {renderMenuItems(item.children, pathDirect)}
        </Submenu>
      );
    }

    // If the item has no children, render a MenuItem

    return (
      <Box px={3} key={item.id}>
        <MenuItem
          key={item.id}
          isSelected={pathDirect === item?.href}
          borderRadius='8px'
          icon={itemIcon}
          link={item.href}
          component={Link}
        >
          {item.title}
        </MenuItem >
      </Box>

    );
  });
};


const SidebarItems = () => {
  const pathname = usePathname();
  const pathDirect = pathname;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getAppSettings().then((settings) => {
      const raw = settings?.logo_url || '/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg';
      // Ensure the URL is absolute (starts with / or http) to avoid relative path issues
      const normalized = raw.startsWith('/') || raw.startsWith('http') ? raw : `/${raw}`;
      setLogoUrl(normalized);
      setLeagueName(settings?.league_name || null);
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
  }, []);

  

  return (
    <>
      <MUI_Sidebar width={"100%"} showProfile={false} themeColor={"#5D87FF"} themeSecondaryColor={'#49beff'}>
        <Logo img={logoUrl} component={Link} to="/" style={{ width: 20, height: 40 }}>
          {leagueName || 'Modernize'}
        </Logo>
        {renderMenuItems(Menuitems, pathDirect)}
        <Profile user={user} />
      </MUI_Sidebar>
    </>
  );
};
export default SidebarItems;
