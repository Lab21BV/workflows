/**
 * Installatievoorwaarden — overgenomen uit pagina's 2-3 van
 * `temp/LAB21_Inmeetformulier Vloerverwarming.pdf`. Tekst is een
 * leesbare samenvatting van de 8 punten; de PDF blijft de juridische
 * bron. Pas hier de wettige tekst aan zodra Victor de schone tekst
 * heeft aangeleverd.
 */
export function Voorwaarden() {
  return (
    <details className="card" style={{ marginTop: 16 }}>
      <summary style={{ cursor: "pointer", fontWeight: 500 }}>
        Lees de installatievoorwaarden (8 punten)
      </summary>
      <ol style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.55, fontSize: 13.5 }}>
        <li>
          <strong>Voorbereiding ruimte.</strong> De ruimte/vloer moet leeg zijn en
          de afwerkvloer waar de vloerverwarming wordt aangebracht dient
          bezemschoon, droog, stofvrij, vlak en egaal te zijn. Bij inslijpen is
          een &quot;normale&quot; afwerkvloer (cement of anhydriet) vereist —
          geen tegels, plavuizen of betonvloer.
        </li>
        <li>
          <strong>Bekende leidingen melden.</strong> Bestaande leidingen in de
          afwerkvloer dien je vooraf bij de LAB21-specialist aan te geven. Schade
          door inslijpen aan onbekende waterleidingen wordt eenmalig kosteloos
          gerepareerd; daarna komen reparatiekosten voor rekening van de klant.
          Schade aan overige leidingen (stadsverwarming, gas, CV) is altijd voor
          rekening van de klant.
        </li>
        <li>
          <strong>Elektriciteit.</strong> Op de werkdag is minimaal één
          elektriciteitsgroep (16A, 230V) aanwezig. LAB21 gaat uit van een
          stabiele elektriciteitsaansluiting.
        </li>
        <li>
          <strong>Etages &amp; lift.</strong> Bij werkzaamheden op een etage
          moet er een lift beschikbaar zijn voor materiaal- en
          gereedschapsvervoer.
        </li>
        <li>
          <strong>Bescherming.</strong> Tijdens de aanleg ontstaat stof en
          rommel. LAB21 is hier niet verantwoordelijk voor; bescherm zelf
          gevoelige oppervlakken en interieur.
        </li>
        <li>
          <strong>Droogperiode.</strong> Tussen de installatie van de
          vloerverwarming en het leggen van de definitieve vloerafwerking moet
          de minimaal opgegeven droogperiode in acht worden genomen.
        </li>
        <li>
          <strong>Aansluiting verdeler.</strong> De positie van de verdeler
          moet technisch goedgekeurd worden en wordt in overleg bepaald.
          Standaard aansluitmaten zijn 15, 22 of 28 mm.
        </li>
        <li>
          <strong>Aanwezigheid op leveringsdag.</strong> Op de dag van montage
          dient de klant aanwezig te zijn voor inmeting en bevestiging van de
          werkzaamheden. Bij niet-aanwezigheid kunnen extra kosten in rekening
          gebracht worden.
        </li>
      </ol>
      <p style={{ marginTop: 12, color: "var(--color-muted)", fontSize: 12 }}>
        Volledige juridische tekst: zie de inmeetformulier-PDF van LAB21.
      </p>
    </details>
  );
}
