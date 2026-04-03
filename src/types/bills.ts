export type BillCategory = {
  id?: string | number;
  code: string;
  name: string;
  description?: string;
};

export type BillProvider = {
  id?: string | number;
  name: string;
  code: string;
  logo_url?: string | null;
  category_code?: string;
  active?: boolean | number;
};

export type BillVariation = {
  variation_code?: string;
  variation_amount?: string | number;
  name?: string;
  amount?: string | number;
  [key: string]: unknown;
};

export type BillVariationsResponse = {
  serviceID?: string;
  serviceName?: string;
  variations?: BillVariation[];
  [key: string]: unknown;
};

export type BillQuoteRequest = {
  providerCode: string;
  amount: number;
  variationCode?: string;
};

export type BillQuoteResponse = {
  provider: string;
  amount: number;
  fee: number;
  total: number;
  currency: string;
};

export type BillsPayRequest = {
  providerCode: string;
  amount: number;
  account: string;
  pin: string;
  variationCode?: string;
  phone?: string;
  subscriptionType?: string;
};

export type BillsPayCardRequest = {
  providerCode: string;
  amount: number;
  account: string;
  variationCode?: string;
  subscriptionType?: string;
};

export type BillsPayResponse = {
  id?: string | number;
  status?: string;
  message?: string;
  provider?: string;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
};

export type BillsPayCardResponse = {
  checkoutUrl?: string;
  [key: string]: unknown;
};

export type AdminBillPricing = {
  id: string | number;
  provider: string;
  provider_code: string;
  category_code?: string;
  category_name?: string;
  base_fee: number | string;
  markup_type: 'flat' | 'percent' | string;
  markup_value: number | string;
  currency?: string;
  active?: boolean | number;
  [key: string]: unknown;
};

export type AdminBillProvider = {
  id: string | number;
  name: string;
  code: string;
  logo_url?: string | null;
  category_code?: string;
  category_name?: string;
  active?: boolean | number;
  [key: string]: unknown;
};
