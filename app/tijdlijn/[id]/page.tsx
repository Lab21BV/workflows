import Link from "next/link";
import { RecordsApi, ZohoClient, ZohoApiError } from "@/src/zoho";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SalesOrder = {
  id: string;
  Subject?: string;
  Status?: string;
  Account_Name?: { id: string; name: string };
  Contact_Name?: { id: string; name: string };
  Owner?: { id: string; name: string };
  Grand_Total?: number;
  Created_Time?: string;
  Modified_Time?: string;
};

type Milestone = {
  id: string;
  Name?: string;
  Code?: string;
  Omschrijving?: string;
  Fase?: string;
  Status_acceptatie?: string;
  Created_Time?: string;
  Modified_Time?: string;
  Voorinspecties?: { id: string; name: string };
  Klantenservice?: { id: string; name: string };
  Uitvoeringen?: { id: string; name: string };
  Verkoopkans?: { id: string; name: string };
  Offerte?: { id: string; name: string };
};

type Voorinspectie = { id: string; Name?: string; Status?: string; Modified_Time?: string };
type Planning = {
  id: string;
  Name?: string;
  Dienst?: string;
  Fase?: string;
  Datum?: string;
  Modified_Time?: string;
};
type Klacht = {
  id: string;
  Name?: string;
  Type?: string;
  Status_klacht?: string;
  Modified_Time?: string;
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function badgeClass(status?: string): string {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes("approved") || s.includes("akkoord")) return "approved";
  if (s.includes("afgewezen") || s.includes("rejected")) return "rejected";
  if (s.includes("pending") || s.includes("wachten")) return "pending";
  return "";
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("nl-NL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

async function loadTimeline(salesOrderId: string) {
  const zoho = new ZohoClient();
  const records = new RecordsApi(zoho);

  const [order, milestones] = await Promise.all([
    records.get<SalesOrder & { [k: string]: unknown }>("Sales_Orders", salesOrderId),
    records.search<Milestone & { [k: string]: unknown }>("Datums_2", {
      criteria: `(Verkooporder:equals:${salesOrderId})`,
      perPage: 200,
    }),
  ]);

  const [vis, plans, klachten] = await Promise.all([
    records
      .search<Voorinspectie & { [k: string]: unknown }>("Voorinspecties", {
        criteria: `(Verkooporders:equals:${salesOrderId})`,
        perPage: 50,
      })
      .catch(() => ({ data: [] })),
    records
      .search<Planning & { [k: string]: unknown }>("Planningen", {
        criteria: `(Verkooporder:equals:${salesOrderId})`,
        perPage: 50,
      })
      .catch(() => ({ data: [] })),
    records
      .search<Klacht & { [k: string]: unknown }>("Klantenservice", {
        criteria: `(Verkooporder:equals:${salesOrderId})`,
        perPage: 50,
      })
      .catch(() => ({ data: [] })),
  ]);

  const sorted = [...milestones.data].sort((a, b) => {
    const ta = new Date(a.Modified_Time ?? a.Created_Time ?? 0).getTime();
    const tb = new Date(b.Modified_Time ?? b.Created_Time ?? 0).getTime();
    return ta - tb;
  });

  return {
    order,
    milestones: sorted,
    voorinspecties: vis.data,
    planningen: plans.data,
    klachten: klachten.data,
  };
}

export default async function TijdlijnDetail({ params }: PageProps) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof loadTimeline>> | null = null;
  let error: string | null = null;
  try {
    data = await loadTimeline(id);
  } catch (err) {
    if (err instanceof ZohoApiError) {
      error =
        err.status === 401
          ? "Zoho-credentials ontbreken of zijn verlopen. Configureer ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET en ZOHO_REFRESH_TOKEN."
          : `Zoho API ${err.status}: ${typeof err.body === "string" ? err.body : JSON.stringify(err.body)}`;
    } else if ((err as Error).message?.includes("ZOHO_")) {
      error = `Configuratiefout: ${(err as Error).message}`;
    } else {
      error = `Onbekende fout: ${(err as Error).message}`;
    }
  }

  return (
    <>
      <p>
        <Link href="/tijdlijn">← terug naar zoeker</Link>
      </p>
      <h1>
        Sales_Order <code>{id}</code>
      </h1>

      {error && <div className="error">{error}</div>}

      {data?.order && (
        <div className="card">
          <h2 style={{ margin: 0 }}>{data.order.Subject ?? "Onbekend"}</h2>
          <dl className="kv">
            <dt>Status</dt>
            <dd>{data.order.Status ?? "—"}</dd>
            <dt>Account</dt>
            <dd>{data.order.Account_Name?.name ?? "—"}</dd>
            <dt>Contact</dt>
            <dd>{data.order.Contact_Name?.name ?? "—"}</dd>
            <dt>Owner</dt>
            <dd>{data.order.Owner?.name ?? "—"}</dd>
            <dt>Created</dt>
            <dd>{formatDate(data.order.Created_Time)}</dd>
            <dt>Modified</dt>
            <dd>{formatDate(data.order.Modified_Time)}</dd>
          </dl>
        </div>
      )}

      {data && (
        <>
          <h2>Tijdlijn-mijlpalen ({data.milestones.length})</h2>
          {data.milestones.length === 0 ? (
            <p>Geen Datums_2 records voor deze order.</p>
          ) : (
            <ol className="timeline">
              {data.milestones.map((m) => (
                <li key={m.id} className={`timeline-item ${badgeClass(m.Status_acceptatie)}`}>
                  <div className="timeline-date">{formatDate(m.Modified_Time ?? m.Created_Time)}</div>
                  <div className="timeline-title">
                    {m.Code && <code style={{ marginRight: 8 }}>{m.Code}</code>}
                    {m.Omschrijving ?? m.Name ?? m.id}
                  </div>
                  <dl className="kv">
                    {m.Fase && (
                      <>
                        <dt>Fase</dt>
                        <dd>{m.Fase}</dd>
                      </>
                    )}
                    {m.Status_acceptatie && (
                      <>
                        <dt>Status</dt>
                        <dd>{m.Status_acceptatie}</dd>
                      </>
                    )}
                  </dl>
                </li>
              ))}
            </ol>
          )}

          <h2>Voorinspecties ({data.voorinspecties.length})</h2>
          <div className="grid">
            {data.voorinspecties.map((v) => (
              <div className="card" key={v.id}>
                <div>
                  <code>{v.Name}</code>
                </div>
                <p style={{ margin: "4px 0", color: "var(--fg)" }}>{v.Status ?? "—"}</p>
                <div className="timeline-date">{formatDate(v.Modified_Time)}</div>
              </div>
            ))}
          </div>

          <h2>Uitvoeringen / Planning ({data.planningen.length})</h2>
          <div className="grid">
            {data.planningen.map((p) => (
              <div className="card" key={p.id}>
                <div>
                  <code>{p.Name}</code>{" "}
                  <span className="badge">{p.Fase ?? "—"}</span>
                </div>
                <p style={{ margin: "4px 0", color: "var(--fg)" }}>{p.Dienst ?? "—"}</p>
                <div className="timeline-date">{p.Datum ?? formatDate(p.Modified_Time)}</div>
              </div>
            ))}
          </div>

          {data.klachten.length > 0 && (
            <>
              <h2>Klantenservice ({data.klachten.length})</h2>
              <div className="grid">
                {data.klachten.map((k) => (
                  <div className="card" key={k.id}>
                    <div>
                      <code>{k.Name}</code>{" "}
                      <span className="badge">{k.Type ?? "—"}</span>
                    </div>
                    <p style={{ margin: "4px 0", color: "var(--fg)" }}>{k.Status_klacht ?? "—"}</p>
                    <div className="timeline-date">{formatDate(k.Modified_Time)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
