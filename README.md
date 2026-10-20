# 街景 3D 实景建模 · Street Scene 3D

从一张航拍街景照片重建出的**单文件、可离线**三维街区场景，运行于浏览器（Three.js），可直接用 `<iframe>` 引用或双击打开。

- 产物：`dist/street3d-v2.0.html`（约 543 KB，零外部请求，断网可用）
- 源码：`src/`，一键构建 `scripts/build.sh`
- 需求与实现说明：`docs/`
- 各版本效果图：`screenshots/`

## 快速开始

直接打开产物即可：

```bash
open dist/street3d-v2.0.html      # macOS
xdg-open dist/street3d-v2.0.html  # Linux
```

嵌入到自己的页面：

```html
<iframe src="dist/street3d-v2.0.html" width="1280" height="800"
        style="border:0" allow="fullscreen" title="街景 3D 实景建模"></iframe>
```

移动端可用：支持触摸旋转 / 双指缩放平移 / 虚拟摇杆，竖屏自适应。

## 场景内容

按照片重建的街区：东西向主干道 + 两条南北向道路、黄色网格禁停区、斑马线、
B 区停车楼（屋顶带停车位与车辆）、红顶公寓与篮球场、受损白顶厂房、废墟塔楼、
4 座拱顶机库、塔吊与挖掘机、落叶乔木、电线杆与垂线、信号灯、公交候车亭，
以及沿闭合环线行驶的车流。全部几何与贴图均为程序化生成（CanvasTexture），
不依赖任何外部资源。

## 功能一览（v2.0）

| 功能 | 操作方式 |
| --- | --- |
| 建模分层 | 面板「建模图层」按层显隐：建筑层 / 车辆层 / 人物层 / 标注层 |
| ID + Name 点选 | 单击建筑或车辆弹出信息框：编号、图层、类型、层数、尺寸、坐标、状态；行驶中的车辆坐标实时刷新 |
| 路线标记 | 长按地图约 0.5 s 落点，自动串成 起点 → 途经 → 终点 虚线，显示总长；可撤销一点或清除 |
| 可控假人 | 「操控假人」开启虚拟摇杆，桌面端 WASD / 方向键、Shift 奔跑；支持跟随视角、复位、建筑碰撞 |
| 2D / 3D 切换 | 顶栏分段按钮；2D 为正交俯视平面布局图 |
| 双模式拖拽旋转 | 3D：单指旋转、双指缩放平移、滚轮缩放、双击拉近；2D：单指平移、双指捏合缩放 + 旋转、滚轮缩放、左转 / 右转按钮 |
| 视角预设 | 斜视航拍 / 街景视角（第一人称行车）/ 自动环绕 |
| 环境调节 | 日照角度滑杆（含黄昏长影）、阴影贴图 1024 / 2048 / 关闭、雾效开关、保存截图 |

## 从源码构建

```bash
bash scripts/build.sh
```

脚本会用 esbuild 打包 `src/app.js`，再把结果注入 `src/shell.html` 的 `__APP_JS__`
占位符，生成 `dist/street3d-v2.0.html`。构建产物与仓库中提交的版本逐字节一致。

## 自动化验证

`test/` 下是基于 puppeteer-core + 无头 Chromium 的回归脚本（需本机有 chromium）：

```bash
npm i puppeteer-core            # 在仓库根目录
LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe \
  xvfb-run -a node test/feat.js # 全功能回归：点选 / 路线 / 假人 / 2D / 3D / 图层
node test/offline.js            # 校验零外部网络请求
```

v2.0 回归结果：加载、点选、路线、假人、2D、3D、街景各场景 **0 报错**，
约 17k 三角面 / 60–190 draw calls，外部网络请求数为 0。

## 版本

| 版本 | 内容 | 效果图 |
| --- | --- | --- |
| v1.0 | 单文件三维重建基础版：航拍 / 斜视 / 街景 / 环绕四种视角、日照与阴影调节、截图导出、移动端触摸 | `screenshots/v1.0/` |
| v2.0 | 新增建模分层与点选弹框、长按路线标记、可控假人、2D/3D 切换、双模式旋转拖拽 | `screenshots/v2.0/` |

## 许可与致谢

三维渲染基于 [Three.js](https://threejs.org/) r160（MIT），`OrbitControls` 取自其官方示例。
场景几何、贴图、UI 为本项目原创程序化生成。
