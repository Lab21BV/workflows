"use client";

import { useState, useTransition } from "react";
import {
  DROOGBOUW_TYPE,
  JA_NEE,
  POMPVERDELER,
  RUIMTE_VERDIEPING,
  VLOER_TYPE,
  inmeetFormSchema,
  type InmeetForm,
} from "@/src/data/inmeet-form-schema";
import { submitInmeet } from "./actions";
import { Voorwaarden } from "./_Voorwaarden";

type Ruimte = InmeetForm["ruimtes"][number];

type FormState = {
  naamKlant: string;
  installatieAdres: string;
  postcode: string;
  email: string;
  telefoon: string;
  typeWoonhuis: string;
  bouwjaarWoning: string;
  kruipruimteAanwezig: "Ja" | "Nee" | "";
  dekvloer: (typeof VLOER_TYPE)[number] | "";
  droogbouwvloer: (typeof DROOGBOUW_TYPE)[number] | "";
  leidingInDekvloerAanwezig: "Ja" | "Nee" | "";
  ruimtes: Array<{ verdieping: Ruimte["verdieping"] | ""; nettoOppervlakteM2: string }>;
  aanvoerRetourleidingAanwezig: "Ja" | "Nee" | "";
  positieVerdeler: string;
  diameterCvLeidingenMm: string;
  stopcontactAanwezig: "Ja" | "Nee" | "";
  cvKetelMerk: string;
  stadsverwarming: "Ja" | "Nee" | "";
  thermostaatAanwezig: "Ja" | "Nee" | "";
  warmtepomp: "Ja" | "Nee" | "";
  pompverdelerType: (typeof POMPVERDELER)[number] | "";
  fotoRuimte: boolean;
  fotoVerdelerplek: boolean;
  fotoCvKetel: boolean;
  fotoWarmtepompverdeler: boolean;
  fotoToelichting: string;
  installatievoorwaardenGelezen: boolean;
};

function emptyState(): FormState {
  return {
    naamKlant: "",
    installatieAdres: "",
    postcode: "",
    email: "",
    telefoon: "",
    typeWoonhuis: "",
    bouwjaarWoning: "",
    kruipruimteAanwezig: "",
    dekvloer: "",
    droogbouwvloer: "",
    leidingInDekvloerAanwezig: "",
    ruimtes: [{ verdieping: "", nettoOppervlakteM2: "" }],
    aanvoerRetourleidingAanwezig: "",
    positieVerdeler: "",
    diameterCvLeidingenMm: "",
    stopcontactAanwezig: "",
    cvKetelMerk: "",
    stadsverwarming: "",
    thermostaatAanwezig: "",
    warmtepomp: "",
    pompverdelerType: "",
    fotoRuimte: false,
    fotoVerdelerplek: false,
    fotoCvKetel: false,
    fotoWarmtepompverdeler: false,
    fotoToelichting: "",
    installatievoorwaardenGelezen: false,
  };
}

const radioLabel: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  marginRight: 16,
  fontSize: 13.5,
  cursor: "pointer",
};

const fieldRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "200px 1fr",
  gap: 12,
  alignItems: "start",
  marginBottom: 10,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13.5,
  color: "var(--color-ink)",
  paddingTop: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--color-line)",
  borderRadius: 4,
  fontSize: 14,
  background: "white",
};

const errorStyle: React.CSSProperties = {
  color: "var(--color-clay)",
  fontSize: 12,
  marginTop: 2,
};

function Radio<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | "";
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      {options.map((opt) => (
        <label key={opt} style={radioLabel}>
          <input
            type="radio"
            name={name}
            checked={value === opt}
            onChange={() => onChange(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

export function InmeetForm({ zohoOrderId }: { zohoOrderId: string }) {
  const [state, setState] = useState<FormState>(emptyState);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<{
    submissionId: string;
    datumsId: string | null;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function setRuimte(idx: number, patch: Partial<FormState["ruimtes"][number]>) {
    setState((s) => ({
      ...s,
      ruimtes: s.ruimtes.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  }

  function addRuimte() {
    setState((s) =>
      s.ruimtes.length >= 6
        ? s
        : { ...s, ruimtes: [...s.ruimtes, { verdieping: "", nettoOppervlakteM2: "" }] },
    );
  }

  function removeRuimte(idx: number) {
    setState((s) =>
      s.ruimtes.length <= 1
        ? s
        : { ...s, ruimtes: s.ruimtes.filter((_, i) => i !== idx) },
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side parse via dezelfde zod-schema voor snelle feedback.
    const parsed = inmeetFormSchema.safeParse({
      ...state,
      bouwjaarWoning: state.bouwjaarWoning,
      diameterCvLeidingenMm: state.diameterCvLeidingenMm,
      ruimtes: state.ruimtes.map((r) => ({
        verdieping: r.verdieping,
        nettoOppervlakteM2: r.nettoOppervlakteM2,
      })),
      // Conditionals — strip lege strings naar undefined zodat .optional() pakt
      droogbouwvloer: state.droogbouwvloer || undefined,
      thermostaatAanwezig: state.thermostaatAanwezig || undefined,
      pompverdelerType: state.pompverdelerType || undefined,
      cvKetelMerk: state.cvKetelMerk || undefined,
      fotoToelichting: state.fotoToelichting || undefined,
    });
    if (!parsed.success) {
      const fe: Record<string, string[]> = {};
      for (const i of parsed.error.issues) {
        const k = i.path.join(".") || "_root";
        (fe[k] ||= []).push(i.message);
      }
      setErrors(fe);
      return;
    }

    startTransition(async () => {
      const res = await submitInmeet(zohoOrderId, parsed.data);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { _root: [res.error] });
        return;
      }
      setDone({ submissionId: res.submissionId, datumsId: res.datumsId });
    });
  }

  if (done) {
    return (
      <div className="card" style={{ borderLeft: "3px solid var(--color-tan)" }}>
        <h2 style={{ marginTop: 0 }}>Dank je wel — formulier ontvangen.</h2>
        <p>
          Je inmeetformulier is opgeslagen. We nemen contact met je op zodra de
          aannemer vloerverwarming is toegewezen.
        </p>
        <p style={{ color: "var(--color-muted)", fontSize: 12 }}>
          Referentie: <code>{done.submissionId}</code>
          {done.datumsId && (
            <>
              {" "}
              · Zoho Datums_2: <code>{done.datumsId}</code>
            </>
          )}
        </p>
      </div>
    );
  }

  function err(name: string) {
    const e = errors[name];
    if (!e) return null;
    return <div style={errorStyle}>{e.join(" · ")}</div>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errors._root && (
        <div className="card" style={{ borderLeft: "3px solid var(--color-clay)" }}>
          <strong>Er ging iets mis</strong>
          <div style={errorStyle}>{errors._root.join(" · ")}</div>
        </div>
      )}

      <h2>Algemeen</h2>
      <div className="card">
        <div style={fieldRow}>
          <label style={labelStyle}>Naam klant *</label>
          <div>
            <input
              style={inputStyle}
              value={state.naamKlant}
              onChange={(e) => setField("naamKlant", e.target.value)}
              autoComplete="name"
            />
            {err("naamKlant")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Installatie-adres *</label>
          <div>
            <input
              style={inputStyle}
              value={state.installatieAdres}
              onChange={(e) => setField("installatieAdres", e.target.value)}
              autoComplete="street-address"
            />
            {err("installatieAdres")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Postcode *</label>
          <div>
            <input
              style={inputStyle}
              value={state.postcode}
              onChange={(e) => setField("postcode", e.target.value)}
              autoComplete="postal-code"
            />
            {err("postcode")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>E-mail *</label>
          <div>
            <input
              style={inputStyle}
              type="email"
              value={state.email}
              onChange={(e) => setField("email", e.target.value)}
              autoComplete="email"
            />
            {err("email")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Telefoonnummer *</label>
          <div>
            <input
              style={inputStyle}
              value={state.telefoon}
              onChange={(e) => setField("telefoon", e.target.value)}
              autoComplete="tel"
            />
            {err("telefoon")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Type woonhuis *</label>
          <div>
            <input
              style={inputStyle}
              value={state.typeWoonhuis}
              onChange={(e) => setField("typeWoonhuis", e.target.value)}
              placeholder="bv. rijtjeshuis, appartement, hoekwoning..."
            />
            {err("typeWoonhuis")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Bouwjaar woning *</label>
          <div>
            <input
              style={{ ...inputStyle, width: 120 }}
              type="number"
              value={state.bouwjaarWoning}
              onChange={(e) => setField("bouwjaarWoning", e.target.value)}
              min={1800}
              max={new Date().getFullYear() + 1}
            />
            {err("bouwjaarWoning")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Kruipruimte aanwezig? *</label>
          <div>
            <Radio
              name="kruipruimte"
              value={state.kruipruimteAanwezig}
              options={JA_NEE}
              onChange={(v) => setField("kruipruimteAanwezig", v)}
            />
            {err("kruipruimteAanwezig")}
          </div>
        </div>
      </div>

      <h2>Vloer</h2>
      <div className="card">
        <p style={{ color: "var(--color-muted)", fontSize: 13, marginTop: 0 }}>
          Belangrijk voor het inslijpen is dat de dekvloer vlak is. Is dat niet
          het geval, dan moet de vloer worden geëgaliseerd.
        </p>
        <div style={fieldRow}>
          <label style={labelStyle}>Dekvloer *</label>
          <div>
            <Radio
              name="dekvloer"
              value={state.dekvloer}
              options={VLOER_TYPE}
              onChange={(v) => setField("dekvloer", v)}
            />
            {err("dekvloer")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Droogbouwvloer (indien van toepassing)</label>
          <div>
            <Radio
              name="droogbouwvloer"
              value={state.droogbouwvloer}
              options={DROOGBOUW_TYPE}
              onChange={(v) => setField("droogbouwvloer", v)}
            />
            <p style={{ color: "var(--color-muted)", fontSize: 12, marginTop: 4 }}>
              Scheuren moeten verwijderd worden uit de platen.
            </p>
            {err("droogbouwvloer")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Leiding in dekvloer aanwezig? *</label>
          <div>
            <Radio
              name="leiding"
              value={state.leidingInDekvloerAanwezig}
              options={JA_NEE}
              onChange={(v) => setField("leidingInDekvloerAanwezig", v)}
            />
            {err("leidingInDekvloerAanwezig")}
          </div>
        </div>
      </div>

      <h2>Ruimtes</h2>
      <div className="card">
        {state.ruimtes.map((r, i) => (
          <div
            key={i}
            style={{
              borderBottom:
                i < state.ruimtes.length - 1 ? "1px solid var(--color-line)" : "none",
              paddingBottom: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <strong>Ruimte {i + 1}</strong>
              {state.ruimtes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRuimte(i)}
                  style={{
                    color: "var(--color-clay)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  verwijder
                </button>
              )}
            </div>
            <div style={fieldRow}>
              <label style={labelStyle}>Verdieping</label>
              <div>
                <Radio
                  name={`ruimte-${i}-verdieping`}
                  value={r.verdieping}
                  options={RUIMTE_VERDIEPING}
                  onChange={(v) => setRuimte(i, { verdieping: v })}
                />
                {err(`ruimtes.${i}.verdieping`)}
              </div>
            </div>
            <div style={fieldRow}>
              <label style={labelStyle}>Netto oppervlakte (m²)</label>
              <div>
                <input
                  style={{ ...inputStyle, width: 120 }}
                  type="number"
                  step="0.01"
                  value={r.nettoOppervlakteM2}
                  onChange={(e) => setRuimte(i, { nettoOppervlakteM2: e.target.value })}
                />
                {err(`ruimtes.${i}.nettoOppervlakteM2`)}
              </div>
            </div>
          </div>
        ))}
        {state.ruimtes.length < 6 && (
          <button
            type="button"
            onClick={addRuimte}
            style={{
              padding: "6px 12px",
              background: "var(--color-tan)",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            + Ruimte toevoegen
          </button>
        )}
        {err("ruimtes")}
      </div>

      <h2>Verdeler</h2>
      <div className="card">
        <div style={fieldRow}>
          <label style={labelStyle}>Aanvoer/retourleiding aanwezig? *</label>
          <div>
            <Radio
              name="aanvoer"
              value={state.aanvoerRetourleidingAanwezig}
              options={JA_NEE}
              onChange={(v) => setField("aanvoerRetourleidingAanwezig", v)}
            />
            {err("aanvoerRetourleidingAanwezig")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Positie verdeler *</label>
          <div>
            <input
              style={inputStyle}
              value={state.positieVerdeler}
              onChange={(e) => setField("positieVerdeler", e.target.value)}
              placeholder="bv. meterkast, kelder, technische ruimte..."
            />
            {err("positieVerdeler")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Diameter CV-leidingen (mm) *</label>
          <div>
            <input
              style={{ ...inputStyle, width: 120 }}
              type="number"
              step="0.5"
              value={state.diameterCvLeidingenMm}
              onChange={(e) => setField("diameterCvLeidingenMm", e.target.value)}
            />
            {err("diameterCvLeidingenMm")}
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Stopcontact aanwezig? *</label>
          <div>
            <Radio
              name="stopcontact"
              value={state.stopcontactAanwezig}
              options={JA_NEE}
              onChange={(v) => setField("stopcontactAanwezig", v)}
            />
            {err("stopcontactAanwezig")}
          </div>
        </div>
      </div>

      <h2>Verwarmingsbron</h2>
      <div className="card">
        <div style={fieldRow}>
          <label style={labelStyle}>CV-ketel / merk</label>
          <div>
            <input
              style={inputStyle}
              value={state.cvKetelMerk}
              onChange={(e) => setField("cvKetelMerk", e.target.value)}
              placeholder="bv. Remeha Tzerra, Intergas Compact HRE..."
            />
          </div>
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Stadsverwarming *</label>
          <div>
            <Radio
              name="stadsverwarming"
              value={state.stadsverwarming}
              options={JA_NEE}
              onChange={(v) => {
                setField("stadsverwarming", v);
                if (v === "Nee") setField("thermostaatAanwezig", "");
              }}
            />
            {err("stadsverwarming")}
          </div>
        </div>
        {state.stadsverwarming === "Ja" && (
          <div style={fieldRow}>
            <label style={labelStyle}>Thermostaat aanwezig?</label>
            <div>
              <Radio
                name="thermostaat"
                value={state.thermostaatAanwezig}
                options={JA_NEE}
                onChange={(v) => setField("thermostaatAanwezig", v)}
              />
              {err("thermostaatAanwezig")}
            </div>
          </div>
        )}
        <div style={fieldRow}>
          <label style={labelStyle}>Warmtepomp *</label>
          <div>
            <Radio
              name="warmtepomp"
              value={state.warmtepomp}
              options={JA_NEE}
              onChange={(v) => {
                setField("warmtepomp", v);
                if (v === "Nee") setField("pompverdelerType", "");
              }}
            />
            {err("warmtepomp")}
          </div>
        </div>
        {state.warmtepomp === "Ja" && (
          <div style={fieldRow}>
            <label style={labelStyle}>Type pompverdeler</label>
            <div>
              <Radio
                name="pompverdeler"
                value={state.pompverdelerType}
                options={POMPVERDELER}
                onChange={(v) => setField("pompverdelerType", v)}
              />
              {err("pompverdelerType")}
            </div>
          </div>
        )}
      </div>

      <h2>Foto&apos;s</h2>
      <div className="card">
        <p style={{ marginTop: 0, fontSize: 13.5 }}>
          Stuur ons de volgende foto&apos;s mee (los aanleveren via mail of
          WhatsApp). Vink aan wat je hebt klaarstaan:
        </p>
        <label
          style={{ display: "block", marginBottom: 6, cursor: "pointer", fontSize: 13.5 }}
        >
          <input
            type="checkbox"
            checked={state.fotoRuimte}
            onChange={(e) => setField("fotoRuimte", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Ruimte waar de vloerverwarming komt te liggen
        </label>
        <label
          style={{ display: "block", marginBottom: 6, cursor: "pointer", fontSize: 13.5 }}
        >
          <input
            type="checkbox"
            checked={state.fotoVerdelerplek}
            onChange={(e) => setField("fotoVerdelerplek", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Plek waar de verdeler komt te liggen
        </label>
        <label
          style={{ display: "block", marginBottom: 6, cursor: "pointer", fontSize: 13.5 }}
        >
          <input
            type="checkbox"
            checked={state.fotoCvKetel}
            onChange={(e) => setField("fotoCvKetel", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          CV-ketel en merk
        </label>
        <label
          style={{ display: "block", marginBottom: 12, cursor: "pointer", fontSize: 13.5 }}
        >
          <input
            type="checkbox"
            checked={state.fotoWarmtepompverdeler}
            onChange={(e) => setField("fotoWarmtepompverdeler", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Warmtepomp verdeler
        </label>
        <div style={fieldRow}>
          <label style={labelStyle}>Hoe lever je de foto&apos;s aan?</label>
          <div>
            <input
              style={inputStyle}
              value={state.fotoToelichting}
              onChange={(e) => setField("fotoToelichting", e.target.value)}
              placeholder="bv. via mail naar info@lab21.nl"
            />
          </div>
        </div>
      </div>

      <h2>Bevestiging</h2>
      <Voorwaarden />
      <div className="card" style={{ marginTop: 12 }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={state.installatievoorwaardenGelezen}
            onChange={(e) =>
              setField("installatievoorwaardenGelezen", e.target.checked)
            }
            style={{ marginTop: 3 }}
          />
          <span style={{ fontSize: 13.5 }}>
            Ik bevestig dat ik de installatievoorwaarden heb gelezen en akkoord
            ga met de uitvoering volgens die voorwaarden.
          </span>
        </label>
        {err("installatievoorwaardenGelezen")}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "10px 20px",
            background: "var(--color-ink)",
            color: "var(--color-bone)",
            border: "none",
            borderRadius: 4,
            cursor: isPending ? "wait" : "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {isPending ? "Bezig met opslaan…" : "Inmeetformulier verzenden"}
        </button>
        <span style={{ color: "var(--color-muted)", fontSize: 12, alignSelf: "center" }}>
          Order-ref: <code>{zohoOrderId}</code>
        </span>
      </div>
    </form>
  );
}
