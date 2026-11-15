# 迁移进度台账

> 唯一状态源是 `inventory/pages.csv` 的 `status` / `done_date` / `record` 三列；本文件是人读视图。
> **每完成一个功能页面，必须：① 写 `records/Pxxx.md` 记录卡 → ② 更新 `pages.csv` → ③ 在本文件追加一行。缺一不算完成。**

## 1. 规则

状态机：`pending → in_progress → implemented → verified → done`，受阻写 `blocked` 并注明原因与待确认编号（D1…D15）。

- 一次只推进一个 `Pxxx`（页面级），其页内组件 `C` 随该页一起完成，不单独标 done。
- 命名必须与旧项目同名同路径；重命名过的文件先按 §4.1 收敛，再标 done。
- 发现需要改接口 / 改 `ui/` 里的 js → 立刻 `blocked`，写入待确认，**不私自改**。
- 每批结束跑 `node scripts/verify-migration.mjs`，把 `COMPARE.md` 归档到 `docs/compare/COMPARE-<批次>-<日期>.md`。

## 2. 基线（2026-11-13）

| 项 | 数值 |
| --- | ---: |
| 页面 P | 69 |
| 页内组件 C | 170 |
| `views/**` SFC | 239 |
| 公共组件 + 布局 | 43 |
| 迁移单元合计 | 282 |
| 接口 js（F1 冻结） | 102 |
| 新项目已有视图 | 9（其中 1 个命名对齐、8 个待收敛、2 个为新增页） |
| 已验收 done | **0** |

首轮对比报告（历史）：A 组 0/127 一致，因冻结层尚未复制；C 组路由断链 0。

### 当前状态（2026-11-15，第十七批「课程作业」后）

> 第十五批（P067 考试管理）、第十六批（P220 在线学习）、第十七批（P174 课程作业）为并行/连续独立批次；变更日志按写入顺序排列，互不覆盖。

| 项 | 数值 |
| --- | ---: |
| F1 + F2 冻结层 | **127/127 哈希一致**（`ui/` 零改动） |
| 已验收 done | **22 / 69** |
| 同名路径页面 | **22 / 69**（命名收敛后） |
| B01 完成 | **10 / 10**（P031 / P131 第三批补齐后转 `done`） |
| B02 完成 | **10 / 19**（P055 第四批；第五批列表闭环 4 页；第六批 P147；第十三批 P049 六 Tab 全通；第十二批 P035；**第十四批 P153 排课计划**；**第十五批 P067 考试管理**） |
| B03 完成 | **2 / 17**（**第十六批 P220 在线学习**；**第十七批 P174 课程作业**；P224 孤儿页 `implemented`） |
| `vite build` | 通过 |
| Chrome + CDP 实跑 | 第一批 7/7、第二批 15/15、第三批 23/23、第四批 17/17、第五批 23/23、第六批 27/27、第七批 27/27、第八批 21/21、第九批 13/13、第十二批 24/24、第十三批 45/45、**第十四批 33/33**、**第十六批 34/34**、**第十七批 33/33** 断言，均 0 console error |
| 命名收敛 | **8 / 8 完成**（2026-11-14 第二批） |
| A 适配层 `utils/user.js` | 已落地（F2 `permission.js` 依赖，第三批） |
| 公共组件同名新写 | **9 / 43**：`CascaderPlus` / `ImgCropper` / `ManualGenerateDialog` / `Pagination`（第五批）+ `FilePreview` / `UploadChunk` / `VideoPlay`（第七批）+ `Preview`（第八批）+ `choose-user-list`（第十二批，`views/common` 下） |
| 通用动态菜单加载 | **未实现**（D19）：`ModuleView.vue` 按 component 白名单分发（现 7 条）+ 7 条静态路由 |
| D3 真实菜单页数 | **已确认**：菜单项 69 / 唯一 component 66 / 命中台账 41（33 P + 8 C）/ 25 个 `menuFlag=0` 内置菜单前端无视图；`pages.csv` 新增 `menu` 列，详见 `docs/inventory/menus-export.json` |

## 3. 批次汇总

| 批次 | 优先级 | 页面 | 已完成 | 状态 |
| --- | --- | ---: | ---: | --- |
| B01 | P0 | 10 | 10 | **完成**：命名收敛 + 学生/教师子页 + vue-cropper 自由裁框，P031 / P131 转 `done` |
| B02 | P1 | 19 | 10 | 进行中：P055 + 第五批列表闭环 4 页 + 第六批 P147 + 第十三批 P049（六 Tab 全通）+ 第十二批 P035 + **第十四批 P153 排课计划** + **第十五批 P067 考试管理** |
| B03 | P2 | 17 | 2 | 进行中：**第十六批 P220 在线学习** + **第十七批 P174 课程作业**（6 SFC，随页 C 5 个 `implemented`；P224 孤儿页 `implemented`） |
| B04 | P3 | 12 | 0 | 未开始 |
| B05 | P4 | 9 | 0 | 未开始 |
| B06 | P5 | 2 | 0 | 未开始 |
| **合计** | | **69** | **22** | |

## 4. 页面记录台账

| 页面 ID | 旧路径 | 目标路径 | 批次 | 状态 | 完成日期 | 记录卡 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P003 | `src/views/error/401.vue` | 同名 | B01 | `done` | 2026-11-14 | `P003.md` | 冻结层无接口；返回/回首页逻辑对齐 |
| P004 | `src/views/error/404.vue` | 同名 | B01 | `done` | 2026-11-14 | `P004.md` | catch-all 由跳首页改回 404 页 |
| P009 | `src/views/index.vue` | 同名 | B01 | `done` | 2026-11-14 | `P009.md` | 门户页，调用 F1 `config.js` / `portal.js`；D7 已拍板「容器换肤、内容不动」，footer 补兜底 |
| P010 | `src/views/login.vue` | 同名 | B01 | `done` | 2026-11-14 | `P010.md` | 6 项对比通过；记住密码→记住账号（D14） |
| P031 | `src/views/manager/clazz/index.vue` | 同名 | B01 | `done` | 2026-11-14 | `P031.md` | 第三批：学生/教师子页 + A 适配层 `utils/user.js` 落地，CDP 实跑通过 |
| P128 | `src/views/redirect/iframe/index.vue` | 同名 | B01 | `done` | 2026-11-14 | `P128.md` | query.url / 全屏高度 / 空态 |
| P129 | `src/views/redirect/index.vue` | 同名 | B01 | `done` | 2026-11-14 | `P129.md` | 空态与旧页一致 |
| P130 | `src/views/register.vue` | 同名 | B01 | `done` | 2026-11-14 | `P130.md` | 占位文案保留，新增返回登录导航 |
| P131 | `src/views/system/user/profile/index.vue` | 同名 | B01 | `done` | 2026-11-14 | `P131.md` | 第三批：`vue-cropper` 自由裁框补齐；`$tab.closePage` 按 D2 已拍板差异保留 |
| P171 | `src/views/training/index.vue` | 同名 | B01 | `done` | 2026-11-14 | `P171.md` | 已由 `views/home/index.vue` 归位；容器页 6 项通过，C 为简版另记 |
| P055 | `src/views/manager/course/review/index.vue` | 同名 | B02 | `done` | 2026-11-14 | `P055.md` | B02 首单页：4 个同名 SFC、菜单 component 分发、marked 渲染、CDP 实跑通过 |
| P036 | `src/views/manager/course/case/index.vue` | 同名 | B02 | `done` | 2026-11-14 | `P036.md` | 案例管理：复用管理端 courseList（classify=1），菜单分发 + 静态路由 |
| P037 | `src/views/manager/course/course/index.vue` | 同名 | B02 | `done` | 2026-11-14 | `P037.md` | 课程管理：6 个 SFC（列表/卡片/表格/排序）+ 4 个公共组件同名新写 |
| P142 | `src/views/training/course/case/index.vue` | 同名 | B02 | `done` | 2026-11-14 | `P142.md` | 前端案例显示：复用实训端 courseList（classify=1） |
| P143 | `src/views/training/course/course/index.vue` | 同名 | B02 | `done` | 2026-11-14 | `P143.md` | 前端课程显示：3 个 SFC、卡片/列表/分页/四态、CDP 实跑通过 |
| P147 | `src/views/training/course/courseDetail/index.vue` | 同名 | B02 | `done` | 2026-11-14 | `P147.md` | 前端课程详情：4 个同名 SFC（含 3 个随页 C），D20 实训端详情入口打通 |

| P035 | `src/views/manager/course/assign/index.vue` | 同名 | B02 | `done` | 2026-11-14 | `P035.md` | 课程分配：列表 + 分配抽屉；随页 P034 `courseTable`、公共 P001 `choose-user-list`；CDP 24/24 |
| P049 | `src/views/manager/course/courseEdit/index.vue` | 同名 | B02 | `done` | 2026-11-14 | `P049.md` | 第十三批：作业配置 Tab 补齐，**六 Tab 全通**；设置/卷池/发布/统计/AI 出题/试卷预览/整卷编辑全链路，CDP 45/45 |
| P153 | `src/views/training/course/schedule/index.vue` | 同名 | B02 | `done` | 2026-11-14 | `P153.md` | 第十四批：排课计划全链路（列表/筛选/单多时段/额度/详情/资源抽屉/结束删除/冲突）；随页 P151 `dateTimeRangePicker`、P152 `container`；CDP 33/33 |
| P067 | `src/views/manager/exam/examManager/index.vue` | 同名 | B02 | `done` | 2026-11-15 | `P067.md` | 第十五批：考试管理全链路（列表/搜索/重置/批量删/编辑弹窗 ExamArrangeForm/详情抽屉 AiGradeDetail/手工卷+AI卷预览）；随页 P064/P065/P066/P062/P059/P070；CDP 冒烟 0 console error |
| P220 | `src/views/training/online/learning/index.vue` | 同名 | B03 | `done` | 2026-11-15 | `P220.md` | 第十六批：在线学习整页（顶栏 + 5 Tab 懒挂载 + 章节树/正文/记录 + 章节作业条 + 视频/文档/课件），静态路由 `/online/learning` 不进后台外壳；随页 C 10 个 `implemented`；CDP 34/34 |
| P174 | `src/views/training/learning/homework/do.vue` | 同名 | B03 | `done` | 2026-11-15 | `P174.md` | 第十七批：课程作业 6 个 SFC（答题页 / 逐题明细 / 名单 / 入口壳 / 学生清单 / 教师看板），菜单 2554 分发 + 顶层路由 `/homework-do/:suffix?`；**D20 / D28 双关闭**；CDP 33/33 |

> 上表列 B01 的 10 个页面与 B02 已完成/在办页面；其余页面不预填空行，完成时按 `Pxxx` 追加。完整 239 行在 `inventory/pages.csv`。

## 5. 命名收敛记录（B01 前置，已闭环 2026-11-14）

| 旧路径 | 当前路径 | 动作 | 状态 |
| --- | --- | --- | --- |
| `views/training/index.vue` | `views/home/index.vue` | 重命名归位 | ✅ 已完成 |
| `views/home/admin.vue` | `views/home/AdminHome.vue` | 重命名归位 | ✅ 已完成 |
| `views/home/teacher.vue` | `views/home/TeacherHome.vue` | 重命名归位 | ✅ 已完成 |
| `views/home/student.vue` | `views/home/StudentHome.vue` | 重命名归位 | ✅ 已完成 |
| `views/home/components/ScheduleCalendar/index.vue` | `components/CalendarPanel.vue` | 重命名归位 | ✅ 已完成 |
| `views/manager/clazz/classes/index.vue` | `views/clazz/index.vue` | 重命名归位 | ✅ 已完成 |
| `views/manager/clazz/classes/components/adminClasses.vue` | `views/clazz/ClassList.vue` | 拆分归位 | ✅ 已完成 |
| `views/manager/clazz/classes/components/teacherClasses.vue` | `views/clazz/ClassList.vue` | 拆分归位 | ✅ 已完成 |

新增页（不计入 69 页）：`views/ModuleView.vue`（迁移期占位，全量完成后删）、`views/kitchen/KitchenSink.vue`（组件总览，保留）。

## 6. 变更日志

| 日期 | 内容 |
| --- | --- |
| 2026-11-13 | 建立迁移设计文档、页面/接口/路由/冻结层清单、对比脚本、进度台账与记录卡模板；首轮基线 `COMPARE.md` 生成。 |
| 2026-11-14 | 第一批执行：复制 F1 102 + F2 25 个冻结文件（127/127 哈希一致）；适配层 `utils/request.js` 补 `download` / `isRelogin`；补装 `js-base64`；迁移 6 个 B01 独立页（401 / 404 / 门户 / iframe / redirect / register）并接入静态路由；写 6 份记录卡；`vite build` 通过，Chrome + CDP 7/7 路由实跑、0 JS 异常。 |
| 2026-11-14 | 第二批执行：命名收敛 8 个目标文件（7 源 → 8 目标，含 `ClassList.vue` 按角色拆分）；`/index` 改指 `views/training/index.vue`，`/user/profile` 沿用旧 path/name/meta；新建 P031 / P131 共 7 个 SFC；D1/D2/D7 拍板落地、D3 补客观取证；补 58 条英文字典；4 份记录卡（P010/P031/P131/P171）；`vite build` + `verify --strict` + `i18n-check --strict` 全绿，Chrome + CDP 15/15 断言、0 console error。P031 / P131 按拍板保持 `implemented`，`ui/` 零改动。 |
| 2026-11-14 | 第三批执行：补 A 适配层 `utils/user.js`（F2 依赖）；迁移 P031 学生/教师子页与容器接入；P131 头像裁剪改 `vue-cropper@1.1.1` 自由裁框；P031/P131 转 `done`（B01 10/10、done 10/69）；新增 66 条英文字典、2 份记录卡更新、COMPARE 归档；`vite build` + `verify --strict` + `i18n-check --strict` 全绿，Chrome + CDP 23/23 断言、0 console error。D3 解锁脚本就绪但仍缺 token 值；新增 D16 / D17。 |
| 2026-11-14 | **D3 关闭**：用户提供真实 Bearer token 后运行 `scripts/export-menus.mjs`，导出 125 条菜单（可见路由 123、带 component 69、唯一 66）；命中台账 41 行（33 P + 8 C），25 个未命中全为 `menuFlag=0` 的内置菜单且 `ui/src/views` 无对应文件（登记 D18）。`pages.csv` 新增 `menu` 列（41 行有值）；顺带推进 D11（99 条真实菜单名进字典，字典 725 条）。`verify --strict` A 127/127 / C 0 / D 0 / done 10、`i18n-check --strict` 100%；§5.1、§9、§10、§11.6、§11.7 同步；token 仅用于请求，未写入任何文件。 |
| 2026-11-14 | 第四批执行（B02 首单页）：按源码实况补 `marked@^15.0.12`、复制 `default_course.png`；新建 P055 课程审核主页 + P054 课程信息单元格 + P057 AI 生成过程 + P056 章节树节点共 4 个同名 SFC；`ModuleView.vue` 按后端 component 白名单分发 + 静态路由 `/course/review`；新增 72 条英文字典；记录卡 `P055.md`、pages.csv（P055 done / 3 个 C implemented）、PROGRESS、COMPARE 归档 `compare/COMPARE-B02-batch4-20261114.md`。`vite build` / `verify --strict`（A 127/127、C 0、D 0、done 11）/ `i18n-check --strict`（616 词条 / 797 字典 100%）均 exit 0；Chrome + CDP 带桩 17/17 断言、0 console error。新增 D19；D9 的 mitt/jsencrypt 实测本页链不引用，留待后续批次。 |
| 2026-11-14 | 第五批执行（课程/案例列表闭环）：用户拍板「列表闭环」范围，一次迁移 11 个同名 SFC（管理端 6 + 实训端 5）+ 4 个公共组件同名新写；补 `vuedraggable@4.1.0`；`ModuleView` 白名单扩至 5 条 component、静态路由新增 4 条；新增 103 条英文字典（900 条 / 静态 721 条 100%）；记录卡 P036/P037/P142/P143、pages.csv（done 15 / C implemented 7 行）、shared-components.csv（4 行 implemented）、PROGRESS、COMPARE 归档。`vite build` / `verify --strict`（A 127/127、C 0、D 0、done 15）/ `i18n-check --strict` 全绿；本机桩 + Chrome CDP **23/23 断言、0 console error**。新增 D20（课程编辑页 / 详情页 / 在线学习入口未迁移，当前提示不跳 404）。 |
| 2026-11-14 | 第六批执行（P147 前端课程详情）：按「一次只做一批」先落最小闭环，4 个同名 SFC（`courseDetail/index.vue` + `courseChapter` + `ChapterViewItem` + `ConfigFlag`）；静态路由新增 `/course-center/course/courseDetail`（沿用旧路径，带 `courseId` + `encodedParam`），`ModuleView` 白名单扩至 6 条；列表卡片详情入口由 `message.info` 改为真实跳转，**D20 实训端已打通**；补 40 条英文字典（940 条 / 静态 761 条 100%）；记录卡 P147、pages.csv（done 16 / C implemented 3 行）、PROGRESS、COMPARE 归档。`vite build` / `verify --strict`（A 127/127、C 0、D 0、done 16）/ `i18n-check --strict` 全绿；本机桩 + Chrome CDP **27/27 断言、0 console error**。3 处有意偏差已登记在 P147.md §4（未声明 prop 补默认值、章节 key 改 `chapterId`、开始实验接 `saveScheduleByParams`）。 |
| 2026-11-14 | 第七批执行（P049-A 课程编辑）：源码实测 `courseEdit` **12 文件 / 7,603 行**，依赖交叉无法按单 Tab 切，按依赖闭包拆两段。本批落 **10 个同名 SFC**（壳 + `courseware`/`courseFile`/`courseConfig` + `ConfigList`/`FileList`/`ChapterTreeItems` + 公共 `FilePreview`/`UploadChunk`/`VideoPlay`）；新增依赖 `vue-simple-uploader@1.0.3`、`js-md5@0.8.3`、`longze-vue3-video-player@1.1.7`、`less`（均与 `ui/package.json` 同版本），`main.js` 注册 `app.use(uploader)` / `app.use(longzeVideoPlay)`；静态路由新增 `/manager/course/courseManager/courseEdit`，`ModuleView` 白名单扩至 7 条，**D20 管理端入口打通**（课程管理卡片点击 → 编辑页真实跳转）。章节编辑 / 作业配置 / 全局预览三个 Tab 用 `role=status` 占位写清依赖与行数，不给假按钮；P049 记 `implemented`（非 `done`）。补 109 条英文字典（1049 条 / 静态 873 条 100%）；记录卡 P049、pages.csv（7 行 implemented）、shared-components.csv（S023/S033/S034）。`vite build` / `verify --strict`（A 127/127、C 0、D 0、done 16）/ `i18n-check --strict` 全绿；本机桩 + Chrome CDP **27/27 断言、0 console error**。 |
| 2026-11-14 | 第八批执行（P049 全局预览）：`coursePreview`(585) + 公共 `Preview`(615) 重写，**无新增 npm 依赖**；左侧章节树复用 `ChapterTreeItems(show-type=preview)`，右侧富文本支持标题目录、滚动联动、只滚内部容器、回到顶部、`pre` 内注入「复制代码」（`MutationObserver` 跟内容）；上一节/下一节按「有正文或叶子」编入序列。`courseEdit` 预览 Tab 由占位换成真实组件，**四 Tab 可用**。台账：P047 `implemented`、S028 `implemented`、记录卡 P049 §4.1。补 20 条英文字典（1069 / 静态 891 100%）。`vite build` / `verify --strict`（A 127/127、C 0、D 0、done 16）/ `i18n-check --strict` 全绿；CDP **21/21 断言、0 console error**。 |
| 2026-11-14 | 第九批执行（P049 章节编辑）：`courseChapter`(1,527) 重写，接入 UEditorPlus（`public/UEditorPlus` 4.4MB 原样复制）+ `vue-ueditor-wrap@3.0.8` + `dompurify`；保留章节 CRUD/排序/展开折叠、MD 文件导入、MD 图片导入（按文件名替换引用）、副本保存/查看/改名/采用/删除、有子级时手输名确认删除、实训开关。**修掉旧页隐藏 bug**：`editorConfig` 缺 `imageAllowFiles` 导致 UEditorPlus 打开即抛 TypeError（`simpleupload` 插件 `.join()` 空值），新页显式配置后 0 console error。AI 生成内容 / AI 一键生成两个按钮置灰并注明待迁移（依赖 `AiChapter`+`AiAutoGenerate` 共 5,678 行，新增 **D22**）。台账：P044 `implemented`、记录卡 P049 §4.2。补 44 条英文字典（1113 / 静态 933 100%）。`vite build` / `verify --strict`（A 127/127、C 0、D 0、done 16）/ `i18n-check --strict` 全绿；CDP **13/13 断言、0 console error**。 |
| 2026-11-14 | 第十批执行（视觉规范）：按用户要求移除**所有列表页的页头条**（状态圆点 + 标题 + 共 N 条记录 + 刷新），涉及 training/course/courseList、manager/course/courseList、manager/course/review、clazz/teacher、clazz/student、adminClasses、teacherClasses 共 7 个页面；刷新按钮移入筛选工具条，删除对应死样式与残留媒体查询、移除不再使用的 pageTitle。规范写入设计文档 §3.4。静态词条 933 → 928（字典 1113 不变，100%）。`vite build` / `verify --strict` / `i18n-check --strict` 全绿；CDP **10/10 断言、0 console error**。 |
| 2026-11-14 | 第十一批执行（收口）：按用户要求再删 7 页工具条上的「刷新」按钮（进页即拉取，搜索/重置会重查，功能不缺）；定位并修掉菜单入口的双重留白——`ModuleView` 在渲染已迁移视图时给根节点加 `page--flush`，把 `.page` 的 `22px 26px` 内边距清零，只留 20px 底部。CDP **9/9 断言、0 console error**（`paddingTop/Left=0px`、工具条 `top=60`）。规范同步进设计文档 §3.4。 |
| 2026-11-14 | 第十二批执行（P035 课程分配）：新建 3 个同名 SFC（`assign/index` 355 行 + `assign/courseTable` 78 行 + 公共 `common/choose-user-list` 165 行，旧页合计 1,270 行）；`ModuleView` 白名单扩至 9 条、静态路由新增 `/courseAssign`；补 45 条英文字典（971 条 / 1155 字典 100%）。修掉旧页三处问题：分配详情只可 hover（改为 hover+点击+键盘，带 `aria-expanded`）、逐行串行拉分配（改并发）、选择用户未禁用已分配教师导致重复提交（选择阶段即禁用，去重校验保留）。`vite build` / `verify --strict`（A 127/127、C 0、D 0、done 17）/ `i18n-check --strict` 全绿；本机桩 + Chrome CDP **24/24 断言、0 console error**。新增 D23（分页页长与旧页 10 条/页不同）。 |
| 2026-11-14 | **第十三批执行（P049 作业配置收口）**：作业配置 Tab 依赖闭包实测 **4,099 行旧码**——`Homework` 三件套 2,570（`index` 207 / `HomeworkDrawer` 778 / `HomeworkGenPanel` 1,585）+ `AiPaperPreview` 394 + `AiPaperQuestionEditor` 723 + `QuestionCard` 313 + `questionDefaults.js` 99。一次落地 **6 个同名同路径 SFC + 1 个共享常量原样复制**，壳页占位换成真实 `CourseHomework`；**无新增 npm 依赖、无新增路由 / 白名单**（F1 `api/exam/homework` / `api/exam/aiExam` / `api/apt/questionGen` 与 A 适配层 `utils/user.js` 全部已有）。旧插件替换：`proxy.$modal` → antd `message`/`Modal.confirm`，`checkPermi` → `getUserPermissions()` 本地 `hasPerm`，`proxy.useDict` → F1 `getDicts`，`v-hasPermi`（D17）移除。按 UI/UX 规范补 **字段旁内联错误 + 顶部可聚焦错误汇总**（`role=alert`/`tabindex=-1`）、章节列表与题型导航改原生 `<button>` + `aria-current`/`aria-label`、900px 断点上下布局；设计系统查询返回的 Claymorphism 营销风格与 v4 token 宪法冲突，**不采用**，只落地其表单校验与无障碍规则。补 351 条英文字典（328 静态 + 23 动态 key：题型/难度/快捷预设名与描述），**1297 静态词条 / 1506 字典 100%**。台账：`P049.md` §4.3、`pages.csv`（P049 `done`、P041/P042/P043/P060/P061/P072 `implemented`）、PROGRESS、设计文档 §9/§10/§11.6、COMPARE 归档。`vite build` / `verify --strict`（A 127/127、C 0、D 0、**done 18**）/ `i18n-check --strict` 全绿；本机桩 + Chrome CDP **45/45 断言、0 console error**，截图 `B13-P049-*.png`。`ui/` 零改动、冻结层未动、临时服务已清理、用户 5180 未动。 |
| 2026-11-14 | **课程编辑 UI 修复（用户反馈：顶部间距 / 返回 / 滚动条）**：① `courseEdit` 根节点去掉 `.page`，改自带 `8px 18px 24px` + `gap:12px`，返回条 `fit-content` → 返回条到首卡片 32px→12px、条宽 1378→163px；② `handleEdit` 带 `from`，`goBack` 优先原路返回、否则按 `encodedParam.classify` 兜底，一律 `router.replace`（不堆历史），实测案例回 `/caseManager`、菜单入口回 `/module/2402`、列表恢复卡片视图；③ 4 个课程壳页 `height:100%;overflow:hidden` → `min-height:100%`（长列表实测 `scrollHeight 1154 > 737`），Layout 补顶栏滚轮转发（`scrollTop 0→300`）。`vite build` / `verify --strict`（A 127/127、C 0、D 0、done 18）/ `i18n-check --strict`（1438/1660，100%）全绿；本机桩(8898) + vite(5192) + Chrome CDP **17/17 断言、0 console error**，截图 `B15-*.png`；设计文档 §3.4 / §10 同步，COMPARE 归档 `compare/COMPARE-B15-courseEdit-ui-20261114.md`。备份 `/tmp/ui-redesign-src-backup-20261114-b15-pre`；`ui/` 零改动、冻结层未动。 |
| 2026-11-14 | **第十四批执行（P153 排课计划 → `done`）**：源码实测 `training/course/schedule` **3,844 行**（`index` 2,396 + `container` 1,055 + `dateTimeRangePicker` 393），依赖闭包无跨页组件（`Pagination` / F2 `utils/aigc.js` / A 适配层 `utils/user.js` 均已在新项目）。一次落地 3 个同名同路径 SFC：列表 + 编辑抽屉（单/多时段、额度、冲突）+ 详情/结束/删除弹窗 + 资源抽屉 + 时段选择器。旧页 14 个 F1 import 方法名全部保留，`verify --strict` D 组 0 缺口。**依赖处置**：`moment` 仅一处 `.add(minutes)` → 换 `dayjs`（新项目 `package.json` / lockfile 显式声明 `dayjs@1.11.23`，不改 node_modules）；`startTokenCheck` 是死导入直接删（冻结层 ADAPTER 组，A 组跳过）；旧页依赖 auto-import 的 Vue API 全部显式 import。静态路由 `/schedule` + `ModuleView` 白名单第 10 条。**修掉旧页 bug**：单时段起止校验把 `YYYY-MM-DD HH:mm` 喂给只认 `HH:mm` 的函数导致 NaN 恒 false、重叠检测未取历史最大结束时间且间隔检测用未排序数组、`clearInterval(trainingTimer)` 引用未声明变量、30s 定时与 resize 监听泄漏、`modeMap`/`imageSourceMap` 无兜底、资源抽屉 `getStatus` 写 `.style` 却读 `.color`、`notebook` 映射值笔误、catch 空吞异常致 loading 卡死。**契约改造**：`dateTimeRangePicker` 由直接 mutate props + 4 个 callback prop 改为纯受控 + 7 个标准 emits；hover-only popover 改 click/dropdown 常显按钮；`minuteStep` 1→5（1,440→288 项）；课程名点击的 `/online/learning`（B03 未迁移）改 `message.info` 不跳 404（D20 口径）。补 **154 条英文字典**（140 静态 + 21 动态映射 key，去重 7），**1438 静态词条 / 1660 字典 100%**。`vite build` / `verify --strict`（A 127/127、C 0、D 0、**done 19**）/ `i18n-check --strict` 全绿；本机桩 + Chrome CDP **33/33 断言、0 console error**，截图 `B14-P153-*.png`。台账 7 件套齐，新增 **D25**（tokenChecker 适配层口径）、**D26**（页长与 D23 同源）、F2 中文输出边界已写进 `records/P153.md` §7。`ui/` 零改动、冻结层未动、临时服务已清理、用户 5180 未动。 |
| 2026-11-15 | **第十六批执行（P220 在线学习 → `done`）**：源码实测 `training/online/learning` **12 个 SFC / 6,971 行**（`index` 529 + `CourseInfo` 1,128 + `ChapterList` 1,066 + `CourseAttachments` 792 + `CoursewareList` 648 + `CourseTraining` 1,777 + 6 个公共/页内组件），依赖闭包无跨页组件（`FilePreview` / `VideoPlay` / `Preview` 已在前几批同名新写）。一次落地 **12 个同名同路径 SFC + 1 个分栏 composable**（新页 3,848 行，比旧页少 45%）。**依赖处置**：`moment` 两处 → `dayjs`；`startTokenCheck` 死导入删；`delPaper` / `getContainer` 保留同名 import（D 组口径）；`@/views/training/learning/homework/homeworkDetail`（P175）不引入——它依赖批阅侧 `AiGradeDetail`（P059），改「查看逐题」禁用 + tooltip（**新增 D28**）；`proxy.useDict` → `getDicts`、`dict-span` → 本地 `dictLabelOf`、`proxy.handleTree` → F2 `handleTree`、`proxy.$modal` → antd `message`/`Modal.confirm`。**修掉旧页 bug**：① `mainHeight = clientHeight-45` + `position:absolute` 固定高度改 flex 撑满；② 只在 `onMounted` 读 query → 换课程不刷新（实测去掉 courseId 仍显示旧课），改 `watch(route.query)` + 面板 `:key`；③ 章节搜索只判本节点 → 嵌套章节搜到看不见，改子树递归 + 搜索即展开；④ 附件分组只遍历顶层章节 → 二级章节附件永不显示，改递归下钻；⑤ `getReadTimeSecond` 正则多转义一层（`/\\s/`）→ 阅读时长虚高；⑥ `CourseFileItem` 读不存在的 `props.chapter.children`；⑦ 拖拽条 `z-index:9999` 盖住抽屉 → 降到 5。**无障碍**：章节/附件/班级行全部改原生 `<button>` + `aria-current`/`aria-expanded`，拖拽条 `role=separator` + ←/→ 键（CDP 实测 300→324px）。入口打通：`courseDetail`「进入学习」、`schedule`「课程名」由 `message.info` 改真实跳转，**D20 只剩答题页 `/homework-do`**。**孤儿页 P224**：`CourseTraining.vue` 全库零引用（无路由/菜单/import），按同名同路径完整重写但记 `implemented`（无入口无法 CDP），**新增 D29**。补 **187 条英文字典**，**1756 静态词条 / 1973 字典 100%**。台账：`P220.md`、`P224.md`、`pages.csv`（P220 `done` / P224 + 10 个 C `implemented`）、PROGRESS、设计文档 §9/§10/§11.6、COMPARE 归档。`vite build` / `verify --strict`（A 127/127、C 0、D 0、**done 21**，含并行第十五批 P067）/ `i18n-check --strict` 全绿；本机桩(8897) + 专用 vite(5191) + Chrome CDP **34/34 断言、0 console error**，截图 `B16-learning-*.png`。备份 `/tmp/ui-redesign-src-backup-20261115-b16-pre`；`ui/` 零改动、冻结层未动、临时服务已清理、用户 5180 未动。 |
| 2026-11-15 | **第十七批执行（P174 课程作业 → `done`）**：源码实测 `training/learning/homework` **6 个 SFC / 2,012 行**（`do` 788 + `teacher` 720 + `student` 232 + `homeworkRoster` 176 + `homeworkDetail` 69 + `index` 27）。一次落地 6 个同名同路径 SFC；**无新增 npm 包**、复用第十五批的 `AiGradeDetail`（逐题明细）与 A 适配层 `utils/user`。旧插件替换：`proxy.useDict('sys_question_type')` → `getDicts`；`proxy.$modal` → `Modal.warning/error`；`checkPermi(['exam:aiExam:grade'])` → `getUserPermissions()`（避免空权限 console.error 污染断言）。**修掉旧页问题**：答题页 `clientHeight-40` 固定高度改 flex；看板 `loadBoard` catch 空吞导致 loading 卡死 → 补错误文案 + finally；学生清单接口失败无错误态 → 补 `loadError` + 重试；左栏班级/题型导航改原生 `<button>`（键盘可达）；选项行 `flex-wrap:nowrap` 防错位；硬编码色全改 v4 token。**闭环两项历史缺口**：D20 作业答题页 `/homework-do/:examId` 落地 → 在线学习页「开始作业」由 `message.info` 改真跳转（CDP 实证 `/homework/draw` 被调用）；**D28 关闭** → 在线学习页「查看逐题」接真 `HomeworkDetail`（CDP 实证弹「选择要回看的作业卷」两份）。路由：顶层 `/homework-do/:suffix?`（不进外壳）+ Layout children `homework`；`ModuleView` 白名单加 `training/learning/homework/index`（第 12 条）。补 **97 条英文字典**，**1851 静态词条 / 2070 字典 100%**。台账：`P174.md`、`pages.csv`（P174 `done` / P175-P179 `implemented`）、PROGRESS、设计文档 §9/§10/§11.6、COMPARE 归档。`vite build` / `verify --strict`（A 127/127、C 0、D 0、**done 22**）/ `i18n-check --strict` 全绿；本机桩(8896) + 专用 vite(5193) + Chrome CDP **33/33 断言、0 console error**，截图 `B17-*.png`。备份 `/tmp/ui-redesign-src-backup-20261115-b17-pre`；`ui/` 零改动、冻结层未动、临时服务已清理、用户 5180 未动。 |
| 2026-11-15 | **入口补修（用户反馈：案例点击弹「在线学习页将在后续批次迁移」）**：在线学习页第十六批已迁完，但两处入口仍留着旧占位（`message.info` 不跳）——① `training/course/courseList` 的 `handleDetail`：`classify=1` 分支 → 改 `window.open('#/online/learning?courseId=…','_blank')`，与旧页 `window.open('/online/learning?courseId='+id)` 同口径（页自带顶栏、不进后台外壳）；② `courseDetail/components/ConfigFlag` 的「在线学习」按钮 → 改 `#/online/learning?courseId=…&type=chapter&chapterId=…`（参数同旧页 `startLearn`），不再禁用。两处补 `courseId` 缺失告警（新增词条「该资源缺少课程编号，无法进入学习」+ 英文 1 条；同时删掉已无引用的「在线学习页将在后续批次迁移」，字典净 0 → 2070 条）。**D20 同步补正**（原写「无占位提示」不实）。验证：`vite build` / `verify --strict`（A 127/127、C 0、D 0、done 22）/ `i18n-check --strict`（1851 静态词条，100%）全绿；本机桩(8895，含 `listPlus` 案例行) + 专用 vite(5192) + Chrome CDP **7/7 断言、0 JS 异常**（点案例 → `window.open` 收到 `#/online/learning?courseId=2081624401147060225`；目标页实渲「课程简介/课程内容」5 Tab；详情页 5 个章节「在线学习」按钮点击 → `courseId=6001&type=chapter&chapterId=11`），截图 `/tmp/aigc/fix_learning.png`。备份 `/tmp/ui-redesign-src-backup-20261115-fixentry-pre`；`ui/` 零改动、冻结层未动、临时 8895/5192/9223 已清理、用户 5180 未动。 |
| 2026-11-15 | **流程修订：新增 §6.1 收口通道**。盘点发现 B03 资源中心 P238 我的资源 / P237 班级用量 / P239 用量统计（1,716 行）代码已落地、`router/index.js` 三条静态路由与 `ModuleView.vue` 三条白名单已注册、`manager/kube/quota/*` 11 个依赖组件与 `api/kube/resourceAllocation.js` / `classUsage.js` 齐全，但 `pages.csv` 仍 `pending`、无记录卡、无实跑记录 —— 属「已完成只差结账」。据此新增 §6.1：满足三条判定（文件已存在且行数同量级 / 已 v4 token + `t()` 改写 / 台账未结）即可跳过备份与源码盘点，台账 7 件压到 4 件（同源页合并记录卡、无新增公共组件跳过 shared-components、无新增待确认项跳过 §9）；**`vite build`、`verify--strict`、`i18n-check--strict`、CDP 实跑四项不得压缩**。§8.4 补第 5 条强制规则；skill `ui-redesign-batch-migration` §1 / §4 同步。本次未改代码、未改 `pages.csv` 状态。 |
