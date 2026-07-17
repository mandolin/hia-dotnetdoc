namespace Portal.Components.Navigation
{
    /// <summary>
    /// Provides semantic extraction edge cases.
    /// </summary>
    public class SemanticSample<TValue>
    {
        /// <summary>
        /// Creates a semantic sample.
        /// </summary>
        /// <param name="value">Initial value.</param>
        public SemanticSample(TValue value)
        {
            Value = value;
        }

        /// <summary>
        /// Gets the current value.
        /// </summary>
        public TValue Value { get; }

        /// <summary>
        /// Formats the current value.
        /// </summary>
        /// <param name="value">Value to format.</param>
        /// <param name="text">Formatted text.</param>
        /// <returns>True when formatting succeeds.</returns>
        public bool TryFormat(ref TValue value, out string text)
        {
            text = value?.ToString() ?? string.Empty;
            return true;
        }
    }
}
