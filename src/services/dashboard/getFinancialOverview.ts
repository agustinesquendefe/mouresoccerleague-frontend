import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { EventStatus } from '@/models/event';
import { getEventMemberships } from '@/services/eventMemberships/getEventMemberships';

type FinancialSummary = {
  grossSales: number;
  collected: number;
  outstanding: number;
  netRevenue: number;
  paidCount: number;
  pendingCount: number;
  totalCount: number;
  dataAvailable: boolean;
};

export type EventFinancialRow = {
  eventId: number;
  eventName: string;
  status: EventStatus | null;
  startDate: string;
  endDate: string | null;
  players: number;
  paidPlayers: number;
  pendingPlayers: number;
  grossSales: number;
  collected: number;
  outstanding: number;
  netRevenue: number;
};

export type PaymentStatus = 'paid' | 'partial' | 'pending';

export type FinancialPaymentRow = {
  membershipId: number;
  eventId: number;
  eventName: string;
  playerName: string;
  teamName: string;
  membershipPrice: number;
  amountPaid: number;
  balanceDue: number;
  status: PaymentStatus;
  updatedAt: string;
};

export type FinancialOverview = {
  overall: FinancialSummary;
  organizedEvents: FinancialSummary;
  privateFieldRentals: FinancialSummary;
  eventRows: EventFinancialRow[];
  paymentRows: FinancialPaymentRow[];
  privateFieldRentalsNote: string;
  generatedAt: string;
};

function buildSummary(
  rows: Array<{
    grossSales: number;
    collected: number;
    outstanding: number;
    totalCount: number;
    paidCount: number;
    pendingCount: number;
  }>,
  dataAvailable: boolean
): FinancialSummary {
  return rows.reduce<FinancialSummary>(
    (accumulator, row) => ({
      grossSales: accumulator.grossSales + row.grossSales,
      collected: accumulator.collected + row.collected,
      outstanding: accumulator.outstanding + row.outstanding,
      netRevenue: accumulator.netRevenue + row.collected,
      paidCount: accumulator.paidCount + row.paidCount,
      pendingCount: accumulator.pendingCount + row.pendingCount,
      totalCount: accumulator.totalCount + row.totalCount,
      dataAvailable,
    }),
    {
      grossSales: 0,
      collected: 0,
      outstanding: 0,
      netRevenue: 0,
      paidCount: 0,
      pendingCount: 0,
      totalCount: 0,
      dataAvailable,
    }
  );
}

function normalizeEventName(id: number, name: string | null) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : `Event #${id}`;
}

function getPaymentStatus(amountPaid: number, balanceDue: number): PaymentStatus {
  if (balanceDue <= 0) return 'paid';
  if (amountPaid > 0) return 'partial';
  return 'pending';
}

export async function getFinancialOverview(
  client: SupabaseClient = supabase
): Promise<FinancialOverview> {
  const { data: events, error } = await client
    .from('events')
    .select('id, name, status, start_date, end_date, event_price, membership_price')
    .order('start_date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const eventRows = await Promise.all(
    (events ?? []).map(async (event) => {
      const memberships = await getEventMemberships(Number(event.id), client, {
        ensureMembershipRows: false,
      });
      const eventName = normalizeEventName(Number(event.id), event.name ?? null);

      const row = memberships.reduce(
        (accumulator, membership) => {
          const membershipPrice = Number(membership.membership_price ?? 0);
          const amountPaid = Number(membership.amount_paid ?? 0);
          const balanceDue = Number(membership.balance_due ?? 0);

          accumulator.players += 1;
          accumulator.grossSales += membershipPrice;
          accumulator.collected += amountPaid;
          accumulator.outstanding += balanceDue;

          if (balanceDue <= 0) {
            accumulator.paidPlayers += 1;
          } else {
            accumulator.pendingPlayers += 1;
          }

          accumulator.paymentRows.push({
            membershipId: Number(membership.id),
            eventId: Number(event.id),
            eventName,
            playerName: membership.player_name?.trim() || 'Unnamed player',
            teamName: membership.team_name?.trim() || 'Unassigned',
            membershipPrice,
            amountPaid,
            balanceDue,
            status: getPaymentStatus(amountPaid, balanceDue),
            updatedAt: membership.updated_at,
          });

          return accumulator;
        },
        {
          players: 0,
          paidPlayers: 0,
          pendingPlayers: 0,
          grossSales: 0,
          collected: 0,
          outstanding: 0,
          paymentRows: [] as FinancialPaymentRow[],
        }
      );

      return {
        eventRow: {
          eventId: Number(event.id),
          eventName,
          status: (event.status ?? null) as EventStatus | null,
          startDate: event.start_date,
          endDate: event.end_date,
          players: row.players,
          paidPlayers: row.paidPlayers,
          pendingPlayers: row.pendingPlayers,
          grossSales: row.grossSales,
          collected: row.collected,
          outstanding: row.outstanding,
          netRevenue: row.collected,
        } satisfies EventFinancialRow,
        paymentRows: row.paymentRows,
      };
    })
  );

  const organizedEventsSummary = buildSummary(
    eventRows.map(({ eventRow }) => ({
      grossSales: eventRow.grossSales,
      collected: eventRow.collected,
      outstanding: eventRow.outstanding,
      totalCount: eventRow.players,
      paidCount: eventRow.paidPlayers,
      pendingCount: eventRow.pendingPlayers,
    })),
    true
  );

  const privateFieldRentalsSummary = buildSummary([], false);

  const paymentRows = eventRows
    .flatMap(({ paymentRows: rows }) => rows)
    .sort((left, right) => {
      if (left.balanceDue !== right.balanceDue) {
        return right.balanceDue - left.balanceDue;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  return {
    overall: buildSummary(
      [organizedEventsSummary, privateFieldRentalsSummary].map((summary) => ({
        grossSales: summary.grossSales,
        collected: summary.collected,
        outstanding: summary.outstanding,
        totalCount: summary.totalCount,
        paidCount: summary.paidCount,
        pendingCount: summary.pendingCount,
      })),
      organizedEventsSummary.dataAvailable || privateFieldRentalsSummary.dataAvailable
    ),
    organizedEvents: organizedEventsSummary,
    privateFieldRentals: privateFieldRentalsSummary,
    eventRows: eventRows.map(({ eventRow }) => eventRow),
    paymentRows,
    privateFieldRentalsNote:
      'Private field rentals are separated in this view, but their revenue remains at 0 until bookings and payments are persisted in the database.',
    generatedAt: new Date().toISOString(),
  };
}