// Client-safe plan data (mirror of src/lib/plans.ts which is server-only).
export const PLANS = {
  starter: { name: "Starter", priceMonthly: 29, propertyLimit: 3 },
  professional: { name: "Professional", priceMonthly: 79, propertyLimit: 10 },
  business: { name: "Business", priceMonthly: 199, propertyLimit: 30 },
} as const;
