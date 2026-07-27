namespace Relation.EdgeCases;

/// <summary>
/// <lang><en>Source relation edge-case fixture.</en><zh-CN>源码关系边界 fixture。</zh-CN></lang>
/// </summary>
public sealed class RelationEdgeCases
{
    /// <summary>
    /// <lang><en>Handles one legacy request.</en><zh-CN>处理一个旧式请求。</zh-CN></lang>
    /// </summary>
    public void Handle(LegacyRequest request)
    {
    }

    /// <summary>
    /// <lang><en>Handles one legacy request and candidate.</en><zh-CN>处理旧式请求和候选值。</zh-CN></lang>
    /// </summary>
    public void Handle(LegacyRequest request, string candidate)
    {
    }
}

/// <summary>
/// <lang><en>Legacy request fixture.</en><zh-CN>旧式请求 fixture。</zh-CN></lang>
/// </summary>
public sealed class LegacyRequest
{
}

/// <summary>
/// <lang><en>Relation mode fixture.</en><zh-CN>关系模式 fixture。</zh-CN></lang>
/// </summary>
public enum RelationMode
{
    /// <summary>
    /// <lang><en>Primary mode.</en><zh-CN>主模式。</zh-CN></lang>
    /// </summary>
    Primary
}

/// <summary>
/// <lang><en>Conversion value fixture.</en><zh-CN>转换值 fixture。</zh-CN></lang>
/// </summary>
public readonly struct ConversionValue
{
    /// <summary>
    /// <lang><en>Converts the fixture value to text.</en><zh-CN>把 fixture 值转换为文本。</zh-CN></lang>
    /// </summary>
    public static implicit operator string(ConversionValue value)
    {
        return string.Empty;
    }
}
