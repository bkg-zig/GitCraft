# GitCraft Native Algorithms

vendor/ repositories are references only.

## Code feature inference
Input: executable source code parsed by Tree-sitter. Markdown, README, screenshots and vendor source are excluded.
Pipeline: source file -> AST -> symbol/construct extraction -> normalized feature records -> deterministic capability markers -> persisted code snapshot.

## Review
Input: AST nodes from source files.
Pipeline: AST -> rule selector -> node/text match -> line-accurate finding -> severity aggregation -> persisted review artifact.

## Knowledge
Input: code feature records and generated plans.
Pipeline: snapshot hash -> feature rows -> FTS index -> hierarchical gc:// artifacts -> query/search.

All algorithm versions are recorded in .gc/vault/vault.sqlite.