<template>
  <div class="intro">
    <header class="intro__hd">
      <h2 class="intro__title">{{ opts.title }}</h2>
      <p class="intro__sub">{{ opts.subTitle }}</p>
    </header>
    <ul class="intro__grid">
      <li v-for="(item, i) in opts.features" :key="i" class="intro__card">
        <span class="intro__ico" aria-hidden="true"><component :is="item.icon" /></span>
        <h3 class="intro__name">{{ item.name }}</h3>
        <p class="intro__desc">{{ item.desc }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup name="IntroductionPage">
// 空态引导页：面板没有选中任何章节 / 附件时展示，告诉学生这个面板是干什么的。
// 旧页四种类型（章节 / 文档 / 视频 / 课件）的文案原样保留，只换视觉。
import { computed } from 'vue'
import {
  LinkOutlined, CheckCircleOutlined, HomeOutlined, ProfileOutlined, ReadOutlined,
  PlayCircleOutlined, ClockCircleOutlined, UserSwitchOutlined,
  FileTextOutlined, PictureOutlined, TeamOutlined, UnorderedListOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'

const props = defineProps({
  // 学习类型：chapter / document / video / courseware
  learnType: { type: String, default: '' }
})

const DICT = {
  chapter: {
    title: t('分章体系化在线学习'),
    subTitle: t('按知识脉络拆分的模块化学习单元，循序渐进筑牢学习基础'),
    features: [
      { name: t('章节进度追踪'), desc: t('实时记录每章学习完成度，清晰掌握个人学习节奏'), icon: UnorderedListOutlined },
      { name: t('知识点关联跳转'), desc: t('一键关联前后章节内容，打通完整知识体系链路'), icon: LinkOutlined },
      { name: t('重点难点解析'), desc: t('针对章节核心难点提供专项解读，突破学习瓶颈'), icon: CheckCircleOutlined }
    ]
  },
  document: {
    title: t('探索知识的新维度'),
    subTitle: t('通过精心设计的文档，开启您的学习之旅'),
    features: [
      { name: t('结构化学习'), desc: t('系统化的文档结构，让学习更有条理'), icon: ProfileOutlined },
      { name: t('深度阅读'), desc: t('详细的课程内容，助您深入理解每个知识点'), icon: ReadOutlined },
      { name: t('资源丰富'), desc: t('丰富的学习资料，满足不同学习需求'), icon: HomeOutlined }
    ]
  },
  video: {
    title: t('精品视频课程体系'),
    subTitle: t('专业的视频课程，让学习更轻松、更高效'),
    features: [
      { name: t('高清视频课程'), desc: t('专业录制，清晰流畅的观看体验'), icon: PlayCircleOutlined },
      { name: t('灵活学习时间'), desc: t('随时随地，按自己的节奏学习'), icon: ClockCircleOutlined },
      { name: t('专业讲师指导'), desc: t('经验丰富的讲师团队在线答疑'), icon: UserSwitchOutlined }
    ]
  },
  courseware: {
    title: t('智能备课课件资源'),
    subTitle: t('一站式智能备课工具，轻松打造生动高效的课堂内容'),
    features: [
      { name: t('学科模板库'), desc: t('覆盖全学科的精品课件模板，快速生成规范教学内容'), icon: FileTextOutlined },
      { name: t('多素材融合'), desc: t('一键嵌入动画、习题、音视频资源，让课件内容更鲜活'), icon: PictureOutlined },
      { name: t('云端协同备课'), desc: t('支持同科教师在线协作编辑，共享优质教学思路'), icon: TeamOutlined }
    ]
  }
}

const opts = computed(() => DICT[props.learnType] || { title: '', subTitle: '', features: [] })
</script>

<style scoped>
.intro { padding: 32px 28px 40px; }
.intro__hd { text-align: center; margin-bottom: 28px; }
.intro__title { margin: 0; font-size: 20px; font-weight: 650; color: var(--ink); letter-spacing: -.01em; }
.intro__sub { margin: 8px 0 0; font-size: 13px; color: var(--ink-3); }

.intro__grid {
  list-style: none; margin: 0 auto; padding: 0; max-width: 960px;
  display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.intro__card {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  padding: 20px 18px; text-align: center; box-shadow: var(--sh-1);
  transition: box-shadow .18s ease, border-color .18s ease;
}
.intro__card:hover { box-shadow: var(--sh-2); border-color: var(--line-2); }
.intro__ico {
  display: grid; place-items: center; width: 38px; height: 38px; margin: 0 auto 12px;
  border-radius: var(--r-sm); background: var(--pri-50); color: var(--pri); font-size: 19px;
}
.intro__name { margin: 0 0 6px; font-size: 13.5px; font-weight: 600; color: var(--ink); }
.intro__desc { margin: 0; font-size: 12.5px; line-height: 1.7; color: var(--ink-3); }

@media (max-width: 900px) {
  .intro { padding: 22px 16px 30px; }
}
</style>
