import type { Outcome, VoorinspectieRecord } from "./types";
import { daysBetween, tegenpartij } from "./helpers";

export function evaluateReschedule(
  vi: VoorinspectieRecord,
  langsteLevertijdDagen: number,
): Outcome[] {
  const out: Outcome[] = [];

  // Stage 1 — buffer check on a new proposal
  if (vi.VI_Voorstel_Status === "awaiting_evaluation") {
    const buffer = vi.VI_Buffer_Snapshot_Dagen ?? 7 + langsteLevertijdDagen;
    const gap = daysBetween(vi.VI_Voorgestelde_Datum!, vi.Leverdatum_Origineel);
    if (gap >= buffer) {
      out.push({ kind: "set_status", status: "awaiting_tegenpartij" });
      out.push({
        kind: "notify_portal_user",
        who: tegenpartij(vi.VI_Voorgesteld_Door!),
        template: "vi_voorstel_review",
      });
      out.push({ kind: "log_tijdlijn", event: "VI-voorstel geaccepteerd voor review (buffer ok)" });
    } else {
      out.push({
        kind: "set_status",
        status: "aanvrager_moet_kiezen",
        reason: `Buffer ${buffer} dagen niet gehaald (${gap} dagen)`,
      });
      out.push({
        kind: "notify_portal_user",
        who: vi.VI_Voorgesteld_Door!,
        template: "vi_buffer_te_krap",
      });
    }
    return out;
  }

  return out;
}
