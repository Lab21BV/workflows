// src/workflows/vi-reschedule/types.ts

import type { Department } from "../../lib/departments";

export type Aanvrager = "aannemer" | "klant";
export type { Department }; // re-export voor back-compat

export type VoorstelStatus =
  | "none"
  | "awaiting_evaluation"
  | "awaiting_tegenpartij"
  | "aanvrager_moet_kiezen"
  | "awaiting_klant_leverdatum"
  | "klant_kiest_leverdatum"
  | "done"
  | "rejected";

export type VoorinspectieRecord = {
  id: string;
  Leverdatum_Origineel: string;        // ISO date, snapshot of SO leverdatum at chain start
  Datum_tijd: string | null;           // existing committed VI datetime (ISO)
  VI_Voorstel_Status: VoorstelStatus;
  VI_Voorgestelde_Datum: string | null;
  VI_Voorgesteld_Door: Aanvrager | null;
  VI_Buffer_Snapshot_Dagen: number | null;
  VI_Branch_Gekozen: "A_nieuwe_vi_datum" | "B_klant_kiest_leverdatum" | null;
  VI_Nieuwe_Leverdatum_Voorstel: string | null;
  VI_Toelichting_Klant: string | null;
  VI_Tegenpartij_Reactie: "pending" | "accepted" | "rejected" | null;
  VI_Geaccepteerd_Tijdslot_Van: string | null;
};

export type Outcome =
  | { kind: "set_status"; status: VoorstelStatus; reason?: string }
  | { kind: "notify_portal_user"; who: Aanvrager | "klant" | "aannemer"; template: string }
  | { kind: "create_todo"; department: Department; title: string; body: string }
  | { kind: "update_leverdatum"; nieuweDatum: string; direction: "later" | "eerder" }
  | { kind: "commit_vi_datetime"; datetime: string }
  | { kind: "log_tijdlijn"; event: string };
