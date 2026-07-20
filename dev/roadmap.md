# Roadmap

## P1.1 XML Documentation Intake

- Parse compiler XML documentation files.
- Preserve .NET member ids and documentation tags.
- Preserve XML documentation locale markers such as `<lang>`, `<l>` and compatible `div h_type="doc" > para[lang]`.
- Emit `dotnetdoc-xml-doc-extraction@0.1.0-draft`.

## P1.2 HIA Adapter

- Convert XML documentation extraction to a HIA document artifact.
- Map XML documentation locale markers to `HiaI18nModel.fields`.
- Keep source path privacy conservative and avoid `sourcesContent`.

## P1.3 Roslyn Syntax Source Intake

- Parse explicit C# source files with Roslyn syntax APIs.
- Extract documented/public declarations, XML documentation trivia and source ranges.
- Normalize source XML documentation locale markers without retaining raw XML trivia in final artifacts.
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

## P1.7 Package Release Candidate

- Align package versions and internal dependency pins.
- Add npm publish metadata and public package README/LICENSE files.
- Add pack dry-run verification for package contents.

Status: first runner/producer slice is implemented for compiler XML documentation inputs. A Roslyn syntax-only source extractor is available for explicit `.cs` files. The published `0.1.2` patch carries DotNetDoc XML-native locale marker support for both compiler XML and source XML documentation trivia, plus the T-Lang-P1.4 HIA-ASPNETPortal readiness gate. Rich semantic source-linkage, external language resources and IDE preview/edit workflows remain follow-up concerns.
