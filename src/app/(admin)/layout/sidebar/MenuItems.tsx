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
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';    

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
    href: "/admin/dashboard",
  },
  {
    navlabel: true,
    subheader: "COMPETITION",
  },
  {
    id: uniqueId(),
    title: "Events",
    icon: EmojiEventsIcon,
    href: "/admin/events",
  },
  {
    id: uniqueId(),
    title: "Teams",
    icon: Diversity3Icon,
    href: "/admin/teams",
  },
  {
    id: uniqueId(),
    title: "Fields",
    icon: StadiumIcon,
    href: "/admin/fields",
  },
  {
    navlabel: true,
    subheader: "MATCHES OPERATIONS",
  },
  {
    id: uniqueId(),
    title: "Matches",
    icon: SportsSoccerIcon,
    href: "/admin/matches",
  },
  {
    navlabel: true,
    subheader: " PEOPLE",
  },
  {
    id: uniqueId(),
    title: "Players",
    icon: GroupsIcon,
    href: "/admin/players",
  },
  {
    id: uniqueId(),
    title: "Coachs",
    icon: SportsIcon,
    href: "/admin/coaches",
  },
  {
    id: uniqueId(),
    title: "Referees",
    icon: SettingsAccessibilityIcon,
    href: "/admin/referees",
  },
  {
    navlabel: true,
    subheader: " CONTROL",
  },
  {
    id: uniqueId(),
    title: "Check-ins",
    icon: AssignmentTurnedInIcon,
    href: "/admin/check-ins",
  },
  {
    id: uniqueId(),
    title: "Standings",
    icon: FormatListNumberedIcon,
    href: "/admin/standings",
  },
  {
    navlabel: true,
    subheader: " SETTINGS",
  },
  {
    id: uniqueId(),
    title: "Users",
    icon: ManageAccountsIcon,
    href: "/admin/users",
  },
  {
    id: uniqueId(),
    title: "Settings",
    icon: SettingsIcon,
    href: "/admin/settings",
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


