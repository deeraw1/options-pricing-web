"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const DEFAULT_QUOTES = `# K, T, market_price, type
90,  0.25, 12.5, call
100, 0.25,  5.6, call
110, 0.25,  1.5, call
90,  0.50, 14.2, call
100, 0.50,  7.5, call
110, 0.50,  3.4, call
90,  1.00, 17.0, call
100, 1.00, 10.5, call
110, 1.00,  5.9, call`;

type Point = { K: number; T: number; moneyness: number; iv: number; total_variance: number };
type SurfaceRes = {
  points: Point[];
  butterfly_violations: any[];
  calendar_violations: any[];
};

export default function VolSurface() {
  const [S, setS] = useState(100);
  const [r, setR] = useState(0.05);
  const [q, setQ] = useState(0.0);
  const [text, setText] = useState(DEFAULT_QUOTES);
  const [res, setRes] = useState<SurfaceRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true); setErr("");
    const quotes = text.split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(l => l.split(",").map(s => s.trim()))
      .filter(p => p.length >= 3)
      .map(p => ({ K: +p[0], T: +p[1], price: +p[2], option: (p[3] || "call") as "call" | "put" }));
    try { setRes(await api("/surface", { S, r, q, quotes })); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const tenors = res ? Array.from(new Set(res.points.map(p => p.T))).sort((a, b) => a - b) : [];
  const colors = ["#7c3aed", "#34d399", "#fbbf24", "#f87171", "#60a5fa", "#a78bfa"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
      <div className="card">
        <div className="section-title">Market quotes</div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">Spot S</label>
          <input className="input" type="number" value={S} onChange={e => setS(+e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div><label className="label">r</label>
            <input className="input" type="number" value={r} onChange={e => setR(+e.target.value)} step="0.001" /></div>
          <div><label className="label">q</label>
            <input className="input" type="number" value={q} onChange={e => setQ(+e.target.value)} step="0.001" /></div>
        </div>
        <label className="label">Quotes (K, T, price, type)</label>
        <textarea
          className="input"
          style={{ height: 220, fontFamily: "monospace", fontSize: "0.78rem", resize: "vertical" }}
          value={text} onChange={e => setText(e.target.value)}
        />
        <button className="btn" onClick={go} disabled={busy} style={{ width: "100%", marginTop: 14 }}>
          {busy ? "Building..." : "Build surface"}
        </button>
        {err && <div style={{ color: "var(--bad)", fontSize: "0.8rem", marginTop: 10 }}>{err}</div>}
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        <div className="card">
          <div className="section-title">Implied vol vs strike (per tenor)</div>
          {res ? (
            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#181f2e" strokeDasharray="3 3" />
                  <XAxis dataKey="moneyness" type="number" name="K/S" stroke="#8a9ab8" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="iv" type="number" name="IV" stroke="#8a9ab8" tick={{ fontSize: 11 }}
                          tickFormatter={(v) => (v * 100).toFixed(0) + "%"} />
                  <ZAxis range={[40, 40]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }}
                            contentStyle={{ background: "#0d1117", border: "1px solid #1e2d44" }}
                            formatter={(v: any, n) => n === "iv" ? (v * 100).toFixed(2) + "%" : v} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {tenors.map((T, i) => (
                    <Scatter key={T} name={`T=${T.toFixed(2)}y`}
                             data={res.points.filter(p => p.T === T)} fill={colors[i % colors.length]} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : <p style={{ color: "var(--faint)", padding: "40px 0", textAlign: "center" }}>Build a surface to view smiles</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ArbCard title="Butterfly (vertical) arb" rows={res?.butterfly_violations || []} empty={!res} />
          <ArbCard title="Calendar arb" rows={res?.calendar_violations || []} empty={!res} />
        </div>
      </div>
    </div>
  );
}

function ArbCard({ title, rows, empty }: { title: string; rows: any[]; empty: boolean }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{title}</div>
        {!empty && (
          <span className={"pill " + (rows.length === 0 ? "pill-good" : "pill-bad")}>
            {rows.length === 0 ? "No violations" : `${rows.length} violation${rows.length > 1 ? "s" : ""}`}
          </span>
        )}
      </div>
      {empty ? (
        <div style={{ color: "var(--faint)", fontSize: "0.85rem" }}>—</div>
      ) : rows.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Surface is arbitrage-free along this axis.</div>
      ) : (
        <div style={{ fontSize: "0.78rem", color: "var(--muted)", maxHeight: 180, overflow: "auto" }}>
          {rows.map((r, i) => <pre key={i} style={{ margin: "4px 0", fontFamily: "monospace" }}>{JSON.stringify(r)}</pre>)}
        </div>
      )}
    </div>
  );
}
