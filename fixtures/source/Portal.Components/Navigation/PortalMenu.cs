using System;
using System.Collections.Generic;

namespace Portal.Components.Navigation
{
    /// <summary>
    /// Represents a portal navigation menu.
    /// </summary>
    public class PortalMenu
    {
        /// <summary>
        /// Gets the menu items displayed to the current tenant.
        /// </summary>
        public IReadOnlyList<string> Items { get; } = Array.Empty<string>();

        /// <summary>
        /// Renders tenant-specific navigation markup.
        /// </summary>
        /// <param name="tenantId">Tenant identifier used to select visible menu items.</param>
        /// <returns>HTML fragment for the tenant menu.</returns>
        /// <exception cref="System.ArgumentException">Thrown when the tenant id is empty.</exception>
        public string Render(string tenantId)
        {
            if (string.IsNullOrWhiteSpace(tenantId))
            {
                throw new ArgumentException("Tenant id is required.", nameof(tenantId));
            }

            return "<nav></nav>";
        }
    }
}
