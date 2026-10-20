#!/usr/bin/env bash
# 由 src/ 构建单文件离线产物 dist/street3d-v2.0.html
# 依赖：node + esbuild（见 src/package.json）
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=src
OUT=dist/street3d-v2.0.html

if [ ! -x "$SRC/node_modules/.bin/esbuild" ]; then
  echo "==> 安装构建依赖 (esbuild)"
  (cd "$SRC" && npm install --silent --no-audit --no-fund)
fi

echo "==> 打包 app.js -> bundle.js"
(cd "$SRC" && ./node_modules/.bin/esbuild app.js --bundle --format=esm \
  --minify --legal-comments=none --outfile=bundle.js)

echo "==> 注入 bundle 到 shell.html -> $OUT"
node -e '
const fs = require("fs");
let shell = fs.readFileSync("src/shell.html", "utf8");
// 去掉可能残留的 importmap（本项目运行时不依赖 CDN）
shell = shell.replace(/<script type="importmap">[\s\S]*?<\/script>/, "");
const js = fs.readFileSync("src/bundle.js", "utf8");
// 必须用 split/join：String.replace 会把 js 里的 $& 等模式展开成 shell 内容
const out = shell.split("__APP_JS__").join(js);
if (out.includes("__APP_JS__")) throw new Error("注入失败：占位符未替换");
fs.writeFileSync("dist/street3d-v2.0.html", out);
console.log("    产物大小:", (out.length / 1024).toFixed(0) + " KB");
'

echo "==> 校验：产物内不应残留占位符"
! grep -q "__APP_JS__" "$OUT"
echo "==> 完成：$OUT（单文件、可离线、可直接 iframe 引用）"
