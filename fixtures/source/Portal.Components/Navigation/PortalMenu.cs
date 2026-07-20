using System;
using System.Collections.Generic;

namespace Portal.Components.Navigation
{
    /// <summary>
    /// <lang>
    ///   <en>Represents a portal navigation menu.</en>
    ///   <zh-CN>表示一个门户导航菜单。</zh-CN>
    /// </lang>
    /// </summary>
    /// <remarks>
    /// <div h_type="doc" path="DocLangRes" key="PortalMenu.Remarks">
    ///   <para lang="en">Used by ASP.NET Portal layout pages.</para>
    ///   <para lang="zh-CN">供 ASP.NET Portal 布局页面使用。</para>
    /// </div>
    /// </remarks>
    public class PortalMenu
    {
        /// <summary>
        /// Gets the menu items displayed to the current tenant.
        /// </summary>
        public IReadOnlyList<string> Items { get; } = Array.Empty<string>();

        /// <summary>
        /// Renders tenant-specific navigation markup.
        /// </summary>
        /// <param name="tenantId">
        /// <l>
        ///   <en>Tenant identifier used to select visible menu items.</en>
        ///   <zh-CN>用于选择可见菜单项的租户标识。</zh-CN>
        /// </l>
        /// </param>
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
