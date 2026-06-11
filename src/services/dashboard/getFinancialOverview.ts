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

export type PaymentMethod = 'stripe' | 'cash' | 'zelle' | 'venmo' | 'cashapp' | 'legacy';

export type PaymentMethodBreakdownRow = {
  method: PaymentMethod;
  label: string;
  grossSales: number;
  fees: number;
  netSales: number;
  count: number;
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

export type FinancialPaymentRecordRow = {
  id: number;
  membershipId: number;
  eventId: number;
  eventName: string;
  playerName: string;
  method: PaymentMethod;
  methodLabel: string;
  source: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  reference: string | null;
  createdAt: string;
};

export type FinancialOverview = {
  overall: FinancialSummary;
  organizedEvents: FinancialSummary;
  privateFieldRentals: FinancialSummary;
  eventRows: EventFinancialRow[];
  paymentRows: FinancialPaymentRow[];
  paymentRecords: FinancialPaymentRecordRow[];
  paymentMethodBreakdown: PaymentMethodBreakdownRow[];
  privateFieldRentalsNote: string;
  generatedAt: string;
};

function buildSummary(
  rows: Array<{
    grossSales: number;
    collected: number;
    outstanding: number;
    netRevenue?: number;
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
      netRevenue: accumulator.netRevenue + (row.netRevenue ?? row.collected),
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

function getPaymentMethodLabel(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    stripe: 'Stripe',
    cash: 'Cash',
    zelle: 'Zelle',
    venmo: 'Venmo',
    cashapp: 'Cash App',
    legacy: 'Legacy balance',
  };
  return labels[method];
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

  const { data: paymentRecordsData, error: paymentRecordsError } = await client
    .from('event_membership_payments')
    .select(`
      id,
      event_membership_id,
      event_id,
      player_id,
      amount,
      fee_amount,
      net_amount,
      method,
      source,
      reference,
      created_at,
      event:events (
        id,
        name
      ),
      player:players (
        id,
        full_name
      )
    `)
    .order('created_at', { ascending: false });

  if (paymentRecordsError) {
    throw new Error(paymentRecordsError.message);
  }

  const paymentRecords = (paymentRecordsData ?? []).map((record: any) => {
    const event = Array.isArray(record.event) ? record.event[0] ?? null : record.event ?? null;
    const player = Array.isArray(record.player) ? record.player[0] ?? null : record.player ?? null;
    const method = (record.method ?? 'legacy') as PaymentMethod;

    return {
      id: Number(record.id),
      membershipId: Number(record.event_membership_id),
      eventId: Number(record.event_id),
      eventName: normalizeEventName(Number(record.event_id), event?.name ?? null),
      playerName: player?.full_name?.trim() || `Player #${record.player_id}`,
      method,
      methodLabel: getPaymentMethodLabel(method),
      source: record.source ?? '-',
      amount: Number(record.amount ?? 0),
      feeAmount: Number(record.fee_amount ?? 0),
      netAmount: Number(record.net_amount ?? Number(record.amount ?? 0)),
      reference: record.reference ?? null,
      createdAt: record.created_at,
    } satisfies FinancialPaymentRecordRow;
  });

  const recordedByMembership = new Map<number, number>();
  paymentRecords.forEach((record) => {
    recordedByMembership.set(
      record.membershipId,
      (recordedByMembership.get(record.membershipId) ?? 0) + record.amount
    );
  });

  const legacyPaymentRecords = eventRows
    .flatMap(({ paymentRows: rows }) => rows)
    .flatMap((row) => {
      const recordedAmount = recordedByMembership.get(row.membershipId) ?? 0;
      const legacyAmount = Math.max(row.amountPaid - recordedAmount, 0);

      if (legacyAmount <= 0) return [];

      return [
        {
          id: -row.membershipId,
          membershipId: row.membershipId,
          eventId: row.eventId,
          eventName: row.eventName,
          playerName: row.playerName,
          method: 'legacy' as const,
          methodLabel: getPaymentMethodLabel('legacy'),
          source: 'pre-history',
          amount: legacyAmount,
          feeAmount: 0,
          netAmount: legacyAmount,
          reference: null,
          createdAt: row.updatedAt,
        } satisfies FinancialPaymentRecordRow,
      ];
    });

  const allPaymentRecords = [...paymentRecords, ...legacyPaymentRecords].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  const paymentMethodBreakdown = Array.from(
    allPaymentRecords.reduce((map, record) => {
      const current = map.get(record.method) ?? {
        method: record.method,
        label: record.methodLabel,
        grossSales: 0,
        fees: 0,
        netSales: 0,
        count: 0,
      };
      current.grossSales += record.amount;
      current.fees += record.feeAmount;
      current.netSales += record.netAmount;
      current.count += 1;
      map.set(record.method, current);
      return map;
    }, new Map<PaymentMethod, PaymentMethodBreakdownRow>())
  )
    .map(([, row]) => row)
    .sort((left, right) => right.grossSales - left.grossSales);

  const feesByEvent = allPaymentRecords.reduce((map, record) => {
    map.set(record.eventId, (map.get(record.eventId) ?? 0) + record.feeAmount);
    return map;
  }, new Map<number, number>());

  const financialEventRows = eventRows.map(({ eventRow }) => ({
    ...eventRow,
    netRevenue: Math.max(eventRow.collected - (feesByEvent.get(eventRow.eventId) ?? 0), 0),
  }));

  const organizedEventsSummary = buildSummary(
    financialEventRows.map((eventRow) => ({
      grossSales: eventRow.grossSales,
      collected: eventRow.collected,
      outstanding: eventRow.outstanding,
      netRevenue: eventRow.netRevenue,
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
        netRevenue: summary.netRevenue,
        totalCount: summary.totalCount,
        paidCount: summary.paidCount,
        pendingCount: summary.pendingCount,
      })),
      organizedEventsSummary.dataAvailable || privateFieldRentalsSummary.dataAvailable
    ),
    organizedEvents: organizedEventsSummary,
    privateFieldRentals: privateFieldRentalsSummary,
    eventRows: financialEventRows,
    paymentRows,
    paymentRecords: allPaymentRecords,
    paymentMethodBreakdown,
    privateFieldRentalsNote:
      'Private field rentals are separated in this view, but their revenue remains at 0 until bookings and payments are persisted in the database.',
    generatedAt: new Date().toISOString(),
  };
}
