import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAB21 Workflows",
  description: "Zoho CRM workflow runner + tijdlijn-visualisatie",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <header>
          <a href="/">
            <strong>LAB21 Workflows</strong>
          </a>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/tijdlijn">Tijdlijn</a>
            <a href="/architecture">Architecture</a>
            <a href="/api/status">/api/status</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
