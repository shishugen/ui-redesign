# 迁移对比报告

- 生成时间：2026/11/14 23:38:28
- 源项目：`ui/` · 目标项目：`ui-redesign/`
- 命令：`node scripts/verify-migration.mjs --strict`

## 1. 总览

| 指标 | 基线 | 当前 | 占比 |
| --- | ---: | ---: | ---: |
| 页面 P（可独立打开） | 69 | 19 同名 / 19 含重命名 | 27.5% |
| 页内组件 C | 170 | 44 | 25.9% |
| `views/**` SFC | 239 | 63 | 26.4% |
| 公共组件 + 布局 | 43 | 17 个 .vue（含新增） | — |
| 接口 js（F1） | 102 | 102 一致 | 100.0% |
| 导出方法 / URL | 902 / 892 | 冻结层校验 | — |
| 状态 = done | 0 | 18 | 26.1% |

## 2. 四组检查结果

| 组 | 检查项 | 结果 | 判定 |
| --- | --- | --- | --- |
| A | F1/F2 冻结层哈希 | OK 127 / 异常 0（F1 0） | ✅ |
| B | 页面同名路径覆盖 | 19/69 页；另有 0 页仅以重命名形式存在 | ⏳ |
| C | 路由 import 断链 | 0 处 | ✅ |
| D | 已迁移页接口方法缺失 | 0 页有缺口 | ✅ |

### A 冻结层异常明细

无异常：所有 F1/F2 文件与 `ui/` 逐字节一致。

> 执行复制（只读 `ui/`）：`rsync -a --exclude='.DS_Store' ../ui/src/api/ ./src/api/`，F2 文件按 `frozen-manifest.json` 逐个复制。

### B 批次覆盖

| 批次 | 优先级 | 页面 | 同名路径已存在 | done |
| --- | --- | ---: | ---: | ---: |
| B01 | P0 | 10 | 10 | 10 |
| B02 | P1 | 19 | 9 | 8 |
| B03 | P2 | 17 | 0 | 0 |
| B04 | P3 | 12 | 0 | 0 |
| B05 | P4 | 9 | 0 | 0 |
| B06 | P5 | 2 | 0 | 0 |

### B 模块覆盖（仅列含页面的模块）

| 模块 | 页面 | 同名路径已存在 | done |
| --- | ---: | ---: | ---: |
| `demo` | 1 | 0 | 0 |
| `error` | 2 | 2 | 2 |
| `index` | 1 | 1 | 1 |
| `login` | 1 | 1 | 1 |
| `manager` | 1 | 0 | 0 |
| `manager/ai` | 1 | 0 | 0 |
| `manager/clazz` | 1 | 1 | 1 |
| `manager/course` | 5 | 5 | 5 |
| `manager/exam` | 2 | 0 | 0 |
| `manager/kube` | 5 | 0 | 0 |
| `manager/liblib` | 1 | 0 | 0 |
| `manager/modeUsage` | 1 | 0 | 0 |
| `manager/onlineimage` | 1 | 0 | 0 |
| `manager/teaching` | 1 | 0 | 0 |
| `redirect` | 2 | 2 | 2 |
| `register` | 1 | 1 | 1 |
| `system` | 1 | 1 | 1 |
| `training` | 1 | 1 | 1 |
| `training/analysis` | 1 | 0 | 0 |
| `training/assistant` | 4 | 0 | 0 |
| `training/course` | 4 | 4 | 3 |
| `training/disk` | 3 | 0 | 0 |
| `training/exam` | 4 | 0 | 0 |
| `training/forum` | 3 | 0 | 0 |
| `training/knowledge` | 2 | 0 | 0 |
| `training/learning` | 3 | 0 | 0 |
| `training/liblib` | 1 | 0 | 0 |
| `training/modeUsage` | 1 | 0 | 0 |
| `training/online` | 6 | 0 | 0 |
| `training/private` | 3 | 0 | 0 |
| `training/prompts` | 2 | 0 | 0 |
| `training/resource` | 3 | 0 | 0 |

### 状态分布（pages.csv）

| status | 数量 |
| --- | ---: |
| `done` | 18 |
| `implemented` | 38 |
| `pending` | 183 |

### 待迁移（按批次/优先级，前 20）

| ID | 批次 | 旧路径 | 当前状态 |
| --- | --- | --- | --- |
| P002 | B06 | `src/views/demo/index.vue` | `pending` |
| P022 | B04 | `src/views/manager/ai/index.vue` | `pending` |
| P068 | B02 | `src/views/manager/exam/index.vue` | `pending` |
| P073 | B02 | `src/views/manager/exam/questionGen/index.vue` | `pending` |
| P075 | B06 | `src/views/manager/index.vue` | `pending` |
| P082 | B03 | `src/views/manager/kube/container/docker/workbench.vue` | `pending` |
| P083 | B03 | `src/views/manager/kube/container/index.vue` | `pending` |
| P091 | B03 | `src/views/manager/kube/imageManagement/Create.vue` | `pending` |
| P093 | B03 | `src/views/manager/kube/imageManagement/index.vue` | `pending` |
| P098 | B03 | `src/views/manager/kube/index.vue` | `pending` |
| P116 | B04 | `src/views/manager/liblib/index.vue` | `pending` |
| P117 | B05 | `src/views/manager/modeUsage/index.vue` | `pending` |
| P123 | B04 | `src/views/manager/onlineimage/index.vue` | `pending` |
| P124 | B02 | `src/views/manager/teaching/container/index.vue` | `pending` |
| P136 | B05 | `src/views/training/analysis/base/index.vue` | `pending` |
| P138 | B04 | `src/views/training/assistant/data/index.vue` | `pending` |
| P139 | B04 | `src/views/training/assistant/office/index.vue` | `pending` |
| P140 | B04 | `src/views/training/assistant/question/index.vue` | `pending` |
| P141 | B04 | `src/views/training/assistant/service/index.vue` | `pending` |
| P153 | B02 | `src/views/training/course/schedule/index.vue` | `pending` |

## 3. 判定

**⏳ 进行中**：基线 0/69，当前 18/69 页验收完成。

通过条件：A 无异常 + C 无断链 + D 无缺口 + 69 页同名路径齐全 + 69 页 `status=done` + 每页有记录卡。

> 人工对比（三角色登录、CRUD 抽样、长链路、视觉 1440/1280）不在此脚本内，见 `迁移设计文档.md` §7.2。
