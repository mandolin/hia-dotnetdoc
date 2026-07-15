# Third-Party Notices

## Runtime Dependencies

| Package | Version | License | Purpose |
| --- | --- | --- | --- |
| `fast-xml-parser` | `5.3.2` | MIT | Parse compiler-generated .NET XML documentation files. |
| `Microsoft.CodeAnalysis.CSharp` | `5.6.0` | MIT | Parse C# source files and XML documentation trivia through Roslyn syntax APIs. |

DocFX, SHFB project import, Roslyn semantic compilation, and ASP.NET OpenAPI
integration remain follow-up layers. The first Roslyn slice is syntax-only and
is used by `@hia-doc/dotnet-source-extractor`.
