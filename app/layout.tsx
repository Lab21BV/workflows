import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAB21 Workflows",
  description: "Zoho CRM workflow runner + tijdlijn-visualisatie",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={GeistSans.variable}>
      <body>
        <div className="topbar">
          <div className="topbar-inner">
            <span>LAB21 / Operations</span>
            <span>Workflow runner</span>
          </div>
        </div>
        <header className="main">
          <div className="inner">
            <a href="/" className="brand">
              LAB<span className="accent">21</span> Workflows
            </a>
            <nav>
              <a href="/">Dashboard</a>
              <a href="/processen">Processen</a>
              <a href="/tijdlijn">Tijdlijn</a>
              <a href="/todo/accountmanager">Accountmanager</a>
              <a href="/todo/inkoop-planning">Inkoop en Planning</a>
              <a href="/architecture">Architecture</a>
              <a href="/docs">Specs</a>
              <a href="/api/status">/api/status</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
