use serde::de::DeserializeOwned;
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
