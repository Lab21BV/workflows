import fs from "node:fs/promises";
import path from "node:path";

const SPECS_DIR = path.join(process.cwd(), "docs/superpowers/specs");

export const dynamic = "force-static";

type SpecEntry = {
  slug: string;
  title: string;
  date: string | null;
  summary: string | null;
};

async function loadSpecs(): Promise<SpecEntry[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(SPECS_DIR);
  } catch {
    return [];
  }
  const specs: SpecEntry[] = [];
  for (const f of files.filter((x) => x.endsWith(".md")).sort().reverse()) {
    const slug = f.replace(/\.md$/, "");
    const content = await fs.readFile(path.join(SPECS_DIR, f), "utf8");
    const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? slug;
    const date = slug.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
    const summaryRaw = content
      .match(/^##\s+1\.\s+Summary\s*\n+([\s\S]+?)(?=\n##\s)/m)?.[1]
      ?.trim();
    const summary = summaryRaw
      ? summaryRaw.replace(/\s+/g, " ").slice(0, 220) +
        (summaryRaw.length > 220 ? "…" : "")
      : null;
    specs.push({ slug, title, date, summary });
  }
  return specs;
}

export default async function DocsIndex() {
  const specs = await loadSpecs();
  return (
    <>
      <h1>Design specs</h1>
      <p>
        Per-feature design documents for the LAB21 Operations app. Generated
        from <code>docs/superpowers/specs/*.md</code> in this repo.
      </p>

      {specs.length === 0 ? (
        <div className="card">
          <p>No specs yet.</p>
        </div>
      ) : (
        <div className="grid">
          {specs.map((s) => (
            <a
              key={s.slug}
              href={`/docs/${s.slug}`}
              className="card"
              style={{ textDecoration: "none", color: "var(--fg)" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <strong style={{ color: "var(--fg)" }}>{s.title}</strong>
                {s.date && (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    {s.date}
                  </span>
                )}
              </div>
              {s.summary && (
                <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>
                  {s.summary}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
