import { createRequire } from "node:module";
import maxmind, { type CountryResponse, type Reader } from "maxmind";
import { logger } from "./logger.js";

// IP to country from DB-IP's free Lite database (CC BY 4.0: pages using it link to db-ip.com). It ships with the
// package and is read from memory, so a lookup makes no network call. Update it by bumping the package.
const dbPath = createRequire(import.meta.url).resolve("@ip-location-db/dbip-country-mmdb/dbip-country.mmdb");
let reader: Promise<Reader<CountryResponse> | null> | undefined;

export async function countryOf(ip: string | undefined): Promise<string | null> {
  if (!ip) return null;
  reader ??= maxmind.open<CountryResponse>(dbPath).catch((err: unknown) => {
    logger.error({ err }, "Could not open the IP country database");
    return null;
  });
  // DB-IP's file holds a bare { country_code } rather than MaxMind's nested country record.
  const result = (await reader)?.get(ip.replace(/^::ffff:/, "")) as { country_code?: string } | null | undefined;
  return result?.country_code ?? null;
}
