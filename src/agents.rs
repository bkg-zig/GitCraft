use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Agent {
    Gc,
    Codex,
    Claude,
}

impl Agent {
    pub fn parse(value: &str) -> Self {
        match value.to_ascii_lowercase().as_str() {
            "gc" | "gitcraft" => Self::Gc,
            "claude" => Self::Claude,
            _ => Self::Codex,
        }
    }

    pub fn command(&self, prompt_path: &Path) -> String {
        let p = prompt_path.display();
        match self {
            Self::Gc => format!("gc agent --prompt-file {p}/instructions.md"),
            Self::Codex => format!("cat {p} | codex e --dangerously-bypass-approvals-and-sandbox --json"),
            Self::Claude => format!("cat {p} | claude -p --verbose --output-format stream-json --dangerously-skip-permissions"),
        }
    }

    pub fn supported() -> Vec<String> {
        vec!["gc".into(), "codex".into(), "claude".into()]
    }
}

