# 旅行手札 · A 方案完善版

这是面向手机浏览的静态交互原型。直接打开 `index.html`；`compare.html` 提供带手机画框的预览入口。原旅行网页保持独立，本目录只消费其行程摘要。

## 信息结构

- **当下**：下一项交通、时区、出发/抵达、提醒、当晚住宿与随身入口。
- **行程**：八天日期切换。每一天都可按时间新增、修改或删除景点、交通、美食、活动与住宿；主时间线区分“已定 / 计划”。10 月 3 日音乐会按官方日历默认 19:00 晚场，同时保留票面复核和 15:30 备选分支；天气分支独立呈现；餐厅放“顺路美食”，不虚构固定到店时间。
- **随身**：交通与住宿凭证、装箱和每日清单、旅行相册。
- **费用**：预算、分类、账单明细、同行分摊和原币汇总。

每个行程条目都能打开详情、地图和凭证。交通班次、营业、音乐会场次及未锁定的住宿信息会显示“出发前复核”。数据取舍和冲突见 [`../../../docs/design/itinerary-source-audit.md`](../../../docs/design/itinerary-source-audit.md)。

## 视觉与动效

界面保持无衬线字体、大留白和低密度画廊感。奥地利 Salzkammergut 官方品牌手册中的黄色 `#FFDD00` 用于小面积识别点；湖水绿来自目的地自然景观，用于导航状态和信息层级，不声称为官方品牌色。底部导航、弹层和分段控件使用半透明材质、边缘高光、背景模糊与克制阴影。

页面切换和底部弹层使用带轻微回弹的位移/缩放；系统开启“减少动态效果”时，动画缩短到近乎即时。触控目标和内容在 320 / 390 / 430 px 宽度下验证无横向溢出。

品牌依据：[Salzkammergut Brand Manual](https://www.salzkammergut.at/fileadmin/user_upload/salzkammergut/0_Prospekte_PDFs/MANUAL-salzkammergut-destinationen-Ueberarbeitet.pdf)。

## 运行与验证

静态文件可直接打开，也可在本目录启动本地服务：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

浏览器公共流程测试：

```bash
node scripts/sync-dist.cjs
node tests/source-dist.cjs
node tests/polished-a.e2e.cjs
node tests/itinerary-editor.e2e.cjs
node tests/current-weather.e2e.cjs
```

联网天气烟雾测试单独运行：`node tests/weather-live.cjs`。它会请求 Open-Meteo，并在天气弹层稳定后更新复核截图。

测试覆盖单一 A 体验、八日行程编辑入口、代表日期的新增/修改/删除、场次分支与状态语义、凭证关联和导入、行李勾选与新增、照片导入、账单新增/分摊/编辑、筛选可访问状态、焦点恢复、液态玻璃导航、当前天气成功/失败/竞态、部署目录一致性、减少动态效果，以及六个主页面在三种手机宽度下的横向溢出。

新增文件、照片、清单和账本修改仅保留在当前页面内存；刷新即清空。天气通过 Open-Meteo 获取目的地当前实况并每 10 分钟刷新；它不是 10 月旅行日预报。示例票据不构成预订证明。
