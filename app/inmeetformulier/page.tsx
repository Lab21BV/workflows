import { InmeetForm } from "./_Form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickString(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function InmeetformulierPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const orderId = pickString(sp.orderId);

  if (!orderId) {
    return (
      <>
        <h1>Inmeetformulier vloerverwarming</h1>
        <div className="card" style={{ borderLeft: "3px solid var(--color-clay)" }}>
          <p>
            Deze pagina heeft een <code>orderId</code> parameter nodig.
            Voorbeeld: <code>/inmeetformulier?orderId=728921000099999999</code>.
          </p>
          <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
            Je krijgt deze link via de e-mail die we sturen zodra je order is
            goedgekeurd. Kun je de link niet vinden? Neem dan contact met ons op.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Inmeetformulier vloerverwarming</h1>
      <p>
        Vul dit formulier in zodat onze aannemer vloerverwarming op de
        installatiedag direct kan starten. Velden met * zijn verplicht.
      </p>
      <InmeetForm zohoOrderId={orderId} />
    </>
  );
}
