// Creates the Shortlist brand and the plans' products in Dodo, and prints the env lines to set. Test and live mode have
// separate catalogues, so run it once per mode. Safe to re-run: what already exists is reused.
//   pnpm dodo:products          (test mode key in .env)
//   pnpm dodo:products --live   (live mode key; the flag is required)
// If a price changes in src/modules/billing/dodo.ts, edit the product in the Dodo dashboard too: this won't touch it.
import DodoPayments from "dodopayments";
import { prices } from "../modules/billing/dodo.js";

const apiKey = process.env.DODO_PAYMENTS_API_KEY;
const environment = process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode";
if (!apiKey) throw new Error("Set DODO_PAYMENTS_API_KEY first");
if (environment !== "test_mode" && environment !== "live_mode") {
  throw new Error("DODO_PAYMENTS_ENVIRONMENT must be test_mode or live_mode");
}
if (environment === "live_mode" && !process.argv.includes("--live")) {
  throw new Error("This would change live mode. Pass --live if that's what you want.");
}

const BRAND = {
  name: "Shortlist",
  url: "https://shortlist.co.in",
  support_email: "support@shortlist.co.in",
  description: "AI resume builder: tailor a resume to a job description and approve every change.",
  statement_descriptor: "SHORTLIST",
};

const base = { currency: "USD", discount: 0, purchasing_power_parity: false } as const;
const PRODUCTS = [
  {
    env: "DODO_PRODUCT_PRO",
    name: "Shortlist Pro",
    description: "Shortlist Pro, billed every month until you cancel.",
    price: {
      ...base,
      type: "recurring_price",
      price: prices.pro,
      payment_frequency_count: 1,
      payment_frequency_interval: "Month",
      // Dodo's recommended period for a plan that renews until it's cancelled.
      subscription_period_count: 20,
      subscription_period_interval: "Year",
    },
  },
  {
    env: "DODO_PRODUCT_LIFETIME",
    name: "Shortlist Lifetime",
    description: "Shortlist Lifetime, one payment with fair monthly limits on AI use.",
    price: { ...base, type: "one_time_price", price: prices.lifetime },
  },
] as const;

const client = new DodoPayments({ bearerToken: apiKey, environment });
console.log(`Dodo ${environment}\n`);

const { items: brands } = await client.brands.list();
const named = (name: string | null | undefined) => name?.trim().toLowerCase() === BRAND.name.toLowerCase();
const brand = brands.find((b) => named(b.name)) ?? (await client.brands.create(BRAND));
console.log(`Brand ${brand.name} (${brand.brand_id}), verification: ${brand.verification_status ?? "unknown"}\n`);

const existing = new Map<string, string>();
for await (const product of client.products.list({ archived: false })) {
  if (product.name) existing.set(product.name, product.product_id);
}

const lines = [];
for (const { env, name, description, price } of PRODUCTS) {
  const found = existing.get(name);
  const id =
    found ??
    (await client.products.create({ name, description, price, brand_id: brand.brand_id, tax_category: "saas" }))
      .product_id;
  console.log(`${found ? "Exists: " : "Created:"} ${name} (${id})`);
  lines.push(`${env}=${id}`);
}
console.log(`\nSet these (${environment}):\n\n${lines.join("\n")}`);
