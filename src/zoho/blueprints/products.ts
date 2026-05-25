/**
 * Products module — picklist mappings.
 *
 * Hoofdcategorie + Subcategorie zijn global picklists. Een aantal entries
 * heeft een legacy `actual_value` die afwijkt van de `display_value`.
 * Zoho's metadata API weigert die actual_value te hernoemen (silent no-op
 * op PATCH), dus de mapping leeft hier.
 *
 * Voor zoek- en filter-criteria die rechtstreeks op `actual_value` matchen
 * (Zoho record-API geeft voor deze velden de actual_value terug, niet de
 * display), gebruik de helper-functies hieronder.
 */

/** Legacy actual_value-mismatches in de Hoofdcategorie picklist (`Categorie_n`). */
export const HOOFDCATEGORIE_ACTUAL_VALUE_OVERRIDES: Record<string, string> = {
  "Zonwering (binnen)": "Binnenzonwering",
  Shutters: "Shutter",
  Wandpanelen: "Lattenwand",
  Diensten: "Dienst",
  Vloer: "Hardware1",
  Vitrage: "CRM Applications",
  Legartikel: "Software",
};

/**
 * Geeft de waarde die in Zoho's record-storage voorkomt voor een gegeven
 * Hoofdcategorie display_value. Voor entries zonder mismatch = display_value.
 */
export function hoofdcategorieActualValue(display: string): string {
  return HOOFDCATEGORIE_ACTUAL_VALUE_OVERRIDES[display] ?? display;
}

/** Legacy actual_value-mismatches in de Subcategorie picklist (`Categorie_1`). */
export const SUBCATEGORIE_ACTUAL_VALUE_OVERRIDES: Record<string, string> = {
  PVC: "PVC vloeren",
  Hout: "Houten vloeren",
  Randafwerking: "Plinten en profielen",
  Hulpmaterialen: "Legmaterialen",
  Montage: "Legdienst vloeren",
  "Montage zonwering (binnen)": "Montage zonwering",
};

/**
 * Geeft de waarde die in Zoho's record-storage voorkomt voor een gegeven
 * Subcategorie display_value. Voor entries zonder mismatch = display_value.
 */
export function subcategorieActualValue(display: string): string {
  return SUBCATEGORIE_ACTUAL_VALUE_OVERRIDES[display] ?? display;
}
