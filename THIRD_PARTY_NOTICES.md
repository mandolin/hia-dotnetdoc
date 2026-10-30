# Third-Party Notices

## Runtime Dependencies

| Package | Version | License | Purpose |
| --- | --- | --- | --- |
| `fast-xml-parser` | `5.3.2` | MIT | Parse compiler-generated .NET XML documentation files. |
| `Microsoft.CodeAnalysis.CSharp` | `5.6.0` | MIT | Parse C# source files and XML documentation trivia through Roslyn syntax APIs. |

The source extractor uses Roslyn parsing and a lightweight compilation with
available declared metadata references; it does not load an MSBuild workspace
or build the input project. DocFX/SHFB import, complete target-project semantic
compilation and ASP.NET runtime/OpenAPI discovery remain outside its scope.

源码抽取器使用Roslyn语法和有界轻量语义编译，不加载完整MSBuild工作区或构建输入项目；
上述依赖版本与许可保持不变，静态能力不等于目标项目完整编译或运行时端点发现。
