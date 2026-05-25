/**
 * Tijdlijn (`Datums_2`) module — picklist mappings voor `Omschrijving`.
 *
 * `Omschrijving` is een global picklist (`Tijdlijn_omschrijvingen`, id
 * 728921000006447023) met 41 actieve waardes. 28 hebben een actual_value
 * die afwijkt van display_value — vooral 24× streepje-mismatch
 * (display `DE-010`, actual `DE10`) en een handvol totaal andere actuals.
 *
 * Zoho's metadata API laat actual_value-renames niet toe. Records keren
 * deze actual_value terug bij de record-API; de Zoho UI resolved naar
 * display_value. Voor portal-workflows die op `actual_value` filteren
 * (bijv. logEvent in tijdlijn-repo), gebruik `tijdlijnActualValue(display)`.
 */

export const TIJDLIJN_ACTUAL_VALUE_OVERRIDES: Record<string, string> = {
  "DE-010 - Electra begin/eind": "DE10 - Electra begin/eind",
  "DE-011 - Keuken begin/eind": "DE11 - Keuken begin/eind",
  "DE-012 - Meubels": "DE12 - Meubels",
  "DE-013 - Oplevering aanbouw": "DE13 - Oplevering aanbouw",
  "DE-014 - Oplevering nieuwbouw": "DE14 - Oplevering nieuwbouw",
  "DE-015 - Oplevering verbouw": "DE15 - Oplevering verbouw",
  "DE-016 - Schilderwerk begin/eind": "DE16 - Schilderwerk begin/eind",
  "DE-017 - Storten dekvloer aanbouw": "DE17 - Storten dekvloer aanbouw",
  "DE-018 - Storten dekvloer muur": "DE18 - Storten dekvloer muur",
  "DE-019 - Storten dekvloer nieuwbouw": "Storten dekvloer",
  "DE-020 - Storten dekvloer verbouw": "DE20 - Storten dekvloer verbouw",
  "DE-021 - Stucwerk begin/eind": "DE21 - Stucwerk begin/eind",
  "DE-022 - Verwijderen muur": "DE22 - Verwijderen muur",
  "DE-023 - Verwijderen vloer": "Vloer verwijderen",
  "DE-024 - Vloerverwarming aanleggen": "DE24 - Vloerverwarming aanleggen",
  "KL-010 - Acclimatiseren - begin/eind": "KL10 - Acclimatiseren - begin/eind",
  "KL-011 - Beoordeling basisvloer (volledig leeg)": "KL11 - Beoordeling basisvloer (volledig leeg)",
  "KL-012 - Einde droogperiode stucwerk": "KL12 - Einde droogperiode stucwerk",
  "KL-013 - Einde droogperiode schilderwerk": "KL13 - Einde droogperiode schilderwerk",
  "KL-014 - Opstookprotocol - begin/eind": "KL14 - Opstookprotocol - begin/eind",
  "KL-015 - Sleuteloverdracht": "Sleuteloverdracht",
  "KL-016 - Verhuizing": "Verhuizing",
  "KL-017 - Vloerverwarming activeren": "KL17 - Vloerverwarming activeren",
  "LA-010 - 1ste Egalisatie": "LA10 - 1ste Egalisatie",
  "LA-011 - 2de Egalisatie": "LA11 - 2de Egalisatie",
  "LA-012 - Uitvoerder bekend": "LA12 - Uitvoerder bekend",
  "LA-013 - Droogbouw": "LA13 - Droogbouw",
  "LA-014 - Leggen - Vloer begin/eind": "LA14 - Leggen - Vloer begin/eind",
  "LA-015 - Leverdatum": "LA15 - Leverdatum",
  "LA-016 - Saneren ondergrond": "LA16 - Saneren ondergrond",
  "LA-017 - Verwijderen vloer": "LA17 - Verwijderen vloer",
  "LA-018 - Vloerverwarming": "LA18 - Vloerverwarming",
  "LA-019 - Vloerverwarming - Dichtzetten sleuf": "LA19 - Vloerverwarming - Dichtzetten sleuf",
  "LA-020 - Voorinspectie uitvoeren": "Voorinspectie",
  "LA-021 - Voorinspectie inplannen": "LA021 - Voorinspectie inplannen",
  "LA-022 - Verwachte leverdatum": "LA022 - Verwachte leverdatum",
};

export function tijdlijnActualValue(display: string): string {
  return TIJDLIJN_ACTUAL_VALUE_OVERRIDES[display] ?? display;
}
