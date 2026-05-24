import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { marked } from "marked";

const SPECS_DIR = path.join(process.cwd(), "docs/superpowers/specs");

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const files = await fs.readdir(SPECS_DIR);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ slug: f.replace(/\.md$/, "") }));
  } catch {
    return [];
  }
}

async function loadSpec(slug: string): Promise<string | null> {
  const file = path.join(SPECS_DIR, `${slug}.md`);
  if (path.relative(SPECS_DIR, file).startsWith("..")) return null;
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const md = await loadSpec(slug);
  if (md === null) notFound();

  marked.setOptions({ gfm: true, breaks: false });
  const html = await marked.parse(md);

  return (
    <>
      <p style={{ marginBottom: 16 }}>
        <a href="/docs">← All specs</a>
      </p>
      <article
        className="markdown"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
