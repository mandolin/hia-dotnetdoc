using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

const string Contract = "dotnetdoc-csharp-source-extraction";
const string ContractVersion = "0.1.0-draft";
const string ProducerName = "@hia-doc/dotnet-source-extractor";
// <lang><zh-CN>producer package version 随本地发布候选演进，不升级独立的 extraction contract version。</zh-CN><en>The producer package version follows the local release candidate without upgrading the independent extraction contract version.</en></lang>
const string ProducerVersion = "0.1.12";

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
        assemblyName: options.AssemblyName,
        syntaxTrees: sources.Select(source => source.SyntaxTree),
        references: CompilationReferences(options, diagnostics),
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
            name = options.AssemblyName
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
        Severity = diagnostic.Severity == DiagnosticSeverity.Error
            ? "error"
            : diagnostic.Severity == DiagnosticSeverity.Warning
                ? "warning"
                : "info"
    };
}

/// <summary>从已安装目标框架和工作区声明引用建立只读元数据集合；不加载或执行目标程序集。<para>Builds read-only metadata references from the installed target framework and declared workspace files without loading/executing target assemblies.</para></summary>
static IEnumerable<MetadataReference> CompilationReferences(CommandLineOptions options, List<DiagnosticOutput> diagnostics)
{
    // <lang><zh-CN>同名引用只保留一个，避免混合.NET Framework与当前.NET运行时的基础类型。</zh-CN><en>Keep one reference per filename to avoid mixing .NET Framework and current-runtime core types.</en></lang>
    var files = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    // <lang><zh-CN>显式项目引用必须是托管元数据；框架包的原生伴随DLL不是编译引用，须区别处理。</zh-CN><en>Explicit project references must contain managed metadata; native companion DLLs in a framework pack are not compilation references.</en></lang>
    var declaredFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    // <lang><zh-CN>框架目录只从系统安装根和已校验版本产生，不接受任意外部路径。</zh-CN><en>The framework directory derives only from the system installation root and validated version, never arbitrary external paths.</en></lang>
    var framework = options.FrameworkVersion is null || !OperatingSystem.IsWindows() ? null : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Reference Assemblies", "Microsoft", "Framework", ".NETFramework", options.FrameworkVersion);
    if (framework is not null && File.Exists(Path.Combine(framework, "mscorlib.dll")))
    {
        foreach (var file in Directory.EnumerateFiles(framework, "*.dll")) files[Path.GetFileName(file)] = file;
        // <lang><zh-CN>标准Facades子目录是同一reference pack的一部分，不递归扫描其它目录。</zh-CN><en>The standard Facades directory belongs to the same reference pack; no other directories are scanned recursively.</en></lang>
        var facades = Path.Combine(framework, "Facades");
        if (Directory.Exists(facades)) foreach (var file in Directory.EnumerateFiles(facades, "*.dll")) files[Path.GetFileName(file)] = file;
    }
    else
    {
        if (options.FrameworkVersion is not null) diagnostics.Add(new DiagnosticOutput { Code = "DOTNETDOC_FRAMEWORK_REFERENCES_UNAVAILABLE", Message = "The declared .NET Framework reference pack is not installed; unresolved signature types remain unavailable.", Severity = "warning" });
        foreach (var file in TrustedPlatformPaths()) files[Path.GetFileName(file)] = file;
    }
    foreach (var reference in options.References)
    {
        try
        {
            // <lang><zh-CN>相对路径由JS真实路径门禁提供，helper再次限制工作区及.dll后缀。</zh-CN><en>The JS real-path gate supplies relative paths; the helper checks workspace containment and the DLL suffix again.</en></lang>
            var file = options.ResolveWorkspacePath(reference);
            if (!file.EndsWith(".dll", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("A metadata reference must be a DLL.");
            files[Path.GetFileName(file)] = file;
            declaredFiles.Add(file);
        }
        catch { diagnostics.Add(new DiagnosticOutput { Code = "DOTNETDOC_METADATA_REFERENCE_UNAVAILABLE", Message = "A declared metadata reference could not be read.", Severity = "warning" }); }
    }
    // <lang><zh-CN>逐文件读取PE元数据；坏文件仅形成固定诊断，不输出异常或绝对路径。</zh-CN><en>Read PE metadata per file; invalid files produce fixed diagnostics without exception text or absolute paths.</en></lang>
    var references = new List<MetadataReference>();
    foreach (var file in files.Values)
    {
        try
        {
            // <lang><zh-CN>立即验证PE元数据，防止惰性坏文件在稍后整个编译分析中抛异常。</zh-CN><en>Validate PE metadata immediately so a lazy invalid file cannot abort the later compilation analysis.</en></lang>
            using var stream = File.OpenRead(file);
            using var image = new PEReader(stream, PEStreamOptions.PrefetchMetadata);
            if (!image.HasMetadata)
            {
                if (!declaredFiles.Contains(file)) continue;
                throw new BadImageFormatException();
            }
            image.GetMetadataReader();
            references.Add(MetadataReference.CreateFromFile(file));
        }
        catch { diagnostics.Add(new DiagnosticOutput { Code = "DOTNETDOC_METADATA_REFERENCE_INVALID", Message = "A declared metadata file is not readable managed metadata.", Severity = "warning" }); }
    }
    return references;
}

/// <summary>没有已安装传统框架时沿用当前helper运行时引用。<para>Uses current helper-runtime references when no installed legacy framework is available.</para></summary>
static IEnumerable<string> TrustedPlatformPaths()
{
    var trustedAssemblies = (string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES");
    if (string.IsNullOrWhiteSpace(trustedAssemblies))
    {
        return new[] { typeof(object).Assembly.Location };
    }

    return trustedAssemblies
        .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
        .Where(File.Exists);
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

    public override void VisitEnumMemberDeclaration(EnumMemberDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        var symbol = _semanticModel.GetDeclaredSymbol(node);
        if (typeName.Length != 0 && (HasDocumentation(node) || IsExternallyVisibleSymbol(symbol)))
        {
            AddMember(
                node,
                $"F:{typeName}.{node.Identifier.ValueText}",
                "dotnet-field",
                node.Identifier.ValueText,
                symbol);
        }
        base.VisitEnumMemberDeclaration(node);
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

    public override void VisitOperatorDeclaration(OperatorDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        if (typeName.Length == 0 || !ShouldInclude(node, node.Modifiers))
        {
            base.VisitOperatorDeclaration(node);
            return;
        }

        var operatorName = OperatorMetadataName(node.OperatorToken);
        AddMember(
            node,
            $"M:{typeName}.{operatorName}{DocumentationParameterList(node.ParameterList.Parameters)}",
            "dotnet-method",
            operatorName,
            _semanticModel.GetDeclaredSymbol(node));
        base.VisitOperatorDeclaration(node);
    }

    public override void VisitConversionOperatorDeclaration(ConversionOperatorDeclarationSyntax node)
    {
        var typeName = CurrentTypeName();
        if (typeName.Length == 0 || !ShouldInclude(node, node.Modifiers))
        {
            base.VisitConversionOperatorDeclaration(node);
            return;
        }

        var operatorName = node.ImplicitOrExplicitKeyword.IsKind(SyntaxKind.ImplicitKeyword)
            ? "op_Implicit"
            : "op_Explicit";
        AddMember(
            node,
            $"M:{typeName}.{operatorName}{DocumentationParameterList(node.ParameterList.Parameters)}~{DocumentationTypeName(node.Type)}",
            "dotnet-method",
            operatorName,
            _semanticModel.GetDeclaredSymbol(node));
        base.VisitConversionOperatorDeclaration(node);
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
        var semantic = SemanticOutput.FromSymbol(symbol, node);
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

    private static bool IsExternallyVisibleSymbol(ISymbol? symbol)
    {
        return symbol?.DeclaredAccessibility is Accessibility.Public
            or Accessibility.Protected
            or Accessibility.Internal
            or Accessibility.ProtectedOrInternal
            or Accessibility.ProtectedAndInternal;
    }

    private static string OperatorMetadataName(SyntaxToken token)
    {
        return token.Kind() switch
        {
            SyntaxKind.PlusToken => "op_Addition",
            SyntaxKind.MinusToken => "op_Subtraction",
            SyntaxKind.AsteriskToken => "op_Multiply",
            SyntaxKind.SlashToken => "op_Division",
            SyntaxKind.PercentToken => "op_Modulus",
            SyntaxKind.AmpersandToken => "op_BitwiseAnd",
            SyntaxKind.BarToken => "op_BitwiseOr",
            SyntaxKind.CaretToken => "op_ExclusiveOr",
            SyntaxKind.LessThanLessThanToken => "op_LeftShift",
            SyntaxKind.GreaterThanGreaterThanToken => "op_RightShift",
            SyntaxKind.EqualsEqualsToken => "op_Equality",
            SyntaxKind.ExclamationEqualsToken => "op_Inequality",
            SyntaxKind.GreaterThanToken => "op_GreaterThan",
            SyntaxKind.LessThanToken => "op_LessThan",
            SyntaxKind.GreaterThanEqualsToken => "op_GreaterThanOrEqual",
            SyntaxKind.LessThanEqualsToken => "op_LessThanOrEqual",
            SyntaxKind.ExclamationToken => "op_LogicalNot",
            SyntaxKind.TildeToken => "op_OnesComplement",
            SyntaxKind.PlusPlusToken => "op_Increment",
            SyntaxKind.MinusMinusToken => "op_Decrement",
            SyntaxKind.TrueKeyword => "op_True",
            SyntaxKind.FalseKeyword => "op_False",
            _ => $"operator_{token.ValueText}"
        };
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
    public required string AssemblyName { get; init; }
    public required IReadOnlyList<string> Paths { get; init; }
    /// <summary>已声明且由工作区门禁验证的元数据相对路径。<para>Declared relative metadata paths validated by the workspace gate.</para></summary>
    public IReadOnlyList<string> References { get; init; } = Array.Empty<string>();
    /// <summary>已声明的传统框架版本，不是任意目录。<para>Declared legacy framework version, not an arbitrary directory.</para></summary>
    public string? FrameworkVersion { get; init; }

    public static CommandLineOptions Parse(string[] args)
    {
        var workspaceRoot = Directory.GetCurrentDirectory();
        var assemblyName = "DotNetDoc.SourceExtraction";
        var paths = new List<string>();
        // <lang><zh-CN>元数据选项与源码位置分开积累，避免把DLL当作源码读取。</zh-CN><en>Collect metadata options separately from source paths so DLLs are never read as source.</en></lang>
        var references = new List<string>();
        string? frameworkVersion = null;
        for (var index = 0; index < args.Length; index += 1)
        {
            var arg = args[index];
            if (arg == "--reference")
            {
                if (++index >= args.Length) throw new ArgumentException("--reference requires a value.");
                references.Add(args[index]);
                continue;
            }
            if (arg == "--framework-version")
            {
                if (++index >= args.Length || !Regex.IsMatch(args[index], @"^v\d+(\.\d+){1,2}$")) throw new ArgumentException("--framework-version requires a version.");
                frameworkVersion = args[index];
                continue;
            }
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

            if (arg == "--assembly-name")
            {
                index += 1;
                if (index >= args.Length || string.IsNullOrWhiteSpace(args[index]))
                {
                    throw new ArgumentException("--assembly-name requires a non-empty value.");
                }
                assemblyName = args[index].Trim();
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
            AssemblyName = assemblyName,
            Paths = paths,
            References = references,
            FrameworkVersion = frameworkVersion
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

/// <summary>声明身份、层级及只读显示信息；不携带声明体。<para>Declaration identity, hierarchy and read-only display information, without declaration bodies.</para></summary>
sealed class SemanticOutput
{
    public required string DocumentationCommentId { get; init; }
    /// <summary>声明选择事实，保留partial与生成来源的区别。<para>Declaration-selection facts retaining the partial/generated-source distinction.</para></summary>
    public DeclarationSelectionOutput? Declaration { get; init; }
    /// <summary>ID所用参数/转换类型仍包含ErrorType时不能充当精确身份。<para>Parameter/conversion types containing ErrorType cannot establish an exact identity.</para></summary>
    public bool HasUnresolvedSignatureTypes { get; init; }
    public required string SymbolKind { get; init; }
    public string? ContainingAssembly { get; init; }
    public string? ContainingNamespace { get; init; }
    public string? ContainingType { get; init; }
    public string? ParentDocumentationCommentId { get; init; }
    public List<string> BaseTypeIds { get; init; } = new();
    public List<string> InterfaceIds { get; init; } = new();
    public required string DisplayName { get; init; }

    /// <summary>仅含声明头的可读签名，不含方法体或注释。<para>Readable declaration signature without bodies or comments.</para></summary>
    public required string Signature { get; init; }

    /// <summary>成员的已知结果/值类型；构造器与类型声明为null。<para>Known result/value type, or null for constructors and type declarations.</para></summary>
    public string? ReturnType { get; init; }

    /// <summary>从Roslyn符号创建中性语义信息，不执行目标源码。<para>Creates neutral semantic information from a Roslyn symbol without executing target source.</para></summary>
    public static SemanticOutput? FromSymbol(ISymbol? symbol, SyntaxNode node)
    {
        // <lang><zh-CN>文档ID是成员匹配身份，无法取得时不伪造声明。</zh-CN><en>The documentation ID identifies member matches; its absence never produces a fabricated declaration.</en></lang>
        var documentationCommentId = symbol?.GetDocumentationCommentId();
        if (symbol is null || string.IsNullOrWhiteSpace(documentationCommentId))
        {
            return null;
        }

        // <lang><zh-CN>只有命名类型提供继承链；其它成员通过所属类型关联。</zh-CN><en>Only named types supply an inheritance chain; other members relate through their containing type.</en></lang>
        var namedType = symbol as INamedTypeSymbol;
        // <lang><zh-CN>本次投影持有的新列表，只保存稳定类型身份。</zh-CN><en>A projection-local new list retains stable type identities only.</en></lang>
        var baseTypeIds = new List<string>();
        for (var baseType = namedType?.BaseType; baseType is not null; baseType = baseType.BaseType)
        {
            baseTypeIds.Add(baseType.GetDocumentationCommentId()
                ?? baseType.ToDisplayString(SymbolDisplayFormat.CSharpErrorMessageFormat));
        }

        // <lang><zh-CN>接口身份按序去重，不改变编译器符号或输入集合。</zh-CN><en>Deduplicate interface identities in order without changing compiler symbols or input collections.</en></lang>
        var interfaceIds = namedType?.AllInterfaces
            .Select(item => item.GetDocumentationCommentId()
                ?? item.ToDisplayString(SymbolDisplayFormat.CSharpErrorMessageFormat))
            .Distinct(StringComparer.Ordinal)
            .ToList()
            ?? new List<string>();

        return new SemanticOutput
        {
            DocumentationCommentId = documentationCommentId,
            Declaration = DeclarationSelectionOutput.From(symbol, node),
            HasUnresolvedSignatureTypes = symbol switch
            {
                IMethodSymbol method => method.Parameters.Any(parameter => ContainsErrorType(parameter.Type)) || method.MethodKind == MethodKind.Conversion && ContainsErrorType(method.ReturnType),
                IPropertySymbol property => property.Parameters.Any(parameter => ContainsErrorType(parameter.Type)),
                _ => false
            },
            SymbolKind = symbol.Kind.ToString(),
            ContainingAssembly = symbol.ContainingAssembly?.Name,
            ContainingNamespace = symbol.ContainingNamespace?.IsGlobalNamespace == false
                ? symbol.ContainingNamespace.ToDisplayString()
                : null,
            ContainingType = symbol.ContainingType?.ToDisplayString(),
            ParentDocumentationCommentId = symbol.ContainingType?.GetDocumentationCommentId(),
            BaseTypeIds = baseTypeIds,
            InterfaceIds = interfaceIds,
            DisplayName = symbol.ToDisplayString(SymbolDisplayFormat.CSharpErrorMessageFormat),
            Signature = CreateDeclarationSignature(symbol),
            ReturnType = symbol switch
            {
                IMethodSymbol method when method.MethodKind is not MethodKind.Constructor and not MethodKind.StaticConstructor => method.ReturnType.ToDisplayString(SymbolDisplayFormat.MinimallyQualifiedFormat),
                IPropertySymbol property => property.Type.ToDisplayString(SymbolDisplayFormat.MinimallyQualifiedFormat),
                IFieldSymbol field => field.Type.ToDisplayString(SymbolDisplayFormat.MinimallyQualifiedFormat),
                IEventSymbol eventSymbol => eventSymbol.Type.ToDisplayString(SymbolDisplayFormat.MinimallyQualifiedFormat),
                _ => null
            }
        };
    }

    /// <summary>检查文档ID中嵌套数组/指针/泛型参数的未解析类型，不按短名补全。<para>Checks unresolved types nested in documentation-ID arrays, pointers and generic arguments without short-name completion.</para></summary>
    private static bool ContainsErrorType(ITypeSymbol type) => type.TypeKind == TypeKind.Error || (type switch
    {
        IArrayTypeSymbol array => ContainsErrorType(array.ElementType),
        IPointerTypeSymbol pointer => ContainsErrorType(pointer.PointedAtType),
        INamedTypeSymbol named => named.TypeArguments.Any(ContainsErrorType),
        _ => false
    });

    /// <summary>使用官方显示策略保留类型、参数名、默认值及ref修饰，不拼接自然语言。<para>Uses official display options to retain types, parameter names, defaults and ref modifiers without prose inference.</para></summary>
    /// <param name="symbol">已取得的声明符号。<para>The existing declaration symbol.</para></param>
    /// <returns>只读显示文本，不包含声明体。<para>Read-only display text without declaration bodies.</para></returns>
    private static string CreateDeclarationSignature(ISymbol symbol)
    {
        // <lang><zh-CN>显示格式属于本次投影，不改变编译模型或符号语义。</zh-CN><en>The display format belongs to this projection and never changes the compilation model or symbol semantics.</en></lang>
        var format = new SymbolDisplayFormat(
            typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypesAndNamespaces,
            genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters,
            memberOptions: SymbolDisplayMemberOptions.IncludeAccessibility | SymbolDisplayMemberOptions.IncludeModifiers
                | SymbolDisplayMemberOptions.IncludeContainingType | SymbolDisplayMemberOptions.IncludeExplicitInterface
                | SymbolDisplayMemberOptions.IncludeType | SymbolDisplayMemberOptions.IncludeParameters | SymbolDisplayMemberOptions.IncludeRef,
            parameterOptions: SymbolDisplayParameterOptions.IncludeType | SymbolDisplayParameterOptions.IncludeName
                | SymbolDisplayParameterOptions.IncludeDefaultValue | SymbolDisplayParameterOptions.IncludeParamsRefOut,
            propertyStyle: SymbolDisplayPropertyStyle.ShowReadWriteDescriptor,
            kindOptions: SymbolDisplayKindOptions.IncludeTypeKeyword,
            miscellaneousOptions: SymbolDisplayMiscellaneousOptions.UseSpecialTypes | SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers
                | SymbolDisplayMiscellaneousOptions.IncludeNullableReferenceTypeModifier);
        return symbol.ToDisplayString(format);
    }
}

/// <summary>仅保存声明排序所需事实，不复制源码或声明体。<para>Stores facts needed for declaration ordering without copying source or declaration bodies.</para></summary>
sealed class DeclarationSelectionOutput
{
    /// <summary>仅真实partial类型可合并，不用于普通重载或重复注册。<para>Only genuine partial types may be grouped, never ordinary overloads or duplicate registrations.</para></summary>
    public bool IsPartialType { get; init; }
    /// <summary>同一次编译的全部语法声明数量。<para>Number of syntax declarations in this compilation.</para></summary>
    public int DeclarationCount { get; init; }
    /// <summary>生成文件或标准生成标记的事实。<para>Whether the file/name or standard markers identify generated code.</para></summary>
    public bool IsGenerated { get; init; }

    /// <summary>从Roslyn符号及当前语法节点建立可复核选择事实。<para>Derives auditable selection facts from a Roslyn symbol and the current syntax node.</para></summary>
    public static DeclarationSelectionOutput From(ISymbol symbol, SyntaxNode node)
    {
        // <lang><zh-CN>路径来自语法树；生成判定不依赖类型名或业务约定。</zh-CN><en>The path comes from the syntax tree; generated-code detection never depends on type names or business conventions.</en></lang>
        var file = node.SyntaxTree.FilePath;
        // <lang><zh-CN>只检查文件头前2048字符，不在元数据里保存正文。</zh-CN><en>Inspect at most the first 2048 file-header characters without retaining bodies in metadata.</en></lang>
        var leading = node.SyntaxTree.GetRoot().GetLeadingTrivia().ToFullString();
        var header = leading[..Math.Min(leading.Length, 2048)];
        return new DeclarationSelectionOutput
        {
            IsPartialType = symbol is INamedTypeSymbol && node is TypeDeclarationSyntax declaration && declaration.Modifiers.Any(SyntaxKind.PartialKeyword),
            DeclarationCount = symbol.DeclaringSyntaxReferences.Length,
            // <lang><zh-CN>属性只检查当前part，不能把整个partial符号聚合的GeneratedCode属性传播给手写part。</zh-CN><en>Inspect attributes on this part only, never propagating an aggregated partial-symbol GeneratedCode attribute to a manual part.</en></lang>
            IsGenerated = Regex.IsMatch(file, @"\.(designer|generated|g|g\.i)\.cs$", RegexOptions.IgnoreCase) || Regex.IsMatch(header, @"<auto-generated\b", RegexOptions.IgnoreCase)
                || node is BaseTypeDeclarationSyntax typeNode && typeNode.AttributeLists.SelectMany(list => list.Attributes).Any(attribute => attribute.Name.ToString().Split('.').Last() is "GeneratedCode" or "GeneratedCodeAttribute" or "CompilerGenerated" or "CompilerGeneratedAttribute")
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
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
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
