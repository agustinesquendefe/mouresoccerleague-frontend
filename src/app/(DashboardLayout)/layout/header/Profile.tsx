import React, { useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Box,
  Menu,
  Button,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import { IconListCheck, IconMail, IconUser } from "@tabler/icons-react";

const Profile = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      {/* PROFILE BUTTON (SIDEBAR STYLE) */}
      <Box
        onClick={handleClick}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1,
          mx: 2,
          borderRadius: 2,
          cursor: "pointer",

          // 👇 fondo tipo seleccionado
          bgcolor: "primary.main",
          color: "white",

          "&:hover": {
            bgcolor: "primary.dark",
          },
        }}
      >
        <Avatar
          src="/images/profile/user-1.jpg"
          alt="user"
          sx={{ width: 36, height: 36 }}
        />

        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, lineHeight: 1.2 }}
          >
            John Doe
          </Typography>

          <Typography
            variant="caption"
            sx={{
              opacity: 0.8,
              lineHeight: 1.2,
            }}
          >
            johndoe@gmail.com
          </Typography>
        </Box>
      </Box>

      {/* DROPDOWN */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ horizontal: "right", vertical: "top" }}
        transformOrigin={{ horizontal: "right", vertical: "bottom" }}
        sx={{
          "& .MuiMenu-paper": {
            width: 220,
          },
        }}
      >
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <IconUser width={18} />
          </ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <IconMail width={18} />
          </ListItemIcon>
          <ListItemText>My Account</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <IconListCheck width={18} />
          </ListItemIcon>
          <ListItemText>My Tasks</ListItemText>
        </MenuItem>

        <Box mt={1} px={2} pb={1}>
          <Button
            href="/authentication/login"
            component={Link}
            variant="contained"
            color="primary"
            fullWidth
          >
            Logout
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;