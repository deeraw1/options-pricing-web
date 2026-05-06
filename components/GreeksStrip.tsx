"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function GreeksStrip({ rows }: { rows: any[]; option: "call" | "put" }) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#181f2e" strokeDasharray="3 3" />
          <XAxis dataKey="K" stroke="#8a9ab8" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="L" stroke="#8a9ab8" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="R" orientation="right" stroke="#a78bfa" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #1e2d44" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="L" type="monotone" dataKey="delta" stroke="#7c3aed" dot={false} name="Δ" />
          <Line yAxisId="R" type="monotone" dataKey="gamma" stroke="#34d399" dot={false} name="Γ" />
          <Line yAxisId="R" type="monotone" dataKey="vega"  stroke="#fbbf24" dot={false} name="V" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
