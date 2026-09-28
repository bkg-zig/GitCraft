use std::{fs, path::Path};

use anyhow::{Context, Result};
use sha2::{Digest, Sha256};
use tree_sitter::{Language, Node, Parser};

use crate::models::{CraftFeature, ArchitectureEdge, ArchitectureGraph, ArchitectureNode};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CodeFeature {
    pub path: String,
    pub language: String,
    pub kind: String,
    pub symbol: String,
    pub detail: String,
    pub start_line: usize,
    pub end_line: usize,
    pub fingerprint: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CodeCapability {
    pub id: String,
    pub label: String,
    pub score: u32,
    pub evidence: Vec<String>,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct CodeGraph {
    pub root: String,
    pub files: usize,
    pub features: Vec<CodeFeature>,
    pub capabilities: Vec<CodeCapability>,
}

pub fn analyze(repo: &Path) -> Result<CodeGraph> {
    let root = fs::canonicalize(repo).context("canonicalize repository")?;
    let mut graph = CodeGraph { root: root.display().to_string(), ..Default::default() };

    for entry in walkdir::WalkDir::new(&root)
        .into_iter()
        .filter_entry(|e| !ignored(e.path()))
        .filter_map(Result::ok)
    {
        if !entry.file_type().is_file() { continue; }
        let Some(language) = language_for(entry.path()) else { continue; };
        let content = match fs::read(entry.path()) {
            Ok(v) if v.len() <= 2 * 1024 * 1024 => v,
            _ => continue,
        };
        if content.contains(&0) { continue; }
        if let Some(features) = parse_file(entry.path(), language, &content)? {
            graph.files += 1;
            let rel = entry.path().strip_prefix(&root).unwrap_or(entry.path()).to_string_lossy().into_owned();
            for mut feature in features {
                feature.path = rel.clone();
                graph.features.push(feature);
            }
        }
    }

    graph.features.sort_by(|a,b|
        a.path.cmp(&b.path)
            .then(a.start_line.cmp(&b.start_line))
            .then(a.kind.cmp(&b.kind))
    );
    graph.capabilities = derive_capabilities(&graph.features)?;
    Ok(graph)
}

#[derive(Debug, serde::Deserialize)]
struct CapabilityRule {
    id: String,
    label: String,
    markers: Vec<String>,
}

fn derive_capabilities(features: &[CodeFeature]) -> Result<Vec<CodeCapability>> {
    let rules: Vec<CapabilityRule> = serde_json::from_str(include_str!("../algorithms/code/capabilities.json"))
        .context("parse capability algorithm rules")?;
    let mut capabilities = Vec::new();

    for rule in rules {
        let mut matched = std::collections::BTreeSet::new();
        let mut evidence = Vec::new();
        for feature in features {
            let haystack = format!("{} {}", feature.symbol, feature.detail).to_ascii_lowercase();
            let local_hits: Vec<&String> = rule.markers.iter().filter(|marker| haystack.contains(marker.as_str())).collect();
            if local_hits.is_empty() { continue; }
            for marker in local_hits { matched.insert(marker.clone()); }
            if evidence.len() < 8 {
                evidence.push(format!("{}:{}-{} [{} {}]", feature.path, feature.start_line, feature.end_line, feature.kind, feature.symbol));
            }
        }
        if !matched.is_empty() {
            let score = ((matched.len() as u32 * 18) + (evidence.len() as u32 * 3)).min(100);
            capabilities.push(CodeCapability {
                id: rule.id,
                label: rule.label,
                score,
                evidence,
            });
        }
    }
    capabilities.sort_by(|a,b| b.score.cmp(&a.score).then(a.id.cmp(&b.id)));
    Ok(capabilities)
}

pub fn to_craft_features(graph: &CodeGraph) -> Vec<CraftFeature> {
    let capabilities = graph.capabilities.iter().map(|cap| CraftFeature {
        name: cap.id.clone(),
        category: "capability".into(),
        description: format!("{} detected from source AST (confidence {})", cap.label, cap.score),
        evidence: cap.evidence.clone(),
    });
    let structural = graph.features.iter()
        .filter(|f| matches!(f.kind.as_str(), "function_item" | "function_declaration" | "struct_item" | "class_declaration" | "interface_declaration" | "route" | "route_declaration"))
        .take(160)
        .map(|f| CraftFeature {
            name: format!("{}:{}:{}", f.path, f.kind, f.symbol),
            category: category_for(&f.kind).into(),
            description: f.detail.clone(),
            evidence: vec![format!("{}:{}-{}", f.path, f.start_line, f.end_line)],
        });
    capabilities.chain(structural).collect()
}

pub fn architecture(graph: &CodeGraph) -> ArchitectureGraph {
    let mut nodes = vec![ArchitectureNode {
        id: "root".into(),
        label: Path::new(&graph.root).file_name().unwrap_or_default().to_string_lossy().into(),
        kind: "repository".into(),
    }];
    let mut edges = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for f in &graph.features {
        let file_id = format!("file-{}", slug(&f.path));
        if seen.insert(file_id.clone()) {
            nodes.push(ArchitectureNode { id: file_id.clone(), label: f.path.clone(), kind: f.language.clone() });
            edges.push(ArchitectureEdge { from: "root".into(), to: file_id.clone(), relation: "contains".into() });
        }
        let feature_id = format!("feature-{}", f.fingerprint);
        nodes.push(ArchitectureNode {
            id: feature_id.clone(),
            label: format!("{} {}", f.kind, f.symbol),
            kind: category_for(&f.kind).into(),
        });
        edges.push(ArchitectureEdge { from: file_id, to: feature_id, relation: "declares".into() });
    }

    ArchitectureGraph { root: graph.root.clone(), nodes, edges }
}

pub fn parse_source(path: &Path, source: &[u8]) -> Result<(String, tree_sitter::Tree)> {
    let language_name = language_name(path);
    let language = language_for(path).context("unsupported source language")?;
    let mut parser = Parser::new();
    parser.set_language(&language).context("set tree-sitter language")?;
    let tree = parser.parse(source, None).context("parse source")?;
    Ok((language_name, tree))
}

fn parse_file(path: &Path, language: Language, source: &[u8]) -> Result<Option<Vec<CodeFeature>>> {
    let mut parser = Parser::new();
    parser.set_language(&language).context("set tree-sitter language")?;
    let Some(tree) = parser.parse(source, None) else { return Ok(None); };
    let lang = language_name(path);
    let rel = path.to_string_lossy().into_owned();
    let mut out = Vec::new();
    visit(tree.root_node(), source, &lang, &rel, &mut out);
    Ok(Some(out))
}

fn visit(node: Node<'_>, source: &[u8], language: &str, path: &str, out: &mut Vec<CodeFeature>) {
    let kind = node.kind();
    if is_feature_node(kind) {
        let start = node.start_position().row + 1;
        let end = node.end_position().row + 1;
        let text = node.utf8_text(source).unwrap_or("").trim();
        let symbol = node.named_child(0)
            .and_then(|n| n.utf8_text(source).ok())
            .map(|s| s.split_whitespace().next().unwrap_or("").to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| first_identifier(text));
        let detail = summarize(kind, text);
        let fingerprint = fingerprint(language, kind, text, start, end);
        out.push(CodeFeature {
            path: path.into(),
            language: language.into(),
            kind: kind.into(),
            symbol,
            detail,
            start_line: start,
            end_line: end,
            fingerprint,
        });
    }
    for child in node.named_children(&mut node.walk()) {
        visit(child, source, language, path, out);
    }
}

fn language_for(path: &Path) -> Option<Language> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    Some(match ext.as_str() {
        "rs" => tree_sitter_rust::LANGUAGE.into(),
        "js" | "jsx" | "mjs" | "cjs" => tree_sitter_javascript::LANGUAGE.into(),
        "ts" => tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into(),
        "tsx" => tree_sitter_typescript::LANGUAGE_TSX.into(),
        "py" => tree_sitter_python::LANGUAGE.into(),
        "go" => tree_sitter_go::LANGUAGE.into(),
        _ => return None,
    })
}

fn language_name(path: &Path) -> String {
    match path.extension().and_then(|x| x.to_str()).unwrap_or("") {
        "rs" => "rust",
        "js" | "jsx" | "mjs" | "cjs" => "javascript",
        "ts" => "typescript",
        "tsx" => "tsx",
        "py" => "python",
        "go" => "go",
        _ => "unknown",
    }.into()
}

fn is_feature_node(kind: &str) -> bool {
    matches!(kind,
        "function_item" | "function_declaration" | "function_definition" |
        "method_definition" | "method_declaration" |
        "struct_item" | "class_declaration" | "class_definition" |
        "enum_item" | "enum_declaration" | "interface_declaration" |
        "type_item" | "type_alias_declaration" |
        "impl_item" | "trait_item" |
        "mod_item" | "namespace_definition" | "package_clause" |
        "use_declaration" | "import_statement" | "import_clause" |
        "call_expression" | "macro_invocation" |
        "attribute_item" | "decorator" |
        "route" | "route_declaration" |
        "variable_declaration" | "lexical_declaration"
    )
}

fn category_for(kind: &str) -> &'static str {
    match kind {
        "function_item" | "function_declaration" | "function_definition" | "method_definition" | "method_declaration" => "behavior",
        "struct_item" | "class_declaration" | "class_definition" | "enum_item" | "enum_declaration" | "interface_declaration" | "type_item" | "type_alias_declaration" => "data-model",
        "use_declaration" | "import_statement" | "import_clause" | "package_clause" | "mod_item" | "namespace_definition" => "dependency",
        "call_expression" | "macro_invocation" => "interaction",
        "attribute_item" | "decorator" | "route" | "route_declaration" => "contract",
        "variable_declaration" | "lexical_declaration" => "state",
        _ => "code",
    }
}

fn summarize(kind: &str, text: &str) -> String {
    let compact = text.lines().map(str::trim).filter(|x| !x.is_empty()).take(2).collect::<Vec<_>>().join(" ");
    format!("AST {kind}: {}", compact.chars().take(180).collect::<String>())
}

fn first_identifier(text: &str) -> String {
    text.split(|c: char| !(c.is_ascii_alphanumeric() || c == '_'))
        .find(|s| !s.is_empty())
        .unwrap_or("anonymous").into()
}

fn fingerprint(language: &str, kind: &str, text: &str, start: usize, end: usize) -> String {
    let mut hasher = Sha256::new();
    hasher.update(language.as_bytes());
    hasher.update(kind.as_bytes());
    hasher.update(text.as_bytes());
    hasher.update(start.to_le_bytes());
    hasher.update(end.to_le_bytes());
    hex::encode(hasher.finalize())[..16].to_string()
}

fn slug(value: &str) -> String {
    value.chars().map(|c| if c.is_ascii_alphanumeric() { c } else { '-' }).collect()
}

fn ignored(path: &Path) -> bool {
    path.components().any(|c| {
        let s = c.as_os_str().to_string_lossy();
        matches!(s.as_ref(), ".git" | "target" | "node_modules" | "vendor" | "legacy" | "dist" | "build" | "__pycache__")
    }) || path.file_name().and_then(|x| x.to_str()).is_some_and(|name|
        name.eq_ignore_ascii_case("README.md") || name.eq_ignore_ascii_case("README") || name.ends_with(".md")
    )
}

mod hex {
    pub fn encode(bytes: impl AsRef<[u8]>) -> String {
        const HEX: &[u8] = b"0123456789abcdef";
        bytes.as_ref().iter().flat_map(|b| [HEX[(b >> 4) as usize] as char, HEX[(b & 15) as usize] as char]).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ignores_markdown_and_vendor() {
        assert!(ignored(Path::new("README.md")));
        assert!(ignored(Path::new("vendor/x.rs")));
        assert!(!ignored(Path::new("src/main.rs")));
    }
}
