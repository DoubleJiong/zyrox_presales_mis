# 数据大屏二期页面截图证据记录

日期：2026-04-09

生成环境：准发布联调基线 `http://localhost:5000`

BUILD_ID：`JRuhQjuUmWKe-V0xN9fja`

取证说明：

1. phase-2 三视角与三类统一抽屉截图使用 DTC-14 的稳定 Playwright fixture 口径生成，目的是固定 `region / personnel / topic` 主链路的结构与交互证据，避免页面取证被实时数据波动干扰。
2. 未登录访问保护页截图使用真实运行时 `http://localhost:5000/data-screen` 直接取证，用于证明保护入口仍然生效。
3. 浏览器自动化截图不包含原生地址栏，因此在页面右下角注入了路径条、BUILD_ID 与时间戳，作为页面落点留痕。

## 1. 截图清单

| 编号 | 内容 | 页面路径 | 文件 | 取证焦点 |
| --- | --- | --- | --- | --- |
| SS-01 | 区域视角首屏 | `/data-screen?view=region&preset=management` | `docs/plans/evidence/2026-04-09-data-screen-phase-2/ss-01-region-overview.png` | 一级入口、区域主舞台、左右联动区与底部分析带 |
| SS-02 | 浙江模式地图首屏 | `/data-screen?view=region&map=zhejiang` | `docs/plans/evidence/2026-04-09-data-screen-phase-2/ss-02-region-zhejiang.png` | 浙江模式不再是全零占位，地图口径可切换 |
| SS-03 | 区域详情抽屉 | `/data-screen?view=region#region-detail` | `docs/plans/evidence/2026-04-09-data-screen-phase-2/ss-03-region-detail-drawer.png` | 统一区域下钻已接入右侧抽屉 |
| SS-04 | 人员视角首屏 | `/data-screen?view=personnel&preset=management` | `docs/plans/evidence/2026-04-09-data-screen-phase-2/ss-04-personnel-overview.png` | 人员摘要、中部画像区、下部事项穿透区 |
| SS-05 | 人员事项抽屉 | `/data-screen?view=personnel#personnel-item-detail` | `docs/plans/evidence/2026-04-09-data-screen-phase-2/ss-05-personnel-item-drawer.png` | 人员事项点击可打开统一事项抽屉 |
| SS-06 | 专题视角首屏 | `/data-screen?view=topic&preset=management` | `docs/plans/evidence/2026-04-09-data-screen-phase-2/ss-06-topic-overview.png` | 专题视角 prototype 与主筛选协议共存 |
| SS-07 | 专题风险抽屉 | `/data-screen?view=topic#topic-risk-detail` | `docs/plans/evidence/2026-04-09-data-screen-phase-2/ss-07-topic-risk-drawer.png` | 专题风险项目点击可进入统一抽屉 |
| SS-08 | 未登录访问保护页 | `/data-screen -> /login` | `docs/plans/evidence/2026-04-09-data-screen-phase-2/ss-08-login-protected-page.png` | 未登录访问保护页仍然生效 |

## 2. 当前结论

1. phase-2 三个一级视角与三个统一抽屉已经具备稳定页面证据。
2. 自动化截图口径与 DTC-14 focused Playwright 主链路一致，可以直接作为发布前页面留痕附件。
3. 当前剩余不是“缺截图”，而是 formal 陪跑现场的业务确认与签字动作。 
