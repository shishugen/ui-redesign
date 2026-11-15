<template>
  <div class="hg">
    <a-row :gutter="12">
      <!-- 左：出题依据与要求 -->
      <a-col :xs="24" :lg="7">
        <a-card :bordered="false" size="small" class="hg__card">
          <template #title>{{ t('本章出题配置') }}</template>
          <a-form layout="vertical" class="hg__form">
            <div class="hg__scroll">
              <a-form-item>
                <template #label>{{ t('出题依据') }}<span class="hg__tip-inline">{{ t('（本章正文自动读取，可再加课件 / 上传文件）') }}</span></template>
                <a-spin :spinning="loading" size="small">
                  <div class="hg__src">
                    <FileTextOutlined class="hg__ico" />
                    <span class="hg__src-name" :title="chapterName">{{ chapterName || t('未命名章节') }}</span>
                    <span class="hg__src-meta">{{ t('正文 {v}', { v: chapter.text ? formatWan(chapter.text.length) : t('无') }) }}</span>
                  </div>
                  <div v-if="ware.text" class="hg__src">
                    <ProfileOutlined class="hg__ico" />
                    <span class="hg__src-name">{{ t('已解析课件 {n} 个', { n: ware.infos.length }) }}</span>
                    <span class="hg__src-meta">{{ formatWan(ware.text.length) }}</span>
                    <a class="hg__link" @click="clearWare">{{ t('去除') }}</a>
                  </div>
                  <div v-if="content" class="hg__src hg__src--sum">
                    <span class="hg__src-name">{{ t('合计喂给模型') }}</span>
                    <span class="hg__src-meta">{{ formatWan(content.length) }}</span>
                    <a-button type="link" size="small" :aria-label="t('预览出题依据')" @click="previewOpen = true">
                      <template #icon><EyeOutlined /></template>
                    </a-button>
                    <a-tooltip :title="compressed ? t('当前已是压缩结果，再点会按现有依据重算') : t('去重、去噪声，不改写原文')">
                      <a-button type="link" size="small" :loading="compressing" :aria-label="t('压缩出题依据')"
                                @click="handleCompress"><template #icon><CompressOutlined /></template></a-button>
                    </a-tooltip>
                    <a v-if="compressed" class="hg__link" @click="compressed = ''">{{ t('撤销压缩') }}</a>
                  </div>
                </a-spin>
                <div v-if="!loading && !content" class="hg__no-src">
                  {{ t('还没有出题依据：本章没正文，也没解析课件或上传文件。可到「章节内容」补正文，或展开下方「更多出题依据」加材料，也可改用「指定知识点」出题。') }}
                </div>
                <div v-else-if="content" class="hg__cut">
                  {{ t('超出 {v} 的部分会被截断', { v: formatWan(docLimit) }) }}{{ compressed ? t('（当前为压缩后的文本）') : '' }}
                </div>
              </a-form-item>

              <a-form-item>
                <template #label>{{ t('更多出题依据') }}<span class="hg__tip-inline">{{ t('（课件 / 附件 / 上传文件，可选）') }}</span></template>
                <a-collapse v-model:activeKey="moreOpen" ghost class="hg__more">
                  <a-collapse-panel key="more" :header="t('选课件 / 附件，或上传本地文件')">
                    <template #extra><span v-if="moreSummary" class="hg__cut">{{ moreSummary }}</span></template>
                    <a-spin :spinning="filesLoading" size="small">
                      <div v-if="!filesLoading && !allFiles.length" class="hg__no-src">
                        {{ t('没找到可解析的本章附件或课程课件（只认 docx / pdf / pptx / txt / md）。') }}
                      </div>
                      <template v-else>
                        <div class="hg__tools">
                          <span class="hg__cut">{{ t('本章附件 {a} 个 / 课程课件 {b} 个', { a: chapterFiles.length, b: wareFiles.length }) }}</span>
                          <a-space :size="6">
                            <a @click="pickBySource(t('本章附件'))">{{ t('选完本章附件') }}</a>
                            <a @click="pickBySource(t('课程课件'))">{{ t('选完课程课件') }}</a>
                            <a @click="picked = []">{{ t('清空') }}</a>
                          </a-space>
                        </div>
                        <a-checkbox-group v-model:value="picked" class="hg__files">
                          <div v-for="f in allFiles" :key="f.fileId" class="hg__file">
                            <a-checkbox :value="f.fileId">
                              <a-tag :color="f.source === t('本章附件') ? 'blue' : 'default'">{{ f.source }}</a-tag>
                              <span class="hg__file-name" :title="f.fileName">{{ f.fileName }}</span>
                              <span class="hg__cut">{{ f.fileSuffix }} · {{ formatSize(f.fileSize) }}</span>
                            </a-checkbox>
                          </div>
                        </a-checkbox-group>
                        <div class="hg__tools">
                          <a-button size="small" type="primary" ghost :loading="parsing" @click="parseSelected">
                            {{ parsing ? t('课件解析中...') : t('解析所选（{n}）', { n: picked.length }) }}
                          </a-button>
                          <span v-if="wareStale" class="hg__warn">{{ t('勾选已改动，需重新解析') }}</span>
                          <span v-else-if="!picked.length" class="hg__cut">{{ t('不选也能出，只按本章正文/知识点出题') }}</span>
                        </div>
                        <div v-if="ware.warning" class="hg__warn">{{ ware.warning }}</div>
                      </template>
                    </a-spin>
                    <div class="hg__tools">
                      <a-upload :before-upload="handleUploadFile" :show-upload-list="false" accept=".docx,.pdf,.txt,.md,.pptx">
                        <a-button size="small" :loading="uploading">
                          <template #icon><UploadOutlined /></template>
                          {{ uploading ? t('文件解析中...') : t('上传文件') }}
                        </a-button>
                      </a-upload>
                      <span class="hg__cut">{{ t('docx / pdf / txt / md / pptx，图片与扫描件自动 OCR；可传多个') }}</span>
                    </div>
                    <div v-for="u in uploads" :key="u.uid" class="hg__src">
                      <FileTextOutlined class="hg__ico" />
                      <span class="hg__src-name" :title="u.filename">{{ u.filename }}</span>
                      <span class="hg__src-meta">{{ formatWan(u.char_count) }}</span>
                      <a-button type="link" size="small" :aria-label="t('移除 {name}', { name: u.filename })"
                                @click="removeUpload(u)"><template #icon><CloseCircleOutlined /></template></a-button>
                    </div>
                    <div v-if="uploadWarning" class="hg__warn">{{ uploadWarning }}</div>
                  </a-collapse-panel>
                </a-collapse>
              </a-form-item>

              <a-form-item :label="t('考点范围')">
                <a-radio-group v-model:value="scope">
                  <a-radio value="chapter">{{ t('整章覆盖') }}</a-radio>
                  <a-radio value="points">{{ t('指定知识点') }}</a-radio>
                </a-radio-group>
                <div v-if="scope === 'points'" class="hg__kp">
                  <a-input-group compact>
                    <a-input v-model:value="kpTopic" :maxlength="200" allow-clear
                             :placeholder="t('知识点方向，例如：Python 数据类型与流程控制')" style="width: calc(100% - 100px)" />
                    <a-select v-model:value="kpMaxItems" style="width: 100px">
                      <a-select-option :value="20">20 {{ t('条') }}</a-select-option>
                      <a-select-option :value="30">30 {{ t('条') }}</a-select-option>
                      <a-select-option :value="50">50 {{ t('条') }}</a-select-option>
                    </a-select>
                  </a-input-group>
                  <a-button size="small" type="primary" ghost block :loading="kpLoading" class="hg__kp-btn" @click="handleExpand">
                    <template #icon><BulbOutlined /></template>
                    {{ kpLoading ? t('AI 扩展中...') : (kpGroups.length ? t('重新扩展知识点') : t('扩展知识点清单')) }}
                  </a-button>
                  <a-alert v-if="kpStale" type="warning" show-icon class="hg__warn"
                           :message="t('知识点方向已改动，下面的清单是旧方向的结果，请重新扩展或清空后再出题')" />
                  <a-alert v-for="(w, i) in kpWarnings" :key="'kw' + i" type="warning" show-icon class="hg__warn" :message="w" />
                  <a-collapse v-if="kpGroups.length" v-model:activeKey="kpActiveKeys" size="small" class="hg__kp-list">
                    <a-collapse-panel v-for="(g, gi) in kpGroups" :key="g.group">
                      <template #header>
                        <span>{{ g.group }}</span>
                        <span class="hg__cut">{{ t('{a}/{b}', { a: g.checked.length, b: g.points.length }) }}</span>
                      </template>
                      <template #extra>
                        <a-space :size="4" @click.stop>
                          <a @click="g.checked = [...g.points]">{{ t('全选') }}</a>
                          <a @click="g.checked = []">{{ t('清空') }}</a>
                        </a-space>
                      </template>
                      <a-checkbox-group v-model:value="g.checked" class="hg__kp-points">
                        <div v-for="p in g.points" :key="p" class="hg__kp-point"><a-checkbox :value="p">{{ p }}</a-checkbox></div>
                      </a-checkbox-group>
                    </a-collapse-panel>
                  </a-collapse>
                  <div v-if="kpGroups.length" class="hg__cut">
                    {{ t('已勾选 {a}/{b} 条，出题只落在勾选项范围内', { a: kpChecked.length, b: kpTotal }) }}
                  </div>
                </div>
              </a-form-item>

              <a-form-item v-if="content" :label="t('内容贴合度')">
                <a-radio-group v-model:value="form.grounding" size="small" button-style="solid">
                  <a-radio-button value="strict">{{ t('严格贴合原文') }}</a-radio-button>
                  <a-radio-button value="balanced">{{ t('以材料为主') }}</a-radio-button>
                  <a-radio-button value="loose">{{ t('仅参考') }}</a-radio-button>
                </a-radio-group>
              </a-form-item>

              <a-form-item :label="t('补充要求（可选）')">
                <a-textarea v-model:value="extra" :rows="2" :maxlength="500"
                            :placeholder="t('例如：只考本章的实操步骤，题目情境贴近学生上机场景')" />
              </a-form-item>

              <a-form-item>
                <template #label>{{ t('题型与分值') }}</template>
                <div class="hg__presets">
                  <span class="hg__cut">{{ t('快捷预设') }}</span>
                  <a-tooltip v-for="p in presets" :key="p.name" :title="t(p.desc)">
                    <a-button size="small" @click="applyPreset(p)">{{ t(p.name) }}</a-button>
                  </a-tooltip>
                </div>
                <div v-for="type in questionTypes" :key="type.key" class="hg__count">
                  <span class="hg__count-label">{{ t(type.label) }}</span>
                  <a-input-number v-model:value="form[type.key + '_count']" :min="0" :max="50" size="small"
                                  :aria-label="t('{name}题数', { name: t(type.label) })" style="width: 64px" />
                  <a-input-number v-model:value="form[type.key + '_score']" :min="0" :max="100" :step="0.5" size="small"
                                  :placeholder="t('均分')" :aria-label="t('{name}每题分值', { name: t(type.label) })"
                                  style="width: 76px" />
                </div>
                <div class="hg__cut">{{ t('共 {n} 道（1~50）', { n: totalCount }) }}；{{ scoreHint }}</div>
              </a-form-item>

              <a-form-item :label="t('难度')">
                <a-select v-model:value="form.difficulty" :options="difficultyOptions" />
              </a-form-item>

              <a-form-item>
                <template #label>{{ t('生成份数') }}<span class="hg__tip-inline">{{ t('（一次最多 {n} 张，挑想要的存进卷池）', { n: MAX_PAPERS }) }}</span></template>
                <a-radio-group v-model:value="paperCount" size="small" button-style="solid">
                  <a-radio-button v-for="n in MAX_PAPERS" :key="n" :value="n">{{ t('{n} 张', { n }) }}</a-radio-button>
                </a-radio-group>
                <div class="hg__cut">{{ t('多张共用同一份依据、分多次请求生成，题目互不相同；单张通常 1~3 分钟') }}</div>
              </a-form-item>
            </div>

            <a-alert v-if="!content && scope === 'chapter'" type="error" show-icon class="hg__block"
                     :message="t('没有出题依据（正文、课件、上传文件都空），无法按整章出题')" />
            <div v-if="formError" class="hg__err" role="alert">{{ formError }}</div>
            <a-button type="primary" block :loading="generating || parsing || loading" @click="handleGenerate">
              <template #icon><ThunderboltOutlined /></template>
              {{ generating ? t('AI 出题中（第 {a}/{b} 张）...', { a: genProgress.current, b: genProgress.total })
                : parsing ? t('课件解析中...') : (paperCount > 1 ? t('生成本章题目（{n} 张）', { n: paperCount }) : t('生成本章题目')) }}
            </a-button>
          </a-form>
        </a-card>
      </a-col>

      <!-- 右：出题结果 -->
      <a-col :xs="24" :lg="17">
        <a-card :bordered="false" size="small" class="hg__card hg__result">
          <template #title>
            <div class="hg__result-hd">
              <span>{{ t('出题结果') }}</span>
              <template v-if="papers.length">
                <span class="hg__cut">
                  {{ t('共 {a} 张 / {b} 题，当前第 {c} 张：{d} 题 / {e} 分',
                    { a: papers.length, b: allQuestionCount, c: activeIdx + 1, d: questions.length, e: totalScore }) }}
                </span>
                <a-button size="small" @click="showAllAnswers = !showAllAnswers">
                  <template #icon><EyeOutlined /></template>{{ showAllAnswers ? t('收起全部答案') : t('显示全部答案') }}
                </a-button>
                <a-button size="small" :loading="generating" @click="confirmRegenerate">
                  <template #icon><ReloadOutlined /></template>{{ t('重新生成') }}
                </a-button>
                <a-button size="small" type="primary" @click="openSaveModal">
                  <template #icon><SaveOutlined /></template>{{ t('存入卷池') }}
                </a-button>
              </template>
            </div>
          </template>

          <div v-if="generating" class="hg__generating" role="status" aria-live="polite">
            <a-spin />
            <div>
              <b>{{ t('AI 正在出第 {a}/{b} 张，本次已用 {s} 秒…', { a: genProgress.current, b: genProgress.total, s: generatingSeconds }) }}</b>
              <p>{{ t('多张依次生成，总耗时按张数叠加。请耐心等待，勿关闭本抽屉。') }}</p>
              <p v-if="generatingSeconds >= 90" class="hg__warn">
                {{ t('当前这张已接近接口超时上限（120 秒）。就算超时，前面已生成的张会保留，还能直接入池。') }}
              </p>
            </div>
          </div>
          <a-skeleton v-if="generating" active :paragraph="{ rows: 5 }" />

          <a-tabs v-if="!generating && papers.length" v-model:activeKey="activeIdx" size="small" class="hg__tabs">
            <a-tab-pane v-for="(p, idx) in papers" :key="idx" :tab="tabLabel(p, idx)">
              <div v-if="p.saved" class="hg__saved">
                {{ t('本张已存入卷池（{name}），重复存入会给卷池多添一张卷；题目要改请关掉本抽屉，在卷池列表里点【编辑题目】', { name: p.savedTitle }) }}
              </div>
              <a-alert v-for="(w, i) in (p.result.warnings || [])" :key="'w' + i" type="warning" show-icon
                       :message="w" class="hg__warn" />
              <QuestionCard v-for="(q, i) in p.result.questions" :key="i" :question="q" :index="i"
                            :show-answer="showAllAnswers" :editable="!p.saved"
                            @edit="openEdit(idx, i)" @remove="handleRemove(idx, i)" />
            </a-tab-pane>
          </a-tabs>

          <div v-if="!generating && !papers.length" class="hg__result-empty" role="status">
            <b>{{ t('还没有生成结果') }}</b>
            <span>{{ t('左边确认出题依据后点「生成本章题目」，AI 生成的题目会显示在这里。') }}</span>
            <span>{{ t('存入卷池后即进入当前作业的卷池，还需回抽屉点【发布作业】学生才抽得到。') }}</span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 依据预览 -->
    <a-modal v-model:open="previewOpen" :title="t('出题依据 - {name}（{v}）', { name: chapterName, v: formatWan(content.length) })"
             width="720px" :footer="null">
      <a-textarea :value="content" :rows="18" readonly class="hg__preview" />
    </a-modal>

    <!-- 存入卷池 -->
    <a-modal v-model:open="saveModal.open" :title="t('保存进作业卷池')" width="760px" :mask-closable="false"
             :confirm-loading="saveModal.submitting" :ok-text="t('存入')" :cancel-text="t('取消')" @ok="handleSavePaper">
      <a-alert type="info" show-icon class="hg__warn" :message="saveTip" />
      <div v-if="saveErrors.length" class="hg__err-sum" role="alert" tabindex="-1">
        <b>{{ t('有 {n} 张试卷需要检查', { n: saveErrors.length }) }}</b>
        <ul><li v-for="(e, i) in saveErrors" :key="i">{{ e }}</li></ul>
      </div>
      <div class="hg__save-row hg__save-hd">
        <span>{{ t('存入') }}</span><span>{{ t('作业名称') }}</span><span>{{ t('题数 / 总分') }}</span><span>{{ t('及格线') }}</span>
      </div>
      <div v-for="(it, idx) in saveModal.items" :key="idx" class="hg__save-row">
        <a-checkbox v-model:checked="it.checked" :disabled="it.saved"
                    :aria-label="t('存入第 {n} 张', { n: idx + 1 })" />
        <a-input v-model:value="it.title" :maxlength="30" size="small" :disabled="it.saved"
                 :placeholder="t('作业名称')" :aria-label="t('第 {n} 张作业名称', { n: idx + 1 })" />
        <span class="hg__save-meta">
          {{ t('{a} 题 / {b} 分', { a: it.count, b: it.score }) }}
          <span v-if="it.saved" class="hg__saved-tag">{{ t('已存入') }}</span>
        </span>
        <a-input-number v-model:value="it.passScore" :min="0" :max="it.score" :step="1" :precision="0"
                        size="small" :disabled="it.saved" :addon-after="t('分')"
                        :aria-label="t('第 {n} 张及格线', { n: idx + 1 })" />
      </div>
    </a-modal>

    <!-- 逐题编辑 -->
    <a-modal v-model:open="editModal.open" :title="editTitle" width="720px" :mask-closable="false"
             :ok-text="t('保存修改')" :cancel-text="t('取消')" @ok="confirmEdit">
      <div v-if="editError" class="hg__err" role="alert">{{ editError }}</div>
      <a-form layout="vertical" class="hg__edit">
        <a-form-item :label="t('题干')">
          <a-textarea v-model:value="editDraft.content" :auto-size="{ minRows: 1, maxRows: 8 }"
                      :placeholder="t('请输入题干')" />
        </a-form-item>
        <a-form-item :label="t('难度')">
          <a-select v-model:value="editDraft.difficulty" :options="difficultyOptions" allow-clear
                    :placeholder="t('未设置')" style="width: 140px" />
        </a-form-item>
        <a-form-item v-if="isChoiceDraft"
                     :label="editDraft.type === 'multiple' ? t('选项与正确答案（勾选，可多选）') : t('选项与正确答案（单选，只能勾一个）')">
          <div v-for="(opt, oi) in editDraft.options" :key="oi" class="hg__opt">
            <span class="hg__letter">{{ letterOf(oi) }}.</span>
            <a-input v-model:value="editDraft.options[oi]" size="small" :placeholder="t('选项内容')" />
            <a-checkbox v-if="editDraft.type === 'multiple'" :checked="editDraft.answer.includes(letterOf(oi))"
                        @change="toggleCorrect(letterOf(oi), false)">{{ t('正确答案') }}</a-checkbox>
            <a-radio v-else :checked="editDraft.answer[0] === letterOf(oi)"
                     @change="toggleCorrect(letterOf(oi), true)">{{ t('正确答案') }}</a-radio>
            <a-button type="link" danger size="small" :disabled="editDraft.options.length <= 2"
                      :aria-label="t('删除选项 {k}', { k: letterOf(oi) })" @click="removeOption(oi)">{{ t('删') }}</a-button>
          </div>
          <a-button size="small" @click="editDraft.options.push('')">{{ t('添加选项') }}</a-button>
        </a-form-item>
        <a-form-item v-else-if="editDraft.type === 'fill_blank'"
                     :label="t('填空答案（每空一行；多个可接受写法用 / 分隔）')">
          <div v-for="(blank, bi) in editDraft.answer" :key="bi" class="hg__opt">
            <span class="hg__letter">{{ t('第 {n} 空', { n: bi + 1 }) }}</span>
            <a-input v-model:value="editDraft.answer[bi]" size="small" :placeholder="t('该空答案')" />
            <a-button type="link" danger size="small" :disabled="editDraft.answer.length <= 1"
                      @click="editDraft.answer.splice(bi, 1)">{{ t('删') }}</a-button>
          </div>
          <a-button size="small" @click="editDraft.answer.push('')">{{ t('添加一空') }}</a-button>
          <div v-if="editDraft.answer.length > 1" class="hg__cut">{{ t('填空按空均分：{v}', { v: blankLadder }) }}</div>
        </a-form-item>
        <a-form-item v-else-if="editDraft.type === 'short_answer'"
                     :label="t('参考答案（一行一个得分要点，可空；AI 判分按要点折算）')">
          <a-textarea v-model:value="editDraft.pointsText" :auto-size="{ minRows: 3, maxRows: 12 }"
                      :placeholder="t('一行一个得分要点')" />
        </a-form-item>
        <a-form-item :label="t('解析')">
          <a-textarea v-model:value="editDraft.explanation" :auto-size="{ minRows: 1, maxRows: 6 }"
                      :placeholder="t('答案解析（可空）')" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, createVNode, markRaw } from 'vue'
import { message, Modal, Empty } from 'ant-design-vue'
import { t } from '@/i18n'
import { EyeOutlined, FileTextOutlined, ProfileOutlined, CompressOutlined, BulbOutlined,
  ThunderboltOutlined, ReloadOutlined, SaveOutlined, UploadOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { getChapter } from '@/api/course/chapter'
import { findListFile } from '@/api/course/file'
import { generateQuestions, compressContent, expandKnowledge, parseCourseFiles, parseFile } from '@/api/apt/questionGen'
import { getQuestionDocLimit } from '@/api/apt/config'
import { saveHomeworkPaper } from '@/api/exam/homework'
import { stripRichText, formatWan, formatSize } from '@/utils/richtext'
import { DEFAULT_SCORES, DEFAULT_DOC_LIMIT, SUPPORTED_FILE_RE, QUESTION_TYPES, SCORE_PRESETS,
  HOMEWORK_PANEL_DEFAULT, syncScore } from '@/views/manager/exam/questionGen/questionDefaults.js'
import QuestionCard from '@/views/manager/exam/questionGen/components/QuestionCard.vue'

const props = defineProps({
  groupId: { type: [String, Number], required: true, default: '' },
  chapterId: { type: [String, Number], required: true, default: '' },
  chapterName: { type: String, default: '' },
  courseName: { type: String, default: '' },
  courseId: { type: [String, Number], default: '' }
})
const emit = defineEmits(['saved'])

const questionTypes = QUESTION_TYPES
const presets = SCORE_PRESETS
const MAX_PAPERS = 5
const HALF_SCORE = 0.5
const FILL_BLANK_RE = /_{3,}/g
const simpleImage = markRaw(Empty.PRESENTED_IMAGE_SIMPLE)

const difficultyOptions = ['1', '2', '3', '4', '5', 'mixed'].map(v => ({
  value: v, label: t({ 1: '容易', 2: '较易', 3: '中等', 4: '较难', 5: '极难', mixed: '混合（梯度分布）' }[v])
}))

// ---------- 出题依据 ----------
const loading = ref(false)
const compressing = ref(false)
const previewOpen = ref(false)
const chapter = reactive({ text: '', maxDocChars: 0 })
const ware = reactive({ text: '', infos: [], warning: '', loadedKey: '' })
const compressed = ref('')
const docLimitConf = ref(null)
const docLimit = computed(() => chapter.maxDocChars || docLimitConf.value || DEFAULT_DOC_LIMIT)

const chapterFiles = ref([])
const wareFiles = ref([])
const filesLoading = ref(false)
const parsing = ref(false)
const picked = ref([])
const allFiles = computed(() => [...chapterFiles.value, ...wareFiles.value])
const selectionKey = computed(() => picked.value.slice().sort().join(','))
const wareStale = computed(() => picked.value.length > 0 && ware.loadedKey !== selectionKey.value)

const uploading = ref(false)
const uploads = ref([])
const uploadWarning = ref('')
let uploadSeq = 0
const uploadText = computed(() => uploads.value.map(u => `【${t('文件')}：${u.filename}】\n${u.text}`).join('\n\n'))
const moreOpen = ref([])
const moreSummary = computed(() => {
  const bits = []
  if (ware.text) bits.push(t('课件 {n} 个', { n: ware.infos.length }))
  if (uploads.value.length) bits.push(t('上传 {n} 个', { n: uploads.value.length }))
  return bits.length ? t('已并入 {v}', { v: bits.join(' / ') }) : ''
})
const content = computed(() => compressed.value || [chapter.text, ware.text, uploadText.value].filter(Boolean).join('\n\n'))

const toPickable = (rows, source) => (rows || []).filter(f => SUPPORTED_FILE_RE.test(f.fileName || '') && f.filePath)
  .map(f => ({
    fileId: f.fileId, fileName: f.fileName, filePath: f.filePath,
    fileSuffix: String(f.fileSuffix || (f.fileName.split('.').pop() || '')).toLowerCase(),
    fileSize: f.fileSize, source
  }))
const pickBySource = (source) => {
  const ids = allFiles.value.filter(f => f.source === source).map(f => f.fileId)
  picked.value = [...picked.value.filter(id => !ids.includes(id)), ...ids]
}

async function loadFiles() {
  if (!props.courseId) return
  filesLoading.value = true
  try {
    const [att, courseware] = await Promise.all([
      findListFile({ courseId: props.courseId, chapterId: props.chapterId, relationType: 1, pageNum: 1, pageSize: 200 }),
      findListFile({ courseId: props.courseId, relationType: 2, pageNum: 1, pageSize: 200 })
    ])
    chapterFiles.value = toPickable(att.rows, t('本章附件'))
    wareFiles.value = toPickable(courseware.rows, t('课程课件'))
  } catch (e) { message.error(t('课件列表读取失败：{v}', { v: e?.message || t('请稍后重试') })) }
  finally { filesLoading.value = false }
}
async function loadChapter() {
  loading.value = true
  try {
    const res = await getChapter(props.chapterId)
    chapter.text = stripRichText(res?.data?.content || '')
  } catch (e) { message.error(t('本章正文读取失败：{v}', { v: e?.message || t('请稍后重试') })) }
  finally { loading.value = false }
  if (!docLimitConf.value) docLimitConf.value = await getQuestionDocLimit()
}
async function parseSelected() {
  const chosen = allFiles.value.filter(f => picked.value.includes(f.fileId))
  if (!chosen.length) { message.warning(t('还没勾选任何课件或附件')); return false }
  parsing.value = true
  try {
    const res = await parseCourseFiles(chosen.map(f => ({ file_path: f.filePath, file_name: f.fileName })))
    if (res.status !== 200 || !res.data) throw new Error(res.message || t('课件解析失败'))
    ware.text = res.data.content || ''
    ware.infos = res.data.files || []
    ware.warning = res.data.warning || ''
    ware.loadedKey = selectionKey.value
    compressed.value = ''
    if (res.data.max_doc_chars) chapter.maxDocChars = res.data.max_doc_chars
    message.success(t('已解析 {n} 个文件／{v}，已并入出题依据', { n: ware.infos.length, v: formatWan(ware.text.length) }))
    return true
  } catch (e) {
    const raw = `${e?.code || ''} ${e?.message || ''}`
    message.error(/timeout|ECONNABORTED|ETIMEDOUT/i.test(raw)
      ? t('课件解析超时：扫描件逐页 OCR 比较耗时，请减少课件数量后重试')
      : t('课件解析失败：{v}', { v: e?.message || t('请稍后重试') }))
    return false
  } finally { parsing.value = false }
}
const clearWare = () => {
  ware.text = ''; ware.infos = []; ware.warning = ''; ware.loadedKey = ''; compressed.value = ''
}
async function handleUploadFile(file) {
  if (!SUPPORTED_FILE_RE.test(file.name)) {
    message.warning(t('仅支持 docx / pdf / txt / md / pptx 格式')); return false
  }
  if (file.size > 200 * 1024 * 1024) { message.warning(t('文件大小不能超过 200MB')); return false }
  uploading.value = true
  try {
    const res = await parseFile(file)
    if (res.status === 200 && res.data) {
      uploadSeq += 1
      uploads.value = [...uploads.value, {
        uid: 'u' + uploadSeq, filename: res.data.filename || file.name,
        text: res.data.content || '', char_count: res.data.char_count || (res.data.content || '').length
      }]
      compressed.value = ''
      uploadWarning.value = res.data.warning || ''
      if (res.data.warning) message.warning(res.data.warning)
      else message.success(t('「{name}」解析成功，共 {v}', { name: res.data.filename, v: formatWan(res.data.char_count) }))
    } else message.error(res.message || t('文档解析失败'))
  } catch (e) { message.error(t('文档解析失败：{v}', { v: e?.message || t('请检查文件格式') })) }
  finally { uploading.value = false }
  return false
}
const removeUpload = (u) => { uploads.value = uploads.value.filter(x => x.uid !== u.uid); compressed.value = ''; uploadWarning.value = '' }
async function handleCompress() {
  if (!content.value) { message.warning(t('没有可压缩的内容')); return }
  compressing.value = true
  try {
    const res = await compressContent(content.value)
    if (res.status === 200 && res.data) {
      compressed.value = res.data.content
      if (res.data.max_doc_chars) chapter.maxDocChars = res.data.max_doc_chars
      if (res.data.still_truncated) message.warning(res.data.message)
      else message.success(res.data.message)
    } else message.error(res.message || t('压缩失败'))
  } catch (e) { message.error(t('压缩失败：{v}', { v: e?.message || t('请稍后重试') })) }
  finally { compressing.value = false }
}

// ---------- 知识点 ----------
const scope = ref('chapter')
const extra = ref('')
const kpTopic = ref(props.chapterName || '')
const kpMaxItems = ref(30)
const kpLoading = ref(false)
const kpGroups = ref([])
const kpActiveKeys = ref([])
const kpWarnings = ref([])
const kpExpandedTopic = ref('')
const kpChecked = computed(() => kpGroups.value.flatMap(g => g.checked))
const kpTotal = computed(() => kpGroups.value.reduce((s, g) => s + g.points.length, 0))
const kpStale = computed(() => kpGroups.value.length > 0 && kpExpandedTopic.value !== kpTopic.value.trim())
async function handleExpand() {
  const topic = kpTopic.value.trim()
  if (!topic) { message.warning(t('请先填写知识点方向（默认就是本章章节名）')); return }
  if (kpLoading.value) return
  kpLoading.value = true
  try {
    const res = await expandKnowledge({ topic, grade_level: null, max_items: kpMaxItems.value })
    if (res.status === 200 && res.data && Array.isArray(res.data.groups) && res.data.groups.length) {
      const prev = new Set(kpChecked.value)
      kpGroups.value = res.data.groups.map(g => ({ group: g.group, points: g.points, checked: g.points.filter(p => prev.has(p)) }))
      kpActiveKeys.value = kpGroups.value.map(g => g.group)
      kpExpandedTopic.value = topic
      kpWarnings.value = res.data.warnings || []
      message.success(t('知识点扩展完成，共 {n} 条', { n: res.data.total_items }))
      if (res.data.total_items < kpMaxItems.value * 0.6) message.warning(t('扩展条数明显少于预期，可把方向说得更具体后重新扩展'))
    } else message.error(res.message || t('知识点扩展失败，请调整方向后重试'))
  } catch (e) {
    const raw = `${e?.code || ''} ${e?.message || ''}`
    message.error(/timeout|ECONNABORTED|ETIMEDOUT/i.test(raw)
      ? t('知识点扩展超时，请减少条数档位或把方向说短些后重试')
      : t('知识点扩展失败：{v}', { v: e?.message || t('请稍后重试') }))
  } finally { kpLoading.value = false }
}

// ---------- 题型与分值 ----------
const form = reactive({ ...(HOMEWORK_PANEL_DEFAULT?.values || {}), difficulty: 'mixed', grounding: 'strict' })
Object.keys(DEFAULT_SCORES).forEach(key => syncScore(form, key, form[key + '_count']))
questionTypes.forEach(type => watch(() => form[type.key + '_count'], val => syncScore(form, type.key, val)))
const applyPreset = (p) => {
  Object.assign(form, p.values)
  Object.keys(DEFAULT_SCORES).forEach(key => syncScore(form, key, form[key + '_count']))
}
const totalCount = computed(() => questionTypes.reduce((s, x) => s + (form[x.key + '_count'] || 0), 0))
const specifiedScore = computed(() => Math.round(questionTypes.reduce((s, x) => {
  const c = form[x.key + '_count'], v = form[x.key + '_score']
  return s + ((c && v) ? c * v : 0)
}, 0) * 10) / 10)
const scoreHint = computed(() => {
  const scores = questionTypes.map(x => form[x.key + '_score'])
  if (!scores.some(s => s > 0)) return t('未设分值时，总分 100 分全部题目均分')
  if (!questionTypes.some(x => form[x.key + '_count'] > 0 && !(form[x.key + '_score'] > 0))) {
    return t('各题型分值均已明确设置，总分为 {n} 分', { n: specifiedScore.value })
  }
  if (specifiedScore.value > 100) return t('已设分值合计 {n} 分，超出 100 分，未设分值的题型将参与全部题目均分', { n: specifiedScore.value })
  return t('已设分值合计 {a} 分，未设分值的题型均分剩余 {b} 分',
    { a: specifiedScore.value, b: Math.round((100 - specifiedScore.value) * 10) / 10 })
})

// ---------- 生成 ----------
const paperCount = ref(5)
const generating = ref(false)
const generatingSeconds = ref(0)
let generatingTimer = null
const genProgress = reactive({ current: 0, total: 1 })
const papers = ref([])
const activeIdx = ref(0)
const showAllAnswers = ref(false)
const formError = ref('')
const active = computed(() => papers.value[activeIdx.value] || null)
const questions = computed(() => active.value?.result.questions || [])
const paperScore = (p) => Math.round((p.result.questions || []).reduce((s, q) => s + (Number(q.score) || 0), 0) * 10) / 10
const totalScore = computed(() => active.value ? paperScore(active.value) : 0)
const allQuestionCount = computed(() => papers.value.reduce((s, p) => s + (p.result.questions || []).length, 0))
const tabLabel = (p, idx) => t('第 {n} 张 · {c} 题', { n: idx + 1, c: p.result.questions.length }) + (p.saved ? t(' · 已存') : '')
watch(generating, val => {
  clearInterval(generatingTimer)
  generatingSeconds.value = 0
  if (val) generatingTimer = setInterval(() => { generatingSeconds.value += 1 }, 1000)
})
onBeforeUnmount(() => clearInterval(generatingTimer))

const buildTopic = () => {
  const bits = [t('章节「{name}」的教学内容', { name: props.chapterName || t('本章') })]
  if (scope.value === 'points' && kpTopic.value.trim()) bits.push(t('重点方向：{v}', { v: kpTopic.value.trim() }))
  if (extra.value.trim()) bits.push(extra.value.trim())
  return bits.join('；')
}
async function handleGenerate() {
  if (generating.value) return
  formError.value = ''
  const fail = (text) => { formError.value = text; message.warning(text) }
  if (scope.value === 'points' && !kpTopic.value.trim()) return fail(t('请先填写知识点方向'))
  if (scope.value === 'points' && kpStale.value) return fail(t('知识点方向已改动，旧清单已失效，请先点「重新扩展」'))
  if (scope.value === 'points' && !kpChecked.value.length) return fail(t('还没有勾选知识点（可先点「扩展知识点清单」再勾选，或改用整章覆盖）'))
  if (!content.value && scope.value === 'chapter') return fail(t('本章正文、课件与上传文件都空，没有出题依据；请先补章节正文、解析课件或上传文件，也可以改用指定知识点'))
  if (picked.value.length && wareStale.value && !(await parseSelected())) return
  if (totalCount.value < 1 || totalCount.value > 50) return fail(t('题目总数必须在 1~50 之间'))

  generating.value = true
  papers.value = []
  activeIdx.value = 0
  showAllAnswers.value = false
  genProgress.total = paperCount.value
  genProgress.current = 0
  const payload = {
    topic: buildTopic(), file_content: content.value || null,
    single_count: form.single_count || 0, multiple_count: form.multiple_count || 0,
    judge_count: form.judge_count || 0, fill_blank_count: form.fill_blank_count || 0,
    short_answer_count: form.short_answer_count || 0,
    difficulty: form.difficulty, grade_level: null, extra_requirement: null,
    single_score: form.single_score || null, multiple_score: form.multiple_score || null,
    judge_score: form.judge_score || null, fill_blank_score: form.fill_blank_score || null,
    short_answer_score: form.short_answer_score || null,
    grounding: content.value ? form.grounding : 'balanced',
    course_name: props.courseName || null,
    knowledge_points: scope.value === 'points' ? kpChecked.value : null
  }
  try {
    for (let i = 0; i < paperCount.value; i++) {
      genProgress.current = i + 1
      const res = await generateQuestions(payload)
      if (res.status !== 200 || !res.data) throw new Error(res.message || t('出题失败，请调整要求后重试'))
      papers.value = [...papers.value, { result: res.data, saved: false, savedTitle: '' }]
    }
    message.success(t('已生成 {n} 张试卷，挑想要的存入卷池即可', { n: papers.value.length }))
  } catch (e) {
    const raw = `${e?.code || ''} ${e?.message || ''}`
    const head = /timeout|ECONNABORTED|ETIMEDOUT/i.test(raw)
      ? t('出题超时：AI 未在规定时间内返回结果，可减少题目数量或压缩出题依据后重试')
      : t('出题失败：{v}', { v: e?.message || t('请稍后重试') })
    message.error(papers.value.length
      ? t('{head}；已生成的 {n} 张已保留，可直接存入卷池', { head, n: papers.value.length }) : head)
  } finally { generating.value = false }
}
const handleRemove = (paperIdx, qIdx) => { papers.value[paperIdx]?.result.questions.splice(qIdx, 1) }
function confirmRegenerate() {
  if (!papers.value.length) { handleGenerate(); return }
  Modal.confirm({
    title: t('重新生成题目？'), icon: createVNode(ExclamationCircleOutlined),
    content: t('当前的 {n} 张结果将被覆盖（已存入卷池的卷不受影响）。', { n: papers.value.length }),
    okText: t('确定'), cancelText: t('取消'),
    onOk: () => { handleGenerate() }
  })
}

// ---------- 逐题编辑 ----------
const editModal = reactive({ open: false, paperIdx: -1, qIdx: -1 })
const editDraft = reactive({ type: '', content: '', options: [], answer: [], pointsText: '', explanation: '', difficulty: undefined })
const editError = ref('')
const isChoiceDraft = computed(() => ['single', 'multiple', 'judge'].includes(editDraft.type))
const editTitle = computed(() => {
  const hit = QUESTION_TYPES.find(x => x.key === editDraft.type)
  return t('编辑第 {n} 题', { n: editModal.qIdx + 1 }) + (hit ? ' · ' + t(hit.label) : '')
})
const currentEditQuestion = () => papers.value[editModal.paperIdx]?.result.questions[editModal.qIdx] || null
const letterOf = (index) => String.fromCharCode(65 + index)
const indexOfLetter = (key) => String(key || '').trim().toUpperCase().charCodeAt(0) - 65
const stripLetter = (opt) => String(opt ?? '').replace(/^\s*[A-Za-z][.、)]\s*/, '')
const fillBlankSlots = (c) => (String(c || '').match(FILL_BLANK_RE) || ['']).length
const blankStepScore = (score, hit, total) => {
  const full = Number(score) || 0
  if (!total) return 0
  const per = Math.ceil(Math.round(full / total * 10000) / 10000 / HALF_SCORE) * HALF_SCORE
  let got = Math.round(per * hit * 100) / 100
  if (hit < total) got = Math.min(got, Math.round((full - HALF_SCORE * (total - hit)) * 100) / 100)
  return Math.min(Math.max(got, 0), full)
}
const blankLadder = computed(() => {
  const total = editDraft.answer.length
  const full = Number(currentEditQuestion()?.score) || 0
  if (total < 2) return ''
  if (total > 5) return t('本题 {n} 分 / {m} 空，对 1 空 {p} 分，全对 {n} 分',
    { n: full, m: total, p: blankStepScore(full, 1, total) })
  return Array.from({ length: total }, (_, i) => t('对 {i} 空 {p} 分', { i: i + 1, p: blankStepScore(full, i + 1, total) })).join('、')
})
const toggleCorrect = (key, single) => {
  const at = editDraft.answer.indexOf(key)
  if (at >= 0) { editDraft.answer.splice(at, 1); return }
  if (single) editDraft.answer.splice(0, editDraft.answer.length, key)
  else editDraft.answer.push(key)
}
const removeOption = (oi) => {
  const removed = letterOf(oi)
  editDraft.options.splice(oi, 1)
  editDraft.answer = editDraft.answer.filter(k => k !== removed)
    .map(k => indexOfLetter(k) > oi ? letterOf(indexOfLetter(k) - 1) : k)
}
function openEdit(paperIdx, qIdx) {
  const p = papers.value[paperIdx]
  if (!p || p.saved) return
  const q = p.result.questions[qIdx]
  if (!q) return
  editModal.paperIdx = paperIdx; editModal.qIdx = qIdx
  editDraft.type = q.type
  editDraft.content = q.content || ''
  const choice = ['single', 'multiple', 'judge'].includes(q.type)
  editDraft.options = choice ? (q.options || []).map(stripLetter) : []
  editDraft.answer = choice ? [...(q.answer || [])].map(k => String(k).trim().toUpperCase())
    : q.type === 'short_answer' ? [] : [...(q.answer || [])].map(k => String(k))
  editDraft.pointsText = q.type === 'short_answer' ? (q.answer || []).join('\n') : ''
  editDraft.explanation = q.explanation || ''
  editDraft.difficulty = q.difficulty == null || q.difficulty === '' ? undefined : String(q.difficulty)
  editError.value = ''
  editModal.open = true
}
function confirmEdit() {
  const q = currentEditQuestion()
  if (!q) { editModal.open = false; return }
  editError.value = ''
  const no = t('第 {n} 题', { n: editModal.qIdx + 1 })
  const fail = (text) => { editError.value = text; message.warning(text) }
  if (!String(editDraft.content).trim()) return fail(t('{no}题干不能为空', { no }))
  if (!(Number(q.score) > 0)) return fail(t('{no}分值还没设好，请先在卡片头部填大于 0 的分值', { no }))
  const choice = isChoiceDraft.value, fill = editDraft.type === 'fill_blank'
  if (choice) {
    if (editDraft.options.length < 2) return fail(t('{no}至少需要 2 个选项', { no }))
    if (editDraft.options.some(o => !String(o || '').trim())) return fail(t('{no}存在空的选项内容', { no }))
    if (!editDraft.answer.length) return fail(t('{no}请勾选正确答案', { no }))
    if (editDraft.type !== 'multiple' && editDraft.answer.length > 1) return fail(t('{no}是单选/判断题，只能有一个正确答案', { no }))
  }
  if (fill) {
    if (editDraft.answer.some(b => !String(b || '').trim())) return fail(t('{no}存在空的填空答案', { no }))
    const slots = fillBlankSlots(editDraft.content)
    if (slots !== editDraft.answer.length) return fail(t('{no}题干有 {a} 个空位，但设了 {b} 个答案，两者数量要对齐', { no, a: slots, b: editDraft.answer.length }))
    const min = Math.round(HALF_SCORE * editDraft.answer.length * 100) / 100
    if (!(Number(q.score) >= min)) return fail(t('{no}有 {b} 个空，分值至少 {m} 分', { no, b: editDraft.answer.length, m: min }))
  }
  q.content = String(editDraft.content)
  q.explanation = editDraft.explanation || ''
  q.difficulty = editDraft.difficulty || ''
  if (choice) { q.options = editDraft.options.map(o => String(o).trim()); q.answer = [...editDraft.answer].sort() }
  else if (fill) q.answer = editDraft.answer.map(b => String(b).trim())
  else if (editDraft.type === 'short_answer') {
    q.answer = String(editDraft.pointsText || '').split('\n').map(l => l.trim()).filter(Boolean)
  }
  editModal.open = false
  message.success(t('{no}已更新，存入时按修改后的题目入库', { no }))
}

// ---------- 存入卷池 ----------
const saveModal = reactive({ open: false, submitting: false, items: [] })
const saveErrors = ref([])
const saveTip = computed(() => t('勾上的 {n} 张将逐张保存为 AI 试卷（默认启用）并归入当前作业的卷池；学生还做不了，需回到章节作业抽屉点【发布作业】排出场次',
  { n: saveModal.items.filter(it => it.checked && !it.saved).length }))
function openSaveModal() {
  if (!papers.value.length) { message.warning(t('没有可保存的题目')); return }
  const multi = papers.value.length > 1
  saveErrors.value = []
  saveModal.items = papers.value.map((p, idx) => {
    const score = paperScore(p)
    return {
      paperIdx: idx, checked: !p.saved, saved: p.saved,
      title: p.savedTitle || `${props.chapterName || t('本章')}-${t('作业')}${multi ? idx + 1 : ''}`.slice(0, 100),
      count: (p.result.questions || []).length,
      score, passScore: Math.floor(score * 0.6)
    }
  })
  saveModal.open = true
}
async function handleSavePaper() {
  const chosen = saveModal.items.filter(it => it.checked && !it.saved)
  saveErrors.value = []
  if (!chosen.length) { message.warning(t('没有勾选要存入的试卷')); return }
  for (const it of chosen) {
    const no = t('第 {n} 张', { n: it.paperIdx + 1 })
    if (!it.count) saveErrors.value.push(t('{no} 没有题目', { no }))
    else if (!String(it.title || '').trim()) saveErrors.value.push(t('{no} 还没填试卷名称', { no }))
    else if (!(Number(it.passScore) > 0)) saveErrors.value.push(t('{no} 的及格分数要大于 0', { no }))
    else if (Number(it.passScore) > it.score) saveErrors.value.push(t('{no} 的及格分数不能高于总分 {s} 分', { no, s: it.score }))
  }
  if (saveErrors.value.length) return

  saveModal.submitting = true
  const savedTitles = [], failed = []
  for (const it of chosen) {
    const p = papers.value[it.paperIdx]
    const payload = {
      title: String(it.title).trim(), passScore: Math.floor(Number(it.passScore) || 0),
      questions: p.result.questions.map(q => ({
        type: q.type, content: q.content, options: q.options || [], answer: q.answer || [],
        explanation: q.explanation || '', difficulty: q.difficulty || '', score: Number(q.score) || 0
      }))
    }
    try {
      const res = await saveHomeworkPaper(props.groupId, payload)
      p.saved = true; it.saved = true; it.checked = false
      it.title = p.savedTitle = res?.data?.title || payload.title
      savedTitles.push(p.savedTitle)
    } catch (e) { failed.push(t('第 {n} 张', { n: it.paperIdx + 1 })) }
  }
  saveModal.submitting = false
  if (savedTitles.length) emit('saved')
  if (!savedTitles.length) message.error(t('全部存入失败，请检查网络与卷池状态后重试'))
  else if (failed.length) message.warning(t('已存入 {n} 张，{v} 存入失败', { n: savedTitles.length, v: failed.join('、') }))
  else { message.success(t('已存入 {n} 张：{v}', { n: savedTitles.length, v: savedTitles.join('、') })); saveModal.open = false }
}

onMounted(() => { loadChapter(); loadFiles() })
</script>

<style scoped>
.hg { padding: 16px; }
.hg__card { border: 1px solid var(--line); border-radius: var(--r); }
.hg__card :deep(.ant-card-head-title) { overflow: visible; white-space: normal; }
.hg__form :deep(.ant-form-item) { margin-bottom: 12px; }
.hg__scroll { max-height: calc(100vh - 320px); overflow-y: auto; padding-right: 4px; }
.hg__tip-inline { font-size: 11px; color: var(--ink-4); font-weight: 400; }
.hg__src { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border: 1px solid var(--line);
  border-radius: var(--r-xs); margin-bottom: 6px; font-size: 12px; }
.hg__src--sum { background: var(--pri-50); border-color: var(--pri-100); }
.hg__ico { color: var(--pri); flex: none; }
.hg__src-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hg__src-meta, .hg__cut { color: var(--ink-4); font-size: 11.5px; flex: none; }
.hg__link { flex: none; }
.hg__no-src, .hg__cut { line-height: 1.6; }
.hg__no-src { padding: 8px; background: var(--warn-soft); border: 1px solid var(--warn-line);
  border-radius: var(--r-xs); color: var(--warn); font-size: 11.5px; }
.hg__tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
.hg__files { display: flex; flex-direction: column; gap: 4px; width: 100%; max-height: 180px; overflow-y: auto; }
.hg__file :deep(.ant-checkbox-wrapper) { display: flex; align-items: center; width: 100%; }
.hg__file-name { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hg__warn { color: var(--warn); font-size: 11.5px; }
.hg__kp { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.hg__kp-btn { margin: 4px 0; }
.hg__kp-list { max-height: 260px; overflow-y: auto; }
.hg__kp-points { display: flex; flex-direction: column; gap: 2px; }
.hg__presets { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
.hg__count { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.hg__count-label { width: 66px; flex: none; font-size: 12px; color: var(--ink-2); }
.hg__block { margin-bottom: 8px; }
.hg__err { margin-bottom: 8px; padding: 6px 8px; border: 1px solid var(--danger-line);
  background: var(--danger-soft); color: var(--danger); border-radius: var(--r-xs); font-size: 12px; }
.hg__result-hd { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hg__generating { display: flex; align-items: flex-start; gap: 16px; padding: 18px; border: 1px solid var(--pri-100);
  background: var(--pri-50); border-radius: var(--r); font-size: 12.5px; color: var(--ink-2); }
.hg__generating p { margin: 6px 0 0; color: var(--ink-3); font-size: 11.5px; }
.hg__saved { padding: 8px 10px; margin-bottom: 8px; border-radius: var(--r-xs);
  background: var(--ok-soft); color: var(--ok); font-size: 12px; }
.hg__result-empty { display: flex; flex-direction: column; gap: 6px; padding: 60px 20px; text-align: center;
  color: var(--ink-3); font-size: 12.5px; }
.hg__result-empty b { color: var(--ink-2); }
.hg__preview { font-family: var(--mono); font-size: 11.5px; }
.hg__err-sum { padding: 10px 14px; margin-bottom: 10px; border: 1px solid var(--danger-line);
  background: var(--danger-soft); color: var(--danger); border-radius: var(--r); font-size: 12.5px; }
.hg__err-sum ul { margin: 6px 0 0; padding-left: 18px; }
.hg__save-row { display: grid; grid-template-columns: 52px 1fr 130px 110px; align-items: center; gap: 8px; margin-bottom: 8px; }
.hg__save-hd { font-size: 11.5px; color: var(--ink-4); }
.hg__save-meta { font-size: 12px; color: var(--ink-3); }
.hg__saved-tag { margin-left: 6px; color: var(--ok); }
.hg__opt { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.hg__opt :deep(.ant-input) { flex: 1; min-width: 0; }
.hg__letter { flex: none; width: 54px; text-align: right; color: var(--ink-3); font-size: 12px; }
.hg__edit :deep(.ant-form-item) { margin-bottom: 10px; }
@media (max-width: 900px) { .hg__scroll { max-height: none; } }
</style>
