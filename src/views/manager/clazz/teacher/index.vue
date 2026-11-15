<template>
  <div class="tl">

    <!-- 错误态：role=alert 让读屏软件播报，附重试动作 -->
    <div v-if="loadError" class="tl__err" role="alert">
      <span>{{ loadError }}</span>
      <a-button size="small" @click="fetchUsers">{{ t('重试') }}</a-button>
    </div>

    <div class="tl__tool">
      <div class="tl__tool-l">
        <a-button v-if="can(['clazz:teacher:add'])" type="primary" @click="openAdd">
          <PlusOutlined />{{ t('添加') }}
        </a-button>
        <a-button v-if="can(['clazz:teacher:delete'])" danger :disabled="!selectedKeys.length" @click="batchDelete">
          <DeleteOutlined />{{ t('批量删除') }}
        </a-button>
      </div>
      <div class="tl__tool-r">
        <a-input
          v-model:value="query.nickName" :placeholder="t('请输入姓名或账号')"
          allow-clear style="width: 220px" @press-enter="handleSearch"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button type="primary" @click="handleSearch">{{ t('查询') }}</a-button>
        <a-button @click="handleReset"><ReloadOutlined />{{ t('重置') }}</a-button>
      </div>
    </div>

    <!-- 宽表在窄视口横向滚动，不撑破页面 -->
    <div class="tl__table">
      <a-table
        :columns="columns" :data-source="rows" :loading="loading"
        :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }"
        :pagination="false" row-key="userId" size="middle"
        :scroll="{ x: 760 }"
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
              <a-button v-if="can(['clazz:teacher:edit'])" type="link" size="small" @click="openEdit(record)">{{ t('编辑') }}</a-button>
              <a-button v-if="can(['clazz:teacher:edit'])" type="link" size="small" @click="openResetPwd(record)">{{ t('重置密码') }}</a-button>
              <a-button v-if="can(['clazz:teacher:delete'])" type="link" danger size="small" @click="deleteOne(record)">{{ t('删除') }}</a-button>
            </a-space>
          </template>
        </template>
        <template #emptyText>
          <div class="tl__empty" role="status">
            <div class="tl__empty-t">{{ loadError ? t('教师列表接口没有返回数据') : t('还没有教师记录') }}</div>
            <div class="tl__empty-d">{{ loadError ? loadError : t('调整查询条件，或先添加一个教师。后端 rows 为空时不填充演示数据。') }}</div>
          </div>
        </template>
      </a-table>
    </div>

    <div class="tl__pager">
      <span>{{ t('共') }} {{ total }} {{ t('条 · 每页') }} {{ query.pageSize }} {{ t('条') }}</span>
      <a-pagination
        :current="query.pageNum" :page-size="query.pageSize" :total="total"
        :show-size-changer="true" :page-size-options="['10', '20', '50']"
        size="small" @change="onPageChange"
      />
    </div>

    <!-- 新增 / 编辑 -->
    <a-modal
      v-model:open="editOpen" :title="isEdit ? t('编辑教师') : t('添加教师')"
      :ok-text="t('确定')" :cancel-text="t('取消')" :confirm-loading="editLoading"
      width="700px" @ok="submitEdit" @cancel="resetEdit"
    >
      <a-form ref="editFormRef" :model="editForm" :rules="editRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="t('账号')" name="userName">
              <a-input v-model:value="editForm.userName" :placeholder="t('请输入教师账号')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('姓名')" name="nickName">
              <a-input v-model:value="editForm.nickName" :placeholder="t('请输入教师姓名')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('手机号')" name="phonenumber">
              <a-input v-model:value="editForm.phonenumber" :placeholder="t('请输入手机号')" />
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
    <a-modal v-model:open="viewOpen" :title="t('查看教师')" :footer="null" width="700px">
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item v-for="f in viewFields" :key="f.k" :label="f.k">{{ f.v }}</a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { checkPermi } from '@/utils/permission'
import { listTeachers, addTeacher, editTeacher, deleteTeacher } from '@/api/system/clazz/teacherStudent'
import { resetUserPwd } from '@/api/system/user'

const session = useSessionStore()

/** 同学生子页：空权限先短路，登录后走 F2 冻结层 checkPermi 的真实口径 */
const can = keys => {
  if (!(session.permissions || []).length) return true
  return checkPermi(keys)
}

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const selectedKeys = ref([])
const query = reactive({ pageNum: 1, pageSize: 10, nickName: '', userName: '' })

const columns = computed(() => [
  { title: t('用户名'), dataIndex: 'userName', key: 'userName' },
  { title: t('姓名'), dataIndex: 'nickName', key: 'nickName' },
  { title: t('状态'), key: 'status', align: 'center' },
  { title: t('性别'), key: 'sex', align: 'center' },
  { title: t('操作'), key: 'action', align: 'right', width: 320 }
])
const sexText = v => (v === '0' ? t('男') : v === '1' ? t('女') : '')
const statusText = v => (v === '0' ? t('正常') : v === '1' ? t('禁用') : t('未知'))
const sexOptions = computed(() => [{ value: '0', label: t('男') }, { value: '1', label: t('女') }])
const statusOptions = computed(() => [{ value: '0', label: t('正常') }, { value: '1', label: t('禁用') }])

async function fetchUsers() {
  loading.value = true
  loadError.value = ''
  try {
    // 旧页把 nickName 同时作为 userName 传给后端，参数口径保持一致
    const params = { ...query, userName: query.nickName }
    const res = await listTeachers(params)
    rows.value = res?.rows || []
    total.value = Number(res?.total) || 0
  } catch (e) {
    rows.value = []
    total.value = 0
    loadError.value = e?.message || t('教师列表接口不可用')
  } finally { loading.value = false }
}

function handleSearch() { query.pageNum = 1; fetchUsers() }
function handleReset() { query.nickName = ''; query.userName = ''; query.pageNum = 1; fetchUsers() }
function onPageChange(page, pageSize) { query.pageNum = page; query.pageSize = pageSize; fetchUsers() }
function onSelectChange(keys) { selectedKeys.value = keys }

const editOpen = ref(false)
const isEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref(null)
const editForm = ref({})
const editRules = computed(() => ({
  userName: [{ required: true, message: t('请输入账号'), trigger: 'blur' }],
  nickName: [{ required: true, message: t('请输入姓名'), trigger: 'blur' }],
  sex: [{ required: true, message: t('请选择性别'), trigger: 'change' }]
}))

function openAdd() {
  isEdit.value = false
  editForm.value = {
    userName: '', nickName: '', phonenumber: '', email: '', sex: undefined, status: '0'
  }
  editOpen.value = true
}
function openEdit(row) { isEdit.value = true; editForm.value = { ...row }; editOpen.value = true }
function resetEdit() { editForm.value = {}; editFormRef.value?.resetFields?.() }
async function submitEdit() {
  try { await editFormRef.value.validate() } catch (e) { return }
  editLoading.value = true
  try {
    if (isEdit.value) await editTeacher(editForm.value)
    else await addTeacher(editForm.value)
    message.success(t(isEdit.value ? '编辑成功' : '添加成功'))
    editOpen.value = false
    fetchUsers()
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
  { k: t('账号'), v: viewRow.value.userName || '—' },
  { k: t('姓名'), v: viewRow.value.nickName || '—' },
  { k: t('手机号'), v: viewRow.value.phonenumber || '—' },
  { k: t('邮箱'), v: viewRow.value.email || '—' },
  { k: t('性别'), v: sexText(viewRow.value.sex) || '—' },
  { k: t('状态'), v: statusText(viewRow.value.status) },
  { k: t('创建时间'), v: viewRow.value.createTime || '—' }
])
function openView(row) { viewRow.value = { ...row }; viewOpen.value = true }

function deleteOne(row) {
  Modal.confirm({
    title: t('提示'), content: t('确定要删除该教师吗？'),
    okText: t('确定'), cancelText: t('取消'), okButtonProps: { danger: true },
    onOk: async () => {
      try { await deleteTeacher(row.userId); message.success(t('删除成功')); fetchUsers() }
      catch (e) { message.error(t('删除失败')) }
    }
  })
}
function batchDelete() {
  Modal.confirm({
    title: t('提示'), content: t('确定要删除选中的教师吗？'),
    okText: t('确定'), cancelText: t('取消'), okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await deleteTeacher(selectedKeys.value.join(','))
        message.success(t('删除成功'))
        selectedKeys.value = []
        fetchUsers()
      } catch (e) { message.error(t('删除失败')) }
    }
  })
}

onMounted(fetchUsers)
</script>

<style scoped>
.tl {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1); overflow: hidden;
}
.tl__err {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin: 12px 18px 0; padding: 10px 14px; border-radius: var(--r-sm);
  border: 1px solid var(--line-2); background: var(--bg); color: var(--ink-2); font-size: 12.5px;
}
.tl__tool {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
  gap: 12px; padding: 13px 18px; border-bottom: 1px solid var(--line-3); background: var(--bg-soft);
}
.tl__tool-l, .tl__tool-r { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tl__table { overflow-x: auto; }
.tl__empty { padding: 40px 12px; border: 0; background: transparent; }
.tl__empty-t { font-size: 14px; font-weight: 600; color: var(--ink-2); }
.tl__empty-d { font-size: 12px; color: var(--ink-4); margin-top: 8px; line-height: 1.8; }
.tl__pager {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 18px; border-top: 1px solid var(--line-3);
  font-size: 12px; color: var(--ink-4);
}
@media (max-width: 860px) {
  .tl__tool { flex-direction: column; align-items: stretch; }
}
</style>
