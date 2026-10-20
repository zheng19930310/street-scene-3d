# 源码说明

| 文件 | 作用 |
| --- | --- |
| `app.js` | 场景全部逻辑：程序化贴图 → 几何构建 → 图层注册 → 相机与交互 → 渲染循环 |
| `shell.html` | 页面外壳与 UI（顶栏、信息弹框、虚拟摇杆、控制面板、样式）；内含 `__APP_JS__` 占位符 |
| `OrbitControls.js` | Three.js 官方轨道控制器（r160，MIT），用于 3D 模式 |
| `three.module.min.js` | Three.js r160 ESM 压缩包（MIT）副本，供离线查阅 |

## 构建

在仓库根目录执行 `bash scripts/build.sh`：esbuild 以 npm 安装的 `three` 为模块源打包
`app.js`，再注入 `shell.html` 的 `__APP_JS__` 占位符，产出 `dist/street3d-v2.0.html`。

> 注意：注入必须使用 `split('__APP_JS__').join(js)` 而非 `String.replace`——
> 压缩包中出现 `$&` 等替换模式会把外壳内容展开进去，导致产物损坏。
>
> 产物由 npm 版 `three` 打包生成；仓库内的 `three.module.min.js` 是其逐字节一致的副本
> （md5 `4d8e72afd9639e074547992bce6a3de3`），仅作离线参考，直接 `--alias` 到该文件
> 会得到体积不同的等价产物。
