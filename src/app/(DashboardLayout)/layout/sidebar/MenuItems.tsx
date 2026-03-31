import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StadiumIcon from '@mui/icons-material/Stadium';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SettingsAccessibilityIcon from '@mui/icons-material/SettingsAccessibility';
import SportsIcon from '@mui/icons-material/Sports';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';    

import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "HOME",
  },

  {
    id: uniqueId(),
    title: "Dashboard",
    icon: DashboardIcon,
    href: "/",
  },
  {
    navlabel: true,
    subheader: "COMPETITION",
  },
  {
    id: uniqueId(),
    title: "Events",
    icon: EmojiEventsIcon,
    href: "/events",
  },
  {
    id: uniqueId(),
    title: "Teams",
    icon: Diversity3Icon,
    href: "/teams",
  },
  {
    id: uniqueId(),
    title: "Fields",
    icon: StadiumIcon,
    href: "/fields",
  },
  {
    navlabel: true,
    subheader: "MATCHES OPERATIONS",
  },
  {
    id: uniqueId(),
    title: "Matches",
    icon: SportsSoccerIcon,
    href: "/matches",
  },
  {
    navlabel: true,
    subheader: " PEOPLE",
  },
  {
    id: uniqueId(),
    title: "Players",
    icon: GroupsIcon,
    href: "/players",
  },
  {
    id: uniqueId(),
    title: "Coachs",
    icon: SportsIcon,
    href: "/coachs",
  },
  {
    id: uniqueId(),
    title: "Referees",
    icon: SettingsAccessibilityIcon,
    href: "/referees",
  },
  {
    navlabel: true,
    subheader: " CONTROL",
  },
  {
    id: uniqueId(),
    title: "Check-ins",
    icon: AssignmentTurnedInIcon,
    href: "/check-ins",
  },
  {
    id: uniqueId(),
    title: "Standings",
    icon: FormatListNumberedIcon,
    href: "/standings",
  },
  {
    navlabel: true,
    subheader: " SETTINGS",
  },
  {
    id: uniqueId(),
    title: "Settings",
    icon: SettingsIcon,
    href: "/settings",
  },

];

export default Menuitems;

/*
{
  id: uniqueId(),
  title: "Login",
  icon: IconLogin,
  href: "/authentication/login",
},
{
  id: uniqueId(),
  title: "Register",
  icon: IconUserPlus,
  href: "/authentication/register",
},
*/


