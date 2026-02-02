// Custom OpenRPC Generator component for Bitcoin Core Rust client codegen.
// This module also works as a standalone script: `node generator/rust-component.js`.

/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const RUST_KEYWORDS = new Set([
  "as", "break", "const", "continue", "crate", "else", "enum", "extern",
  "false", "fn", "for", "if", "impl", "in", "let", "loop", "match",
  "mod", "move", "mut", "pub", "ref", "return", "self", "Self", "static",
  "struct", "super", "trait", "true", "type", "unsafe", "use", "where",
  "while", "async", "await", "dyn",
]);

<<<<<<< HEAD
function toSnake(name) {
=======
const EXTRA_WORDS = [
  "add", "address", "addr", "all", "block", "blocks", "chain", "client",
  "create", "decode", "descriptor", "dump", "encode", "estimate", "fee",
  "feerate", "get", "hash", "height", "import", "info", "key", "keys",
  "list", "load", "lock", "mempool", "min", "max", "network", "node",
  "peer", "psbt", "raw", "receive", "remove", "rescan", "scan", "send",
  "set", "sign", "submit", "sync", "tx", "txid", "utxo", "verify", "wallet",
];

let NAME_INFO = null;

function setNameInfo(info) {
  NAME_INFO = info;
}

function getNameInfo() {
  return NAME_INFO || { renameMap: new Map(), wordSet: new Set(EXTRA_WORDS) };
}

function walkDir(dir, visitor) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, visitor);
    } else if (entry.isFile()) {
      visitor(full);
    }
  }
}

function addTokens(name, wordSet) {
  if (!name) return;
  const clean = name.startsWith("r#") ? name.slice(2) : name;
  const parts = clean.split("_").filter(Boolean);
  if (parts.length === 0) {
    wordSet.add(clean.toLowerCase());
    return;
  }
  for (const part of parts) {
    wordSet.add(part.toLowerCase());
  }
}

function buildNameInfo(root) {
  const renameMap = new Map();
  const wordSet = new Set(EXTRA_WORDS);

  const typesDir = path.join(root, "corepc", "types", "src");
  if (fs.existsSync(typesDir)) {
    walkDir(typesDir, (file) => {
      if (!file.endsWith(".rs")) return;
      const content = fs.readFileSync(file, "utf8");
      const renameRe = /#\[serde\(rename = "([^"]+)"\)\]\s*(?:#\[[^\]]+\]\s*)*pub\s+([A-Za-z0-9_]+)\s*:/g;
      for (const match of content.matchAll(renameRe)) {
        renameMap.set(match[1], match[2]);
        addTokens(match[2], wordSet);
      }
      const fieldRe = /\bpub\s+([A-Za-z0-9_]+)\s*:/g;
      for (const match of content.matchAll(fieldRe)) {
        addTokens(match[1], wordSet);
      }
    });
  }

  const clientDir = path.join(root, "corepc", "client", "src");
  if (fs.existsSync(clientDir)) {
    walkDir(clientDir, (file) => {
      if (!file.endsWith(".rs")) return;
      const content = fs.readFileSync(file, "utf8");
      const fnRe = /\bpub\s+fn\s+([A-Za-z0-9_]+)\s*\(/g;
      for (const match of content.matchAll(fnRe)) {
        addTokens(match[1], wordSet);
      }
    });
  }

  return { renameMap, wordSet };
}

function splitLowercase(name, wordSet) {
  if (!wordSet || wordSet.size === 0) return null;
  const n = name.length;
  const best = Array(n + 1).fill(null);
  best[0] = { count: 0, tokens: [] };

  for (let i = 0; i < n; i += 1) {
    if (!best[i]) continue;
    for (let j = i + 1; j <= n; j += 1) {
      const token = name.slice(i, j);
      if (!wordSet.has(token)) continue;
      const candidate = best[i].tokens.concat(token);
      const count = candidate.length;
      if (!best[j] || count < best[j].count) {
        best[j] = { count, tokens: candidate };
      }
    }
  }

  return best[n] ? best[n].tokens : null;
}

function normalizeSnake(out) {
  const parts = out.split("_").filter(Boolean);
  const merged = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const next = parts[i + 1];
    if (part === "pub" && (next === "key" || next === "keys")) {
      merged.push(`pub${next}`);
      i += 1;
      continue;
    }
    if (part === "tx" && (next === "id" || next === "ids")) {
      merged.push(`tx${next}`);
      i += 1;
      continue;
    }
    if (part === "wtx" && (next === "id" || next === "ids")) {
      merged.push(`wtx${next}`);
      i += 1;
      continue;
    }
    merged.push(part);
  }
  return merged.join("_");
}

function toSnake(name) {
  const { renameMap, wordSet } = getNameInfo();
  if (renameMap && renameMap.has(name)) return renameMap.get(name);

>>>>>>> 7c5b579b01 (add codegen)
  let out = name.replace(/[^0-9a-zA-Z]+/g, "_");
  out = out.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
  out = out.replace(/^_+|_+$/g, "").toLowerCase();
  if (!out) out = "field";
<<<<<<< HEAD
=======

  if (!out.includes("_")) {
    const tokens = splitLowercase(out, wordSet);
    if (tokens && tokens.length > 1) {
      out = tokens.join("_");
    }
  }

  out = normalizeSnake(out);
>>>>>>> 7c5b579b01 (add codegen)
  if (/^[0-9]/.test(out)) out = `_${out}`;
  if (RUST_KEYWORDS.has(out)) out = `${out}_`;
  return out;
}

function toCamel(name) {
<<<<<<< HEAD
  const parts = name.split(/[^0-9a-zA-Z]+/g).filter(Boolean);
=======
  const snake = toSnake(name);
  const parts = snake.split("_").filter(Boolean);
>>>>>>> 7c5b579b01 (add codegen)
  let out = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  if (!out) out = "Type";
  if (/^[0-9]/.test(out)) out = `T${out}`;
  return out;
}

function docLines(text, indent = "") {
  if (!text) return [];
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => `${indent}/// ${line.trimEnd()}`);
}

function makeOptional(typeName) {
  if (typeName.startsWith("Option<")) return typeName;
  return `Option<${typeName}>`;
}

class TypeEmitter {
  constructor() {
    this.lines = [];
    this.usedNames = new Set();
    this.needRange = false;
<<<<<<< HEAD
=======
    this.needBTreeMap = false;
>>>>>>> 7c5b579b01 (add codegen)
  }

  unique(base) {
    let name = base;
    let idx = 2;
    while (this.usedNames.has(name)) {
      name = `${base}${idx}`;
      idx += 1;
    }
    this.usedNames.add(name);
    return name;
  }

  emitStruct(name, fields, extraField) {
<<<<<<< HEAD
    this.lines.push("#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]");
=======
    this.lines.push("#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]");
    this.lines.push("#[cfg_attr(feature = \"serde-deny-unknown-fields\", serde(deny_unknown_fields))]");
>>>>>>> 7c5b579b01 (add codegen)
    this.lines.push(`pub struct ${name} {`);
    for (const field of fields) {
      if (field.doc) this.lines.push(...docLines(field.doc, "    "));
      if (field.rename) this.lines.push(`    #[serde(rename = \"${field.rename}\")]`);
      if (field.optional) {
<<<<<<< HEAD
        this.lines.push("    #[serde(default, skip_serializing_if = \"Option::is_none\")]" );
=======
        this.lines.push("    #[serde(default, skip_serializing_if = \"Option::is_none\")]");
>>>>>>> 7c5b579b01 (add codegen)
        this.lines.push(`    pub ${field.name}: ${makeOptional(field.type)},`);
      } else {
        this.lines.push(`    pub ${field.name}: ${field.type},`);
      }
    }
    if (extraField) {
      if (extraField.doc) this.lines.push(...docLines(extraField.doc, "    "));
      this.lines.push("    #[serde(flatten)]");
      this.lines.push(`    pub ${extraField.name}: ${extraField.type},`);
    }
    this.lines.push("}");
    this.lines.push("");
  }

  emitEnum(name, variants) {
<<<<<<< HEAD
    this.lines.push("#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]");
=======
    this.lines.push("#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]");
>>>>>>> 7c5b579b01 (add codegen)
    this.lines.push("#[serde(untagged)]");
    this.lines.push(`pub enum ${name} {`);
    for (const variant of variants) {
      if (variant.doc) this.lines.push(...docLines(variant.doc, "    "));
      this.lines.push(`    ${variant.name}(${variant.type}),`);
    }
    this.lines.push("}");
    this.lines.push("");
  }
}

function splitNullable(schema) {
  if (!schema) return { schema, nullable: false };
  if (schema.nullable === true) return { schema: { ...schema, nullable: undefined }, nullable: true };
  if (Array.isArray(schema.type)) {
    const types = schema.type.filter((t) => t !== "null");
    if (types.length === 1) {
      return { schema: { ...schema, type: types[0] }, nullable: true };
    }
  }
  if (Array.isArray(schema.oneOf)) {
    const nonNull = schema.oneOf.filter((s) => s.type !== "null");
    if (nonNull.length === 1) {
      return { schema: nonNull[0], nullable: true };
    }
  }
  if (Array.isArray(schema.anyOf)) {
    const nonNull = schema.anyOf.filter((s) => s.type !== "null");
    if (nonNull.length === 1) {
      return { schema: nonNull[0], nullable: true };
    }
  }
  return { schema, nullable: false };
}

function resolveSchema(schema, nameHint, emitter) {
  if (!schema) return "Value";
  if (schema.$ref) return "Value";

  const { schema: baseSchema, nullable } = splitNullable(schema);
  const resolved = resolveSchemaInner(baseSchema, nameHint, emitter);
  return nullable ? makeOptional(resolved) : resolved;
}

function resolveSchemaInner(schema, nameHint, emitter) {
  if (!schema) return "Value";

  const btcType = schema["x-bitcoin-type"];
<<<<<<< HEAD
  if (btcType === "amount") return "rust_decimal::Decimal";
=======
  if (btcType === "amount") return "f64";
>>>>>>> 7c5b579b01 (add codegen)
  if (btcType === "hex") return "String";
  if (btcType === "range") {
    emitter.needRange = true;
    return "RangeParam";
  }

  if (schema.oneOf || schema.anyOf) {
    const variants = (schema.oneOf || schema.anyOf).map((entry, idx) => {
      const vType = resolveSchema(entry, `${nameHint}Variant${idx}`, emitter);
      const vDoc = entry.description || entry["x-bitcoin-condition"] || "";
      return { name: `Variant${idx}`, type: vType, doc: vDoc };
    });
    const enumName = emitter.unique(toCamel(nameHint));
    emitter.emitEnum(enumName, variants);
    return enumName;
  }

  if (schema.type === "string") return "String";
  if (schema.type === "number") {
    if (schema["x-bitcoin-format"] === "unix-time") return "i64";
    if (schema["x-bitcoin-type"] === "amount") return "rust_decimal::Decimal";
    return "f64";
  }
  if (schema.type === "integer") return "i64";
  if (schema.type === "boolean") return "bool";
  if (schema.type === "null") return "()";
  if (schema.type === "array") {
    if (Array.isArray(schema.items)) return "Vec<Value>";
    const itemType = resolveSchema(schema.items, `${nameHint}Item`, emitter);
    return `Vec<${itemType}>`;
  }
  if (schema.type === "object") {
    const props = schema.properties || {};
    const required = new Set(schema.required || []);
    const propNames = Object.keys(props);
    if (propNames.length === 0) {
      if (schema.additionalProperties) {
        const addl = schema.additionalProperties;
<<<<<<< HEAD
        if (addl === true) return "std::collections::BTreeMap<String, Value>";
        const valueType = resolveSchema(addl, `${nameHint}Value`, emitter);
        return `std::collections::BTreeMap<String, ${valueType}>`;
=======
        emitter.needBTreeMap = true;
        if (addl === true) return "BTreeMap<String, Value>";
        const valueType = resolveSchema(addl, `${nameHint}Value`, emitter);
        return `BTreeMap<String, ${valueType}>`;
>>>>>>> 7c5b579b01 (add codegen)
      }
      return "Value";
    }

    const structName = emitter.unique(toCamel(nameHint));
    const fields = [];
<<<<<<< HEAD
    for (const propName of propNames) {
      const propSchema = props[propName] || {};
      const fieldName = toSnake(propName);
      const fieldType = resolveSchema(propSchema, `${structName}${toCamel(propName)}`, emitter);
      const optional = !required.has(propName) || propSchema["x-bitcoin-optional"] === true;
=======
    const usedFieldNames = new Set();
    for (const propName of propNames) {
      const propSchema = props[propName] || {};
      let fieldName = toSnake(propName);
      if (usedFieldNames.has(fieldName)) {
        if (propName === "feeRate" && fieldName === "fee_rate") {
          fieldName = "fee_rate_btc_kvb";
        } else {
          let suffix = 2;
          let candidate = `${fieldName}_${suffix}`;
          while (usedFieldNames.has(candidate)) {
            suffix += 1;
            candidate = `${fieldName}_${suffix}`;
          }
          fieldName = candidate;
        }
      }
      const fieldType = resolveSchema(propSchema, `${structName}${toCamel(propName)}`, emitter);
      const optional = !required.has(propName) || propSchema["x-bitcoin-optional"] === true;
      usedFieldNames.add(fieldName);
>>>>>>> 7c5b579b01 (add codegen)
      fields.push({
        name: fieldName,
        type: fieldType,
        optional,
        doc: propSchema.description || "",
        rename: fieldName !== propName ? propName : null,
      });
    }

    let extraField = null;
    if (schema.additionalProperties) {
      const addl = schema.additionalProperties;
      const fieldName = propNames.includes("extra") ? "extra_fields" : "extra";
<<<<<<< HEAD
      let fieldType = "std::collections::BTreeMap<String, Value>";
      if (addl !== true) {
        const valueType = resolveSchema(addl, `${structName}ExtraValue`, emitter);
        fieldType = `std::collections::BTreeMap<String, ${valueType}>`;
=======
      emitter.needBTreeMap = true;
      let fieldType = "BTreeMap<String, Value>";
      if (addl !== true) {
        const valueType = resolveSchema(addl, `${structName}ExtraValue`, emitter);
        fieldType = `BTreeMap<String, ${valueType}>`;
>>>>>>> 7c5b579b01 (add codegen)
      }
      extraField = {
        name: fieldName,
        type: fieldType,
        doc: "Additional properties",
      };
    }

    emitter.emitStruct(structName, fields, extraField);
    return structName;
  }

  return "Value";
}

function buildParams(params) {
  const lines = [];
  lines.push(`        let out = {`);
  lines.push(`        let mut params: Vec<Option<serde_json::Value>> = vec![None; ${params.length}];`);
  params.forEach((param, idx) => {
    const paramName = toSnake(param.name || `arg${idx}`);
    if (param.required) {
      lines.push(`        params[${idx}] = Some(serde_json::to_value(${paramName})?);`);
    } else {
      lines.push(`        if let Some(value) = ${paramName} {`);
      lines.push(`            params[${idx}] = Some(serde_json::to_value(value)?);`);
      lines.push("        }");
    }
  });
  lines.push("        let mut last_some: Option<usize> = None;");
  lines.push("        for (idx, item) in params.iter().enumerate() {");
  lines.push("            if item.is_some() {");
  lines.push("                last_some = Some(idx);");
  lines.push("            }");
  lines.push("        }");
  lines.push("        let mut out = Vec::new();");
  lines.push("        if let Some(last) = last_some {");
  lines.push("            for (idx, item) in params.into_iter().enumerate() {");
  lines.push("                if idx > last { break; }");
  lines.push("                out.push(item.unwrap_or(serde_json::Value::Null));");
  lines.push("            }");
  lines.push("        }");
  lines.push("        out");
  lines.push("        };" );
  return lines;
}

function generateBindings(document, options) {
  const emitter = new TypeEmitter();
  const methods = [];
<<<<<<< HEAD
=======
  const root = path.resolve(__dirname, "..");
  setNameInfo(buildNameInfo(root));
>>>>>>> 7c5b579b01 (add codegen)

  for (const method of document.methods || []) {
    const methodName = toSnake(method.name);
    const params = method.params || [];
    const doc = method.summary || method.description || "";

    const paramsSig = params.map((param, idx) => {
      const paramName = toSnake(param.name || `arg${idx}`);
      const paramType = resolveSchema(param.schema, `${toCamel(method.name)}${toCamel(param.name || `Arg${idx}`)}`, emitter);
      return param.required ? `${paramName}: ${paramType}` : `${paramName}: Option<${paramType}>`;
    });

    const resultSchema = method.result ? method.result.schema : null;
    let resultType = "()";
    if (resultSchema) {
<<<<<<< HEAD
      resultType = resolveSchema(resultSchema, `${toCamel(method.name)}Result`, emitter);
=======
      resultType = resolveSchema(resultSchema, `${toCamel(method.name)}`, emitter);
>>>>>>> 7c5b579b01 (add codegen)
    }

    const methodLines = [];
    methodLines.push("    ");
    if (doc) methodLines.push(...docLines(doc, "    "));
    methodLines.push(`    pub async fn ${methodName}(&self${paramsSig.length ? ", " + paramsSig.join(", ") : ""}) -> crate::RpcResult<${resultType}> {`);
    if (params.length) {
      methodLines.push(...buildParams(params));
      methodLines.push(`        self.call(\"${method.name}\", out).await`);
    } else {
      methodLines.push(`        self.call(\"${method.name}\", Vec::new()).await`);
    }
    methodLines.push("    }");
    methods.push(...methodLines);
  }

  const lines = [];
  lines.push("// This file is @generated by generator/rust-component.js. Do not edit by hand.");
  lines.push("");
  lines.push("pub mod types {");
  lines.push("    use serde::{Deserialize, Serialize};");
<<<<<<< HEAD
  lines.push("    pub use serde_json::Value;");
  lines.push("");
  if (emitter.needRange) {
    lines.push("    #[derive(Debug, Clone, Serialize, Deserialize)]");
    lines.push("    #[serde(untagged)]");
    lines.push("    pub enum RangeParam {");
    lines.push("        Single(u64),");
    lines.push("        Range([u64; 2]),");
=======
  if (emitter.needBTreeMap) {
    lines.push("    use std::collections::BTreeMap;");
  }
  lines.push("    pub use serde_json::Value;");
  lines.push("");
  if (emitter.needRange) {
    lines.push("    #[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]");
    lines.push("    #[serde(untagged)]");
    lines.push("    pub enum RangeParam {");
      lines.push("        Single(u64),");
      lines.push("        Range([u64; 2]),");
>>>>>>> 7c5b579b01 (add codegen)
    lines.push("    }");
    lines.push("");
  }
  for (const line of emitter.lines) {
    lines.push(line ? `    ${line}` : "");
  }
  lines.push("}");
  lines.push("");
  lines.push("use self::types::*;");
<<<<<<< HEAD
=======
  if (emitter.needBTreeMap) {
    lines.push("use std::collections::BTreeMap;");
  }
>>>>>>> 7c5b579b01 (add codegen)
  lines.push("");
  lines.push("impl crate::RpcClient {");
  lines.push(...methods);
  lines.push("}");

  return lines.join("\n") + "\n";
}

function renderCargoToml(config) {
  const crateName = config.crateName || "bitcoin-cli-rpc";
  const edition = config.rustEdition || "2021";
  const http = config.http || "reqwest";
  const lines = [];
  lines.push("[package]");
  lines.push(`name = "${crateName}"`);
  lines.push("version = \"0.1.0\"");
  lines.push(`edition = "${edition}"`);
  lines.push("license = \"MIT OR Apache-2.0\"");
  lines.push("");
  lines.push("[dependencies]");
  if (http === "reqwest") {
    lines.push("reqwest = { version = \"0.11\", default-features = false, features = [\"json\", \"rustls-tls\"] }");
  }
  lines.push("serde = { version = \"1\", features = [\"derive\"] }");
  lines.push("serde_json = \"1\"");
  lines.push("thiserror = \"1\"");
<<<<<<< HEAD
  lines.push("rust_decimal = { version = \"1\", features = [\"serde\"] }");
=======
>>>>>>> 7c5b579b01 (add codegen)
  lines.push("");
  return lines.join("\n") + "\n";
}

function renderLibRs() {
  return `use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::Value;
use std::sync::atomic::{AtomicU64, Ordering};

#[derive(Debug, thiserror::Error)]
pub enum RpcError {
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("rpc error {code}: {message}")]
    Rpc {
        code: i64,
        message: String,
        data: Option<serde_json::Value>,
    },
    #[error("missing result for rpc call {method}")]
    MissingResult { method: String },
}

pub type RpcResult<T> = Result<T, RpcError>;

#[derive(Debug)]
pub struct RpcClient {
    url: String,
    auth: Option<(String, String)>,
    client: reqwest::Client,
    id: AtomicU64,
}

#[derive(Debug, Deserialize)]
struct RpcResponse<T> {
    result: Option<T>,
    error: Option<RpcErrorObj>,
    id: Value,
}

#[derive(Debug, Deserialize)]
struct RpcErrorObj {
    code: i64,
    message: String,
    data: Option<Value>,
}

impl RpcClient {
    pub fn new(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            auth: None,
            client: reqwest::Client::new(),
            id: AtomicU64::new(0),
        }
    }

    pub fn with_auth(url: impl Into<String>, user: impl Into<String>, pass: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            auth: Some((user.into(), pass.into())),
            client: reqwest::Client::new(),
            id: AtomicU64::new(0),
        }
    }

    pub async fn call<T: DeserializeOwned>(&self, method: &str, params: Vec<Value>) -> RpcResult<T> {
        let id = self.id.fetch_add(1, Ordering::Relaxed);
        let request = serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        });

        let mut builder = self.client.post(&self.url).json(&request);
        if let Some((user, pass)) = &self.auth {
            builder = builder.basic_auth(user, Some(pass));
        }

        let response = builder.send().await?.error_for_status()?;
        let payload: RpcResponse<T> = response.json().await?;

        if let Some(err) = payload.error {
            return Err(RpcError::Rpc {
                code: err.code,
                message: err.message,
                data: err.data,
            });
        }

        payload
            .result
            .ok_or_else(|| RpcError::MissingResult {
                method: method.to_string(),
            })
    }
}

mod generated;
pub use generated::*;
`;
}

function loadDocument(input) {
  if (!input) return null;
  if (typeof input === "string") {
    const content = fs.readFileSync(input, "utf8");
    return JSON.parse(content);
  }
  return input;
}

function normalizeArgs(args) {
  if (args.length === 1 && args[0] && typeof args[0] === "object") {
    const ctx = args[0];
    const document = loadDocument(ctx.openrpcDocument || ctx.document || ctx.openrpcDocumentPath || ctx.openrpc || ctx.input || null);
    const config = ctx.config || ctx.componentConfig || ctx.options || {};
    const outDir = ctx.outDir || ctx.outputDir || ctx.output || null;
    return { document: document || ctx.openrpcDocument, config, outDir };
  }
  if (args.length >= 1) {
    const document = loadDocument(args[0]);
    const opts = args[1] && typeof args[1] === "object" ? args[1] : {};
    return { document, config: opts.config || opts, outDir: opts.outDir || null };
  }
  return { document: null, config: {}, outDir: null };
}

async function generate(...args) {
  const { document } = normalizeArgs(args);
  const root = path.resolve(__dirname, "..");
  const openrpcPath = path.join(root, "OpenRPC.json");
  const resolvedDoc = document || loadDocument(openrpcPath);
  if (!resolvedDoc) throw new Error("OpenRPC document not found.");

<<<<<<< HEAD
  const outputRoot = path.join(root, "rust-bitcoin-cli");
=======
  const outputRoot = path.join(root, ".");
>>>>>>> 7c5b579b01 (add codegen)
  const generatedFile = path.join(outputRoot, "src", "generated.rs");

  const contents = generateBindings(resolvedDoc, {});
  fs.mkdirSync(path.dirname(generatedFile), { recursive: true });
  fs.writeFileSync(generatedFile, contents, "utf8");

  if (!fs.existsSync(path.join(outputRoot, "Cargo.toml"))) {
    fs.writeFileSync(path.join(outputRoot, "Cargo.toml"), renderCargoToml({}), "utf8");
  }
  if (!fs.existsSync(path.join(outputRoot, "src", "lib.rs"))) {
    fs.writeFileSync(path.join(outputRoot, "src", "lib.rs"), renderLibRs(), "utf8");
  }

  return contents;
}

const hooks = {
  templateFiles: {
    rust: [
      {
        path: "generated.rs",
        template: ({ openrpcDocument }) => generateBindings(openrpcDocument, {}),
      },
    ],
  },
  afterCompileTemplate: [
    async (destDir) => {
      const outputRoot = path.dirname(destDir);
      const cargoPath = path.join(outputRoot, "Cargo.toml");
      const libPath = path.join(outputRoot, "src", "lib.rs");
      if (!fs.existsSync(cargoPath)) {
        fs.writeFileSync(cargoPath, renderCargoToml({}), "utf8");
      }
      if (!fs.existsSync(libPath)) {
        fs.writeFileSync(libPath, renderLibRs(), "utf8");
      }
    },
  ],
};

const staticPath = () => undefined;

if (require.main === module) {
  generate()
    .then(() => {
<<<<<<< HEAD
      console.log("Generated rust-bitcoin-cli/src/generated.rs from OpenRPC.json");
=======
      console.log("Generated ./src/generated.rs from OpenRPC.json");
>>>>>>> 7c5b579b01 (add codegen)
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { hooks, staticPath };
module.exports.default = { hooks, staticPath };
module.exports.generate = generate;
