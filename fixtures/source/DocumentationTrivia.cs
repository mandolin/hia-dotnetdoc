namespace DocumentationTrivia;

/// <summary>
/// <para>保留文档正文中的字面标记。</para>
/// <para>Preserve the literal /// marker in documentation text.</para>
/// </summary>
/// <remarks>
/// <para>中文备注。</para>
/// <para>English remarks with /// inside content.</para>
/// </remarks>
public sealed class LineDocumentation { }

/**
 * <summary>
 * <para>保留块注释正文。</para>
 * <para>Preserve block-comment content and the literal /// marker.</para>
 * </summary>
 */
public sealed class BlockDocumentation { }
