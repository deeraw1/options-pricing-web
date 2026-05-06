"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import GreeksStrip from "./GreeksStrip";
import VolSurface from "./VolSurface";

type Greeks = { delta: number; gamma: number; theta: number; vega: number; rho: number };
type BSResult = { model: string; price: number; greeks: Greeks };
type HestonResult = { model: string; price: number; feller_condition: number; feller_satisfied: boolean };

export default function OptionsLab() {
  const [tab, setTab] = useState<"bs" | "heston" | "iv" | "surface">("bs");

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ marginBottom: 36 }}>
          <div className="section-label">Quantitative Derivatives</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Options Pricing Lab
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: 720, fontSize: "0.95rem" }}>
            Closed-form <strong>Black-Scholes</strong>, <strong>Heston</strong> stochastic vol pricing,
            full Greeks, an implied-vol solver, and a vol-surface builder with butterfly &
            calendar arbitrage diagnostics.
          </p>
        </header>

        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 28 }}>
          <div className={"tab " + (tab === "bs" ? "active" : "")} onClick={() => setTab("bs")}>Black-Scholes</div>
          <div className={"tab " + (tab === "heston" ? "active" : "")} onClick={() => setTab("heston")}>Heston</div>
          <div className={"tab " + (tab === "iv" ? "active" : "")} onClick={() => setTab("iv")}>Implied Vol</div>
          <div className={"tab " + (tab === "surface" ? "active" : "")} onClick={() => setTab("surface")}>Vol Surface</div>
        </div>

        {tab === "bs" && <BSPanel />}
        {tab === "heston" && <HestonPanel />}
        {tab === "iv" && <IVPanel />}
        {tab === "surface" && <VolSurface />}
      </div>
    </div>
  );
}

function fmt(x: number, d = 4) { return Number.isFinite(x) ? x.toFixed(d) : "—"; }

function BSPanel() {
  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [T, setT] = useState(0.5);
  const [r, setR] = useState(0.05);
  const [q, setQ] = useState(0.0);
  const [sigma, setSigma] = useState(0.25);
  const [option, setOption] = useState<"call" | "put">("call");
  const [res, setRes] = useState<BSResult | null>(null);
  const [strip, setStrip] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true); setErr("");
    try {
      const r1 = await api<BSResult>("/price/black-scholes",
        { S, K, T, r, q, sigma, option });
      setRes(r1);
      const r2 = await api<{ rows: any[] }>("/greeks/strip",
        { S, K, T, r, q, sigma, option });
      setStrip(r2.rows);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
      <div className="card">
        <div className="section-title">Inputs</div>
        <Row label="Spot S">
          <input className="input" type="number" value={S} onChange={e => setS(+e.target.value)} step="any" />
        </Row>
        <Row label="Strike K">
          <input className="input" type="number" value={K} onChange={e => setK(+e.target.value)} step="any" />
        </Row>
        <Row label="Time T (years)">
          <input className="input" type="number" value={T} onChange={e => setT(+e.target.value)} step="0.01" />
        </Row>
        <Row label="Risk-free r">
          <input className="input" type="number" value={r} onChange={e => setR(+e.target.value)} step="0.001" />
        </Row>
        <Row label="Dividend q">
          <input className="input" type="number" value={q} onChange={e => setQ(+e.target.value)} step="0.001" />
        </Row>
        <Row label="Volatility σ">
          <input className="input" type="number" value={sigma} onChange={e => setSigma(+e.target.value)} step="0.01" />
        </Row>
        <Row label="Type">
          <select className="select" value={option} onChange={e => setOption(e.target.value as any)}>
            <option value="call">Call</option><option value="put">Put</option>
          </select>
        </Row>
        <button className="btn" onClick={go} disabled={busy} style={{ width: "100%", marginTop: 10 }}>
          {busy ? "Pricing..." : "Price"}
        </button>
        {err && <div style={{ color: "var(--bad)", fontSize: "0.8rem", marginTop: 10 }}>{err}</div>}
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        <div className="card">
          <div className="section-title">Result</div>
          {res ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <Stat label="Price" value={fmt(res.price)} accent />
              <Stat label="Δ Delta" value={fmt(res.greeks.delta)} />
              <Stat label="Γ Gamma" value={fmt(res.greeks.gamma, 5)} />
              <Stat label="Θ Theta /day" value={fmt(res.greeks.theta)} />
              <Stat label="V Vega /1vol" value={fmt(res.greeks.vega)} />
              <Stat label="ρ Rho /1%" value={fmt(res.greeks.rho)} />
            </div>
          ) : <Empty>Run a pricing to see Greeks</Empty>}
        </div>
        {strip.length > 0 && (
          <div className="card">
            <div className="section-title">Greeks across strike strip</div>
            <GreeksStrip rows={strip} option={option} />
          </div>
        )}
      </div>
    </div>
  );
}

function HestonPanel() {
  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [T, setT] = useState(1.0);
  const [r, setR] = useState(0.05);
  const [q, setQ] = useState(0.0);
  const [v0, setV0] = useState(0.04);
  const [kappa, setKappa] = useState(2.0);
  const [theta, setTheta] = useState(0.04);
  const [sigmaV, setSigmaV] = useState(0.5);
  const [rho, setRho] = useState(-0.7);
  const [option, setOption] = useState<"call" | "put">("call");
  const [res, setRes] = useState<HestonResult | null>(null);
  const [bs, setBs] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true); setErr("");
    try {
      const r1 = await api<HestonResult>("/price/heston",
        { S, K, T, r, q, v0, kappa, theta, sigma_v: sigmaV, rho, option });
      setRes(r1);
      const r2 = await api<BSResult>("/price/black-scholes",
        { S, K, T, r, q, sigma: Math.sqrt(theta), option });
      setBs(r2.price);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
      <div className="card">
        <div className="section-title">Heston parameters</div>
        <Row label="Spot S"><input className="input" type="number" value={S} onChange={e => setS(+e.target.value)} step="any" /></Row>
        <Row label="Strike K"><input className="input" type="number" value={K} onChange={e => setK(+e.target.value)} step="any" /></Row>
        <Row label="Time T"><input className="input" type="number" value={T} onChange={e => setT(+e.target.value)} step="0.01" /></Row>
        <Row label="Risk-free r"><input className="input" type="number" value={r} onChange={e => setR(+e.target.value)} step="0.001" /></Row>
        <Row label="Dividend q"><input className="input" type="number" value={q} onChange={e => setQ(+e.target.value)} step="0.001" /></Row>
        <Row label="Initial variance v₀"><input className="input" type="number" value={v0} onChange={e => setV0(+e.target.value)} step="0.001" /></Row>
        <Row label="Mean-reversion κ"><input className="input" type="number" value={kappa} onChange={e => setKappa(+e.target.value)} step="0.1" /></Row>
        <Row label="Long-run variance θ"><input className="input" type="number" value={theta} onChange={e => setTheta(+e.target.value)} step="0.001" /></Row>
        <Row label="Vol-of-vol σᵥ"><input className="input" type="number" value={sigmaV} onChange={e => setSigmaV(+e.target.value)} step="0.01" /></Row>
        <Row label="Correlation ρ"><input className="input" type="number" value={rho} onChange={e => setRho(+e.target.value)} step="0.05" /></Row>
        <Row label="Type">
          <select className="select" value={option} onChange={e => setOption(e.target.value as any)}>
            <option value="call">Call</option><option value="put">Put</option>
          </select>
        </Row>
        <button className="btn" onClick={go} disabled={busy} style={{ width: "100%", marginTop: 10 }}>
          {busy ? "Integrating..." : "Price (Heston)"}
        </button>
        {err && <div style={{ color: "var(--bad)", fontSize: "0.8rem", marginTop: 10 }}>{err}</div>}
      </div>

      <div className="card">
        <div className="section-title">Result</div>
        {res ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
              <Stat label="Heston price" value={fmt(res.price)} accent />
              <Stat label="BS reference (σ=√θ)" value={fmt(bs ?? NaN)} />
              <Stat label="Stoch-vol premium"
                    value={bs != null ? fmt(res.price - bs) : "—"} />
            </div>
            <div className="kv">
              <span className="kv-key">2κθ − σᵥ² (Feller)</span>
              <span className="kv-val">{fmt(res.feller_condition)}</span>
            </div>
            <div className="kv">
              <span className="kv-key">Variance positivity</span>
              <span className={"pill " + (res.feller_satisfied ? "pill-good" : "pill-bad")}>
                {res.feller_satisfied ? "Satisfied" : "Violated"}
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 16 }}>
              Heston captures the volatility smile by letting variance follow a mean-reverting CIR
              process. The negative ρ is the mechanism behind the equity-index skew.
            </p>
          </>
        ) : <Empty>Run a Heston pricing to see results</Empty>}
      </div>
    </div>
  );
}

function IVPanel() {
  const [price, setPrice] = useState(7.5);
  const [S, setS] = useState(100); const [K, setK] = useState(100);
  const [T, setT] = useState(0.5); const [r, setR] = useState(0.05); const [q, setQ] = useState(0.0);
  const [option, setOption] = useState<"call" | "put">("call");
  const [res, setRes] = useState<{ implied_vol: number; greeks: Greeks } | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  async function go() {
    setBusy(true); setErr("");
    try { setRes(await api("/iv", { price, S, K, T, r, q, option })); }
    catch (e: any) { setErr(e.message); setRes(null); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
      <div className="card">
        <div className="section-title">Inputs</div>
        <Row label="Market price"><input className="input" type="number" value={price} onChange={e => setPrice(+e.target.value)} step="0.01" /></Row>
        <Row label="Spot S"><input className="input" type="number" value={S} onChange={e => setS(+e.target.value)} step="any" /></Row>
        <Row label="Strike K"><input className="input" type="number" value={K} onChange={e => setK(+e.target.value)} step="any" /></Row>
        <Row label="Time T"><input className="input" type="number" value={T} onChange={e => setT(+e.target.value)} step="0.01" /></Row>
        <Row label="Risk-free r"><input className="input" type="number" value={r} onChange={e => setR(+e.target.value)} step="0.001" /></Row>
        <Row label="Dividend q"><input className="input" type="number" value={q} onChange={e => setQ(+e.target.value)} step="0.001" /></Row>
        <Row label="Type">
          <select className="select" value={option} onChange={e => setOption(e.target.value as any)}>
            <option value="call">Call</option><option value="put">Put</option>
          </select>
        </Row>
        <button className="btn" onClick={go} disabled={busy} style={{ width: "100%", marginTop: 10 }}>
          {busy ? "Solving..." : "Solve for IV"}
        </button>
        {err && <div style={{ color: "var(--bad)", fontSize: "0.8rem", marginTop: 10 }}>{err}</div>}
      </div>

      <div className="card">
        <div className="section-title">Result</div>
        {res ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <Stat label="Implied volatility" value={(res.implied_vol * 100).toFixed(2) + "%"} accent />
            <Stat label="Δ Delta" value={fmt(res.greeks.delta)} />
            <Stat label="Γ Gamma" value={fmt(res.greeks.gamma, 5)} />
            <Stat label="Θ Theta /day" value={fmt(res.greeks.theta)} />
            <Stat label="V Vega" value={fmt(res.greeks.vega)} />
            <Stat label="ρ Rho" value={fmt(res.greeks.rho)} />
          </div>
        ) : <Empty>Enter a market price and solve for implied vol</Empty>}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card-tight">
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: accent ? "var(--accent2)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "var(--faint)", fontSize: "0.9rem", padding: "30px 0", textAlign: "center" }}>{children}</div>;
}
