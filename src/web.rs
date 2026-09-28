use dioxus::prelude::*;
use crate::{codegraph, engine, llm::LlmClient, models::{ApiProbe, ArchitectureGraph, CraftPlan, DashboardSnapshot, NewTask, ReviewReport, Task, TaskStatus}, review};

#[get("/api/gc/dashboard")]
pub async fn get_dashboard() -> Result<DashboardSnapshot, ServerFnError> {
    engine().map_err(|e| ServerFnError::new(e.to_string()))?.dashboard().map_err(|e| ServerFnError::new(e.to_string()))
}
#[post("/api/gc/tasks")]
pub async fn create_task_api(request: NewTask) -> Result<Task, ServerFnError> {
    engine().map_err(|e| ServerFnError::new(e.to_string()))?.create_task(request).map_err(|e| ServerFnError::new(e.to_string()))
}
#[post("/api/gc/tasks/{id}/cancel")]
pub async fn cancel_task(id: String) -> Result<(), ServerFnError> {
    engine().map_err(|e| ServerFnError::new(e.to_string()))?.cancel(&id).map_err(|e| ServerFnError::new(e.to_string()))
}
#[post("/api/gc/tasks/{id}/retry")]
pub async fn retry_task(id: String) -> Result<(), ServerFnError> {
    engine().map_err(|e| ServerFnError::new(e.to_string()))?.retry(&id).map_err(|e| ServerFnError::new(e.to_string()))
}
#[delete("/api/gc/tasks/{id}")]
pub async fn delete_task(id: String) -> Result<(), ServerFnError> {
    engine().map_err(|e| ServerFnError::new(e.to_string()))?.delete(&id).map_err(|e| ServerFnError::new(e.to_string()))
}
#[post("/api/gc/tasks/clean")]
pub async fn clean_tasks() -> Result<usize, ServerFnError> {
    engine().map_err(|e| ServerFnError::new(e.to_string()))?.clean().map_err(|e| ServerFnError::new(e.to_string()))
}
#[post("/api/gc/review")]
pub async fn review_repository(repo: String) -> Result<ReviewReport, ServerFnError> {
    review::run(std::path::Path::new(&repo), None).map_err(|e| ServerFnError::new(e.to_string()))
}
#[get("/api/gc/architecture")]
pub async fn architecture(repo: String) -> Result<ArchitectureGraph, ServerFnError> {
    let graph = codegraph::analyze(std::path::Path::new(&repo)).map_err(|e| ServerFnError::new(e.to_string()))?;
    Ok(codegraph::architecture(&graph))
}
#[get("/api/gc/llm/probe")]
pub async fn probe_llm() -> Result<ApiProbe, ServerFnError> {
    let client = LlmClient::from_env().ok_or_else(|| ServerFnError::new("GC API secrets missing"))?;
    let start = std::time::Instant::now();
    let models = client.probe().await.map_err(|e| ServerFnError::new(e.to_string()))?;
    let endpoint = std::env::var("GC_API_URL").ok()
        .or_else(|| std::env::var("GC_API_URL_FILE").ok().and_then(|p| std::fs::read_to_string(p).ok()))
        .unwrap_or_default().trim().to_string();
    Ok(ApiProbe { endpoint, status: 200, latency_ms: start.elapsed().as_millis(), models })
}
fn status_label(s: &TaskStatus) -> &'static str { match s {
    TaskStatus::Queued=>"QUEUED", TaskStatus::Running=>"RUNNING", TaskStatus::Complete=>"COMPLETE",
    TaskStatus::Failed=>"FAILED", TaskStatus::Cancelled=>"CANCELLED", TaskStatus::Blocked=>"BLOCKED"
}}
fn status_class(s: &TaskStatus) -> &'static str { match s {
    TaskStatus::Queued=>"status status-queued", TaskStatus::Running=>"status status-running",
    TaskStatus::Complete=>"status status-complete", TaskStatus::Failed=>"status status-failed",
    TaskStatus::Cancelled=>"status status-cancelled", TaskStatus::Blocked=>"status status-blocked"
}}
#[component]
pub fn App() -> Element {
    let mut tab = use_signal(|| "ops".to_string());
    let repo = use_signal(|| "/workspace/bkg-alpha/GitCraft".to_string());
    let task_name = use_signal(|| "gc-task".to_string());
    let prompt = use_signal(|| "Inspect the repository, implement the requested change completely in the isolated workspace, run validation, and return a reviewable branch.".to_string());
    let agent = use_signal(|| "gc".to_string());
    let notice = use_signal(String::new);
    let mut selected = use_signal(|| None::<String>);
    let mut dashboard = use_resource(move || async move { get_dashboard().await });
    rsx! {
        document::Title { "GitCraft // gc" }
        document::Link { rel: "stylesheet", href: "/assets/gc.css" }
        div { class:"shell",
            header { class:"topbar",
                div { class:"brand",
                    div { class:"brand-mark","GC" }
                    div { div { class:"eyebrow","GITCRAFT / NATIVE AGENT FABRIC" } h1{"GitCraft"} span {class:"brand-subtitle","AST intelligence • sandbox execution • Git delivery"} }
                }
                div {class:"top-status", span {class:"status-dot"} span{"ONLINE"} span {class:"mono","gc.eysho.info"}}
            }
            nav {class:"nav",
                for (id,label) in [("ops","CONTROL"),("craft","FOUNDRY"),("sentinel","SENTINEL"),("canvas","ARCHCANVAS"),("nexus","NEXUS")] {
                    button {class:if tab()==id {"nav-btn active"} else {"nav-btn"}, onclick:move |_| tab.set(id.to_string()), "{label}"}
                }
                button {class:"nav-btn utility",onclick:move |_| dashboard.restart(),"SYNC"}
            }
            main {class:"content",
                if !notice().is_empty(){div{class:"notice","{notice}"}}
                match tab().as_str() {
                    "ops"=>rsx!{
                        section{class:"hero-grid",
                            div{class:"hero",div{class:"eyebrow cyan","GC CONTROL PLANE"},h2{"Intent becomes isolated, reviewable work."},
                                p{"Web, CLI, TUI and ACP share the same task primitive. Each run gets its own Git workspace, branch and sandbox network. Model credentials never enter the browser."},
                                div{class:"hero-chips",span{"TASK FABRIC"} span{"GC AGENT"} span{"SANDBOX"} span{"AST GATE"}}
                            }
                            div{class:"runtime-card",div{class:"eyebrow","LIVE STATE"},
                                if let Some(Ok(data))=&*dashboard.read(){
                                    div{class:"big-metric","{data.counts.running}"}
                                    span{class:"mono","active agents"}
                                    div{class:"metric-row",span{"queued"}span{class:"mono","{data.counts.queued}"}}
                                    div{class:"metric-row",span{"complete"}span{class:"mono","{data.counts.complete}"}}
                                    div{class:"metric-row",span{"failed"}span{class:"mono","{data.counts.failed}"}}
                                    div{class:"metric-row",span{"v"}span{class:"mono","{data.runtime.version}"}}
                                }else{
                                    div{class:"big-metric","—"}
                                    span{class:"mono","syncing..."}
                                }
                            }
                        }
                        TaskCreator{repo,task_name,prompt,agent,notice,on_created:move |_| dashboard.restart()}
                        section{class:"panel",div{class:"panel-head",div{h3{"Task Fabric"}p{"Queue, retries, cancellation and branch handoff."}}span{class:"micro-tag","SQLITE WAL"}},
                            if let Some(Ok(data))=&*dashboard.read(){
                                if data.tasks.is_empty(){
                                    div{class:"empty","● NO TASKS QUEUED"}
                                }else{
                                    div{class:"task-list",for task in &data.tasks{
                                        TaskRow{key:"{task.id}",task:task.clone(),selected:selected()==Some(task.id.clone()),on_select:move|id|selected.set(Some(id)),on_refresh:move |_|dashboard.restart()}
                                    }}
                                }
                            }else{div{class:"empty","SYNCING..."}}
                        }
                    },
                    "craft"=>rsx!{FoundryView{repo:repo(),notice}},
                    "sentinel"=>rsx!{SentinelView{repo:repo(),notice}},
                    "canvas"=>rsx!{CanvasView{repo:repo(),notice}},
                    "nexus"=>rsx!{NexusView{notice}},
                    _=>rsx!{div{class:"empty","unknown module"}}
                }
            }
            footer{class:"footer",span{"GitCraft // gc"}span{class:"mono","RUST + DIOXUS + AST + VAULT + SANDBOX"}span{"Traefik/TLS remains owned by Core."}}
        }
    }
}
#[component]
fn TaskCreator(repo:Signal<String>,task_name:Signal<String>,prompt:Signal<String>,agent:Signal<String>,mut notice:Signal<String>,on_created:EventHandler<()>) -> Element {
    let mut repo=repo;let mut task_name=task_name;let mut prompt=prompt;let mut agent=agent;
    rsx!{section{class:"panel create-panel",
        div{class:"panel-head",div{h3{"Queue Agent Work"}p{"Default agent: GC. Codex and Claude remain optional adapters."}}span{class:"micro-tag","ISOLATED"}},
        div{class:"form-grid",
            label{"Repository" input{value:"{repo()}",oninput:move|e|repo.set(e.value())}}
            label{"Task name" input{value:"{task_name()}",oninput:move|e|task_name.set(e.value())}}
            label{"Agent" select{value:"{agent()}",onchange:move|e|agent.set(e.value()),option{value:"gc","GC Agent"}option{value:"codex","Codex"}option{value:"claude","Claude"}}}
            label{class:"wide","Prompt" textarea{value:"{prompt()}",oninput:move|e|prompt.set(e.value()),rows:"4"}}
        }
        button{class:"primary",onclick:move |_|{
            let request=NewTask{repo_root:repo(),name:task_name(),task_type:"agent".into(),prompt:prompt(),agent:agent(),model:None,parent_ids:Vec::new(),network_isolation:true,allowed_domains:Vec::new(),interactive:false};
            notice.set("queueing isolated task...".into());
            spawn(async move{match create_task_api(request).await{Ok(t)=>notice.set(format!("queued {}",t.id)),Err(e)=>notice.set(format!("queue failed: {e}"))}on_created.call(());});
        },"QUEUE TASK"}
    }}
}
#[component]
fn TaskRow(task:Task,selected:bool,on_select:EventHandler<String>,on_refresh:EventHandler<()>) -> Element {
    let id=task.id.clone();
    rsx!{div{class:if selected{"task-row selected"}else{"task-row"},
        div{class:"task-main",onclick:move |_|on_select.call(id.clone()),div{class:"task-title-line",strong{"{task.name}"}span{class:"{status_class(&task.status)}","{status_label(&task.status)}"}},
            div{class:"task-meta mono",span{"{task.id}"}span{"agent={task.agent}"}span{"branch={task.branch_name}"}}
            if let Some(v)=&task.error_message{p{class:"task-error","{v}"}} if let Some(v)=&task.result_message{p{class:"task-ok","{v}"}}
        }
        div{class:"task-actions",
            if matches!(task.status,TaskStatus::Queued|TaskStatus::Running){button{class:"icon-btn",onclick:{let id=task.id.clone();move |_|{let id=id.clone();spawn(async move{let _=cancel_task(id).await;on_refresh.call(());});}},"CANCEL"}}
            if matches!(task.status,TaskStatus::Failed|TaskStatus::Cancelled|TaskStatus::Blocked){button{class:"icon-btn",onclick:{let id=task.id.clone();move |_|{let id=id.clone();spawn(async move{let _=retry_task(id).await;on_refresh.call(());});}},"RETRY"}}
            if matches!(task.status,TaskStatus::Complete|TaskStatus::Failed|TaskStatus::Cancelled){button{class:"icon-btn danger-text",onclick:{let id=task.id.clone();move |_|{let id=id.clone();spawn(async move{let _=delete_task(id).await;on_refresh.call(());});}},"DELETE"}}
        }
    }}
}
#[component]
fn FoundryView(repo: String, mut notice: Signal<String>) -> Element {
    let mut plan = use_signal(|| None::<CraftPlan>);
    let mut running = use_signal(|| false);
    let action_repo = repo.clone();

    let run = move |_| {
        if running() { return; }
        running.set(true);
        notice.set("indexing source AST and generating plan...".into());
        let repo = action_repo.clone();
        spawn(async move {
            match crate::craft::build_plan(std::path::Path::new(&repo), None).await {
                Ok(value) => {
                    notice.set(format!("foundry: {} features / {} proposals", value.features.len(), value.suggestions.len()));
                    plan.set(Some(value));
                }
                Err(error) => notice.set(format!("foundry failed: {error}")),
            }
            running.set(false);
        });
    };

    rsx! {
        section { class: "hero-grid",
            div { class: "hero module-craft",
                div { class: "eyebrow cyan", "GC FOUNDRY" }
                h2 { "Code is the source of truth." }
                p { "Capabilities come from parsed source AST and symbol provenance. Markdown, vendor code and legacy prototypes are excluded." }
                div { class: "hero-chips", span { "TREE-SITTER" } span { "CODE VAULT" } span { "LLM PLAN" } span { "BRANCH" } }
            }
            div { class: "runtime-card",
                div { class: "eyebrow", "PIPELINE" }
                div { class: "pipeline", span { "AST" } span { "VAULT" } span { "PLAN" } span { "TASK" } }
                button { class: "primary small", onclick: run, disabled: running(), if running() { "INDEXING..." } else { "RUN FOUNDRY" } }
            }
        }
        if let Some(value) = plan() {
            section { class: "panel",
                div { class: "panel-head", div { h3 { "Code-derived capabilities" } p { "Evidence is tied to source code." } } span { class: "micro-tag", "{value.features.len()} FEATURES" } }
                div { class: "capability-grid",
                    for feature in value.features.iter().take(240) {
                        div { class: "feature-card",
                            span { class: "node-kind", "{feature.category}" }
                            strong { "{feature.name}" }
                            p { "{feature.description}" }
                        }
                    }
                }
            }
        } else {
            div { class: "empty panel", "Run the Foundry to build a code-derived plan." }
        }
    }
}
#[component]
fn SentinelView(repo:String,mut notice:Signal<String>)->Element{
    let mut report=use_signal(||None::<ReviewReport>);let mut running=use_signal(||false);let p=repo.clone();
    let run=move |_|{if running(){return}running.set(true);notice.set("running native GC AST review...".into());let repo=p.clone();spawn(async move{
        match review_repository(repo).await{Ok(v)=>{notice.set(format!("review {} / {} findings",v.status,v.findings.len()));report.set(Some(v))},Err(e)=>notice.set(format!("review failed: {e}"))}running.set(false);
    });};
    rsx!{section{class:"hero-grid",div{class:"hero module-sentinel",div{class:"eyebrow amber","REVIEWFLOW SENTINEL"},h2{"Deterministic AST quality gates."},p{"GC walks syntax trees and applies versioned rule algorithms stored in the repository."},div{class:"hero-chips",span{"AST"}span{"RULES"}span{"PROVENANCE"}span{"PASS/BLOCK"}}},
        div{class:"runtime-card",div{class:"eyebrow","ENGINE"},div{class:"big-metric","GC"},span{"native AST reviewer"},button{class:"primary small",onclick:run,disabled:running(),if running(){"SCANNING..."}else{"RUN SENTINEL"}}}}
        section{class:"panel",div{class:"panel-head",h3{"Review Report"}span{class:"micro-tag","DETERMINISTIC"}},if let Some(v)=report(){div{class:"finding-list",for f in v.findings.iter().take(120){div{class:"finding-row",span{class:"status status-failed","{f.severity}"}span{class:"mono finding-path","{f.path}:{f.start_line}"}div{strong{"{f.rule_id}"}p{"{f.message}"}}}}}}else{div{class:"empty","Run Sentinel against the repository."}}}
    }
}
#[component]
fn CanvasView(repo: String, mut notice: Signal<String>) -> Element {
    let mut graph = use_signal(|| None::<ArchitectureGraph>);
    let action_repo = repo.clone();
    let load = move |_| {
        notice.set("deriving architecture from executable source...".into());
        let repo = action_repo.clone();
        spawn(async move {
            match architecture(repo).await {
                Ok(value) => {
                    notice.set(format!("graph {} nodes / {} edges", value.nodes.len(), value.edges.len()));
                    graph.set(Some(value));
                }
                Err(error) => notice.set(format!("architecture failed: {error}")),
            }
        });
    };
    rsx! {
        section { class: "hero-grid",
            div { class: "hero module-canvas",
                div { class: "eyebrow violet", "ARCHCANVAS" }
                h2 { "Architecture from code, not documentation." }
                p { "The graph is derived from the same source AST used by Foundry and Sentinel." }
                button { class: "primary", onclick: load, "BUILD GRAPH" }
            }
            div { class: "runtime-card",
                div { class: "eyebrow", "GRAPH" }
                if let Some(value) = graph() {
                    div { class: "big-metric", "{value.nodes.len()}" }
                    span { "nodes" }
                    div { class: "metric-row", span { "edges" } span { class: "mono", "{value.edges.len()}" } }
                } else {
                    div { class: "big-metric", "—" }
                    span { "not built" }
                }
            }
        }
        section { class: "panel",
            div { class: "panel-head", h3 { "Architecture Nodes" } span { class: "micro-tag", "CODEGRAPH" } }
            if let Some(value) = graph() {
                div { class: "graph-grid",
                    for node in value.nodes.iter().take(180) {
                        div { class: "graph-node", span { class: "node-kind", "{node.kind}" } strong { "{node.label}" } }
                    }
                }
            } else {
                div { class: "empty", "Build the graph to inspect repository shape." }
            }
        }
    }
}
#[component]
fn NexusView(mut notice:Signal<String>)->Element{
    let mut probe=use_signal(||None::<ApiProbe>);let run=move |_|{notice.set("probing configured LLM gateway...".into());spawn(async move{match probe_llm().await{Ok(v)=>{notice.set(format!("gateway online, {} models",v.models.len()));probe.set(Some(v))},Err(e)=>notice.set(format!("gateway failed: {e}"))}});};
    rsx!{section{class:"hero-grid",div{class:"hero module-nexus",div{class:"eyebrow cyan","NEXUS / MODEL GATEWAY"},h2{"Server-side model connectivity."},p{"GC reads URL and key from secrets. The browser receives only the model catalog."},button{class:"primary",onclick:run,"PROBE /MODELS"}},
        div{class:"runtime-card",div{class:"eyebrow","GATEWAY"},if let Some(v)=probe(){div{class:"big-metric","{v.models.len()}"}span{"models returned"}div{class:"metric-row",span{"status"}span{class:"mono","{v.status}"}}div{class:"metric-row",span{"latency"}span{class:"mono","{v.latency_ms}ms"}}}else{div{class:"big-metric","—"}span{"not probed"}}}}
        section{class:"panel",div{class:"panel-head",h3{"Model Catalog"}span{class:"micro-tag","SERVER SIDE"}},if let Some(v)=probe(){div{class:"model-grid",for m in v.models.iter(){span{class:"model-pill mono","{m}"}}}}else{div{class:"empty","Probe the gateway to show its actual model catalog."}}}
    }
}
