# @hia-doc/dotnetdoc-producer

Documentation producer adapter for DotNetDoc.

It exposes a producer descriptor and delegates execution to
`@hia-doc/dotnetdoc-runner`.

The descriptor and results use the shared `documentation-producer@1.0.0` /
`documentation-producer-result@1.0.0` contracts. Domain artifacts and document
source maps keep independent versions. Watch and incremental execution are not
supported. Host progress/abort context is forwarded to the runner; the
descriptor itself is not permission to execute a target project or publish sources.

描述及结果采用共享SDK1.0.0；领域工件/源码地图独立版本化。该适配器只委托runner，
不授予目标项目执行/源码公开权限；watch与incremental不支持。

