use std::path::PathBuf;

use gc::{init_engine, web::App};

#[cfg(feature = "server")]
fn main() {
    let root = std::env::var("GC_PROJECT_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/workspace/bkg-alpha/GitCraft"));

    let engine = init_engine(root).expect("initialize gc engine");

    dioxus::serve(move || {
        let engine = engine.clone();
        async move {
            tokio::spawn(engine.run_scheduler());
            let router = gc::internal_api::router()
                .merge(dioxus::server::router(App));
            Ok(router)
        }
    });
}

#[cfg(all(feature = "web", not(feature = "server")))]
fn main() {
    dioxus::launch(App);
}

#[cfg(not(any(feature = "server", feature = "web")))]
fn main() {
    eprintln!("gc-web requires the server or web feature");
}

