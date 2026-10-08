import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { scan, bundle, coldStartMs, costPerMillion, LAMBDA_COST, EDGES, cpuEstimate, type Issue } from "@/lib/exile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WASM Edge Exile — compile JS to WASM, deploy to the edge" },
      { name: "description", content: "Exile serverless functions to 5 edge locations with latency map, bundle analysis, cold-start prediction and cost per 1M invocations." },
      { property: "og:title", content: "WASM Edge Exile" },
      { property: "og:description", content: "Compile JS/TS to WASM and exile it to the edge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SAMPLES: Record<string, string> = {
  "geo-greet.ts": `export default async function handler(req: Request) {
  const country = req.headers.get("cf-ipcountry") ?? "IN";
  const items = [1, 2, 3].map((n) => n * 2);
  return new Response(JSON.stringify({ hello: country, items }), {
    headers: { "content-type": "application/json" },
  });
}`,
  "read-config.js": `const fs = require("fs");

export default function handler(req) {
  const cfg = fs.readFileSync(__dirname + "/config.json", "utf8");
  return new Response(cfg);
}`,
};

type Result =
  | { ok: false; issues: Issue[] }
  | { ok: true; b: ReturnType<typeof bundle>; cold: number; cpu: number; cost: number; lambda: number };

const STEPS = ["Parsing AST", "Scanning for Node-only APIs", "Lowering to Rust IR", "wasm-pack --target web", "Deploying to 5 edges"];

function Index() {
  const [code, setCode] = useState<string>(SAMPLES["geo-greet.ts"] ?? "");
  const [step, setStep] = useState(-1);
  const [res, setRes] = useState<Result | null>(null);

  const exile = async () => {
    setRes(null);
    const issues = scan(code);
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 380));
      if (i === 1 && issues.length) { setStep(-1); setRes({ ok: false, issues }); return; }
    }
    const b = bundle(code);
    const cpu = cpuEstimate(code);
    setStep(-1);
    setRes({ ok: true, b, cold: coldStartMs(b.totalKb), cpu, cost: costPerMillion(cpu), lambda: LAMBDA_COST(cpu) });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold tracking-tight">WASM<span className="text-primary">·</span>Edge Exile</h1>
        <span className="font-mono text-xs text-muted-foreground">rustc → wasm32 → 5 PoPs</span>
      </header>

      <div className="grid lg:grid-cols-2 gap-px bg-border">
        <section className="bg-background p-6 flex flex-col gap-3">
          <div className="flex gap-2">
            {Object.keys(SAMPLES).map((k) => (
              <button key={k} onClick={() => { setCode(SAMPLES[k] ?? ""); setRes(null); }} className="font-mono text-xs px-3 py-1 border border-border rounded hover:border-primary">{k}</button>
            ))}
          </div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
            className="font-mono text-sm bg-card border border-border rounded-md p-4 h-80 resize-none focus:outline-none focus:border-primary" />
          <button onClick={exile} disabled={step >= 0}
            className="font-display font-bold uppercase tracking-widest bg-primary text-primary-foreground py-3 rounded-md hover:opacity-90 disabled:opacity-50 shadow-glow">
            {step >= 0 ? "Exiling…" : "Exile to Edge →"}
          </button>
          <ol className="font-mono text-xs space-y-1">
            {STEPS.map((s, i) => (
              <li key={s} className={i === step ? "text-primary" : i < step ? "text-muted-foreground" : "text-muted-foreground/40"}>
                {i < step ? "✓" : i === step ? "▸" : "·"} {s}
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-background p-6">
          {!res && <p className="font-mono text-sm text-muted-foreground">Write a function and exile it.</p>}
          {res && !res.ok && (
            <div className="border border-destructive rounded-md p-5 space-y-4">
              <h2 className="font-display text-lg font-bold text-destructive">✕ Non-exilable</h2>
              {res.issues.map((i, k) => (
                <div key={k} className="font-mono text-sm">
                  <div><span className="text-destructive">{i.api}</span> <span className="text-muted-foreground">at line {i.line}</span></div>
                  <div className="text-muted-foreground mt-1">fix → {i.fix}</div>
                </div>
              ))}
            </div>
          )}
          {res && res.ok && <Report r={res} />}
        </section>
      </div>
    </main>
  );
}

function Report({ r }: { r: Extract<Result, { ok: true }> }) {
  const proj = (lat: number, lon: number): [number, number] => [((lon + 180) / 360) * 600, ((90 - lat) / 180) * 300];
  const max = Math.max(...EDGES.map((e) => e.rtt));
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold mb-2">Latency from Mumbai client</h2>
        <svg viewBox="0 0 600 300" className="w-full bg-card border border-border rounded-md">
          {Array.from({ length: 30 * 15 }).map((_, i) => (
            <circle key={i} cx={(i % 30) * 20 + 10} cy={Math.floor(i / 30) * 20 + 10} r="0.8" className="fill-muted-foreground/30" />
          ))}
          {EDGES.map((e) => {
            const [x, y] = proj(e.lat, e.lon);
            const hot = e.rtt < 50;
            return (
              <g key={e.id}>
                <circle cx={x} cy={y} r="14" className={hot ? "fill-primary/20 animate-ping origin-center" : "fill-destructive/10"} style={{ transformBox: "fill-box" }} />
                <circle cx={x} cy={y} r="5" className={hot ? "fill-primary" : "fill-destructive"} />
                <text x={x + 9} y={y - 8} className="fill-foreground font-mono" fontSize="11">{e.city} {e.rtt + Math.round(r.cpu)}ms</text>
              </g>
            );
          })}
        </svg>
        <div className="mt-3 space-y-1">
          {EDGES.map((e) => (
            <div key={e.id} className="flex items-center gap-2 font-mono text-xs">
              <span className="w-10">{e.id}</span>
              <div className="flex-1 h-2 bg-muted rounded"><div className="h-2 rounded bg-primary" style={{ width: `${(e.rtt / max) * 100}%` }} /></div>
              <span className="w-14 text-right">{e.rtt + Math.round(r.cpu)}ms</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Bundle (gzip)" value={`${r.b.gzipKb} KB`} />
        <Stat label="Cold start" value={`${r.cold} ms`} />
        <Stat label="Cost / 1M" value={`$${r.cost}`} sub={`Lambda: $${r.lambda}`} />
      </div>

      <div>
        <h3 className="font-display font-bold mb-2 text-sm">Bundle analyzer</h3>
        <div className="flex h-6 rounded overflow-hidden font-mono text-[10px]">
          <div className="bg-primary text-primary-foreground px-1 flex items-center" style={{ flex: r.b.wasmKb }}>module.wasm {r.b.wasmKb}KB</div>
          <div className="bg-secondary text-secondary-foreground px-1 flex items-center" style={{ flex: r.b.runtimeKb }}>runtime shim {r.b.runtimeKb}KB</div>
        </div>
        <p className="font-mono text-xs text-muted-foreground mt-2">source {r.b.sourceKb}KB → raw {r.b.totalKb}KB · est. CPU {r.cpu}ms/req · limit 1MB ✓</p>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border rounded-md p-3 bg-card">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-bold text-primary">{value}</div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
