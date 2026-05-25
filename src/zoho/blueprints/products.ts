/**
 * Products module — picklist mappings.
 *
 * Subcategorie is een global picklist (`Categorie_1`, id 728921000000827282)
 * waarvan een aantal entries een legacy `actual_value` hebben die afwijkt van
 * `display_value`. Zoho weigert die actual_value via de metadata API te
 * hernoemen (silent no-op op PATCH), dus de mapping leeft hier.
 *
 * Voor zoek- en filter-criteria die rechtstreeks op `actual_value` matchen
 * (sommige Zoho-endpoints), gebruik `subcategorieActualValue(display)`.
 * Zoho's record-search met `:equals:` lijkt display_value-aware, maar wees
 * defensief en gebruik de mapping waar het kan.
 */

/** Legacy actual_value-mismatches in de Subcategorie picklist. */
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
 * display_value. Voor entries zonder mismatch is dat de display_value zelf.
 */
export function subcategorieActualValue(display: string): string {
  return SUBCATEGORIE_ACTUAL_VALUE_OVERRIDES[display] ?? display;
}
