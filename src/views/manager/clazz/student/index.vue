<template>
  <div class="sl">

    <!-- 错误态：role=alert 让读屏软件播报，附重试动作 -->
    <div v-if="loadError" class="sl__err" role="alert">
      <span>{{ loadError }}</span>
      <a-button size="small" @click="fetchStudents">{{ t('重试') }}</a-button>
    </div>

    <div class="sl__tool">
      <div class="sl__tool-l">
        <a-button v-if="can(['clazz:student:add'])" type="primary" @click="openAdd">
          <PlusOutlined />{{ t('添加') }}
        </a-button>
        <!-- click 触发：不依赖 hover，键盘/自动化同样可打开（旧页为 hover 触发） -->
        <a-dropdown v-if="can(['clazz:student:import', 'clazz:student:export', 'clazz:student:delete'])" :trigger="['click']">
          <template #overlay>
            <a-menu>
              <a-menu-item v-if="can(['clazz:student:import'])" @click="openImport">
                <UploadOutlined />{{ t('导入') }}
              </a-menu-item>
              <a-menu-item v-if="can(['clazz:student:export'])" :disabled="!selectedKeys.length" @click="exportStudents">
                <DownloadOutlined />{{ exportLoading ? t('导出中...') : t('导出') }}
              </a-menu-item>
              <a-menu-item v-if="can(['clazz:student:delete'])" danger :disabled="!selectedKeys.length" @click="batchDelete">
                <DeleteOutlined />{{ t('批量删除') }}
              </a-menu-item>
            </a-menu>
          </template>
          <a-button>{{ t('更多操作') }}<DownOutlined /></a-button>
        </a-dropdown>
      </div>
      <div class="sl__tool-r">
        <a-select
          v-if="classOptions.length"
          v-model:value="query.deptId"
          :options="classOptions"
          :placeholder="t('请选择班级')"
          allow-clear show-search style="width: 170px"
          @change="changeDeptId"
        />
        <a-input
          v-model:value="query.nickName" :placeholder="t('请输入姓名或账号')"
          allow-clear style="width: 210px" @press-enter="handleSearch"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button type="primary" @click="handleSearch">{{ t('查询') }}</a-button>
        <a-button @click="handleReset"><ReloadOutlined />{{ t('重置') }}</a-button>
      </div>
    </div>

    <!-- 宽表在窄视口横向滚动，不撑破页面 -->
    <div class="sl__table">
      <a-table
        :columns="columns" :data-source="rows" :loading="loading"
        :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }"
        :pagination="false" row-key="userId" size="middle"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === '0' ? 'success' : 'error'">{{ statusText(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'sex'">
            {{ sexText(record.sex) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="8">
              <a-button type="link" size="small" @click="openView(record)">{{ t('查看') }}</a-button>
              <a-button v-if="can(['clazz:student:edit'])" type="link" size="small" @click="openEdit(record)">{{ t('编辑') }}</a-button>
              <a-button v-if="can(['clazz:student:edit'])" type="link" size="small" @click="openResetPwd(record)">{{ t('重置密码') }}</a-button>
              <a-button v-if="can(['clazz:student:delete'])" type="link" danger size="small" @click="deleteOne(record)">{{ t('删除') }}</a-button>
            </a-space>
          </template>
        </template>
        <template #emptyText>
          <div class="sl__empty" role="status">
            <div class="sl__empty-t">{{ loadError ? t('学生列表接口没有返回数据') : t('还没有学生记录') }}</div>
            <div class="sl__empty-d">{{ loadError ? loadError : t('调整查询条件，或先添加一个学生。后端 rows 为空时不填充演示数据。') }}</div>
          </div>
        </template>
      </a-table>
    </div>

    <div class="sl__pager">
      <span>{{ t('共') }} {{ total }} {{ t('条 · 每页') }} {{ query.pageSize }} {{ t('条') }}</span>
      <a-pagination
        :current="query.pageNum" :page-size="query.pageSize" :total="total"
        :show-size-changer="true" :page-size-options="['10', '20', '50']"
        size="small" @change="onPageChange"
      />
    </div>

    <!-- 新增 / 编辑 -->
    <a-modal
      v-model:open="editOpen" :title="isEdit ? t('编辑学生') : t('添加学生')"
      :ok-text="t('确定')" :cancel-text="t('取消')" :confirm-loading="editLoading"
      width="700px" @ok="submitEdit" @cancel="resetEdit"
    >
      <a-form ref="editFormRef" :model="editForm" :rules="editRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="t('班级')" name="deptId">
              <a-select v-model:value="editForm.deptId" :options="classOptions" :placeholder="t('请选择班级')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('账号')" name="userName">
              <a-input v-model:value="editForm.userName" :placeholder="t('请输入学生账号')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('昵称')" name="nickName">
              <a-input v-model:value="editForm.nickName" :placeholder="t('请输入学生昵称')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('邮箱')" name="email">
              <a-input v-model:value="editForm.email" :placeholder="t('请输入邮箱')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('性别')" name="sex">
              <a-select v-model:value="editForm.sex" :options="sexOptions" :placeholder="t('请选择性别')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('学号')" name="userNum">
              <a-input v-model:value="editForm.userNum" :placeholder="t('请输入学生学号')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('手机号')" name="phone">
              <a-input v-model:value="editForm.phone" :placeholder="t('请输入学生手机号')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('状态')" name="status">
              <a-radio-group v-model:value="editForm.status" :options="statusOptions" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 重置密码 -->
    <a-modal
      v-model:open="pwdOpen" :title="t('重置密码')"
      :ok-text="t('确定')" :cancel-text="t('取消')" :confirm-loading="pwdLoading"
      width="420px" @ok="submitResetPwd"
    >
      <a-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" layout="vertical">
        <a-form-item :label="t('新密码')" name="password">
          <a-input-password v-model:value="pwdForm.password" :placeholder="t('请输入新密码')" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 查看 -->
    <a-modal v-model:open="viewOpen" :title="t('查看学生')" :footer="null" width="700px">
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item v-for="f in viewFields" :key="f.k" :label="f.k">{{ f.v }}</a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- 导入 -->
    <a-modal
      v-model:open="upload.open" :title="t('学生导入')"
      :ok-text="t('确定')" :cancel-text="t('取消')" :confirm-loading="upload.isUploading"
      width="480px" @ok="submitImport" @cancel="closeImport"
    >
      <a-upload-dragger
        :file-list="fileList" :before-upload="beforeImportFile" :max-count="1"
        accept=".xls,.xlsx" @remove="onRemoveFile"
      >
        <p class="sl__up-icon"><InboxOutlined /></p>
        <p>{{ t('将文件拖到此处，或点击上传') }}</p>
      </a-upload-dragger>
      <a-checkbox v-model:checked="upload.updateSupport" class="sl__up-check">
        {{ t('是否更新已经存在的用户数据') }}
      </a-checkbox>
      <div class="sl__up-tip">
        {{ t('仅允许导入 xls、xlsx 格式文件。') }}
        <a-button type="link" size="small" @click="downloadTemplate">{{ t('下载模板') }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined, DeleteOutlined, DownOutlined, UploadOutlined, DownloadOutlined,
  InboxOutlined, SearchOutlined, ReloadOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { checkPermi } from '@/utils/permission'
import { isAdmin, isTeacher } from '@/utils/user'
import { getToken } from '@/utils/auth'
import { download } from '@/utils/request'
import {
  listStudents, addStudent, listClasses, editStudent, deleteStudent, exportSelectedStudents
} from '@/api/system/clazz/teacherStudent'
import { findAssignClassesList } from '@/api/course/assign.js'
import { resetUserPwd } from '@/api/system/user'

const session = useSessionStore()

/**
 * 旧页用 v-hasPermi / checkPermi，权限来自 F2 冻结层 utils/permission.js。
 * 补了 A 适配层 utils/user.js 后它可直接用；空权限时 F2 会 console.error，
 * 因此未登录态先短路放行（与 classes 子页 can() 口径一致），登录后走真实权限判定。
 */
const can = keys => {
  if (!(session.permissions || []).length) return true
  return checkPermi(keys)
}

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const exportLoading = ref(false)
const selectedKeys = ref([])
const query = reactive({ pageNum: 1, pageSize: 10, nickName: '', userName: '', deptId: undefined })
const classOptions = ref([])

const columns = computed(() => [
  { title: t('账号'), dataIndex: 'userName', key: 'userName' },
  { title: t('姓名'), dataIndex: 'nickName', key: 'nickName' },
  { title: t('学号'), dataIndex: 'userNum', key: 'userNum' },
  { title: t('状态'), key: 'status', align: 'center', width: 100 },
  { title: t('性别'), key: 'sex', align: 'center', width: 90 },
  { title: t('班级'), dataIndex: ['dept', 'deptName'], key: 'deptName' },
  { title: t('操作'), key: 'action', align: 'right', width: 320 }
])
const sexText = v => (v === '0' ? t('男') : v === '1' ? t('女') : '—')
const statusText = v => (v === '0' ? t('正常') : v === '1' ? t('禁用') : t('未知'))
const sexOptions = computed(() => [{ value: '0', label: t('男') }, { value: '1', label: t('女') }])
const statusOptions = computed(() => [{ value: '0', label: t('正常') }, { value: '1', label: t('禁用') }])

async function fetchStudents() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listStudents(query)
    rows.value = res?.rows || []
    total.value = Number(res?.total) || 0
  } catch (e) {
    rows.value = []
    total.value = 0
    loadError.value = e?.message || t('学生列表接口不可用')
  } finally {
    loading.value = false
  }
}

async function loadClassOptions() {
  try {
    // 管理员看全部班级；教师只看课程分配到的班级（与旧页 hasAdmin / hasTeacher 分支一致）
    const res = isAdmin() ? await listClasses({}) : await findAssignClassesList({})
    const list = res?.rows || []
    classOptions.value = list.map(x => ({ label: x.deptName, value: x.deptId }))
    if (!isAdmin() && list.length) {
      query.deptId = list[0].deptId
    }
  } catch (e) {
    classOptions.value = []
  }
}

function changeDeptId() { query.pageNum = 1; fetchStudents() }
function handleSearch() {
  query.userName = query.nickName
  query.pageNum = 1
  fetchStudents()
}
function handleReset() {
  query.nickName = ''
  query.userName = ''
  query.pageNum = 1
  fetchStudents()
}
function onPageChange(page, pageSize) { query.pageNum = page; query.pageSize = pageSize; fetchStudents() }
function onSelectChange(keys) { selectedKeys.value = keys }

const editOpen = ref(false)
const isEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref(null)
const editForm = ref({})
const editRules = computed(() => ({
  deptId: [{ required: true, message: t('请选择班级'), trigger: 'change' }],
  userName: [{ required: true, message: t('请输入账号'), trigger: 'blur' }],
  nickName: [{ required: true, message: t('请输入昵称'), trigger: 'blur' }],
  sex: [{ required: true, message: t('请选择性别'), trigger: 'change' }]
}))

function openAdd() {
  isEdit.value = false
  editForm.value = {
    deptId: undefined, userNum: '', userName: '', nickName: '',
    email: '', sex: undefined, phone: '', status: '0'
  }
  editOpen.value = true
}
function openEdit(row) { isEdit.value = true; editForm.value = { ...row }; editOpen.value = true }
function resetEdit() { editForm.value = {}; editFormRef.value?.resetFields?.() }
async function submitEdit() {
  try { await editFormRef.value.validate() } catch (e) { return }
  editLoading.value = true
  try {
    if (isEdit.value) await editStudent(editForm.value)
    else await addStudent(editForm.value)
    message.success(t(isEdit.value ? '编辑成功' : '添加成功'))
    editOpen.value = false
    fetchStudents()
  } catch (e) {
    message.error(t(isEdit.value ? '编辑失败' : '添加失败'))
  } finally { editLoading.value = false }
}

const pwdOpen = ref(false)
const pwdLoading = ref(false)
const pwdFormRef = ref(null)
const pwdForm = ref({ userId: '', password: '' })
const pwdRules = computed(() => ({
  password: [{ required: true, message: t('请输入新密码'), trigger: 'blur' }]
}))
function openResetPwd(row) { pwdForm.value = { userId: row.userId, password: '' }; pwdOpen.value = true }
async function submitResetPwd() {
  try { await pwdFormRef.value.validate() } catch (e) { return }
  pwdLoading.value = true
  try {
    await resetUserPwd(pwdForm.value.userId, pwdForm.value.password)
    message.success(t('密码重置成功'))
    pwdOpen.value = false
  } catch (e) { message.error(t('密码重置失败')) } finally { pwdLoading.value = false }
}

const viewOpen = ref(false)
const viewRow = ref({})
const viewFields = computed(() => [
  { k: t('班级'), v: viewRow.value.dept?.deptName || '—' },
  { k: t('账号'), v: viewRow.value.userName || '—' },
  { k: t('昵称'), v: viewRow.value.nickName || '—' },
  { k: t('邮箱'), v: viewRow.value.email || '—' },
  { k: t('性别'), v: sexText(viewRow.value.sex) },
  { k: t('学号'), v: viewRow.value.userNum || '—' },
  { k: t('手机号'), v: viewRow.value.phone || '—' },
  { k: t('创建时间'), v: viewRow.value.createTime || '—' },
  { k: t('状态'), v: statusText(viewRow.value.status) }
])
function openView(row) { viewRow.value = { ...row }; viewOpen.value = true }

function deleteOne(row) {
  Modal.confirm({
    title: t('提示'), content: t('确定要删除该学生吗？'),
    okText: t('确定'), cancelText: t('取消'), okButtonProps: { danger: true },
    onOk: async () => {
      try { await deleteStudent(row.userId); message.success(t('删除成功')); fetchStudents() }
      catch (e) { message.error(t('删除失败')) }
    }
  })
}
function batchDelete() {
  if (!selectedKeys.value.length) { message.warning(t('请选择要删除的学生')); return }
  Modal.confirm({
    title: t('提示'), content: t('确定要删除选中的 {n} 个学生吗？', { n: selectedKeys.value.length }),
    okText: t('确定'), cancelText: t('取消'), okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await deleteStudent(selectedKeys.value.join(','))
        message.success(t('批量删除成功'))
        selectedKeys.value = []
        fetchStudents()
      } catch (e) { message.error(t('批量删除失败')) }
    }
  })
}

async function exportStudents() {
  if (!selectedKeys.value.length) { message.warning(t('请先勾选要导出的学生')); return }
  exportLoading.value = true
  try {
    const blob = await exportSelectedStudents(selectedKeys.value)
    const url = URL.createObjectURL(new Blob([blob]))
    const a = document.createElement('a')
    a.href = url
    a.download = `selected_students_${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    message.success(t('导出成功'))
  } catch (e) { message.error(t('导出失败')) } finally { exportLoading.value = false }
}

const upload = reactive({ open: false, updateSupport: false, isUploading: false })
const fileList = ref([])
const importUrl = `${import.meta.env.VITE_APP_BASE_API}/system/clazz/teacherStudent/importStudentData`

function openImport() { upload.open = true; upload.updateSupport = false; fileList.value = [] }
function closeImport() { upload.open = false; fileList.value = [] }
function onRemoveFile() { fileList.value = [] }
function beforeImportFile(file) {
  const ok = /\.(xls|xlsx)$/i.test(file.name)
  if (!ok) message.error(t('仅允许导入 xls、xlsx 格式文件。'))
  else fileList.value = [file]
  return false
}
function downloadTemplate() {
  download('/system/clazz/teacherStudent/importStudentTemplate', {}, `user_template_${Date.now()}.xlsx`)
}
async function submitImport() {
  if (!fileList.value.length) { message.warning(t('请选择要上传的文件')); return }
  const fd = new FormData()
  fd.append('file', fileList.value[0])
  fd.append('updateSupport', Number(upload.updateSupport))
  upload.isUploading = true
  try {
    const res = await fetch(importUrl, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getToken() },
      body: fd
    }).then(r => r.json())
    if (res.code === 200) {
      message.success(res.msg || t('导入成功'))
      closeImport()
      fetchStudents()
    } else message.error(res.msg || t('导入失败'))
  } catch (e) { message.error(t('导入失败')) } finally { upload.isUploading = false }
}

onMounted(async () => {
  await loadClassOptions()
  fetchStudents()
})
</script>

<style scoped>
.sl {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1); overflow: hidden;
}
.sl__err {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin: 12px 18px 0; padding: 10px 14px; border-radius: var(--r-sm);
  border: 1px solid var(--line-2); background: var(--bg); color: var(--ink-2); font-size: 12.5px;
}
.sl__tool {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
  gap: 12px; padding: 13px 18px; border-bottom: 1px solid var(--line-3); background: var(--bg-soft);
}
.sl__tool-l, .sl__tool-r { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sl__table { overflow-x: auto; }
.sl__empty { padding: 40px 12px; border: 0; background: transparent; }
.sl__empty-t { font-size: 14px; font-weight: 600; color: var(--ink-2); }
.sl__empty-d { font-size: 12px; color: var(--ink-4); margin-top: 8px; line-height: 1.8; }
.sl__pager {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 18px; border-top: 1px solid var(--line-3);
  font-size: 12px; color: var(--ink-4);
}
.sl__up-icon { font-size: 34px; color: var(--pri); margin: 0; }
.sl__up-check { margin-top: 12px; }
.sl__up-tip { font-size: 12px; color: var(--ink-4); margin-top: 8px; }
@media (max-width: 860px) {
  .sl__tool { flex-direction: column; align-items: stretch; }
}
</style>
