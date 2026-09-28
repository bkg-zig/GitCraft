FROM rust:1.98-bookworm AS builder
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git bash curl pkg-config libssl-dev zlib1g-dev cmake \
    && rm -rf /var/lib/apt/lists/*
RUN cargo install dioxus-cli --version 0.7.10 --locked
WORKDIR /src
COPY Cargo.toml Cargo.lock Dioxus.toml ./
COPY src ./src
COPY assets ./assets
COPY algorithms ./algorithms
COPY sandbox ./sandbox
RUN CARGO_TARGET_DIR=/src/target-dx dx build --release --fullstack --bin gc-web --features server
RUN cargo build --release --bin gc --bin gc-proxy --bin bkg-craft

FROM debian:bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git bash docker.io curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /src/target-dx/dx/gc-web/release/web/server /usr/local/bin/gc-web
COPY --from=builder /src/target-dx/dx/gc-web/release/web/public /app/public
COPY assets/gc.css /app/public/assets/gc.css
COPY --from=builder /src/target/release/gc /usr/local/bin/gc
COPY --from=builder /src/target/release/gc-proxy /usr/local/bin/gc-proxy
COPY --from=builder /src/target/release/bkg-craft /usr/local/bin/bkg-craft
COPY algorithms /app/algorithms
COPY sandbox /app/sandbox

ENV GC_PROJECT_ROOT=/app
ENV GC_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
ENV GC_DATA_DIR=/var/lib/gc
ENV DIOXUS_PUBLIC_PATH=/app/public
ENV RUST_LOG=info
ENV IP=0.0.0.0
ENV PORT=3000

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/gc-web"]
