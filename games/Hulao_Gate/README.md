# 虎牢关 · 无双战记 (Hulao Gate Musou)

基于 **Three.js + TypeScript + Vite** 的原创三国题材第三人称 3D 动作游戏原型（v0.1.0）。无需商业素材；人物、城墙、地形、兵器与特效由几何体程序化生成。首版采用写实取向的光照、阴影、雾效和材质，但**不等同于商业级写实角色/动画**。

## 本地运行

需要 Node.js 20.19+ 或 22.12+（建议 Node 22）。在项目根目录执行：

```bash
npm install
npm run dev
```

打开终端提示的本地地址（通常是 http://localhost:5173）。首次运行必须联网下载 npm 依赖。构建：

```bash
npm run build
npm run preview
```

`dist/` 为可部署静态站点。不要直接双击 `index.html`；应使用 Vite 服务。

## 操作

- `W/A/S/D` 移动，鼠标控制第三人称视角，`Shift` 冲刺
- 鼠标左键或 `J` 普通攻击，`K` 重击，`Space` 闪避
- `Q` 无双技（能量 100% 时），`Esc` 暂停
- 触屏设备提供摇杆、战斗按钮及滑动视角

击破至少 12 名普通敌兵并向关门推进，即可触发虎牢关守将战。击败守将通关。

## 部署到 GitHub Pages

1. 在 GitHub 创建新仓库，例如 `hulao-threejs`，将项目完整推送到 `main` 分支（可在首次 `npm install` 后提交生成的 `package-lock.json` 以锁定依赖版本）。
2. 仓库 `Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。
3. 推送后 `.github/workflows/deploy.yml` 自动执行 `npm install`、`npm run build` 并发布 `dist/`。
4. 成功后访问 `https://<你的用户名>.github.io/hulao-threejs/`。

Vite 配置 `base:'./'`，兼容 GitHub Pages 子路径部署。若仓库使用不同分支，请同步修改 workflow 的 `branches`。

## 工程结构

- `src/main.ts`：渲染、场景、人物、敌人 AI、战斗、镜头、输入、任务及状态管理
- `src/style.css`：HUD、菜单、移动端触控界面
- `index.html`：页面和 UI 容器
- `vite.config.ts`：构建配置
- `.github/workflows/deploy.yml`：GitHub Pages 自动发布

## 当前限制

首版使用程序化低多边形角色，并非商业级写实模型；未包含动作捕捉、配音、音效、骑马、联网或存档。物理/命中为简化距离与方向判定。适合作为后续导入 GLB 人物模型、骨骼动画、Rapier 物理、音效和关卡系统的可玩基础。

## 授权

项目源代码使用 MIT License；游戏名称、原创场景与程序化模型可按本项目授权使用。Three.js 依其自身 MIT License 发布。未包含第三方商业游戏资产。
