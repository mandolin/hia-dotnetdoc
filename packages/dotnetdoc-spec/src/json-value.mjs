/** @file 按属性描述符无损复制普通JSON值，不执行访问器或序列化钩子。 @lang en Losslessly copies ordinary JSON values through property descriptors without invoking accessors or serialization hooks. */
import { types } from 'node:util';

/**
 * 复制普通JSON数据，保留负零和重复非循环值；拒绝循环/访问器/隐藏字段/稀疏数组/特殊对象。
 * @lang en Copies ordinary JSON data while retaining negative zero and repeated acyclic values; rejects cycles, accessors, hidden fields, sparse arrays and special objects.
 * @param {unknown} value <lang><zh-CN>调用方拥有的候选JSON数据。</zh-CN><en>Caller-owned candidate JSON data.</en></lang>
 * @returns {unknown} <lang><zh-CN>独立普通数据副本，不读写文件或原输入。</zh-CN><en>Independent ordinary-data copy, without file I/O or input modification.</en></lang>
 * @throws {TypeError} <lang><zh-CN>非JSON或不能无损复制时只抛固定公开消息。</zh-CN><en>Throws a fixed public message when data is non-JSON or cannot be copied losslessly.</en></lang>
 */
export function cloneDotnetDocJson(value) {
  // <lang><zh-CN>递归栈属于本次复制，不让调用方或数组回调的额外参数控制状态。</zh-CN><en>The recursion stack belongs to this copy and cannot be controlled by callers or extra array-callback arguments.</en></lang>
  return cloneJsonValue(value, new Set());
}

/**
 * 在本次递归栈内复制一个值，重复的非循环分支独立复制。
 * @lang en Copies one value within the current recursion stack, independently copying repeated acyclic branches.
 * @param {unknown} value <lang><zh-CN>当前JSON节点。</zh-CN><en>Current JSON node.</en></lang>
 * @param {Set<object>} active <lang><zh-CN>本次复制独占的递归栈。</zh-CN><en>Recursion stack owned by this copy.</en></lang>
 * @returns {unknown} <lang><zh-CN>独立普通数据副本。</zh-CN><en>Independent ordinary-data copy.</en></lang>
 * @throws {TypeError} <lang><zh-CN>非JSON、循环或行为节点固定拒绝。</zh-CN><en>Fixed refusal for non-JSON, cyclic or behavior-bearing nodes.</en></lang>
 */
function cloneJsonValue(value, active) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || types.isProxy(value) || active.has(value)) throw new TypeError('DotNetDoc data must be ordinary lossless JSON.');
  // <lang><zh-CN>数组和普通/空原型对象是唯一容器，不读取用户原型行为。</zh-CN><en>Arrays and plain/null-prototype objects are the only containers; user prototype behavior is not read.</en></lang>
  const array = Array.isArray(value);
  if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('DotNetDoc data must be ordinary lossless JSON.');
  active.add(value);
  try {
    // <lang><zh-CN>新容器以数据属性写入，__proto__等键不会改变原型。</zh-CN><en>Write data properties into a fresh container so keys such as __proto__ cannot alter its prototype.</en></lang>
    const result = array ? [] : {};
    for (const key of Reflect.ownKeys(value)) {
      if (array && key === 'length') continue;
      // <lang><zh-CN>先检查描述符再递归，不通过value[key]触发getter，不静默丢字段。</zh-CN><en>Inspect descriptors before recursion, never invoking getters via value[key] or silently dropping fields.</en></lang>
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor) || (array && !/^(0|[1-9][0-9]*)$/u.test(key))) throw new TypeError('DotNetDoc data must be ordinary lossless JSON.');
      Object.defineProperty(result, key, { value: cloneJsonValue(descriptor.value, active), enumerable: true, configurable: true, writable: true });
    }
    if (array && (result.length !== value.length || Object.keys(result).length !== value.length)) throw new TypeError('DotNetDoc data must be ordinary lossless JSON.');
    return result;
  } finally {
    // <lang><zh-CN>只移除当前递归节点，允许另一个分支引用同一非循环输入值。</zh-CN><en>Remove only the current recursion node, allowing another branch to reference the same acyclic input value.</en></lang>
    active.delete(value);
  }
}
