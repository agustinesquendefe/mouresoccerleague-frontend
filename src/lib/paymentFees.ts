import type { SupabaseClient } from '@supabase/supabase-js';

export type PaymentFeeSettings = {
  passPaymentFeesToCustomer: boolean;
  operatingState: string;
  stripeFeePercentage: number;
  stripeFeeFixedAmount: number;
  stateFeePercentage: number;
  stateFeeLabel: string;
};

export type PaymentFeeBreakdown = {
  baseAmount: number;
  stripeFeeAmount: number;
  stateFeeAmount: number;
  totalFeeAmount: number;
  totalAmount: number;
  settings: PaymentFeeSettings;
};

const DEFAULT_PAYMENT_FEE_SETTINGS: PaymentFeeSettings = {
  passPaymentFeesToCustomer: true,
  operatingState: 'NC',
  stripeFeePercentage: 2.9,
  stripeFeeFixedAmount: 0.3,
  stateFeePercentage: 0,
  stateFeeLabel: 'State fee',
};

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function getPaymentFeeSettings(
  supabaseAdmin: SupabaseClient
): Promise<PaymentFeeSettings> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select(
      'pass_payment_fees_to_customer, operating_state, state, stripe_fee_percentage, stripe_fee_fixed_amount, state_fee_percentage, state_fee_label'
    )
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    passPaymentFeesToCustomer:
      data?.pass_payment_fees_to_customer ??
      DEFAULT_PAYMENT_FEE_SETTINGS.passPaymentFeesToCustomer,
    operatingState:
      data?.operating_state?.trim() ||
      data?.state?.trim() ||
      DEFAULT_PAYMENT_FEE_SETTINGS.operatingState,
    stripeFeePercentage: toNumber(
      data?.stripe_fee_percentage,
      DEFAULT_PAYMENT_FEE_SETTINGS.stripeFeePercentage
    ),
    stripeFeeFixedAmount: toNumber(
      data?.stripe_fee_fixed_amount,
      DEFAULT_PAYMENT_FEE_SETTINGS.stripeFeeFixedAmount
    ),
    stateFeePercentage: toNumber(
      data?.state_fee_percentage,
      DEFAULT_PAYMENT_FEE_SETTINGS.stateFeePercentage
    ),
    stateFeeLabel: data?.state_fee_label?.trim() || DEFAULT_PAYMENT_FEE_SETTINGS.stateFeeLabel,
  };
}

export function calculatePaymentFees(
  baseAmount: number,
  settings: PaymentFeeSettings
): PaymentFeeBreakdown {
  const normalizedBaseAmount = roundCurrency(Math.max(Number(baseAmount) || 0, 0));

  if (!settings.passPaymentFeesToCustomer || normalizedBaseAmount <= 0) {
    return {
      baseAmount: normalizedBaseAmount,
      stripeFeeAmount: 0,
      stateFeeAmount: 0,
      totalFeeAmount: 0,
      totalAmount: normalizedBaseAmount,
      settings,
    };
  }

  const stripeFeeAmount = roundCurrency(
    normalizedBaseAmount * (settings.stripeFeePercentage / 100) + settings.stripeFeeFixedAmount
  );
  const stateFeeAmount = roundCurrency(normalizedBaseAmount * (settings.stateFeePercentage / 100));
  const totalFeeAmount = roundCurrency(stripeFeeAmount + stateFeeAmount);

  return {
    baseAmount: normalizedBaseAmount,
    stripeFeeAmount,
    stateFeeAmount,
    totalFeeAmount,
    totalAmount: roundCurrency(normalizedBaseAmount + totalFeeAmount),
    settings,
  };
}
