<template>
  <!-- 公共组件：选择用户（同名同路径重写，props / 回调契约与旧页一致）
       旧页在课程分配里用：historyList 传已分配的教师，勾选后通过回调回填父表单 -->
  <div class="cu">
    <div class="cu__tool">
      <a-select v-model:value="query.deptId" :options="classOptions" :placeholder="t('请选择班级')"
                allow-clear style="width: 168px" @change="handleQuery" />
      <a-select v-model:value="query.roleKey" :options="roleOptions" :placeholder="t('请选择角色')"
                allow-clear style="width: 148px" @change="handleQuery" />
      <a-input v-model:value="query.nickName" :placeholder="t('请输入姓名或账号')" allow-clear
               style="width: 190px" @press-enter="handleQuery">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-button type="primary" @click="handleQuery">{{ t('查询') }}</a-button>
      <a-button @click="handleReset">{{ t('重置') }}</a-button>
      <span class="cu__spacer" />
      <a-button type="primary" ghost :disabled="!selectedKeys.length" @click="handleBatchSelect">
        {{ t('批量选择') }}<template v-if="selectedKeys.length">（{{ selectedKeys.length }}）</template>
      </a-button>
    </div>

    <a-table :columns="columns" :data-source="rows" :loading="loading" :pagination="false"
             row-key="userId" size="small" :row-selection="rowSelection" :scroll="{ x: 640 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'sex'">
          <span>{{ String(record.sex) === '0' ? t('男') : t('女') }}</span>
        </template>
        <template v-else-if="column.key === 'classes'">
          <span>{{ record.dept?.deptName || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button v-if="isPicked(record)" type="link" size="small" disabled>{{ t('已选择') }}</a-button>
          <a-button v-else type="link" size="small" @click="toChoose(record)">{{ t('选择') }}</a-button>
        </template>
      </template>
    </a-table>

    <div v-if="!loading && !rows.length" class="cu__empty" role="status">
      <div class="cu__empty-t">{{ loadError ? t('用户列表接口没有返回数据') : t('没有匹配的用户') }}</div>
      <div class="cu__empty-d">{{ t('调整班级、角色或姓名后重新查询。') }}</div>
    </div>

    <Pagination :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize"
                @pagination="getList" />
  </div>
</template>

<script setup name="ChooseUserList">
import { ref, reactive, computed, onMounted } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { listUser } from '@/api/system/user.js'
import { listRole } from '@/api/system/role.js'
import { listClasses } from '@/api/system/clazz/teacherStudent'
import Pagination from '@/components/Pagination/index.vue'

const props = defineProps({
  // 已有分配的用户：这些行置灰并显示「已选择」
  historyList: { type: Array, default: () => [] },
  callbackChooseList: { type: Function, default: () => {} },
  callbackChooseOne: { type: Function, default: () => {} }
})

const rows = ref([])
const classList = ref([])
const roleList = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const selectedKeys = ref([])
const selectedRows = ref([])

const query = reactive({
  pageNum: 1, pageSize: 10,
  userName: undefined, status: undefined, deptId: undefined, roleKey: undefined, nickName: undefined
})

const columns = computed(() => [
  { title: t('账号'), dataIndex: 'userName', key: 'userName', width: 150 },
  { title: t('姓名'), dataIndex: 'nickName', key: 'nickName', width: 130 },
  { title: t('性别'), dataIndex: 'sex', key: 'sex', width: 80 },
  { title: t('班级'), dataIndex: 'classes', key: 'classes' },
  { title: t('操作'), key: 'action', width: 92, align: 'center' }
])

const classOptions = computed(() => (classList.value || []).map(c => ({ label: c.deptName, value: c.deptId })))
const roleOptions = computed(() => (roleList.value || []).map(r => ({ label: r.roleName, value: r.roleKey })))

const historyIds = computed(() => (props.historyList || []).map(h => String(h.userId)))
const isPicked = (row) => historyIds.value.includes(String(row.userId))

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys, picked) => { selectedKeys.value = keys; selectedRows.value = picked },
  getCheckboxProps: (record) => ({ disabled: isPicked(record), name: record.nickName })
}))

async function getList() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listUser({ ...query })
    rows.value = (res.rows || []).map(r => ({ ...r, checked: isPicked(r) }))
    total.value = res.total || 0
  } catch (e) {
    rows.value = []; total.value = 0
    loadError.value = t('用户列表接口没有返回数据')
  } finally { loading.value = false }
}

function handleQuery() { query.pageNum = 1; getList() }

function handleReset() {
  query.nickName = undefined
  query.deptId = undefined
  query.roleKey = undefined
  selectedKeys.value = []
  selectedRows.value = []
  handleQuery()
}

function handleBatchSelect() {
  if (!selectedRows.value.length) return
  props.callbackChooseList(selectedRows.value)
  selectedKeys.value = []
  selectedRows.value = []
}

function toChoose(row) {
  row.checked = true
  props.callbackChooseOne(row)
}

async function getClassesList() {
  try { const res = await listClasses({}); classList.value = res.rows || [] } catch (e) { classList.value = [] }
}
async function getRoleList() {
  try { const res = await listRole(); roleList.value = res.rows || [] } catch (e) { roleList.value = [] }
}

onMounted(() => { getList(); getClassesList(); getRoleList() })
</script>

<style scoped>
.cu { display: flex; flex-direction: column; gap: 10px; }

.cu__tool {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  padding: 10px 12px; background: var(--bg-soft);
  border: 1px solid var(--line-3); border-radius: var(--r);
}
.cu__spacer { flex: 1; min-width: 8px; }

.cu__empty { padding: 28px 12px; text-align: center; }
.cu__empty-t { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.cu__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }

:deep(.ant-table-row) { cursor: default; }
</style>
