# Project Status

`hia-dotnetdoc` is at P0/P1 skeleton status.

Completed in the first slice:

- workspace skeleton;
- XML documentation extraction contract;
- HIA document adapter;
- fixture build/check/test scripts;
- dependency license audit for `fast-xml-parser`.

Completed in W-P16.3 first slice:

- standalone `@hia-doc/dotnetdoc-runner`;
- `hia-dotnetdoc` and `dotnetdoc` CLI aliases;
- versioned `dotnetdoc.config.json`;
- documentation producer result manifest;
- `@hia-doc/dotnetdoc-producer` descriptor and adapter;
- standalone example and release gate checks.

Not yet implemented:

- DocFX metadata bridge;
- Roslyn semantic extraction;
- ASP.NET OpenAPI endpoint inventory;
- source-linkage beyond compiler XML documentation paths;
- package publishing setup.
