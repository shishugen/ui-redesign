<template>
  <div class="pr">
    <div class="pr__hd">
      <a-input-search v-model:value="searchVal" allow-clear :placeholder="t('搜索章节')" style="width: 220px"
                      @change="handleSearch" @search="handleSearch">
        <template #addonBefore>{{ t('共 {n} 章', { n: flatRows.length }) }}</template>
      </a-input-search>
      <a-button :title="t('展开或折叠全部')" :aria-label="t('展开或折叠全部')" @click="handleExpand">
        <UpOutlined v-if="!forceCollapse" /><DownOutlined v-else />
      </a-button>
      <div class="pr__cur" :title="currChapter.chapterName">
        {{ currNumber }} {{ currChapter.chapterName }}
      </div>
      <div class="pr__tools">
        <a-button size="small" :disabled="currIndex <= 0" @click="toPrevChapter">{{ t('上一节') }}</a-button>
        <a-button size="small" :disabled="currIndex >= chapterMap.size - 1" @click="toNextChapter">{{ t('下一节') }}</a-button>
        <a-button size="small" :loading="loading" @click="getList"><ReloadOutlined />{{ t('刷新') }}</a-button>
      </div>
    </div>

    <div v-if="loadError" class="pr__err" role="alert">
      <span>{{ loadError }}</span>
      <a-button size="small" @click="getList">{{ t('重试') }}</a-button>
    </div>

    <div class="pr__body">
      <div class="pr__left">
        <div v-if="loading" class="pr__hint">{{ t('章节加载中') }}</div>
        <template v-else-if="tree.length">
          <ChapterLearnItem
            v-for="(c, i) in tree" :key="c.chapterId || i" :chapter="c"
            :curr-chapter="currChapter" :chapter-index="String(i + 1)"
            :force-collapse="forceCollapse" :show-chapter-list="showChapterList"
            :call-back-learn-chapter="toLearnChapter"
          />
        </template>
        <div v-else class="pr__hint" role="status">{{ t('暂无章节') }}</div>
      </div>

      <div class="pr__right">
        <div v-if="!currChapter.content" class="pr__hint" role="status">{{ t('暂无章节内容') }}</div>

        <template v-else-if="hasAiHistory">
          <div class="pr__grid">
            <div class="pr__col">
              <div class="pr__ct">{{ t('概述与核心提示词') }}</div>
              <p class="pr__p"><b>{{ t('章节概述') }}</b>：{{ generateObj.overview || '—' }}</p>
              <p class="pr__p"><b>{{ t('核心提示词') }}</b>：{{ generateObj.core_prompt || '—' }}</p>
            </div>
            <div class="pr__col">
              <div class="pr__ct">{{ t('章节内容') }}</div>
              <div class="pr__html" v-html="renderMarkdown(toSubString(currChapter.content, 200))" />
              <a-button type="link" size="small" @click="previewOpen = true">{{ t('查看详细') }}</a-button>
            </div>
            <div class="pr__col">
              <div class="pr__ct">{{ t('AI 辅助开发步骤') }}</div>
              <div class="pr__steps">
                <a-tag v-for="(s, i) in steps" :key="s.key" :color="s.value ? 'green' : 'default'"
                       style="cursor:pointer" @click="toStepDetail(s)">
                  {{ i + 1 }}. {{ t(s.key) }}
                </a-tag>
              </div>
              <template v-if="stepTitle">
                <a-divider>{{ stepTitle }} — {{ t('明细信息') }}</a-divider>
                <div v-if="stepContent" class="pr__html" v-html="renderMarkdown(stepContent)" />
                <div v-else class="pr__hint">{{ t('此步骤暂无操作') }}</div>
              </template>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="pr__ct">{{ t('手动录入章节内容') }}</div>
          <div class="pr__html" v-html="renderMarkdown(currChapter.content)" />
        </template>
      </div>
    </div>

    <a-modal v-model:open="previewOpen" :title="t('内容预览')" :footer="null" width="800px">
      <div class="pr__html" v-html="renderMarkdown(currChapter.content)" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { UpOutlined, DownOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { marked } from 'marked'
import { t } from '@/i18n'
import ChapterLearnItem from './ChapterLearnItem.vue'
import { getChapterByChapterId } from '@/api/apt/courseCreation'
import { getChapter, getSimpleList } from '@/api/course/chapter.js'
import { getUserId } from '@/utils/user'
import { toSubString } from '@/utils/aigc.js'

const props = defineProps({
  courseId: { type: [String, Number], default: '' },
  defaultChapterId: { type: [String, Number], default: '' }
})

// 旧页从全局 proxy.useDict / proxy.handleTree 取值；按 D2 不补兼容层，这里本地实现树组装。
// useDict 的结果在旧页模板里未被使用，本页不引入字典接口。
const userId = ref(getUserId())

const loading = ref(false)
const loadError = ref('')
const searchVal = ref('')
const showChapterList = ref([])
const flatRows = ref([])
const tree = ref([])
const chapterMap = ref(new Map())
const forceCollapse = ref(true)
const currNumber = ref('')
const currChapter = ref({ chapterId: '0', chapterName: '', content: '', parentId: '', level: 0 })
const currIndex = computed(() => chapterMap.value.get(currChapter.value.chapterId) ?? 0)
const previewOpen = ref(false)
const generateObj = ref({})
const stepTitle = ref('')
const stepContent = ref('')
const stepKeys = ['章节概述', '核心提示词', '提示词优化', '优化确认', '内容生成', '配图提示词', '配图生成']
const steps = ref(stepKeys.map(k => ({ key: k, value: '' })))
const hasAiHistory = computed(() => !!(generateObj.value.id && generateObj.value.core_prompt))

function buildTree(rows) {
  const byId = new Map()
  rows.forEach(r => byId.set(String(r.chapterId), { ...r, children: [] }))
  const roots = []
  rows.forEach(r => {
    const node = byId.get(String(r.chapterId))
    const parent = byId.get(String(r.parentId))
    if (parent && String(r.parentId) !== '0' && node !== parent) parent.children.push(node)
    else roots.push(node)
  })
  return roots
}

/** 编号 + 全局顺序下标：与旧页 initIndex 口径一致（有内容或叶子节点才进 chapterMap） */
function initIndex(nodes, prefix = '') {
  nodes.forEach((n, i) => {
    n.number = `${prefix}${i + 1}.`
    if (n.hasContent > 0 || !n.children.length) {
      n.index = chapterMap.value.size
      chapterMap.value.set(n.chapterId, n.index)
    }
    if (n.children.length) initIndex(n.children, n.number)
  })
}

function resetChapter() {
  currChapter.value = { chapterId: '0', chapterName: '', content: '', parentId: '', level: 0 }
  generateObj.value = {}
  steps.value = stepKeys.map(k => ({ key: k, value: '' }))
  stepTitle.value = ''
  stepContent.value = ''
}

async function getAiHistory() {
  try {
    const res = await getChapterByChapterId(currChapter.value.chapterId)
    const d = res?.data
    if (!d) return
    generateObj.value = d
    let starRule = ''
    if (d.role_and_skills) {
      starRule = [
        `${t('角色和技能')}：${d.role_and_skills || ''}`,
        `${t('场景和需求')}：${d.scenario_and_requirements || ''}`,
        `${t('要求和任务')}：${d.requirements_and_tasks || ''}`,
        `${t('约束和限制')}：${d.constraints_and_limitations || ''}`,
        `${t('交付和要求')}：${d.deliverables_and_requirements || ''}`
      ].join('\n')
    }
    const values = [
      d.overview, d.core_prompt, starRule, d.optimized_prompt,
      d.content, d.image_prompt,
      d.image_url ? `<img src="${d.image_url}" />` : ''
    ]
    steps.value = stepKeys.map((k, i) => ({ key: k, value: values[i] || '' }))
  } catch (e) { /* AI 记录为空是正常状态，不伪造内容 */ }
}

async function toLearnChapter(chapterId, number) {
  currNumber.value = number || ''
  resetChapter()
  try {
    const res = await getChapter(chapterId)
    currChapter.value = res?.data || currChapter.value
    await getAiHistory()
  } catch (e) {
    loadError.value = e?.message || t('章节详情接口不可用')
  }
}

function chooseChapter(nodes, index) {
  nodes.forEach(n => {
    if (n.index === index) toLearnChapter(n.chapterId, n.number)
    if (n.children?.length) chooseChapter(n.children, index)
  })
}
function changeChapter(index) {
  if (index < 0 || index >= chapterMap.value.size) return
  chooseChapter(tree.value, index)
}
function toPrevChapter() { changeChapter(currIndex.value - 1) }
function toNextChapter() { changeChapter(currIndex.value + 1) }

function handleSearch() {
  const kw = (searchVal.value || '').trim()
  if (!kw) { showChapterList.value = []; return }
  showChapterList.value = flatRows.value
    .filter(r => String(r.chapterName || '').includes(kw))
    .map(r => r.chapterId)
}
function handleExpand() { forceCollapse.value = !forceCollapse.value }
function toStepDetail(step) { stepTitle.value = t(step.key); stepContent.value = step.value || '' }
function renderMarkdown(content) { return content ? marked(content) : '' }

async function getList() {
  loadError.value = ''
  resetChapter()
  chapterMap.value = new Map()
  loading.value = true
  try {
    const res = await getSimpleList({ courseId: props.courseId, orderByColumn: 'sort', isAsc: 'asc' })
    flatRows.value = res?.rows || []
    tree.value = buildTree(flatRows.value.map(r => ({ ...r })))
    initIndex(tree.value)
    // 默认打开第一个有内容的章节（与旧页 changeChapter(0) 一致）
    const first = props.defaultChapterId || tree.value[0]?.chapterId
    if (first) await toLearnChapter(first, tree.value[0]?.number || '')
    else changeChapter(0)
  } catch (e) {
    loadError.value = e?.message || t('章节列表接口不可用')
  } finally {
    loading.value = false
  }
}

onMounted(getList)
</script>

<style scoped>
.pr { border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; background: var(--panel); }
.pr__hd {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px; border-bottom: 1px solid var(--line-3); background: var(--bg-soft);
}
.pr__cur { font-size: 13px; font-weight: 500; color: var(--ink); flex: 1; min-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pr__tools { display: flex; gap: 6px; flex: none; }
.pr__err {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin: 10px 14px; padding: 8px 12px; border-radius: var(--r-sm);
  border: 1px solid var(--line-2); background: var(--bg); color: var(--ink-2); font-size: 12.5px;
}
.pr__body { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 380px; }
.pr__left { border-right: 1px solid var(--line-3); padding: 8px; overflow-y: auto; max-height: 420px; }
.pr__right { padding: 14px 16px; overflow: auto; max-height: 420px; min-width: 0; }
.pr__hint { font-size: 12.5px; color: var(--ink-4); padding: 24px 8px; text-align: center; }
.pr__grid { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 14px; }
.pr__col { min-width: 0; }
.pr__ct { font-size: 12.5px; font-weight: 500; color: var(--pri-ink); background: var(--pri-50); padding: 6px 10px; border-radius: var(--r-sm); margin-bottom: 10px; }
.pr__p { font-size: 12.5px; line-height: 1.8; color: var(--ink-2); word-break: break-word; }
.pr__steps { display: flex; flex-wrap: wrap; gap: 6px; }
.pr__html { font-size: 12.5px; line-height: 1.8; color: var(--ink-2); overflow-wrap: anywhere; }
.pr__html :deep(img) { max-width: 100%; height: auto; }
.pr__html :deep(pre) { background: var(--bg); padding: 8px; border-radius: var(--r-sm); overflow: auto; }
@media (max-width: 900px) {
  .pr__body { grid-template-columns: 1fr; }
  .pr__left { border-right: 0; border-bottom: 1px solid var(--line-3); max-height: 220px; }
  .pr__grid { grid-template-columns: 1fr; }
}
</style>
