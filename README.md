# ST Userscript Shell

一个给 **SillyTavern userscript / import 脚本** 使用的最小空壳。

它不是官方 extension，目标是：

- 在扩展菜单里加入一个按钮
- 打开一个独立的浮动面板
- 尽量自动收起原扩展菜单
- 提供一个统一的 `mount()` 挂载点
- 以后让不同插件都能复用这个壳

---

## 这个仓库适合谁

适合你这种情况：

- 已经在写 userscript
- 不想继续覆盖别人的壳
- 暂时不想直接做官方 extension
- 只需要一个稳定、空白、可复用的 UI 容器

---

## 这个壳会做什么

### 会做
- 在 SillyTavern 扩展菜单中加入按钮
- 打开自己的独立面板
- 点击按钮时尝试关闭原扩展菜单
- 暴露全局对象 `window.STUserScriptShell`
- 给业务插件提供 `mount(renderFn)`

### 不会做
- 不负责提示词注入
- 不负责世界书逻辑
- 不负责模型搜索
- 不负责 profile 切换
- 不负责自动重发/轮询池

这些都应该由你的业务 userscript 自己做。

---

## 仓库文件说明

```text
st-userscript-shell/
├─ index.js
├─ README.md
├─ package.json
└─ LICENSE
