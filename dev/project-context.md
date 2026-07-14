# Project Context

`hia-dotnetdoc` should support two operating modes:

- standalone usage for ordinary .NET and ASP.NET projects;
- adapter usage inside HIA Documentation System project builds.

The first implementation layer consumes compiler XML documentation files because
that is the stable language-level documentation artifact already present in the
.NET ecosystem.

DocFX, Roslyn, and ASP.NET OpenAPI should be added as bridges around this layer,
not as replacements for it.

