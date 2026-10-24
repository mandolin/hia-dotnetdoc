// <lang><zh-CN>只含公开合成声明的签名测试输入，不依赖真实业务数据。</zh-CN><en>Signature-test input containing only public synthetic declarations, without real business data.</en></lang>
namespace Signature.Sample;

/// <summary>签名覆盖用的公开合成类型。<para>Public synthetic type for signature coverage.</para></summary>
/// <typeparam name="T">结果类型。<para>Result type.</para></typeparam>
public sealed class SignatureSample<T>
{
    /// <summary>按次数返回文本。<para>Returns text for a count.</para></summary>
    /// <param name="count">次数。<para>Count.</para></param>
    /// <param name="text">文本。<para>Text.</para></param>
    /// <returns>原文本。<para>The original text.</para></returns>
    public string Echo(int count, string text = "x") => text;

    /// <summary>返回文本长度。<para>Returns the text length.</para></summary>
    /// <param name="text">文本。<para>Text.</para></param>
    /// <returns>字符数。<para>Character count.</para></returns>
    public int Echo(string text) => text.Length;

    /// <summary>原位递增。<para>Increments by reference.</para></summary>
    /// <param name="number">可变计数。<para>Mutable count.</para></param>
    public void Change(ref int number)
    {
        // <lang><zh-CN>此处的变更用于验证ref参数显示，不添加隐藏状态。</zh-CN><en>Mutation verifies ref-parameter display without hidden state.</en></lang>
        number += 1;
    }
}
