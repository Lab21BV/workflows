/**
 * Diensten Planning — picklist mapping voor `Planningen.Dienst`.
 *
 * Global picklist `Diensten_Planning` (id 728921000001208299) met 30
 * actieve waardes. 4 hebben een legacy actual_value die afwijkt van
 * display_value. Bijzonder lelijk: `Vloer verwijderen` mapt op de
 * Zoho-template default actual `Optie 2`.
 *
 * Zoho's metadata API laat actual_value-renames niet toe. Voor code die
 * op actual_value filtert (search-criteria, COQL): gebruik
 * `dienstenPlanningActualValue(display)`.
 */

export const DIENSTEN_PLANNING_ACTUAL_VALUE_OVERRIDES: Record<string, string> = {
  "Vloer verwijderen": "Optie 2",
  "Annulering order": "Annulering",
  // 2026-05-25: cleanup-pogingscyclus laat "Controlelijst" achter met
  // actual "Controlelijst__TMP_CLEANUP" (eerder: "Controle lijst legdienst",
  // nu in Unused values als "Controlelijst (mismatch unused)").
  Controlelijst: "Controlelijst__TMP_CLEANUP",
  "Dekvloer storten": "Aanbouw dekvloer storten",
};

export function dienstenPlanningActualValue(display: string): string {
  return DIENSTEN_PLANNING_ACTUAL_VALUE_OVERRIDES[display] ?? display;
}
