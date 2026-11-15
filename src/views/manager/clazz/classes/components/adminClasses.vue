<template>
  <div class="cl">

    <div class="cl__tool">
      <div class="cl__tool-l">
        <a-button v-if="can('clazz:class:add')" type="primary" @click="openAdd">
          <PlusOutlined />{{ t('新增班级') }}
        </a-button>
        <a-button v-if="can('clazz:class:delete')" danger :disabled="!selectedKeys.length" @click="batchDelete">
          <DeleteOutlined />{{ t('批量删除') }}{{ selectedKeys.length ? `（${selectedKeys.length}）` : '' }}
        </a-button>
      </div>
      <div class="cl__tool-r">
        <a-input
          v-model:value="query.deptName" allow-clear :placeholder="t('按班级名称查询')"
          style="width: 220px" @press-enter="handleSearch"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button type="primary" @click="handleSearch">{{ t('查询') }}</a-button>
        <a-button @click="handleReset"><ReloadOutlined />{{ t('重置') }}</a-button>
      </div>
    </div>

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }"
      :pagination="false"
      row-key="deptId"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'deptName'">
          <span class="cl__name">{{ record.deptName || t('（未返回名称）') }}</span>
        </template>
        <template v-else-if="column.key === 'studentCount'">
          <span class="cl__num">{{ record.studentCount ?? '—' }}</span>
        </template>
        <template v-else-if="column.key === 'createTime'">
          <span class="cl__time">{{ record.createTime || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space :size="14">
            <a-button type="link" size="small" @click="openView(record)">{{ t('查看') }}</a-button>
            <a-button type="link" size="small" @click="showStudents(record)">{{ t('学生') }}</a-button>
            <a-button v-if="can('clazz:class:edit')" type="link" size="small" @click="openEdit(record)">{{ t('编辑') }}</a-button>
            <a-button v-if="can('clazz:class:delete')" type="link" danger size="small" @click="deleteOne(record)">{{ t('删除') }}</a-button>
          </a-space>
        </template>
      </template>

      <template #emptyText>
        <div class="empty" style="border:0;background:transparent;margin:0;padding:40px 12px">
          <div class="empty__mark">·</div>
          <div class="empty__t">{{ loadError ? t('班级列表接口没有返回数据') : t('还没有班级记录') }}</div>
          <div class="empty__d">{{ loadError || t('后端 rows 为空 · 不填充演示数据') }}</div>
        </div>
      </template>
    </a-table>

    <div class="cl__pager">
      <span class="cl__pager-t">{{ t('共') }} {{ total }} {{ t('条 · 每页') }} {{ query.pageSize }} {{ t('条') }}</span>
      <a-pagination
        :current="query.pageNum"
        :page-size="query.pageSize"
        :total="total"
        :show-size-changer="true"
        :page-size-options="['10', '20', '50']"
        size="small"
        @change="onPageChange"
      />
    </div>

    <!-- 新增 / 编辑 -->
    <a-modal v-model:open="editOpen" :title="isEdit ? t('编辑班级') : t('新增班级')" :ok-text="t('确定')" :cancel-text="t('取消')"
             :confirm-loading="editLoading" @ok="submitEdit" @cancel="resetEdit" width="460px">
      <a-form ref="editFormRef" :model="editForm" :rules="editRules" layout="vertical">
        <a-form-item :label="t('班级名称')" name="deptName">
          <a-input v-model:value="editForm.deptName" :placeholder="t('例如：2025 级人工智能 1 班')" />
        </a-form-item>
      </a-form>
      <div class="cl__hint">{{ t('其余字段沿用主项目默认值：type=1 / parentId=100 / orderNum=0 / status=0') }}</div>
    </a-modal>

    <!-- 查看：原始字段 -->
    <a-modal v-model:open="viewOpen" :title="t('班级原始字段')" :footer="null" width="580px">
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item v-for="f in viewFields" :key="f.k" :label="f.k">
          <span class="cl__mono">{{ f.v }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- 查看学生 -->
    <a-modal v-model:open="studentOpen" :title="t('{name} · 学生', { name: studentClassName })" :footer="null" width="820px">
      <div v-if="studentError" class="note" style="margin-bottom:12px">{{ studentError }}</div>
      <a-table :columns="studentColumns" :data-source="studentRows" :loading="studentLoading"
               :pagination="false" row-key="userId" size="middle">
        <template #emptyText>
          <div class="empty" style="border:0;background:transparent;margin:0;padding:30px 12px">
            <div class="empty__t">{{ studentError ? t('学生接口没有返回数据') : t('该班级暂无学生') }}</div>
          </div>
        </template>
      </a-table>
      <div class="cl__pager" style="border-top:0;padding-inline:0">
        <span class="cl__pager-t">{{ t('共') }} {{ studentTotal }} {{ t('条') }}</span>
        <a-pagination :current="studentQuery.pageNum" :page-size="studentQuery.pageSize"
                      :total="studentTotal" size="small" @change="onStudentPageChange" />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { useSessionStore } from '@/stores/session'
import { listClasses, listUsersByClass, deleteClass, addDept, updateDept } from '@/api/clazz'

const router = useRouter()
const session = useSessionStore()

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const selectedKeys = ref([])
const query = reactive({ deptName: '', pageNum: 1, pageSize: 10 })

const can = key => {
  const p = session.permissions || []
  if (!p.length) return true
  return p.includes('*:*:*') || p.includes(key)
}

const columns = computed(() => [
  { title: t('班级名称'), dataIndex: 'deptName', key: 'deptName' },
  { title: t('创建人'), dataIndex: 'createBy', key: 'createBy', align: 'center', width: 120 },
  { title: t('创建时间'), dataIndex: 'createTime', key: 'createTime', align: 'center', width: 170 },
  { title: t('学生人数'), dataIndex: 'studentCount', key: 'studentCount', align: 'center', width: 100 },
  { title: t('操作'), key: 'action', align: 'right', width: 220 }
])
const studentColumns = computed(() => [
  { title: t('账号'), dataIndex: 'userName', key: 'userName' },
  { title: t('姓名'), dataIndex: 'nickName', key: 'nickName' },
  { title: t('学号'), dataIndex: 'userNo', key: 'userNo' },
  { title: t('手机号'), dataIndex: 'phone', key: 'phone' },
  { title: t('邮箱'), dataIndex: 'email', key: 'email' }
])

async function fetchClasses() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listClasses(query, true)
    rows.value = (res.rows || []).map(r => {
      const { children, ...rest } = r
      return rest
    })
    total.value = Number(res.total) || 0
  } catch (e) {
    rows.value = []
    total.value = 0
    loadError.value = e?.message || t('班级列表接口不可用（通常需要先登录）')
  } finally {
    loading.value = false
  }
}

function handleSearch() { query.pageNum = 1; fetchClasses() }
function handleReset() { query.deptName = ''; query.pageNum = 1; fetchClasses() }
function onPageChange(page, pageSize) { query.pageNum = page; query.pageSize = pageSize; fetchClasses() }
function onSelectChange(keys) { selectedKeys.value = keys }
function goLogin() { router.push({ path: '/login', query: { redirect: '/clazz' } }) }

const editOpen = ref(false)
const isEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref(null)
const editForm = ref({})
const editRules = { deptName: [{ required: true, message: t('请输入班级名称'), trigger: 'blur' }] }

function openAdd() {
  isEdit.value = false
  editForm.value = { deptName: '', type: 1, orderNum: 0, parentId: 100, status: 0 }
  editOpen.value = true
}
function openEdit(row) { isEdit.value = true; editForm.value = { ...row }; editOpen.value = true }
function resetEdit() { editForm.value = {}; editFormRef.value?.resetFields?.() }
async function submitEdit() {
  try { await editFormRef.value.validate() } catch (e) { return }
  editLoading.value = true
  try {
    if (isEdit.value) await updateDept(editForm.value)
    else await addDept(editForm.value)
    message.success(t(isEdit.value ? '已保存' : '已新增'))
    editOpen.value = false
    fetchClasses()
  } catch (e) { /* 拦截器已提示，不伪造成功 */ } finally { editLoading.value = false }
}

function deleteOne(row) {
  Modal.confirm({
    title: t('删除班级'),
    content: t('确定删除「{name}」吗？该操作不可撤销。', { name: row.deptName || row.deptId }),
    okText: t('删除'), okButtonProps: { danger: true }, cancelText: t('取消'),
    onOk: async () => {
      try { await deleteClass(row.deptId); message.success(t('已删除')); fetchClasses() } catch (e) { /* 拦截器已提示 */ }
    }
  })
}
function batchDelete() {
  Modal.confirm({
    title: t('批量删除'),
    content: t('确定删除选中的 {n} 个班级吗？', { n: selectedKeys.value.length }),
    okText: t('删除'), okButtonProps: { danger: true }, cancelText: t('取消'),
    onOk: async () => {
      try {
        await deleteClass(selectedKeys.value.join(','))
        message.success(t('已删除'))
        selectedKeys.value = []
        fetchClasses()
      } catch (e) { /* 拦截器已提示 */ }
    }
  })
}

const viewOpen = ref(false)
const viewRow = ref({})
const viewFields = computed(() => Object.entries(viewRow.value)
  .filter(([k]) => k !== 'children')
  .map(([k, v]) => ({ k, v: v === '' || v === null || v === undefined ? '—' : String(v) })))
function openView(row) { viewRow.value = { ...row }; viewOpen.value = true }

const studentOpen = ref(false)
const studentRows = ref([])
const studentTotal = ref(0)
const studentLoading = ref(false)
const studentError = ref('')
const studentClassName = ref('')
const studentQuery = reactive({ pageNum: 1, pageSize: 10 })
let currentClassId = null

async function fetchStudents() {
  if (!currentClassId) return
  studentLoading.value = true
  studentError.value = ''
  try {
    const res = await listUsersByClass(currentClassId, studentQuery, true)
    studentRows.value = res.rows || []
    studentTotal.value = Number(res.total) || 0
  } catch (e) {
    studentRows.value = []
    studentTotal.value = 0
    studentError.value = e?.message || t('学生列表接口不可用')
  } finally {
    studentLoading.value = false
  }
}
async function showStudents(row) {
  studentClassName.value = row.deptName || ''
  currentClassId = row.deptId
  studentQuery.pageNum = 1
  await fetchStudents()
  studentOpen.value = true
}
function onStudentPageChange(page) { studentQuery.pageNum = page; fetchStudents() }

onMounted(fetchClasses)
</script>

<style lang="scss" scoped>
.cl {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1); overflow: hidden;
}

.cl__tool {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 13px 18px; border-bottom: 1px solid var(--line-3);
  background: var(--bg-soft);
}
.cl__tool-l { display: flex; align-items: center; gap: 8px; flex: 1 1 auto; min-width: 0; }
.cl__tool-r { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }

.cl__name { font-weight: 550; color: var(--ink); }
.cl__num { font-variant-numeric: tabular-nums; color: var(--ink); }
.cl__time { font-size: 12.5px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.cl__mono { font-family: var(--mono); font-size: 12px; }
.cl__hint { font-size: 11.5px; color: var(--ink-4); line-height: 1.7; }

.cl__pager {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 18px; border-top: 1px solid var(--line-3);
}
.cl__pager-t { font-size: 12px; color: var(--ink-4); }

@media (max-width: 860px) {
  .cl__tool { flex-wrap: wrap; }
  .cl__tool-r { width: 100%; }
  .cl__tool-r :deep(.ant-input-affix-wrapper) { flex: 1; width: auto !important; }
}
@media (max-width: 720px) {
  .cl__tool { flex-direction: column; align-items: stretch; }
  .cl__tool-r :deep(.ant-input-affix-wrapper) { width: 100% !important; }
}
</style>
