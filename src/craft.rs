use std::path::{Path, PathBuf};
use anyhow::Result;

use crate::{
    codegraph::{self, CodeFeature, CodeGraph},
    llm::LlmClient,
    models::{CraftFeature, CraftPlan, CraftProposal},
    vault::Vault,
};

pub async fn build_plan(repo: &Path, brief: Option<&str>) -> Result<CraftPlan> {
    let graph = codegraph::analyze(repo)?;
    let features = graph_to_craft_features(&graph);

    let vault = Vault::open(repo)?;
    let _ = persist_graph(&vault, &graph)?;

    if let Some(llm) = LlmClient::from_env() {
        let evidence = graph_evidence(&graph);
        let system = "You are the GitCraft architect. Use only supplied source-code and AST evidence. Do not infer features from README, markdown, comments, screenshots or marketing text. Return JSON only.";
        let prompt = format!(
            "Repository: {}\nBrief: {}\nAST/code features:\n{}\nCode evidence:\n{}\nReturn JSON with suggestions and next_steps.",
            graph.root,
            brief.unwrap_or("derive technically coherent implementation directions from executable code"),
            serde_json::to_string(&features)?,
            evidence
        );
        if let Ok(value) = llm.complete_json(system, &prompt).await {
            let suggestions = value.get("suggestions")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter_map(|v| serde_json::from_value::<CraftProposal>(v).ok())
                .collect::<Vec<_>>();
            let next_steps = value.get("next_steps")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_str().map(str::to_string)).collect())
                .unwrap_or_default();
            if !suggestions.is_empty() {
                let plan = CraftPlan {
                    repo: graph.root,
                    features,
                    suggestions,
                    next_steps,
                };
                let _ = vault.save_craft_plan(&plan);
                return Ok(plan);
            }
        }
    }

    let plan = CraftPlan {
        repo: graph.root,
        features: features.clone(),
        suggestions: fallback_proposals(&features),
        next_steps: vec![
            "Inspect AST-derived features and symbol provenance.".into(),
            "Select a proposal and create an isolated implementation task.".into(),
            "Run the change through the native GC sandbox.".into(),
            "Gate the resulting branch through the native GC AST review engine.".into(),
        ],
    };
    let _ = vault.save_craft_plan(&plan);
    Ok(plan)
}

pub fn harvest(repo: &Path) -> Result<Vec<CraftFeature>> {
    Ok(graph_to_craft_features(&codegraph::analyze(repo)?))
}

fn graph_to_craft_features(graph: &CodeGraph) -> Vec<CraftFeature> {
    let mut features = codegraph::to_craft_features(graph);
    features.sort_by(|a,b| a.category.cmp(&b.category).then(a.name.cmp(&b.name)));
    features.dedup_by(|a,b| a.name == b.name && a.category == b.category);
    features
}

fn graph_evidence(graph: &CodeGraph) -> String {
    graph.features.iter().take(600).map(|f| {
        format!(
            "{}:{}-{} [{}] {} {} :: {}",
            f.path, f.start_line, f.end_line, f.language, f.kind, f.symbol, f.detail
        )
    }).collect::<Vec<_>>().join("\n")
}

fn persist_graph(vault: &Vault, graph: &CodeGraph) -> Result<i64> {
    let files = graph.features.iter().map(|f| (f.path.clone(), f.fingerprint.clone())).collect::<Vec<_>>();
    vault.store_code_snapshot(&graph.root, &files, &graph.features.iter().map(to_internal_feature).collect::<Vec<_>>())
}

fn to_internal_feature(feature: &CodeFeature) -> CodeFeature {
    feature.clone()
}

fn fallback_proposals(features: &[CraftFeature]) -> Vec<CraftProposal> {
    let names = features.iter().take(10).map(|f| f.name.clone()).collect::<Vec<_>>();
    vec![
        CraftProposal {
            title: "ReviewFlow Sentinel".into(),
            problem: "Turn AST findings and code provenance into a hard pre-merge quality gate.".into(),
            feasibility: 94,
            features: names.clone(),
            implementation: "Use the native code graph, deterministic review rules, finding provenance and branch state to block unsafe or incomplete work.".into(),
        },
        CraftProposal {
            title: "Agent Foundry".into(),
            problem: "Run coding agents against real repository capabilities without letting them escape the workspace boundary.".into(),
            feasibility: 93,
            features: names.clone(),
            implementation: "Connect task scheduling, isolated Git workspaces, proxy allowlisting, agent execution, code context retrieval and AST review into one execution graph.".into(),
        },
        CraftProposal {
            title: "Architecture Workbench".into(),
            problem: "Keep architecture views synchronized with executable code instead of documentation claims.".into(),
            feasibility: 90,
            features: names,
            implementation: "Render symbols, modules, routes, integrations and task boundaries from the native code graph and persist every edge with source provenance.".into(),
        },
    ]
}

pub fn plan_file(repo: &Path) -> PathBuf {
    repo.join(".gc").join("craft-plan.json")
}

