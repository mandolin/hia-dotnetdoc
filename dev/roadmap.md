# Roadmap

## P1.1 XML Documentation Intake

- Parse compiler XML documentation files.
- Preserve .NET member ids and documentation tags.
- Emit `dotnetdoc-xml-doc-extraction@0.1.0-draft`.

## P1.2 HIA Adapter

- Convert XML documentation extraction to a HIA document artifact.
- Keep source path privacy conservative and avoid `sourcesContent`.

## P1.3 ASP.NET Endpoint Intake

- Add OpenAPI document intake.
- Map controller/minimal API endpoints to route symbols.

## P1.4 Roslyn / DocFX Bridge

- Decide whether DocFX metadata is a first-class input.
- Add Roslyn semantic extraction only where XML doc/OpenAPI metadata is not enough.

## P1.5 Producer Bridge

- Add documentation producer descriptor and result output.
- Add source-linkage privacy checks.

