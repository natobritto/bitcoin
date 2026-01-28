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

function toSnake(name) {
  let out = name.replace(/[^0-9a-zA-Z]+/g, "_");
  out = out.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
  out = out.replace(/^_+|_+$/g, "").toLowerCase();
  if (!out) out = "field";
  if (/^[0-9]/.test(out)) out = `_${out}`;
  if (RUST_KEYWORDS.has(out)) out = `${out}_`;
  return out;
}

function toCamel(name) {
  const parts = name.split(/[^0-9a-zA-Z]+/g).filter(Boolean);
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
    this.lines.push("#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]");
    this.lines.push(`pub struct ${name} {`);
    for (const field of fields) {
      if (field.doc) this.lines.push(...docLines(field.doc, "    "));
      if (field.rename) this.lines.push(`    #[serde(rename = \"${field.rename}\")]`);
      if (field.optional) {
        this.lines.push("    #[serde(default, skip_serializing_if = \"Option::is_none\")]" );
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
    this.lines.push("#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]");
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
  if (btcType === "amount") return "rust_decimal::Decimal";
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
        if (addl === true) return "std::collections::BTreeMap<String, Value>";
        const valueType = resolveSchema(addl, `${nameHint}Value`, emitter);
        return `std::collections::BTreeMap<String, ${valueType}>`;
      }
      return "Value";
    }

    const structName = emitter.unique(toCamel(nameHint));
    const fields = [];
    for (const propName of propNames) {
      const propSchema = props[propName] || {};
      const fieldName = toSnake(propName);
      const fieldType = resolveSchema(propSchema, `${structName}${toCamel(propName)}`, emitter);
      const optional = !required.has(propName) || propSchema["x-bitcoin-optional"] === true;
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
      let fieldType = "std::collections::BTreeMap<String, Value>";
      if (addl !== true) {
        const valueType = resolveSchema(addl, `${structName}ExtraValue`, emitter);
        fieldType = `std::collections::BTreeMap<String, ${valueType}>`;
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
      resultType = resolveSchema(resultSchema, `${toCamel(method.name)}Result`, emitter);
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
  lines.push("    pub use serde_json::Value;");
  lines.push("");
  if (emitter.needRange) {
    lines.push("    #[derive(Debug, Clone, Serialize, Deserialize)]");
    lines.push("    #[serde(untagged)]");
    lines.push("    pub enum RangeParam {");
    lines.push("        Single(u64),");
    lines.push("        Range([u64; 2]),");
    lines.push("    }");
    lines.push("");
  }
  for (const line of emitter.lines) {
    lines.push(line ? `    ${line}` : "");
  }
  lines.push("}");
  lines.push("");
  lines.push("use self::types::*;");
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
  lines.push("rust_decimal = { version = \"1\", features = [\"serde\"] }");
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

  const outputRoot = path.join(root, "rust-bitcoin-cli");
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
      console.log("Generated rust-bitcoin-cli/src/generated.rs from OpenRPC.json");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { hooks, staticPath };
module.exports.default = { hooks, staticPath };
module.exports.generate = generate;
