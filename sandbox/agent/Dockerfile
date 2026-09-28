FROM gc:local

RUN useradd --create-home --shell /bin/bash agent \
    && mkdir -p /workspace /instructions \
    && chown -R agent:agent /workspace /instructions /tmp

USER agent
WORKDIR /workspace

ENTRYPOINT ["/usr/local/bin/gc"]
