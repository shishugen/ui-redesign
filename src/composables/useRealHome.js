import { t } from '@/i18n'
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import {
  listCourse, listAllClasses, listAllTeachers, listStudents,
  getAvailableModelsWithStatusByUserId, listModel,
  getCurrSchedule, listReport
} from '@/api/home'
import { listNotice, getServer, getDict } from '@/api/system'

/** 从 RuoYi / gpt-api 的各种响应结构里取出列表，不猜具体业务字段 */
export function rowsOf(res) {
  if (Array.isArray(res)) return res
  if (!res || typeof res !== 'object') return []
  const candidates = [res.rows, res.list, res.records, res.data, res.data?.rows, res.data?.list, res.data?.records, res.data?.data]
  for (const c of candidates) if (Array.isArray(c)) return c
  return []
}

export function totalOf(res, rows) {
  const v = res?.total ?? res?.totalCount ?? res?.data?.total ?? (Array.isArray(rows) ? rows.length : null)
  // 接口失败时不能把 null/undefined 当成 0 展示
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function today() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 按真实字典聚合分布：字典里没有的值补在后面，条数为 0 的字典项保留，
 * 这样「某类型还没有课程」也看得见，而不是让面板整块消失。
 */
export function distribution(rows, field, dict) {
  const counts = new Map()
  rows.forEach(r => {
    const v = r?.[field]
    if (v === null || v === undefined || v === '') return
    const k = String(v)
    counts.set(k, (counts.get(k) || 0) + 1)
  })
  const used = new Set()
  const out = (dict || []).map(d => {
    const k = String(d.dictValue)
    used.add(k)
    return { label: d.dictLabel, key: k, count: counts.get(k) || 0 }
  })
  counts.forEach((c, k) => {
    if (!used.has(k)) out.push({ label: k, key: k, count: c })
  })
  return out.sort((a, b) => b.count - a.count)
}

/** 三个角色首页共享同一份真实数据，切换布局不重复打接口 */
let shared = null
export function useRealHome() {
  if (!shared) shared = createRealHome()
  return shared
}

function createRealHome() {
  const session = useSessionStore()
  const loading = ref(false)
  const loaded = ref(false)
  const note = ref('')
  const apiStatus = ref([])

  const courseRows = ref([])
  const scheduleRows = ref([])
  const noticeRows = ref([])
  const modelRows = ref([])
  const classRows = ref([])
  const reportRows = ref([])
  const server = ref(null)
  const dictType = ref([])
  const dictDifficulty = ref([])
  const updatedAt = ref('')
  const stats = ref({
    course: null, case: null, model: null, class: null,
    teacher: null, student: null, schedule: null, report: null, notice: null
  })

  async function reload() {
    loading.value = true
    note.value = ''
    const userId = session.user.userId || ''
    const deptId = session.user.deptId || ''
    const calls = [
      ['课程列表', () => listCourse({ pageNum: 1, pageSize: 10000 }, true)],
      ['课程总数', () => listCourse({ pageNum: 1, pageSize: 1, classify: 0 }, true)],
      ['案例总数', () => listCourse({ pageNum: 1, pageSize: 1, classify: 1 }, true)],
      ['班级列表', () => listAllClasses(true)],
      ['教师列表', () => listAllTeachers(true)],
      ['学员统计', () => listStudents({ pageNum: 1, pageSize: 1 }, true)],
      ['可用模型', () => userId ? getAvailableModelsWithStatusByUserId(userId, true) : Promise.resolve([])],
      ['模型清单', () => listModel({ page: 1, size: 10 }, true)],
      ['个人排课', () => getCurrSchedule({
        scheduleUserId: userId, scheduleType: 2, searchDate: today(),
        orderByColumn: 'a.actual_end_time', isAsc: 'desc'
      }, true)],
      ['实验报告', () => listReport({ pageNum: 1, pageSize: 10 }, true)],
      ['通知公告', () => listNotice({ pageNum: 1, pageSize: 10 }, true)],
      ['服务监控', () => getServer(true)],
      ['课程类型字典', () => getDict('sys_course_type', true)],
      ['课程难度字典', () => getDict('sys_course_difficulty', true)]
    ]
    if (deptId) {
      calls.splice(8, 0, ['班级排课', () => getCurrSchedule({
        classesId: deptId, searchDate: today(),
        orderByColumn: 'a.actual_end_time', isAsc: 'desc'
      }, true)])
    }

    const results = await Promise.allSettled(calls.map(c => c[1]()))
    apiStatus.value = results.map((r, i) => ({
      name: calls[i][0],
      ok: r.status === 'fulfilled',
      msg: r.status === 'rejected' ? (r.reason?.message || t('请求失败')) : ''
    }))
    const idx = name => calls.findIndex(c => c[0] === name)
    const val = name => {
      const i = idx(name)
      return i >= 0 && results[i]?.status === 'fulfilled' ? results[i].value : null
    }
    // 只有接口真正成功时才允许用 rows.length 兜底，失败一律 null（不能把空数组算成 0）
    const totalFrom = (name, rows) => {
      const i = idx(name)
      return i >= 0 && results[i]?.status === 'fulfilled' ? totalOf(results[i].value, rows) : null
    }

    const courseRes = val('课程列表')
    const courseList = rowsOf(courseRes)
    courseRows.value = courseList

    const classRes = val('班级列表')
    const teacherRes = val('教师列表')
    const studentRes = val('学员统计')
    const modelRes = val('可用模型')
    const modelListRes = val('模型清单')
    const reportRes = val('实验报告')
    const noticeRes = val('通知公告')
    const serverRes = val('服务监控')
    dictType.value = rowsOf(val('课程类型字典'))
    dictDifficulty.value = rowsOf(val('课程难度字典'))

    const scheduleRes = [val('班级排课'), val('个人排课')].filter(Boolean)
    const schedules = scheduleRes.flatMap(r => rowsOf(r))
    const seen = new Set()
    scheduleRows.value = schedules.filter(s => {
      const k = s.scheduleId ?? s.id ?? JSON.stringify(s).slice(0, 60)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    noticeRows.value = rowsOf(noticeRes)
    modelRows.value = rowsOf(modelListRes).length ? rowsOf(modelListRes) : rowsOf(modelRes)
    classRows.value = rowsOf(classRes)
    reportRows.value = rowsOf(reportRes)
    server.value = serverRes?.data ?? serverRes ?? null

    stats.value = {
      course: totalFrom('课程总数', courseList),
      case: totalFrom('案例总数', null),
      model: totalFrom('模型清单', modelRows.value) ?? totalFrom('可用模型', rowsOf(modelRes)),
      class: totalFrom('班级列表', classRows.value),
      teacher: totalFrom('教师列表', rowsOf(teacherRes)),
      student: totalFrom('学员统计', null),
      schedule: scheduleRows.value.length || null,
      report: totalFrom('实验报告', reportRows.value),
      notice: totalFrom('通知公告', noticeRows.value)
    }

    const failed = apiStatus.value.filter(s => !s.ok)
    note.value = failed.length
      ? t('{n} 个接口没有返回数据：{names}。页面只展示已成功返回的内容，不补任何演示数字。', { n: failed.length, names: failed.map(f => t(f.name)).join(', ') })
      : ''
    updatedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    loaded.value = true
    loading.value = false
  }

  /** 接口名的成败，用于「接口联通」面板与 KPI 的失败标记 */
  const fail = name => {
    const hit = apiStatus.value.find(a => a.name === name)
    return !!hit && !hit.ok
  }

  const typeDist = computed(() => distribution(courseRows.value, 'type', dictType.value))
  const difficultyDist = computed(() => distribution(courseRows.value, 'difficulty', dictDifficulty.value))
  const onlineCount = computed(() => apiStatus.value.filter(a => a.ok).length)

  return {
    loading, loaded, note, apiStatus, updatedAt, onlineCount,
    courseRows, scheduleRows, noticeRows, modelRows, classRows, reportRows, server,
    dictType, dictDifficulty, typeDist, difficultyDist, stats, fail,
    reload, today: today()
  }
}
