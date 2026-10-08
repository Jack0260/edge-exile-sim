export type Issue = { api: string; line: number; fix: string };

const NODE_APIS: { re: RegExp; api: string; fix: string }[] = [
  { re: /require\(\s*['"](node:)?fs(\/promises)?['"]\s*\)|from\s+['"](node:)?fs(\/promises)?['"]/, api: "fs", fix: "Edge has no filesystem. Read from KV / R2 (env.BUCKET.get(key)) or bundle static data as an import." },
  { re: /['"](node:)?child_process['"]/, api: "child_process", fix: "Process spawning is impossible at the edge. Move this to a queue-backed origin worker." },
  { re: /['"](node:)?net['"]|['"](node:)?tls['"]/, api: "net", fix: "Raw sockets aren't allowed. Use fetch() or the connect() sockets API." },
  { re: /['"](node:)?os['"]/, api: "os", fix: "No host OS access. Use request.cf for location data instead." },
  { re: /__dirname|__filename/, api: "__dirname", fix: "No module paths at the edge. Use import.meta.url or bundle the asset." },
  { re: /process\.binding|process\.dlopen/, api: "process.binding", fix: "Native bindings can't run in WASM. Swap for a pure-JS/WASM package." },
];

export function scan(code: string): Issue[] {
  const lines = code.split("\n");
  const out: Issue[] = [];
  lines.forEach((l, i) => {
    for (const n of NODE_APIS) if (n.re.test(l)) out.push({ api: n.api, line: i + 1, fix: n.fix });
  });
  return out;
}

export const RUNTIME_KB = 38; // WASM JS-runtime shim

export function bundle(code: string) {
  const sourceKb = new TextEncoder().encode(code).length / 1024;
  const wasmKb = +(sourceKb * 2.6).toFixed(1);
  const total = +(RUNTIME_KB + wasmKb).toFixed(1);
  return { sourceKb: +sourceKb.toFixed(2), wasmKb, runtimeKb: RUNTIME_KB, totalKb: total, gzipKb: +(total * 0.34).toFixed(1) };
}

/** cold start: 0.5ms isolate + 0.04ms per KB instantiated */
export function coldStartMs(totalKb: number) {
  return +(0.5 + totalKb * 0.04).toFixed(2);
}

/** $0.30 per 1M requests + $0.02 per 1M CPU-ms */
export function costPerMillion(cpuMs: number) {
  return +(0.3 + 0.02 * cpuMs).toFixed(3);
}
export const LAMBDA_COST = (cpuMs: number) => +(0.2 + 0.0000166667 * 0.128 * cpuMs * 1000).toFixed(3);

export const EDGES = [
  { id: "BOM", city: "Mumbai", lat: 19.07, lon: 72.87, rtt: 12 },
  { id: "SIN", city: "Singapore", lat: 1.35, lon: 103.82, rtt: 38 },
  { id: "FRA", city: "Frankfurt", lat: 50.11, lon: 8.68, rtt: 104 },
  { id: "GRU", city: "São Paulo", lat: -23.55, lon: -46.63, rtt: 168 },
  { id: "IAD", city: "Virginia", lat: 38.95, lon: -77.45, rtt: 120 },
];

export function cpuEstimate(code: string) {
  const loops = (code.match(/\b(for|while|map|reduce|forEach)\b/g) || []).length;
  return +(0.3 + loops * 0.4).toFixed(2);
}
