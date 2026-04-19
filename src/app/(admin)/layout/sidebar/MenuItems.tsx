import GroupsIcon from '@mui/icons-material/Groups';
import GavelIcon from '@mui/icons-material/Gavel';
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
import ViewListIcon from '@mui/icons-material/ViewList';
import SportsSoccerOutlinedIcon from '@mui/icons-material/SportsSoccerOutlined';

const Menuitems = [
  {
    navlabel: true,
    subheader: "HOME",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: DashboardIcon,
    href: "/admin/dashboard",
  },
  {
    navlabel: true,
    subheader: "COMPETITION",
  },
  {
    id: "events",
    title: "Events",
    icon: EmojiEventsIcon,
    href: "/admin/events",
  },
  {
    id: "teams",
    title: "Teams",
    icon: Diversity3Icon,
    href: "/admin/teams",
  },
  {
    id: "fields",
    title: "Fields",
    icon: StadiumIcon,
    href: "/admin/fields",
  },
  {
    navlabel: true,
    subheader: "MATCHES OPERATIONS",
  },
  {
    id: "matches",
    title: "Matches",
    icon: SportsSoccerIcon,
    href: "/admin/matches",
  },
  {
    navlabel: true,
    subheader: "PEOPLE",
  },
  {
    id: "players",
    title: "Players",
    icon: GroupsIcon,
    href: "/admin/players",
  },
  {
    id: "coaches",
    title: "Coachs",
    icon: SportsIcon,
    href: "/admin/coaches",
  },
  {
    id: "referees",
    title: "Referees",
    icon: SettingsAccessibilityIcon,
    href: "/admin/referees",
  },
  {
    navlabel: true,
    subheader: "CONTROL",
  },
  {
    id: "check-ins",
    title: "Check-ins",
    icon: AssignmentTurnedInIcon,
    href: "/admin/check-ins",
  },
  {
    id: "standings",
    title: "Standings",
    icon: FormatListNumberedIcon,
    href: "/admin/standings",
  },
  {
    navlabel: true,
    subheader: "CONFIG",
  },
  {
    id: "format-types",
    title: "Format Types",
    icon: ViewListIcon,
    href: "/admin/format-types",
  },
  {
    id: "match-formats",
    title: "Match Formats",
    icon: SportsSoccerOutlinedIcon,
    href: "/admin/match-formats",
  },
  {
    navlabel: true,
    subheader: "LEGAL",
  },
  {
    id: "legal-documents",
    title: "Rules & Permissions",
    icon: GavelIcon,
    href: "/admin/legal-documents",
  },
  {
    navlabel: true,
    subheader: "SETTINGS",
  },
  {
    id: "users",
    title: "Users",
    icon: ManageAccountsIcon,
    href: "/admin/users",
  },
  {
    id: "settings",
    title: "Settings",
    icon: SettingsIcon,
    href: "/admin/settings",
  },
];

export default Menuitems;

