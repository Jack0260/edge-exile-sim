# Edge Exile

Build "WASM Edge Exile" - Next.js + Rust/WASM + Cloudflare Workers mock.

KEY FEATURE: You write a normal JS/TS function. Click "Exile to Edge". Your compiler converts it to WASM, deploys to 5 edge locations mock, and shows latency map: Mumbai 12ms vs Virginia 120ms. If function uses Node-only API [fs], it flags it as non-exilable and suggests fix.

Senior Requirements: Bundle size analyzer, cold-start predictor, cost per 1M invocations.

Resume Line: Built a WASM compiler that exiles serverless functions to edge with latency and cost analysis.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://edge-exile-sim.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6be54c78-5978-4d7e-b0f9-bea249ae45b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
