"use client";

export type EventMembershipStatus = 'eligible' | 'warning' | 'blocked' | 'paid';

export type EventMembership = {
  id: number;
  event_id: number;
  player_id: number;
  amount_paid: number;
  appearances_count: number;
  created_at: string;
  updated_at: string;
};

export type EventMembershipSummary = EventMembership & {
  player_name: string | null;
  player_document_id: string | null;
  membership_price: number;
  balance_due: number;
  free_appearances_remaining: number;
  status: EventMembershipStatus;
  can_play: boolean;
};

export type EventMembershipPaymentInput = {
  eventId: number;
  playerId: number;
  amount: number;
};
