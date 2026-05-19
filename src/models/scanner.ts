export type ScannerValidationRequest = {
  barcode: string;
  eventId?: number | null;
  matchId?: number | null;
  teamId?: number | null;
};

export type ScannerValidationCheckCode =
  | 'active_event'
  | 'match_context'
  | 'team_context'
  | 'player_exists'
  | 'player_active'
  | 'team_membership'
  | 'paid_membership'
  | 'active_event_payment'
  | 'eligible_to_play';

export type ScannerValidationCheck = {
  code: ScannerValidationCheckCode;
  label: string;
  passed: boolean;
  message: string;
};

export type ScannerPlayerSummary = {
  id: number;
  fullName: string;
  documentId: string;
  photoUrl: string | null;
  paidMembership: boolean;
  amountPaid: number;
  balanceDue: number;
  membershipStatus: string | null;
  canPlay: boolean;
};

export type ScannerContextSummary = {
  scannerMode: 'keyboard_wedge';
  scannedCode: string;
  eventId: number | null;
  eventName: string | null;
  matchId: number | null;
  matchLabel: string | null;
  teamId: number | null;
  teamName: string | null;
};

export type ScannerValidationResponse = {
  approved: boolean;
  outcome: 'approved' | 'denied';
  headline: string;
  summary: string;
  context: ScannerContextSummary;
  player: ScannerPlayerSummary | null;
  checks: ScannerValidationCheck[];
  validatedAt: string;
  checkIn?: ScannerCheckInSummary | null;
  deniedScan?: ScannerDeniedScanSummary | null;
};

export type ScannerCheckInSummary = {
  id: number | null;
  status: 'approved' | 'already_checked_in' | 'not_registered';
  method: 'scanner';
  checkedInAt: string | null;
  message: string;
};

export type ScannerDeniedScanSummary = {
  id: number;
  method: 'scanner';
  savedAt: string;
  message: string;
};

export type ScannerCheckedInPlayer = {
  id: number;
  playerId: number;
  playerName: string;
  documentId: string | null;
  photoUrl: string | null;
  teamId: number;
  teamName: string | null;
  status: string | null;
  method: string | null;
  checkedInAt: string | null;
};

export type ScannerDeniedPlayer = {
  id: string;
  playerId: number | null;
  playerName: string;
  documentId: string | null;
  photoUrl: string | null;
  reason: string;
  method: string | null;
  scannedAt: string;
};

export type ScannerMatchOption = {
  id: number;
  eventId: number;
  label: string;
  status: string | null;
  date: string | null;
  time: string | null;
  team1: {
    id: number;
    name: string;
  };
  team2: {
    id: number;
    name: string;
  };
};

export type ScannerEventOption = {
  id: number;
  name: string;
  status: string | null;
};

export type ScannerContextData = {
  activeEvent: ScannerEventOption | null;
  events: ScannerEventOption[];
  matches: ScannerMatchOption[];
};
