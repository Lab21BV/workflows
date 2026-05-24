"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lazy-loaded Mermaid renderer. We import the library client-side only
 * (~600KB) so the rest of the app stays light.
 */
export function MermaidDiagram({ source }: { source: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            background: "#0d1117",
            primaryColor: "#161b22",
            primaryTextColor: "#e6edf3",
            primaryBorderColor: "#30363d",
            lineColor: "#8b949e",
            secondaryColor: "#21262d",
            tertiaryColor: "#161b22",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          },
          flowchart: { useMaxWidth: true, htmlLabels: true },
          securityLevel: "loose",
        });
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, source);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) {
    return (
      <div className="error">
        Diagram-fout: {error}
        <pre style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>{source}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: 16,
        overflowX: "auto",
        minHeight: 120,
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 12 }}>Laadt diagram…</div>
    </div>
  );
}
