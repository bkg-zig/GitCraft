use std::{fs, time::Duration};
use anyhow::{Context, Result};
use reqwest::Client;
use serde_json::{json, Value};

#[derive(Clone)]
pub struct LlmClient {
    base_url: String,
    api_key: String,
    model: String,
    http: Client,
}

impl LlmClient {
    pub fn from_env() -> Option<Self> {
        let base_url = std::env::var("GC_API_URL").ok().or_else(|| std::env::var("GC_API_URL_FILE").ok().and_then(|p| fs::read_to_string(p).ok())).map(|s| s.trim().trim_end_matches('/').to_string())?;
        let key_path = std::env::var("GC_API_KEY_FILE").ok()?;
        let api_key = fs::read_to_string(key_path).ok()?.trim().to_string();
        if base_url.is_empty() || api_key.is_empty() { return None; }
        Some(Self {
            base_url,
            api_key,
            model: std::env::var("GC_MODEL").unwrap_or_else(|_| "nvidia/nemotron-3.5-lightning-30b-a3b".into()),
            http: Client::builder().timeout(Duration::from_secs(180)).build().ok()?,
        })
    }

    pub async fn probe(&self) -> Result<Vec<String>> {
        let body: Value = self.http.get(format!("{}/models", self.base_url))
            .bearer_auth(&self.api_key).send().await?.error_for_status()?.json().await?;
        Ok(body.get("data").and_then(Value::as_array)
            .or_else(|| body.get("models").and_then(Value::as_array))
            .map(|items| items.iter().filter_map(|v| v.get("id").and_then(Value::as_str).map(str::to_string)).collect())
            .unwrap_or_default())
    }

    pub async fn complete_json(&self, system: &str, prompt: &str) -> Result<Value> {
        let body = json!({
            "model": self.model,
            "messages": [
                {"role":"system","content":system},
                {"role":"user","content":prompt}
            ],
            "temperature": 0.2,
            "response_format": {"type":"json_object"}
        });
        let body: Value = self.http.post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key).json(&body).send().await?.error_for_status()?.json().await?;
        let text = body.pointer("/choices/0/message/content").and_then(Value::as_str)
            .context("LLM response did not contain message content")?;
        let clean = text.trim().trim_start_matches(r"```json").trim_start_matches(r"```").trim_end_matches(r"```").trim();
        Ok(serde_json::from_str(clean)?)
    }
}

