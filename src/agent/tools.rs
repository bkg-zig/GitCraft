use serde_json::Value;
pub struct ToolSpec { pub name: &'static str, pub description: &'static str, pub input_schema: Value }
pub fn native_tools() -> Vec<ToolSpec> {
    vec![
        ToolSpec { name: "task_create", description: "Create a GitCraft task", input_schema: Value::Object(Default::default()) },
        ToolSpec { name: "task_status", description: "Get task status", input_schema: Value::Object(Default::default()) },
        ToolSpec { name: "vault_search", description: "Search code vault", input_schema: Value::Object(Default::default()) },
    ]
}
