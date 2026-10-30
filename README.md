# Ordering Lab · 计算机系统顺序实验室

Interactive visual experiments exploring CPU execution, memory ordering, multicore synchronization, and I/O ordering, with planned PCIe transaction simulations.

用可交互实验理解计算机系统中的“先后”：程序顺序、CPU 内部执行顺序、访存可见顺序，以及设备事务和完成状态。

**GitHub Pages 地址（首次启用并部署成功后生效）：** https://marsdoge.github.io/ordering-lab/

支持播放 / 暂停、前后单步、时间轴拖动、速度调节、键盘快捷键、场景链接和离线 HTML 下载。响应式中文界面，无运行时依赖、追踪器或外部字体。

## 已实现的实验

| 分类 | 实验 | 重点 |
| --- | --- | --- |
| 单核 | 自己写，自己读 | 存储转发与对外可见性不同 |
| 单核与设备 | CPU + 一致性 DMA | 写写排序与发布协议 |
| 多核 | 数据与旗标 | x86 WB、LoongArch 无同步、release/acquire |
| 多核 | Store Buffering | x86 也允许双零，双完整屏障排除双零 |
| DMA | DBAR 不会清理缓存 | 非一致性 DMA 的缓存维护与所有权 |
| 设备 I/O | 写到、收到、做完 | Posted MMIO、回读与设备完成确认 |
| 屏障 | 乱序 CPU 怎样守住 DBAR | 指令年龄、未完成访存、独立计算 |

## 计划扩展

- CPU 流水线、多发射、乱序执行与按序退休的独立实验。
- 多核缓存一致性、原子操作与锁。
- PCIe 请求 / Completion、Posted / Non-Posted 事务、Relaxed Ordering 等规则。
- ARM、RISC-V 与 LoongArch / x86 的对比。

以上为路线图，尚未实现的功能不会作为可运行实验展示。PCIe 模型需要标注规范版本、事务类型和适用条件，不把简化示意当作完整协议模拟器。

## 本地使用

需要 Node.js 20 或更新版本，无需安装依赖。

```sh
git clone https://github.com/MarsDoge/ordering-lab.git
cd ordering-lab
npm test
npm run build
```

直接用浏览器打开 `dist/index.html`，即可离线使用。页面底部也提供单文件 HTML 下载。

快捷键：空格播放 / 暂停，左右方向键单步。焦点在按钮、链接或表单控件上时，保留控件自身的键盘行为。

## GitHub Pages 部署

仓库内已提供 `.github/workflows/pages.yml`。默认分支为 `master`：

1. 首次到仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
2. 打开 **Actions → Test and deploy Ordering Lab → Run workflow**，选择 `master` 并运行。若首次推送时 Pages 尚未启用，先完成第 1 步再重跑。
3. `Test and build` 与 `Deploy GitHub Pages` 均成功后访问上面的 Pages 地址。

之后推送到 `master` 会自动运行测试、构建并发布；Pull Request 只测试和构建，不部署。工作流使用 GitHub 自带的临时令牌，不需要添加个人访问令牌。

构建产物使用内联 CSS / JavaScript 和片段链接，适用于 `/ordering-lab/` 这样的项目子路径，也可直接离线打开。

仓库保留了可选的 `vercel.json` 和 `wrangler.jsonc`：Vercel / Cloudflare Pages 的构建命令为 `npm run build`，输出目录为 `dist`。GitHub Pages 是本项目的主要发布方式。

## 源码结构与扩展

```text
src/model.mjs       场景说明、路径定义与纯状态函数
src/app.mjs         播放器、时间轴、场景切换与渲染
src/styles.css     响应式布局与动画
src/shell.html     页面骨架
scripts/build.mjs  生成单文件 HTML，并保留 MIT 许可声明
tests/             状态模型的关键不变量与反例验证
```

新增实验时，先明确参与者、初始状态、访问类型和排序约束，再定义允许的执行轨迹。测试应验证关键结果，例如屏障后哪些结果被禁止，而不仅是复述实现。

## 教学模型的边界

动画展示一种被允许的离散执行，不是周期精确模拟器，也不代表芯片性能。较强序不代表顺序一致；缓存一致性不等于内存序，CPU 核间一致也不必然意味着 DMA 一致。

机器级伪代码与 C/C++ 并发模型须区分：不要把普通变量的数据竞争当作合法实验。实际驱动必须遵循内存属性、DMA API 和设备协议。

DBAR 的内部实现示意是概念解释，不声称描述龙芯 3A6000 的未公开实现。

## 技术依据

- [LoongArch Volume 1](https://loongson.github.io/LoongArch-Documentation/LoongArch-Vol1-EN.html)：DBAR / IBAR、MAT。
- [Intel SDM](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)：普通 WB 内存序及 Store→Load 例外。
- [Linux Memory Barriers](https://docs.kernel.org/core-api/wrappers/memory-barriers.html)。
- [Linux DMA API HOWTO](https://docs.kernel.org/core-api/dma-api-howto.html)。
- [Linux Device I/O](https://docs.kernel.org/driver-api/device-io.html)：posted writes 与回读。

## License

[MIT License](LICENSE) · Copyright (c) 2026 Dongyan Qian.
