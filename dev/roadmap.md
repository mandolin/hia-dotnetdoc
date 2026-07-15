# Roadmap

## P1.1 XML Documentation Intake

- Parse compiler XML documentation files.
- Preserve .NET member ids and documentation tags.
- Emit `dotnetdoc-xml-doc-extraction@0.1.0-draft`.

## P1.2 HIA Adapter

- Convert XML documentation extraction to a HIA document artifact.
- Keep source path privacy conservative and avoid `sourcesContent`.

## P1.3 Roslyn Syntax Source Intake

- Parse explicit C# source files with Roslyn syntax APIs.
- Extract documented/public declarations, XML documentation trivia and source ranges.
- Emit `dotnetdoc-csharp-source-extraction@0.1.0-draft`.

## P1.4 ASP.NET Endpoint Intake

- Add OpenAPI document intake.
- Map controller/minimal API endpoints to route symbols.

## P1.5 Roslyn Semantic / DocFX / SHFB Bridge

- Decide whether DocFX metadata is a first-class input.
- Add Roslyn semantic extraction for `.sln`/`.csproj`, overload normalization, inherited docs and richer source-linkage.
- Import SHFB/DocFX project organization where existing projects already use them.

## P1.6 Producer Bridge

- Add documentation producer descriptor and result output.
- Add source-linkage privacy checks.

Status: first runner/producer slice is implemented for compiler XML documentation inputs. A Roslyn syntax-only source extractor is now available for explicit `.cs` files. Rich semantic source-linkage remains a follow-up Roslyn/DocFX/SHFB bridge concern.
