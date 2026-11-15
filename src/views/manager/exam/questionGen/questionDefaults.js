/**
 * AI 出题的默认分值与快捷预设
 *
 * 单独成模块的原因：出题有两个入口——「AI 出题页」（exam/questionGen，保存为 AI 试卷）与
 * 「章节作业出题面板」（course/courseEdit 的 HomeworkGenPanel，保存进作业卷池）。
 * 两者的数量/分值联动规则必须完全一致（否则同一套题在两个入口算出的总分会不一样），
 * 所以默认值与预设方案只在这里存一份。
 */

// 出题内容截断上限的本地兜底值（与后端 DEFAULT_MAX_DOC_CHARS 一致）：
// 正常不会用到——后端响应会带真实上限，拿不到还有后台动态配置，只有两者都失败时才落到这里
export const DEFAULT_DOC_LIMIT = 100000

// 可解析出题的文件类型（docx/pdf 与扫描版走 OCR，pptx 有降级解析），两个出题入口同一口径
export const SUPPORTED_FILE_RE = /\.(docx|pdf|txt|md|pptx)$/i

// 各题型每题分值的默认值：填了数量就把分值补上它（简答题分值高，默认 10 分，其余 5 分），
// 老师可再手改；想要「未设分值、按总分均分」的隐性分配，把分值手动清空即可
export const DEFAULT_SCORES = { single: 5, multiple: 5, judge: 5, fill_blank: 5, short_answer: 10 }

// 参与出题的题型键（数量键 = key + '_count'，分值键 = key + '_score'），两个入口共用同一口径
export const QUESTION_TYPES = [
  { key: 'single', label: '单选题' },
  { key: 'multiple', label: '多选题' },
  { key: 'judge', label: '判断题' },
  { key: 'fill_blank', label: '填空题' },
  { key: 'short_answer', label: '简答题' }
]

// 快捷预设方案（点击后覆盖表单里五组数量+分值）
export const SCORE_PRESETS = [
  {
    name: '120分·标准',
    desc: '单选 10题×4分 + 多选 10题×6分 + 判断 10题×2分 = 120 分（共 30 题）',
    values: { single_count: 10, single_score: 4, multiple_count: 10, multiple_score: 6, judge_count: 10, judge_score: 2, fill_blank_count: 0, fill_blank_score: null, short_answer_count: 0, short_answer_score: null }
  },
  {
    name: '120分·五题型',
    desc: '单选 10×3 + 多选 10×4 + 判断 10×1 + 填空 5×4 + 简答 2×10 = 120 分（共 37 题）',
    values: { single_count: 10, single_score: 3, multiple_count: 10, multiple_score: 4, judge_count: 10, judge_score: 1, fill_blank_count: 5, fill_blank_score: 4, short_answer_count: 2, short_answer_score: 10 }
  },
  {
    name: '120分·精简',
    desc: '单选 10题×4分 + 判断 10题×2分 + 简答 4题×15分 = 120 分（共 24 题）',
    values: { single_count: 10, single_score: 4, multiple_count: 0, multiple_score: null, judge_count: 10, judge_score: 2, fill_blank_count: 0, fill_blank_score: null, short_answer_count: 4, short_answer_score: 15 }
  },
  {
    name: '100分·经典',
    desc: '单选 10×2 + 多选 10×5 + 判断 5×2 + 简答 2×10 = 100 分（共 27 题）',
    values: { single_count: 10, single_score: 2, multiple_count: 10, multiple_score: 5, judge_count: 5, judge_score: 2, fill_blank_count: 0, fill_blank_score: null, short_answer_count: 2, short_answer_score: 10 }
  },
  // 题少分重的轻量版（用户 2026-10-01：“加一个 10、5、5，共 20 题凑 100 分，分值怎么分你来定”）。
  // 名字叫“轻量”：叫“简单”会跟同一个表单里的「难度：简单」选项混淆。
  // 100 分的分法按“难度决定权重”：判断 3 < 单选 5 < 多选 7（10×5 + 5×7 + 5×3 = 100）。
  // 判断题四蒙其二（期望 1.5 分/题）、单选四蒙其一（期望 1.25 分/题），两档全蒙期望共 20 分；
  // 多选错选不得分几乎蒙不到，整卷靠猜远到不了 60 分及格线。三档分值不相等，才能把“只背了概念”和“真的会”拉开
  {
    name: '100分·轻量',
    desc: '单选 10题×5分 + 多选 5题×7分 + 判断 5题×3分 = 100 分（共 20 题，题量少、单题分值高，适合一章一次作业）',
    values: { single_count: 10, single_score: 5, multiple_count: 5, multiple_score: 7, judge_count: 5, judge_score: 3, fill_blank_count: 0, fill_blank_score: null, short_answer_count: 0, short_answer_score: null }
  },
  {
    // 随堂不挂简答题（用户 2026-10-01：“随堂不要有简答题”）：随堂要的是当场交卷当场出分，
    // 简答题得走 AI 判分/老师复核，放在随堂里就是给一节小课挂个延迟；全卷都是客观题。
    // 再加 4 道多选（用户 2026-10-01：“加几个多选题”）：只有单选+判断的卷子考不出“多个概念同时拿准”这种能力。
    // 单选/判断的题量与分值一字未动，只插入多选；总分跟着变成 50，名字按“名实相符”口径同步。
    // 分值阶梯仍保持单调：判断 2 < 单选 4 < 多选 5（多选错选不得分，最难，但随堂卷里不必拉到 100分·轻量那种 5/7 的跨度）
    // 历史：原名「40分·随堂」是算错的（当时实际 50），去简答题后一度是「30分·随堂」
    name: '50分·随堂',
    desc: '单选 5题×4分 + 多选 4题×5分 + 判断 5题×2分 = 50 分（共 14 题，全是客观题，交卷即出分），适合一章一次的课后作业',
    values: { single_count: 5, single_score: 4, multiple_count: 4, multiple_score: 5, judge_count: 5, judge_score: 2, fill_blank_count: 0, fill_blank_score: null, short_answer_count: 0, short_answer_score: null }
  }
]

// 章节作业出题面板的默认题型/分值就取这一条预设（用户 2026-10-01：“出题入池，默认为50分随堂”）。
// 这里导出的是引用而不是把数字重复写一份：以后改上面那条预设，面板默认值自己跟着变，两边不会漂。
// （代价：改了这条预设的名字，面板默认就取不到它了——名字就在上面几行，改的时候顺手对一下）
export const HOMEWORK_PANEL_DEFAULT = SCORE_PRESETS.find(p => p.name === '50分·随堂')

/**
 * 数量 → 分值的双向联动：
 * 有数量且分值空着（或 0，与「已设分值」判定 s > 0 同一口径）→ 补默认分值，
 * 已手填的分值和快捷预设带过来的分值不覆盖；
 * 数量为 0 或清空 → 分值跟着归 0，不在框里留一个不参与出题的无效分数
 * （副作用：数量改 0 再改回来时，原先手填的分值已丢，会重新拿到默认值）
 * @param {object} form 含 xxx_count / xxx_score 的表单对象（原地修改）
 * @param {string} key 题型键，如 single
 * @param {number} count 该题型数量
 */
export function syncScore(form, key, count) {
  const scoreKey = key + '_score'
  if (count > 0) {
    if (!(form[scoreKey] > 0)) {
      form[scoreKey] = DEFAULT_SCORES[key]
    }
  } else {
    form[scoreKey] = 0
  }
}
