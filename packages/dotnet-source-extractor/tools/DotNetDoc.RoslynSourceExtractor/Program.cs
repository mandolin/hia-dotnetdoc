using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

const string Contract = "dotnetdoc-csharp-source-extraction";
const string ContractVersion = "0.1.0-draft";
const string ProducerName = "@hia-doc/dotnet-source-extractor";
const string ProducerVersion = "0.1.5";

try
{
    var options = CommandLineOptions.Parse(args);
    var sources = new List<SourceInput>();
    var diagnostics = new List<DiagnosticOutput>();
    foreach (var relativePath in options.Paths)
    {
        var absolutePath = options.ResolveWorkspacePath(relativePath);
        var sourceText = File.ReadAllText(absolutePath);
        var syntaxTree = CSharpSyntaxTree.ParseText(sourceText, path: relativePath);
        diagnostics.AddRange(syntaxTree.GetDiagnostics().Select(ToDiagnosticOutput));
        sources.Add(new SourceInput(relativePath, syntaxTree));
    }

    var compilation = CSharpCompilation.Create(
        assemblyName: "DotNetDoc.SourceExtraction",
        syntaxTrees: sources.Select(source => source.SyntaxTree),
        references: TrustedPlatformReferences(),
        options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
    diagnostics.AddRange(compilation.GetDiagnostics().Select(ToDiagnosticOutput));

    var members = new List<MemberOutput>();
    foreach (var source in sources)
    {
        var root = source.SyntaxTree.GetCompilationUnitRoot();
        var semanticModel = compilation.GetSemanticModel(source.SyntaxTree, ignoreAccessibility: true);
        var walker = new DocumentationWalker(source.SyntaxTree, source.RelativePath, semanticModel);
        walker.Visit(root);
        members.AddRange(walker.Members);
    }

    var artifact = new
    {
        contract = Contract,
        contractVersion = ContractVersion,
        producer = new
        {
            name = ProducerName,
            version = ProducerVersion,
            engine = "roslyn",
            engineVersion = typeof(CSharpSyntaxTree).Assembly.GetName().Version?.ToString()
        },
        source = new
        {
            kind = "csharp-source",
            files = options.Paths.Select(path => new { path }).ToArray()
        },
        assembly = new
        {
            name = (string?)null
        },
        members,
        diagnostics
    };

    Console.Out.WriteLine(JsonSerializer.Serialize(artifact, JsonOptions.Default));
    return 0;
}
catch (Exception error)
{
    Console.Error.WriteLine(error.Message);
    return 1;
}

static DiagnosticOutput ToDiagnosticOutput(Diagnostic diagnostic)
{
    return new DiagnosticOutput
    {
        Code = diagnostic.Id,
        Message = diagnostic.GetMessage(),
        Severity = diagnostic.Severity.ToString().ToLowerInvariant(),
        Source = null
    };
}

static IEnumerable<MetadataReference> TrustedPlatformReferences()
{
    var trustedAssemblies = (string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES");
    if (string.IsNullOrWhiteSpace(trustedAssemblies))
    {
        return new[] { MetadataReference.CreateFromFile(typeof(object).Assembly.Location) };
    }

    return trustedAssemblies
        .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
        .Where(File.Exists)
        .Select(assemblyPath => MetadataReference.CreateFromFile(assemblyPath));
}

sealed record SourceInput(string RelativePath, SyntaxTree SyntaxTree);

sealed class DocumentationWalker : CSharpSyntaxWalker
{
    private readonly SyntaxTree _syntaxTree;
    private readonly string _relativePath;
    private readonly SemanticModel _semanticModel;
    private readonly Stack<string> _namespaces = new();
    private readonly Stack<string> _types = new();

    public DocumentationWalker(SyntaxTree syntaxTree, string relativePath, SemanticModel semanticModel)
    {
        _syntaxTree = syntaxTree;
        _relativePath = relativePath;
        _semanticModel = semanticModel;
    }

    public List<MemberOutput> Members { get; } = new();

    public override void VisitNamespaceDeclaration(NamespaceDeclarationSyntax node)
    {
        _namespaces.Push(node.Name.ToString());
        base.VisitNamespaceDeclaration(node);
        _namespaces.Pop();
    }

    public override void VisitFileScopedNamespaceDeclaration(FileScopedNamespaceDeclarationSyntax node)
    {
        _namespaces.Push(node.Name.ToString());
        base.VisitFileScopedNamespaceDeclaration(node);
        _namespaces.Pop();
    }

    public override void VisitClassDeclaration(ClassDeclarationSyntax node)
    {
        VisitTypeDeclaration(node, node.Identifier.ValueText, node.TypeParameterList?.Parameters.Count ?? 0, () => base.VisitClassDeclaration(node));
    }

    public override void VisitInterfaceDeclaration(InterfaceDeclarationSyntax node)
    {
        VisitTypeDeclaration(node, node.Identifier.ValueText, node.TypeParameterList?.Parameters.Count ?? 0, () => base.VisitInterfaceDeclaration(node));
    }

    public override void VisitStructDeclaration(StructDeclarationSyntax node)
    {
        VisitTypeDeclaration(node, node.Identifier.ValueText, node.TypeParameterList?.Parameters.Count ?? 0, () => base.VisitStructDeclaration(node));
    }

    public override void VisitRecordDeclaration(RecordDeclarationSyntax node)
    {
        VisitTypeDeclaration(node, node.Identifier.ValueText, node.TypeParameterList?.Parameters.Count ?? 0, () => base.VisitRecordDeclaration(node));
    }

    public override void VisitEnumDeclaration(EnumDeclarationSyntax node)
    {
        VisitTypeDeclaration(node, node.Identifier.ValueText, 0, () => base.VisitEnumDeclaration(node));
    }

    public override void VisitMethodDeclaration(MethodDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        if (typeName.Length == 0 || !ShouldInclude(node, node.Modifiers))
        {
            base.VisitMethodDeclaration(node);
            return;
        }

        var genericSuffix = node.TypeParameterList is null ? "" : $"``{node.TypeParameterList.Parameters.Count}";
        var parameters = DocumentationParameterList(node.ParameterList.Parameters);
        AddMember(
            node,
            $"M:{typeName}.{node.Identifier.ValueText}{genericSuffix}{parameters}",
            "dotnet-method",
            node.Identifier.ValueText,
            _semanticModel.GetDeclaredSymbol(node));
        base.VisitMethodDeclaration(node);
    }

    public override void VisitConstructorDeclaration(ConstructorDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        if (typeName.Length == 0 || !ShouldInclude(node, node.Modifiers))
        {
            base.VisitConstructorDeclaration(node);
            return;
        }

        AddMember(
            node,
            $"M:{typeName}.#ctor{DocumentationParameterList(node.ParameterList.Parameters)}",
            "dotnet-method",
            "#ctor",
            _semanticModel.GetDeclaredSymbol(node));
        base.VisitConstructorDeclaration(node);
    }

    public override void VisitPropertyDeclaration(PropertyDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        if (typeName.Length != 0 && ShouldInclude(node, node.Modifiers))
        {
            AddMember(node, $"P:{typeName}.{node.Identifier.ValueText}", "dotnet-property", node.Identifier.ValueText, _semanticModel.GetDeclaredSymbol(node));
        }
        base.VisitPropertyDeclaration(node);
    }

    public override void VisitIndexerDeclaration(IndexerDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        if (typeName.Length != 0 && ShouldInclude(node, node.Modifiers))
        {
            AddMember(node, $"P:{typeName}.Item{DocumentationParameterList(node.ParameterList.Parameters)}", "dotnet-property", "Item", _semanticModel.GetDeclaredSymbol(node));
        }
        base.VisitIndexerDeclaration(node);
    }

    public override void VisitFieldDeclaration(FieldDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        if (typeName.Length != 0 && ShouldInclude(node, node.Modifiers))
        {
            foreach (var variable in node.Declaration.Variables)
            {
                AddMember(node, $"F:{typeName}.{variable.Identifier.ValueText}", "dotnet-field", variable.Identifier.ValueText, _semanticModel.GetDeclaredSymbol(variable));
            }
        }
        base.VisitFieldDeclaration(node);
    }

    public override void VisitEventDeclaration(EventDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        if (typeName.Length != 0 && ShouldInclude(node, node.Modifiers))
        {
            AddMember(node, $"E:{typeName}.{node.Identifier.ValueText}", "dotnet-event", node.Identifier.ValueText, _semanticModel.GetDeclaredSymbol(node));
        }
        base.VisitEventDeclaration(node);
    }

    public override void VisitEventFieldDeclaration(EventFieldDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        if (typeName.Length != 0 && ShouldInclude(node, node.Modifiers))
        {
            foreach (var variable in node.Declaration.Variables)
            {
                AddMember(node, $"E:{typeName}.{variable.Identifier.ValueText}", "dotnet-event", variable.Identifier.ValueText, _semanticModel.GetDeclaredSymbol(variable));
            }
        }
        base.VisitEventFieldDeclaration(node);
    }

    private void VisitTypeDeclaration(BaseTypeDeclarationSyntax node, string identifier, int typeParameterCount, Action visitChildren)
    {
        var typeName = typeParameterCount > 0 ? $"{identifier}`{typeParameterCount}" : identifier;
        if (ShouldInclude(node, node.Modifiers))
        {
            AddMember(node, $"T:{QualifiedTypeName(typeName)}", "dotnet-type", identifier, _semanticModel.GetDeclaredSymbol(node));
        }

        _types.Push(typeName);
        visitChildren();
        _types.Pop();
    }

    private void AddMember(SyntaxNode node, string memberName, string kind, string displayName, ISymbol? symbol)
    {
        var documentation = DocumentationData.FromNode(node);
        var semantic = SemanticOutput.FromSymbol(symbol);
        var semanticMemberName = semantic?.DocumentationCommentId;
        Members.Add(new MemberOutput
        {
            Id = CreateMemberId(semanticMemberName ?? memberName),
            MemberName = semanticMemberName ?? memberName,
            Kind = kind,
            Name = displayName,
            Summary = documentation.Summary,
            Remarks = documentation.Remarks,
            Parameters = documentation.Parameters,
            TypeParameters = documentation.TypeParameters,
            Returns = documentation.Returns,
            Exceptions = documentation.Exceptions,
            See = documentation.See,
            SeeAlso = documentation.SeeAlso,
            DocumentationXml = documentation.Xml,
            Source = SourceFor(node),
            Semantic = semantic
        });
    }

    private SourceOutput SourceFor(SyntaxNode node)
    {
        var span = _syntaxTree.GetLineSpan(node.Span);
        return new SourceOutput
        {
            Path = _relativePath,
            Language = "csharp",
            RangeSource = "roslyn-syntax",
            Confidence = "medium",
            Range = new RangeOutput
            {
                Start = new PositionOutput
                {
                    Line = span.StartLinePosition.Line + 1,
                    Column = span.StartLinePosition.Character + 1
                },
                End = new PositionOutput
                {
                    Line = span.EndLinePosition.Line + 1,
                    Column = span.EndLinePosition.Character + 1
                }
            }
        };
    }

    private string CurrentTypeName()
    {
        return QualifiedTypeName(null);
    }

    private string QualifiedTypeName(string? leaf)
    {
        var parts = new List<string>();
        parts.AddRange(_namespaces.Reverse());
        parts.AddRange(_types.Reverse());
        if (!string.IsNullOrEmpty(leaf))
        {
            parts.Add(leaf);
        }
        return string.Join(".", parts.Where(part => !string.IsNullOrWhiteSpace(part)));
    }

    private static bool ShouldInclude(SyntaxNode node, SyntaxTokenList modifiers)
    {
        return HasDocumentation(node) || modifiers.Any(IsExternallyVisibleModifier);
    }

    private static bool HasDocumentation(SyntaxNode node)
    {
        return node.GetLeadingTrivia().Any(trivia => trivia.GetStructure() is DocumentationCommentTriviaSyntax);
    }

    private static bool IsExternallyVisibleModifier(SyntaxToken token)
    {
        return token.IsKind(SyntaxKind.PublicKeyword)
            || token.IsKind(SyntaxKind.ProtectedKeyword)
            || token.IsKind(SyntaxKind.InternalKeyword);
    }

    private static string DocumentationParameterList(SeparatedSyntaxList<ParameterSyntax> parameters)
    {
        if (parameters.Count == 0)
        {
            return "";
        }

        return $"({string.Join(",", parameters.Select(parameter => DocumentationTypeName(parameter.Type)))})";
    }

    private static string DocumentationTypeName(TypeSyntax? type)
    {
        if (type is null)
        {
            return "System.Object";
        }

        return type switch
        {
            PredefinedTypeSyntax predefined => PredefinedTypeName(predefined.Keyword),
            NullableTypeSyntax nullable => DocumentationTypeName(nullable.ElementType),
            ArrayTypeSyntax array => $"{DocumentationTypeName(array.ElementType)}[]",
            GenericNameSyntax generic => $"{generic.Identifier.ValueText}`{generic.TypeArgumentList.Arguments.Count}",
            QualifiedNameSyntax qualified => $"{DocumentationTypeName(qualified.Left)}.{DocumentationTypeName(qualified.Right)}",
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
            _ => type.ToString().Replace(" ", "", StringComparison.Ordinal)
        };
    }

    private static string PredefinedTypeName(SyntaxToken token)
    {
        return token.Kind() switch
        {
            SyntaxKind.BoolKeyword => "System.Boolean",
            SyntaxKind.ByteKeyword => "System.Byte",
            SyntaxKind.SByteKeyword => "System.SByte",
            SyntaxKind.ShortKeyword => "System.Int16",
            SyntaxKind.UShortKeyword => "System.UInt16",
            SyntaxKind.IntKeyword => "System.Int32",
            SyntaxKind.UIntKeyword => "System.UInt32",
            SyntaxKind.LongKeyword => "System.Int64",
            SyntaxKind.ULongKeyword => "System.UInt64",
            SyntaxKind.FloatKeyword => "System.Single",
            SyntaxKind.DoubleKeyword => "System.Double",
            SyntaxKind.DecimalKeyword => "System.Decimal",
            SyntaxKind.CharKeyword => "System.Char",
            SyntaxKind.StringKeyword => "System.String",
            SyntaxKind.ObjectKeyword => "System.Object",
            SyntaxKind.VoidKeyword => "System.Void",
            _ => token.ValueText
        };
    }

    private static string CreateMemberId(string memberName)
    {
        var slug = Regex.Replace(memberName.Trim().ToLowerInvariant(), "[^a-z0-9._:-]+", "-").Trim('-');
        return $"dotnet:{(slug.Length == 0 ? "member" : slug)}";
    }
}

sealed class DocumentationData
{
    public string Summary { get; set; } = "";
    public string Remarks { get; set; } = "";
    public List<NamedDocumentationOutput> Parameters { get; set; } = new();
    public List<NamedDocumentationOutput> TypeParameters { get; set; } = new();
    public string Returns { get; set; } = "";
    public List<ExceptionDocumentationOutput> Exceptions { get; set; } = new();
    public List<ReferenceOutput> See { get; set; } = new();
    public List<ReferenceOutput> SeeAlso { get; set; } = new();
    public string Xml { get; set; } = "";

    public static DocumentationData FromNode(SyntaxNode node)
    {
        var data = new DocumentationData();
        var xmlFragments = new List<string>();
        foreach (var trivia in node.GetLeadingTrivia())
        {
            if (trivia.GetStructure() is not DocumentationCommentTriviaSyntax documentation)
            {
                continue;
            }

            foreach (var item in documentation.Content)
            {
                xmlFragments.Add(item.ToFullString());
                CollectXmlNode(data, item);
            }
        }
        data.Xml = string.Concat(xmlFragments).Trim();
        return data;
    }

    private static void CollectXmlNode(DocumentationData data, XmlNodeSyntax node)
    {
        switch (node)
        {
            case XmlElementSyntax element:
                ApplyXmlElement(data, ElementName(element.StartTag.Name), element);
                break;
            case XmlEmptyElementSyntax emptyElement:
                ApplyXmlEmptyElement(data, ElementName(emptyElement.Name), emptyElement);
                break;
        }
    }

    private static void ApplyXmlElement(DocumentationData data, string name, XmlElementSyntax element)
    {
        var text = CompactWhitespace(TextContent(element));
        switch (name)
        {
            case "summary":
                data.Summary = text;
                break;
            case "remarks":
                data.Remarks = text;
                break;
            case "param":
                AddNamed(data.Parameters, AttributeValue(element, "name"), text);
                break;
            case "typeparam":
                AddNamed(data.TypeParameters, AttributeValue(element, "name"), text);
                break;
            case "returns":
                data.Returns = text;
                break;
            case "exception":
                data.Exceptions.Add(new ExceptionDocumentationOutput
                {
                    Cref = AttributeValue(element, "cref"),
                    Summary = text
                });
                break;
            case "see":
                data.See.Add(ReferenceFrom(element, text));
                break;
            case "seealso":
                data.SeeAlso.Add(ReferenceFrom(element, text));
                break;
        }
    }

    private static void ApplyXmlEmptyElement(DocumentationData data, string name, XmlEmptyElementSyntax element)
    {
        var reference = ReferenceFrom(element, "");
        switch (name)
        {
            case "see":
                data.See.Add(reference);
                break;
            case "seealso":
                data.SeeAlso.Add(reference);
                break;
        }
    }

    private static ReferenceOutput ReferenceFrom(SyntaxNode node, string label)
    {
        return new ReferenceOutput
        {
            Cref = AttributeValue(node, "cref"),
            Href = AttributeValue(node, "href"),
            Label = label
        };
    }

    private static void AddNamed(List<NamedDocumentationOutput> items, string? name, string summary)
    {
        if (!string.IsNullOrWhiteSpace(name))
        {
            items.Add(new NamedDocumentationOutput
            {
                Name = name,
                Summary = summary
            });
        }
    }

    private static string ElementName(XmlNameSyntax name)
    {
        return name.ToString();
    }

    private static string? AttributeValue(SyntaxNode node, string name)
    {
        var match = Regex.Match(node.ToString(), $@"\b{Regex.Escape(name)}\s*=\s*""([^""]*)""");
        return match.Success ? match.Groups[1].Value : null;
    }

    private static string TextContent(SyntaxNode node)
    {
        return string.Concat(node.DescendantTokens()
            .Where(token => token.IsKind(SyntaxKind.XmlTextLiteralToken))
            .Select(token => token.ValueText));
    }

    private static string CompactWhitespace(string value)
    {
        return Regex.Replace(value, @"\s+", " ").Trim();
    }
}

sealed class CommandLineOptions
{
    public required string WorkspaceRoot { get; init; }
    public required IReadOnlyList<string> Paths { get; init; }

    public static CommandLineOptions Parse(string[] args)
    {
        var workspaceRoot = Directory.GetCurrentDirectory();
        var paths = new List<string>();
        for (var index = 0; index < args.Length; index += 1)
        {
            var arg = args[index];
            if (arg == "--workspace-root")
            {
                index += 1;
                if (index >= args.Length)
                {
                    throw new ArgumentException("--workspace-root requires a value.");
                }
                workspaceRoot = Path.GetFullPath(args[index]);
                continue;
            }

            if (arg.StartsWith("--", StringComparison.Ordinal))
            {
                throw new ArgumentException($"Unsupported option: {arg}");
            }

            paths.Add(NormalizeRelativePath(arg));
        }

        if (paths.Count == 0)
        {
            throw new ArgumentException("At least one C# source path is required.");
        }

        return new CommandLineOptions
        {
            WorkspaceRoot = Path.GetFullPath(workspaceRoot),
            Paths = paths
        };
    }

    public string ResolveWorkspacePath(string relativePath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(WorkspaceRoot, relativePath));
        var rootWithSeparator = WorkspaceRoot.EndsWith(Path.DirectorySeparatorChar)
            ? WorkspaceRoot
            : $"{WorkspaceRoot}{Path.DirectorySeparatorChar}";
        if (!fullPath.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Path escapes workspace root: {relativePath}");
        }
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"C# source file not found: {relativePath}", fullPath);
        }
        return fullPath;
    }

    private static string NormalizeRelativePath(string value)
    {
        var normalized = value.Replace('\\', '/').TrimStart('.', '/');
        if (string.IsNullOrWhiteSpace(normalized)
            || Path.IsPathRooted(value)
            || normalized.Split('/').Contains("..")
            || !normalized.EndsWith(".cs", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Expected a safe workspace-relative .cs path: {value}");
        }
        return normalized;
    }
}

sealed class MemberOutput
{
    public required string Id { get; init; }
    public required string MemberName { get; init; }
    public required string Kind { get; init; }
    public required string Name { get; init; }
    public string Summary { get; init; } = "";
    public string Remarks { get; init; } = "";
    public List<NamedDocumentationOutput> Parameters { get; init; } = new();
    public List<NamedDocumentationOutput> TypeParameters { get; init; } = new();
    public string Returns { get; init; } = "";
    public List<ExceptionDocumentationOutput> Exceptions { get; init; } = new();
    public List<ReferenceOutput> See { get; init; } = new();
    public List<ReferenceOutput> SeeAlso { get; init; } = new();
    public string DocumentationXml { get; init; } = "";
    public required SourceOutput Source { get; init; }
    public SemanticOutput? Semantic { get; init; }
}

sealed class SemanticOutput
{
    public required string DocumentationCommentId { get; init; }
    public required string SymbolKind { get; init; }
    public string? ContainingAssembly { get; init; }
    public string? ContainingNamespace { get; init; }
    public string? ContainingType { get; init; }
    public required string DisplayName { get; init; }

    public static SemanticOutput? FromSymbol(ISymbol? symbol)
    {
        var documentationCommentId = symbol?.GetDocumentationCommentId();
        if (symbol is null || string.IsNullOrWhiteSpace(documentationCommentId))
        {
            return null;
        }

        return new SemanticOutput
        {
            DocumentationCommentId = documentationCommentId,
            SymbolKind = symbol.Kind.ToString(),
            ContainingAssembly = symbol.ContainingAssembly?.Name,
            ContainingNamespace = symbol.ContainingNamespace?.IsGlobalNamespace == false
                ? symbol.ContainingNamespace.ToDisplayString()
                : null,
            ContainingType = symbol.ContainingType?.ToDisplayString(),
            DisplayName = symbol.ToDisplayString(SymbolDisplayFormat.CSharpErrorMessageFormat)
        };
    }
}

sealed class NamedDocumentationOutput
{
    public required string Name { get; init; }
    public string Summary { get; init; } = "";
}

sealed class ExceptionDocumentationOutput
{
    public string? Cref { get; init; }
    public string Summary { get; init; } = "";
}

sealed class ReferenceOutput
{
    public string? Cref { get; init; }
    public string? Href { get; init; }
    public string Label { get; init; } = "";
}

sealed class SourceOutput
{
    public required string Path { get; init; }
    public required string Language { get; init; }
    public required string RangeSource { get; init; }
    public required string Confidence { get; init; }
    public required RangeOutput Range { get; init; }
}

sealed class RangeOutput
{
    public required PositionOutput Start { get; init; }
    public required PositionOutput End { get; init; }
}

sealed class PositionOutput
{
    public required int Line { get; init; }
    public required int Column { get; init; }
}

sealed class DiagnosticOutput
{
    public required string Code { get; init; }
    public required string Message { get; init; }
    public required string Severity { get; init; }
    public SourceOutput? Source { get; init; }
}

static class JsonOptions
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };
}
