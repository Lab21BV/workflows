import Link from "next/link";
import { redirect } from "next/navigation";

async function searchAction(formData: FormData) {
  "use server";
  const q = String(formData.get("q") ?? "").trim();
  if (q) redirect(`/tijdlijn/${encodeURIComponent(q)}`);
}

export default function TijdlijnIndex() {
  return (
    <>
      <h1>Tijdlijn</h1>
      <p>
        Voer een Sales_Order ID in (Zoho record ID, bv. <code>728921000099999999</code>) om de
        volledige tijdlijn van Datums_2-mijlpalen en gerelateerde Voorinspectie/Planning/Klacht
        records te tonen.
      </p>

      <form className="search" action={searchAction}>
        <input name="q" placeholder="Sales_Order ID" autoComplete="off" />
        <button type="submit">Open</button>
      </form>

      <div className="card">
        <h2 style={{ margin: 0 }}>Hoe vind ik een Sales_Order ID?</h2>
        <p style={{ color: "var(--fg)" }}>
          In Zoho CRM, open de Sales_Order en kijk in de URL — het laatste cijfer-segment is het
          record ID. Of zoek via{" "}
          <Link href="/api/status" target="_blank">
            /api/status
          </Link>{" "}
          en de Zoho REST API.
        </p>
      </div>
    </>
  );
}
