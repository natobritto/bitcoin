# OpenRPC Rust client generator

This custom component feeds `OpenRPC.json` into `@open-rpc/generator` and emits
Rust client bindings that match `rust-bitcoin-cli` (error types, async runtime,
HTTP layer, and method layout).

## Prereqs

- Node.js
- `@open-rpc/generator` installed locally

## Generate

```bash
npx open-rpc-generator generate -c open-rpc-generator-config.json
```

The component writes to `rust-bitcoin-cli/src/generated.rs`.

## Standalone

If you just want to run the component directly:

```bash
node generator/rust-component.js
```
