use std::{collections::BTreeSet, fs, path::Path};
use anyhow::{Context, Result};
use serde::Deserialize;
use tree_sitter::Node;

use crate::{codegraph, models::{ReviewFinding, ReviewReport}};

#[derive(Debug, Clone, Deserialize)]
struct RuleSpec {
    id: String,
    severity: String,
    category: String,
    title: String,
    node_kinds: Vec<String>,
    text_any: Vec<String>,
    message: String,
}

pub fn run(repo: &Path, task_id: Option<String>) -> Result<ReviewReport> {
    let graph = codegraph::analyze(repo)?;
    let rules = load_rules()?;
    let vault = crate::vault::Vault::open(repo)?;
    vault.record_algorithm("gc-native-review", "1.0.0", "AST review rules derived as a native Rust execution path from the vendored OpenCodeReview rule model.")?;
    vault.save_artifact("gc://algorithms/review/rules-v1", "review-rules", include_str!("../algorithms/review/rules.json"), Some("gc://algorithms/review"))?;
    let root = fs::canonicalize(repo)?;
    let mut findings = Vec::new();
    let paths: BTreeSet<String> = graph.features.iter().map(|f| f.path.clone()).collect();

    for relative_path in paths {
        let path = root.join(&relative_path);
        let source = fs::read_to_string(&path)
            .with_context(|| format!("read {}", path.display()))?;
        let (_language, tree) = codegraph::parse_source(Path::new(&relative_path), source.as_bytes())?;
        for rule in &rules {
            collect(&tree.root_node(), &source, &relative_path, rule, &mut findings);
        }
        if tree.root_node().has_error() {
            findings.push(ReviewFinding {
                rule_id: "syntax.parse".into(),
                severity: "high".into(),
                category: "syntax".into(),
                path: relative_path,
                start_line: 1,
                end_line: 1,
                message: "AST parser reported syntax errors in this source file.".into(),
            });
        }
    }

    findings.sort_by(|a,b| a.path.cmp(&b.path).then(a.start_line.cmp(&b.start_line)).then(a.rule_id.cmp(&b.rule_id)));
    findings.dedup_by(|a,b| a.path == b.path && a.start_line == b.start_line && a.rule_id == b.rule_id);

    let penalty: u32 = findings.iter().map(|f| match f.severity.as_str() {
        "critical" => 30,
        "high" => 15,
        "medium" => 7,
        _ => 2,
    }).sum();

    Ok(ReviewReport {
        task_id,
        repo: graph.root,
        engine: "GC AST Review Engine".into(),
        status: if findings.iter().any(|f| matches!(f.severity.as_str(), "critical" | "high")) { "blocked" } else { "pass" }.into(),
        score: Some(100u32.saturating_sub(penalty.min(100))),
        findings,
        output: format!("Analyzed {} source files and {} AST features.", graph.files, graph.features.len()),
    })
}

pub async fn run_ocr(repo: &Path, task_id: Option<String>) -> Result<ReviewReport> {
    run(repo, task_id)
}

pub async fn preview(repo: &Path) -> Result<String> {
    let graph = codegraph::analyze(repo)?;
    Ok(serde_json::to_string_pretty(&serde_json::json!({
        "engine": "GC AST Review Engine",
        "ruleset": "algorithms/review/rules.json",
        "source_files": graph.files,
        "ast_features": graph.features.len()
    }))?)
}

fn load_rules() -> Result<Vec<RuleSpec>> {
    Ok(serde_json::from_str(include_str!("../algorithms/review/rules.json"))?)
}

fn collect(
    node: &Node<'_>,
    source: &str,
    path: &str,
    rule: &RuleSpec,
    findings: &mut Vec<ReviewFinding>,
) {
    let kind = node.kind();
    if matches!(kind, "comment" | "line_comment" | "block_comment") {
        return;
    }
    let text = node.utf8_text(source.as_bytes()).unwrap_or("");
    let lower = text.to_ascii_lowercase();
    let node_hit = rule.node_kinds.is_empty() || rule.node_kinds.iter().any(|v| v == kind);
    let text_hit = rule.text_any.is_empty() || rule.text_any.iter().any(|v| lower.contains(&v.to_ascii_lowercase()));

    if node_hit && text_hit {
        findings.push(ReviewFinding {
            rule_id: rule.id.clone(),
            severity: rule.severity.clone(),
            category: rule.category.clone(),
            path: path.into(),
            start_line: node.start_position().row + 1,
            end_line: node.end_position().row + 1,
            message: format!("{} {}", rule.title, rule.message),
        });
    }

    let mut cursor = node.walk();
    for child in node.named_children(&mut cursor) {
        collect(&child, source, path, rule, findings);
    }
}

