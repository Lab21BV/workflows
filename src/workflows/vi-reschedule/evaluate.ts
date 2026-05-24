import type { Outcome, VoorinspectieRecord } from "./types";
import { daysBetween, isLater, tegenpartij } from "./helpers";

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

  // Stage 2 — aanvrager chose a branch
  if (vi.VI_Voorstel_Status === "aanvrager_moet_kiezen" && vi.VI_Branch_Gekozen) {
    if (vi.VI_Branch_Gekozen === "A_nieuwe_vi_datum") {
      out.push({
        kind: "set_status",
        status: "none",
        reason: "Nieuwe ronde — aanvrager kiest andere VI-datum",
      });
    } else {
      out.push({ kind: "set_status", status: "awaiting_klant_leverdatum" });
      out.push({
        kind: "notify_portal_user",
        who: "klant",
        template: "vraag_nieuwe_leverdatum_met_toelichting",
      });
    }
    return out;
  }

  // Stage 3 — tegenpartij reacted
  if (vi.VI_Voorstel_Status === "awaiting_tegenpartij" && vi.VI_Tegenpartij_Reactie) {
    if (vi.VI_Tegenpartij_Reactie === "accepted") {
      if (!vi.VI_Geaccepteerd_Tijdslot_Van) {
        out.push({
          kind: "set_status",
          status: "rejected",
          reason: "Acceptatie zonder gekozen tijdslot — portal-bug",
        });
        return out;
      }
      out.push({ kind: "commit_vi_datetime", datetime: vi.VI_Geaccepteerd_Tijdslot_Van });
      out.push({ kind: "set_status", status: "done" });
      out.push({
        kind: "log_tijdlijn",
        event: `VI-datum ${vi.VI_Geaccepteerd_Tijdslot_Van} bevestigd door beide partijen`,
      });
      out.push({
        kind: "create_todo",
        department: "inkoop_planning",
        title: `VI-datum gewijzigd voor ${vi.id}`,
        body: `Nieuwe VI-datum: ${vi.VI_Geaccepteerd_Tijdslot_Van}. Controleer of inkoop/levering aansluit.`,
      });
    } else {
      out.push({
        kind: "set_status",
        status: "none",
        reason: "Tegenpartij weigerde; ronde opnieuw",
      });
      out.push({
        kind: "notify_portal_user",
        who: vi.VI_Voorgesteld_Door!,
        template: "vi_tegenpartij_weigert",
      });
    }
    return out;
  }

  // Stage 4 — klant gave a new leverdatum
  if (vi.VI_Voorstel_Status === "klant_kiest_leverdatum" && vi.VI_Nieuwe_Leverdatum_Voorstel) {
    const direction = isLater(vi.VI_Nieuwe_Leverdatum_Voorstel, vi.Leverdatum_Origineel)
      ? "later"
      : "eerder";
    out.push({
      kind: "update_leverdatum",
      nieuweDatum: vi.VI_Nieuwe_Leverdatum_Voorstel,
      direction,
    });

    const buffer = vi.VI_Buffer_Snapshot_Dagen ?? 7 + langsteLevertijdDagen;
    const gap = daysBetween(vi.VI_Voorgestelde_Datum!, vi.VI_Nieuwe_Leverdatum_Voorstel);

    if (gap >= buffer) {
      out.push({ kind: "set_status", status: "awaiting_tegenpartij" });
      out.push({
        kind: "notify_portal_user",
        who: tegenpartij(vi.VI_Voorgesteld_Door!),
        template: "vi_voorstel_review_na_leverdatum",
      });
      out.push({
        kind: "log_tijdlijn",
        event: `Leverdatum → ${vi.VI_Nieuwe_Leverdatum_Voorstel} (${direction}); buffer nu ok → tegenpartij beslist`,
      });
    } else {
      out.push({
        kind: "set_status",
        status: "none",
        reason: `Nieuwe leverdatum onvoldoende (gap ${gap}, vereist ${buffer}); nieuwe ronde`,
      });
      out.push({
        kind: "notify_portal_user",
        who: vi.VI_Voorgesteld_Door!,
        template: "vi_leverdatum_onvoldoende",
      });
      out.push({
        kind: "log_tijdlijn",
        event: `Leverdatum → ${vi.VI_Nieuwe_Leverdatum_Voorstel} (${direction}); buffer ${buffer} > gap ${gap} → nieuwe ronde`,
      });
    }
    out.push({
      kind: "create_todo",
      department: "inkoop_planning",
      title: `Leverdatum gewijzigd (${direction}) voor ${vi.id}`,
      body: `Nieuwe leverdatum: ${vi.VI_Nieuwe_Leverdatum_Voorstel} (oorspronkelijk ${vi.Leverdatum_Origineel}). Controleer inkoop en levering.`,
    });
    out.push({
      kind: "create_todo",
      department: "accountmanager",
      title: `Klant heeft leverdatum aangepast voor ${vi.id}`,
      body: `Nieuwe leverdatum (${direction}): ${vi.VI_Nieuwe_Leverdatum_Voorstel}. Toelichting klant: ${vi.VI_Toelichting_Klant ?? "—"}.`,
    });
    return out;
  }

  return out;
}
