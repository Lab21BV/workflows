export { ZohoClient, ZohoApiError, loadZohoEnv } from "./client";
export type { ZohoEnv } from "./client";
export { RecordsApi } from "./records";
export type { ZohoRecord, ListRecordsOptions, SearchOptions } from "./records";
export { MODULES, INSTALLATION_PIPELINE } from "./modules";
export type { ModuleKey } from "./modules";

import { ZohoClient } from "./client";
import { RecordsApi } from "./records";

/**
 * Lazy-cached `RecordsApi` voor app-code (repos, scripts, workflows).
 *
 * Waarom lazy: de ZohoClient-constructor valideert env-vars met Zod en
 * gooit als een env-var leeg is. Bij `next build` worden modules
 * geladen zonder dat Zoho-vars per se aanwezig zijn (bv. wanneer alleen
 * /medewerkers gerendered wordt). Late binding voorkomt dat de hele
 * build faalt voor routes die geen Zoho nodig hebben.
 *
 * Waarom shared: de Lambda hergebruikt instanties tussen requests; één
 * gedeelde RecordsApi met cached OAuth-token bespaart token-refresh-
 * calls op cold-warm grens.
 */
let _records: RecordsApi | null = null;
export function getRecordsApi(): RecordsApi {
  if (!_records) _records = new RecordsApi(new ZohoClient());
  return _records;
}

/** Test-helper om de gedeelde instance te resetten (geen productie-gebruik). */
export function __resetRecordsApiForTests(): void {
  _records = null;
}
