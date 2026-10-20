# 自动化验证脚本

基于 `puppeteer-core` + 无头 Chromium，均指向 `dist/street3d-v2.0.html`，
截图输出到 `screenshots/_out/`（已 gitignore）。

```bash
npm i puppeteer-core                       # 仓库根目录，另需本机 chromium
LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe \
  xvfb-run -a node test/feat.js            # 全功能回归
```

无头环境必须走软件渲染（`xvfb-run` + llvmpipe），否则 WebGL 上下文创建失败。
软件渲染帧率仅约 1.5–25 FPS，因此涉及逐帧积分的运动学用页面暴露的
`__dummyStep(n)` 以固定 1/60 s 步长离线推进验证。

| 脚本 | 覆盖 |
| --- | --- |
| `feat.js` | 主回归：注册表、点选弹框、长按路线、假人、2D/3D 切换、图层显隐、街景视角 |
| `offline.js` | 断言零外部网络请求 |
| `pinch.js` | 移动端竖屏：2D 双指捏合缩放 + 旋转、触摸长按、摇杆驱动 |
| `mob.js` | 移动端布局与控件命中区 |
| `pop2.js` | 标记 / 假人 / 行驶车辆的弹框内容与坐标实时刷新 |
| `two.js` | 2D 全貌与 2D 点选 |
| `test.js` | 各视角截图冒烟（参数：`name,view,waitMs`） |
| `dbg2d.js` `dbgdum.js` `dumshot.js` | 调试：2D 拾取、假人运动学与碰撞、特写截图 |

页面调试钩子：`__SCENE_READY__`、`__scene`、`__cam`、`__pcam`、`__REG()`、
`__pickAt(x,y)`、`__dummyStep(n,keys)`、`__stickV()`。
