<template>
  <div class="v2-page kitchen">
    <div class="v2-head">
      <div>
        <h2>{{ t('组件总览 · 一页看全') }}</h2>
        <div class="sub">{{ t('列表、弹窗、提示、添加、删除、下拉等本轮用到的全部控件，全部跑在真实 ant-design-vue 组件与新主题上') }}</div>
      </div>
      <div class="acts">
        <a-button size="small" @click="fireAll">
          <BellOutlined />{{ t('连续弹 4 条提示') }}
        </a-button>
        <a-button size="small" type="primary" @click="openAdd">
          <PlusOutlined />{{ t('新增（弹窗）') }}
        </a-button>
      </div>
    </div>

    <div class="anchors">
      <a href="#sec-btn">{{ t('按钮') }}</a>
      <a href="#sec-form">{{ t('输入 / 下拉') }}</a>
      <a href="#sec-pick">{{ t('选择控件') }}</a>
      <a href="#sec-table">{{ t('列表') }}</a>
      <a href="#sec-modal">{{ t('弹窗') }}</a>
      <a href="#sec-msg">{{ t('提示') }}</a>
      <a href="#sec-show">{{ t('展示') }}</a>
    </div>

    <!-- 按钮 -->
    <section id="sec-btn" class="v2-card">
      <div class="v2-card__hd"><h3>{{ t('按钮 Button') }}</h3><span class="hint">{{ t('一个区域只放一个主按钮') }}</span></div>
      <div class="v2-card__bd">
        <div class="demo-row">
          <span class="demo-label">{{ t('类型') }}</span>
          <a-button type="primary">{{ t('主按钮') }}</a-button>
          <a-button>{{ t('次按钮') }}</a-button>
          <a-button dashed>{{ t('虚线按钮') }}</a-button>
          <a-button type="text">{{ t('文字按钮') }}</a-button>
          <a-button type="link">{{ t('链接按钮') }}</a-button>
          <a-button danger>{{ t('危险按钮') }}</a-button>
          <a-button type="primary" danger>{{ t('危险主按钮') }}</a-button>
        </div>
        <div class="demo-row">
          <span class="demo-label">{{ t('状态与尺寸') }}</span>
          <a-button type="primary" loading>{{ t('提交中') }}</a-button>
          <a-button disabled>{{ t('禁用') }}</a-button>
          <a-button type="primary" disabled>{{ t('禁用主按钮') }}</a-button>
          <a-button size="large" type="primary">{{ t('大号') }}</a-button>
          <a-button size="small">{{ t('小号') }}</a-button>
          <a-button type="primary" size="small"><PlusOutlined />{{ t('新增班级') }}</a-button>
          <a-button size="small" :loading="loading" @click="fakeLoad">{{ t('重新拉取') }}</a-button>
          <a-button shape="circle"><SettingOutlined /></a-button>
        </div>
      </div>
    </section>

    <div class="v2-grid cols-2" style="margin-top:14px">
      <!-- 输入 / 下拉 -->
      <section id="sec-form" class="v2-card" style="margin-top:0">
        <div class="v2-card__hd"><h3>{{ t('输入与下拉') }}</h3><span class="hint">Input / Select</span></div>
        <div class="v2-card__bd">
          <div class="demo-row"><span class="demo-label">{{ t('搜索框（带前缀与清除）') }}</span>
            <a-input v-model:value="keyword" allow-clear :placeholder="t('请输入班级名称')" style="width:240px">
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </div>
          <div class="demo-row"><span class="demo-label">{{ t('普通输入 / 密码 / 数字') }}</span>
            <a-input :placeholder="t('请输入账号')" style="width:150px" />
            <a-input-password :placeholder="t('密码')" style="width:150px" />
            <a-input-number v-model:value="num" :min="1" :max="100" style="width:110px" />
          </div>
          <div class="demo-row"><span class="demo-label">{{ t('多行文本') }}</span>
            <a-textarea v-model:value="remark" :rows="2" :placeholder="t('请输入备注')" show-count :maxlength="60" />
          </div>
          <div class="demo-row"><span class="demo-label">{{ t('下拉：单选 / 可搜索 / 多选 / 禁用') }}</span>
            <a-select v-model:value="type" style="width:140px" :options="typeOptions" />
            <a-select show-search :options="typeOptions" :placeholder="t('可搜索')" style="width:140px" allow-clear />
            <a-select mode="multiple" :options="typeOptions" :placeholder="t('多选')" style="width:170px" :max-tag-count="2" />
            <a-select disabled :value="t('停用项')" style="width:120px" />
          </div>
          <div class="demo-row"><span class="demo-label">{{ t('日期 / 日期区间') }}</span>
            <a-date-picker style="width:150px" />
            <a-range-picker style="width:250px" />
          </div>
          <div class="demo-row"><span class="demo-label">{{ t('上传（不发请求，仅演示）') }}</span>
            <a-upload :before-upload="() => false" :show-upload-list="false">
              <a-button size="small"><UploadOutlined />{{ t('选择文件') }}</a-button>
            </a-upload>
          </div>
        </div>
      </section>

      <!-- 选择控件 -->
      <section id="sec-pick" class="v2-card" style="margin-top:0">
        <div class="v2-card__hd"><h3>{{ t('选择控件') }}</h3><span class="hint">Radio / Checkbox / Switch / Segmented</span></div>
        <div class="v2-card__bd">
          <div class="demo-row"><span class="demo-label">{{ t('单选') }}</span>
            <a-radio-group v-model:value="scope">
              <a-radio value="all">{{ t('全部') }}</a-radio>
              <a-radio value="mine">{{ t('我负责的') }}</a-radio>
              <a-radio value="none" disabled>{{ t('不可选') }}</a-radio>
            </a-radio-group>
          </div>
          <div class="demo-row"><span class="demo-label">{{ t('复选') }}</span>
            <a-checkbox-group v-model:value="flags" :options="flagOptions" />
          </div>
          <div class="demo-row"><span class="demo-label">{{ t('开关 / 滑块 / 评分') }}</span>
            <a-switch v-model:checked="enabled" :checked-children="t('启')" :un-checked-children="t('停')" />
            <a-switch v-model:checked="enabled2" />
            <a-slider v-model:value="level" :style="{ width: '160px' }" />
            <a-rate v-model:value="stars" />
          </div>
          <div class="demo-row"><span class="demo-label">{{ t('分段（原深色按钮组改这个）') }}</span>
            <a-segmented v-model:value="view" :options="[{ label: t('单图'), value: '单图' }, { label: t('对比'), value: '对比' }, { label: t('平铺'), value: '平铺' }]" />
          </div>
          <div class="demo-row"><span class="demo-label">{{ t('行内提示') }}</span>
            <a-tooltip :title="t('鼠标悬停显示说明')">
              <span class="v2-status"><i class="v2-dot" />{{ t('这是什么？') }}</span>
            </a-tooltip>
            <a-badge :count="5"><a-button size="small">{{ t('待办') }}</a-button></a-badge>
            <a-badge status="processing" :text="t('运行中')" />
          </div>
        </div>
      </section>
    </div>

    <!-- 列表 -->
    <section id="sec-table" class="v2-card" style="margin-top:14px">
      <div class="v2-card__hd">
        <h3>{{ t('列表 Table') }}</h3>
        <span class="hint">{{ t('选择列 / 状态标签 / 行内操作 / 分页 / 空态') }}</span>
        <a class="more" @click="toggleEmpty">{{ rows.length ? t('切换空数据') : t('切回数据') }}</a>
      </div>

      <div class="v2-toolbar">
        <a-button type="primary" size="small" @click="openAdd"><PlusOutlined />{{ t('新增') }}</a-button>
        <a-button danger size="small" :disabled="!selected.length" @click="batchDelete">
          <DeleteOutlined />{{ t('批量删除') }}{{ selected.length ? `（${selected.length}）` : '' }}
        </a-button>
        <span style="font-size:11.5px;color:var(--c-muted)">{{ t('已选') }} {{ selected.length }} {{ t('项') }}</span>
        <span class="right">
          <a-input v-model:value="search" size="small" allow-clear :placeholder="t('搜索名称')" style="width:180px">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-button size="small" @click="message.info(t('已重置查询条件'))">{{ t('重置') }}</a-button>
        </span>
      </div>

      <a-table
        :columns="columns"
        :data-source="filtered"
        :loading="loading"
        :row-selection="{ selectedRowKeys: selected, onChange: k => selected = k }"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="name-cell"><a>{{ record.name }}</a></span>
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="v2-status">
              <i class="v2-dot" :class="{ off: record.status !== 1 }" />{{ record.status === 1 ? t('正常') : t('停用') }}
            </span>
          </template>
          <template v-else-if="column.key === 'count'">
            <span class="num">{{ record.count }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="2">
              <a-button type="link" size="small" @click="openView(record)">{{ t('查看') }}</a-button>
              <a-button type="link" size="small" @click="openEdit(record)">{{ t('编辑') }}</a-button>
              <a-popconfirm :title="t('确定删除这条记录？')" :ok-text="t('删除')" :cancel-text="t('取消')" @confirm="remove(record)">
                <a-button type="link" size="small" danger>{{ t('删除') }}</a-button>
              </a-popconfirm>
              <a-dropdown :trigger="['click']">
                <a-button type="link" size="small"><MoreOutlined /></a-button>
                <template #overlay>
                  <a-menu @click="({ key }) => onRowMore(key, record)">
                    <a-menu-item key="student">{{ t('查看学生') }}</a-menu-item>
                    <a-menu-item key="copy">{{ t('复制名称') }}</a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="del" danger>{{ t('删除') }}</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </template>
        <template #emptyText>
          <a-empty :image="simpleImage" :description="t('暂无数据 · 后端返回 rows 为空时不填充演示数据')" />
        </template>
      </a-table>

      <div class="table-foot">
        <span>{{ t('共') }} {{ filtered.length }} {{ t('条') }}</span>
        <a-pagination :current="1" :page-size="10" :total="filtered.length" size="small" show-size-changer :page-size-options="['10', '20', '50']" />
      </div>
    </section>

    <!-- 弹窗 -->
    <section id="sec-modal" class="v2-card" style="margin-top:14px">
      <div class="v2-card__hd"><h3>{{ t('弹窗与确认') }}</h3><span class="hint">Modal / Drawer / Popconfirm</span></div>
      <div class="v2-card__bd">
        <div class="demo-row">
          <a-button type="primary" @click="openAdd">{{ t('新增弹窗（表单）') }}</a-button>
          <a-button @click="openEdit(rows[0])">{{ t('编辑弹窗（回填）') }}</a-button>
          <a-button @click="openView(rows[0])">{{ t('查看抽屉') }}</a-button>
          <a-button danger @click="confirmDelete">{{ t('删除确认（Modal.confirm）') }}</a-button>
          <a-popconfirm :title="t('这是 Popconfirm 二次确认')" :ok-text="t('确定')" :cancel-text="t('取消')" @confirm="message.success(t('已确认'))">
            <a-button>{{ t('气泡确认') }}</a-button>
          </a-popconfirm>
          <a-button @click="infoModal">{{ t('信息提示弹窗') }}</a-button>
        </div>
        <div class="v2-note" style="margin-top:12px">
          <b>{{ t('约定：') }}</b>{{ t('写操作按钮走') }} <code>Modal.confirm</code>{{ t('；行内删除走') }} <code>Popconfirm</code>{{ t('；查看类走') }} <code>Drawer</code> {{ t('不打断列表。') }}
        </div>
      </div>
    </section>

    <!-- 提示 -->
    <section id="sec-msg" class="v2-card" style="margin-top:14px">
      <div class="v2-card__hd"><h3>{{ t('提示反馈') }}</h3><span class="hint">message / notification / Alert</span></div>
      <div class="v2-card__bd">
        <div class="demo-row">
          <span class="demo-label">{{ t('message（顶部轻提示，已下移到顶栏下方）') }}</span>
          <a-button size="small" @click="message.success(t('保存成功'))">{{ t('成功') }}</a-button>
          <a-button size="small" @click="message.error(t('接口返回 500，请稍后重试'))">{{ t('错误') }}</a-button>
          <a-button size="small" @click="message.warning(t('该班级下还有学生，无法删除'))">{{ t('警告') }}</a-button>
          <a-button size="small" @click="message.info(t('已切换到实训端'))">{{ t('信息') }}</a-button>
          <a-button size="small" @click="loadingMsg">{{ t('加载中') }}</a-button>
        </div>
        <div class="demo-row">
          <span class="demo-label">{{ t('notification（右上角通知）') }}</span>
          <a-button size="small" @click="notify('success')">{{ t('成功通知') }}</a-button>
          <a-button size="small" @click="notify('info')">{{ t('普通通知') }}</a-button>
          <a-button size="small" @click="notify('error')">{{ t('失败通知') }}</a-button>
        </div>
        <div class="demo-row" style="display:block">
          <span class="demo-label" style="display:block;margin-bottom:8px">{{ t('Alert 四种') }}</span>
          <a-space direction="vertical" style="width:100%">
            <a-alert type="info" :message="t('信息提示：本轮只改样式层，不动接口与权限逻辑')" show-icon closable />
            <a-alert type="success" :message="t('成功：12 个接口全部返回 200')" show-icon />
            <a-alert type="warning" :message="t('警告：/gpt-api/models 返回 401，AI 服务独立鉴权')" show-icon />
            <a-alert type="error" :message="t('错误：班级列表接口未返回数据，页面不填充假行')" show-icon />
          </a-space>
        </div>
      </div>
    </section>

    <!-- 展示 -->
    <section id="sec-show" class="v2-card" style="margin-top:14px">
      <div class="v2-card__hd"><h3>{{ t('展示类') }}</h3><span class="hint">KPI / Tag / Progress / Tabs / Steps / Timeline</span></div>
      <div class="v2-card__bd">
        <div class="v2-grid cols-3" style="margin-bottom:14px">
          <div class="v2-kpi">
            <div class="v2-kpi__top"><span class="v2-kpi__ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10l2 2h6.5A1.5 1.5 0 0 1 20 7.5v11A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z"/></svg></span><span class="v2-kpi__lab">{{ t('课程总数') }}</span></div>
            <div class="v2-kpi__val">128<small>{{ t('门') }}</small></div>
            <div class="v2-kpi__src">course/list · classify=0</div>
          </div>
          <div class="v2-kpi">
            <div class="v2-kpi__top"><span class="v2-kpi__ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/></svg></span><span class="v2-kpi__lab">{{ t('学员人数') }}</span></div>
            <div class="v2-kpi__val">1,286<small>{{ t('人') }}</small></div>
            <div class="v2-kpi__src">listStudents</div>
          </div>
          <div class="v2-kpi">
            <div class="v2-kpi__top"><span class="v2-kpi__ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19V5m0 14h16M8 15V9m4 6V7m4 8v-4"/></svg></span><span class="v2-kpi__lab">{{ t('案例总数') }}</span></div>
            <div class="v2-kpi__val">46<small>{{ t('个') }}</small></div>
            <div class="v2-kpi__src">course/list · classify=1</div>
          </div>
        </div>

        <div class="demo-row"><span class="demo-label">{{ t('标签 Tag') }}</span>
          <a-tag color="blue">{{ t('进行中') }}</a-tag>
          <a-tag color="green">{{ t('正常') }}</a-tag>
          <a-tag color="orange">{{ t('待审核') }}</a-tag>
          <a-tag color="red">{{ t('已停用') }}</a-tag>
          <a-tag>{{ t('默认') }}</a-tag>
          <span class="v2-pill pri">{{ t('管理端') }}</span>
          <span class="v2-pill ok"><i class="v2-dot" />{{ t('在线') }}</span>
          <span class="v2-pill wa"><i class="v2-dot wa" />{{ t('待处理') }}</span>
        </div>

        <div class="demo-row" style="display:block">
          <span class="demo-label">{{ t('进度') }}</span>
          <div class="progress-grid">
            <div class="pitem"><span class="pl">{{ t('课程完成度') }}</span><a-progress :percent="62" size="small" /></div>
            <div class="pitem"><span class="pl">{{ t('实验提交率') }}</span><a-progress :percent="84" size="small" status="active" /></div>
            <div class="pitem"><span class="pl">{{ t('成绩归档') }}</span><a-progress :percent="100" size="small" /></div>
            <div class="pitem"><span class="pl">{{ t('接口成功率') }}</span><a-progress :percent="46" size="small" status="exception" /></div>
          </div>
          <div style="margin-top:10px;display:flex;align-items:center;gap:14px">
            <span class="pl" style="width:auto">{{ t('环形') }}</span>
            <a-progress type="circle" :percent="72" :size="54" />
            <a-progress type="circle" :percent="100" :size="54" />
            <a-progress type="circle" :percent="30" :size="54" status="exception" />
          </div>
        </div>

        <div class="demo-row" style="display:block">
          <span class="demo-label">{{ t('步骤条') }}</span>
          <a-steps :current="1" size="small" :items="stepItems" />
        </div>

        <div class="demo-row" style="display:block;margin-top:8px">
          <span class="demo-label">{{ t('时间线 / 标签页') }}</span>
          <div class="v2-grid cols-2">
            <a-timeline style="padding-top:4px">
              <a-timeline-item color="green">{{ t('管理员创建班级 · 11-13 09:12') }}</a-timeline-item>
              <a-timeline-item color="blue">{{ t('教师导入 42 名学生 · 11-13 10:04') }}</a-timeline-item>
              <a-timeline-item>{{ t('系统同步模型列表 · 11-13 10:30') }}</a-timeline-item>
            </a-timeline>
            <a-tabs size="small">
              <a-tab-pane key="1" :tab="t('基本信息')"><div class="tab-body">{{ t('课程名称、学分、负责教师') }}</div></a-tab-pane>
              <a-tab-pane key="2" :tab="t('实训配置')"><div class="tab-body">{{ t('环境镜像、GPU 配额、开放时段') }}</div></a-tab-pane>
              <a-tab-pane key="3" :tab="t('考核')"><div class="tab-body">{{ t('平时成绩、实验报告、期末机考') }}</div></a-tab-pane>
            </a-tabs>
          </div>
        </div>

        <div class="demo-row" style="display:block;margin-top:8px">
          <span class="demo-label">{{ t('折叠面板') }}</span>
          <a-collapse :bordered="false" size="small" :default-active-key="['1']">
            <a-collapse-panel key="1" :header="t('为什么字段显示「—」？')">{{ t('接口没返回就不编造，保持空值占位。') }}</a-collapse-panel>
            <a-collapse-panel key="2" :header="t('按钮为什么有时不显示？')">{{ t('按后端 permissions 显隐，不是前端写死。') }}</a-collapse-panel>
          </a-collapse>
        </div>

        <a-descriptions size="small" bordered :column="3" style="margin-top:14px" :title="t('描述列表（查看详情用）')">
          <a-descriptions-item :label="t('班级名称')">{{ t('2025 级计算机科学与技术 1 班') }}</a-descriptions-item>
          <a-descriptions-item :label="t('学生数')">42</a-descriptions-item>
          <a-descriptions-item :label="t('状态')">{{ t('正常') }}</a-descriptions-item>
          <a-descriptions-item :label="t('创建时间')">2025-09-01 09:12</a-descriptions-item>
          <a-descriptions-item label="deptId">203</a-descriptions-item>
          <a-descriptions-item label="parentId">100</a-descriptions-item>
        </a-descriptions>
      </div>
    </section>

    <!-- 新增 / 编辑弹窗 -->
    <a-modal
      v-model:open="editOpen"
      :title="isEdit ? t('编辑班级') : t('新增班级')"
      :ok-text="t('确定')"
      :cancel-text="t('取消')"
      :confirm-loading="saving"
      @ok="submit"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item :label="t('班级名称')" name="name">
          <a-input v-model:value="form.name" :placeholder="t('请输入班级名称')" />
        </a-form-item>
        <div class="v2-grid cols-2" style="gap:0 12px">
          <a-form-item :label="t('类型')" name="type">
            <a-select v-model:value="form.type" :options="typeOptions" />
          </a-form-item>
          <a-form-item :label="t('学生数')" name="count">
            <a-input-number v-model:value="form.count" :min="0" :max="200" style="width:100%" />
          </a-form-item>
        </div>
        <a-form-item :label="t('状态')" name="status">
          <a-radio-group v-model:value="form.status">
            <a-radio :value="1">{{ t('正常') }}</a-radio>
            <a-radio :value="0">{{ t('停用') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="t('备注')" name="remark">
          <a-textarea v-model:value="form.remark" :rows="2" :placeholder="t('选填')" />
        </a-form-item>
        <div class="v2-note">{{ t('这是表单校验的真实效果：名称留空会拦下来，提交后列表会真的多一行。') }}</div>
      </a-form>
    </a-modal>

    <!-- 查看抽屉 -->
    <a-drawer v-model:open="viewOpen" :title="t('班级详情')" :width="420">
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item :label="t('班级名称')">{{ current?.name }}</a-descriptions-item>
        <a-descriptions-item :label="t('类型')">{{ current?.typeText }}</a-descriptions-item>
        <a-descriptions-item :label="t('学生数')">{{ current?.count }}</a-descriptions-item>
        <a-descriptions-item :label="t('状态')">{{ current?.status === 1 ? t('正常') : t('停用') }}</a-descriptions-item>
        <a-descriptions-item :label="t('更新时间')">{{ current?.time }}</a-descriptions-item>
        <a-descriptions-item :label="t('备注')">{{ current?.remark || '—' }}</a-descriptions-item>
      </a-descriptions>
      <template #footer>
        <a-space>
          <a-button @click="viewOpen = false">{{ t('关闭') }}</a-button>
          <a-button type="primary" @click="viewOpen = false; openEdit(current)">{{ t('编辑') }}</a-button>
        </a-space>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { computed, reactive, ref } from 'vue'
import {
  message, notification, Modal, Empty
} from 'ant-design-vue'
import {
  PlusOutlined, DeleteOutlined, SearchOutlined, BellOutlined,
  SettingOutlined, UploadOutlined, MoreOutlined
} from '@ant-design/icons-vue'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE

/* ---------- 演示状态 ---------- */
const keyword = ref('')
const search = ref('')
const num = ref(42)
const remark = ref('')
const type = ref('core')
const scope = ref('all')
const flags = ref(['a'])
const enabled = ref(true)
const enabled2 = ref(false)
const level = ref(62)
const stars = ref(4)
const view = ref('单图')
const loading = ref(false)
const saving = ref(false)

const typeOptions = computed(() => [
  { value: 'core', label: t('专业核心课') },
  { value: 'practice', label: t('实训实践课') },
  { value: 'general', label: t('通识选修课') },
  { value: 'project', label: t('项目制课程') }
])
const flagOptions = computed(() => [
  { label: t('只看正常'), value: 'a' },
  { label: t('含停用'), value: 'b' },
  { label: t('仅本系'), value: 'c' }
])
const stepItems = computed(() => [
  { title: t('导入课程') }, { title: t('配置实训') }, { title: t('发布考试') }, { title: t('成绩归档') }
])

const rows = ref([
  { id: 1, name: '2025 级计算机科学与技术 1 班', typeText: '专业核心课', count: 42, status: 1, time: '2025-09-01 09:12', remark: '' },
  { id: 2, name: '2025 级软件工程 2 班', typeText: '实训实践课', count: 38, status: 1, time: '2025-09-01 09:20', remark: '含 2 名旁听生' },
  { id: 3, name: '2024 级人工智能 1 班', typeText: '专业核心课', count: 45, status: 0, time: '2024-09-02 10:05', remark: '' },
  { id: 4, name: '2024 级数据科学 2 班', typeText: '项目制课程', count: 41, status: 1, time: '2024-09-02 10:08', remark: '' },
  { id: 5, name: '2023 级智能科学与技术 1 班', typeText: '通识选修课', count: 39, status: 1, time: '2023-09-03 08:40', remark: '' }
])
const hidden = ref(false)
const emptyRows = ref([])
const selected = ref([1])
const filtered = computed(() => {
  const list = hidden.value ? emptyRows.value : rows.value
  const k = search.value.trim()
  return k ? list.filter(r => r.name.includes(k)) : list
})

const columns = computed(() => [
  { title: t('班级名称'), key: 'name', dataIndex: 'name', ellipsis: true },
  { title: t('类型'), key: 'typeText', dataIndex: 'typeText', width: 130 },
  { title: t('学生数'), key: 'count', dataIndex: 'count', width: 80 },
  { title: t('状态'), key: 'status', dataIndex: 'status', width: 90 },
  { title: t('更新时间'), key: 'time', dataIndex: 'time', width: 155 },
  { title: t('操作'), key: 'action', width: 215, align: 'right' }
])

/* ---------- 交互 ---------- */
function fakeLoad() {
  loading.value = true
  setTimeout(() => { loading.value = false; message.success(t('已重新拉取')) }, 800)
}
function toggleEmpty() {
  hidden.value = !hidden.value
  if (hidden.value) message.info(t('已切换到空数据，看空态'))
}
function fireAll() {
  message.success(t('保存成功'))
  setTimeout(() => message.info(t('已切换到实训端')), 300)
  setTimeout(() => message.warning(t('该班级下还有学生，无法删除')), 600)
  setTimeout(() => message.error(t('接口返回 500，请稍后重试')), 900)
}
let closeLoading = null
function loadingMsg() {
  closeLoading = message.loading(t('正在请求真实接口…'), 0)
  setTimeout(() => { closeLoading(); message.success(t('请求完成')) }, 1200)
}
function notify(type) {
  const map = {
    success: { message: t('导入完成'), description: t('42 名学生已加入 2025 级计科 1 班') },
    info: { message: t('模型列表已更新'), description: t('新增 2 个可用模型') },
    error: { message: t('同步失败'), description: t('/gpt-api 返回 401，请检查 AI 服务鉴权') }
  }
  notification[type]({ ...map[type], placement: 'topRight', duration: 3 })
}
function confirmDelete() {
  Modal.confirm({
    title: t('确定删除这个班级？'),
    content: t('删除后该班级下的学生关联会一并解除，操作不可撤销。'),
    okText: t('删除'),
    okType: 'danger',
    cancelText: t('取消'),
    onOk() {
      return new Promise(res => setTimeout(() => { message.success(t('已删除')); res() }, 500))
    }
  })
}
function infoModal() {
  Modal.info({
    title: t('本轮只改样式层'),
    content: t('路由、接口封装、request 拦截器、权限判断都没有动，所以真实数据链路不受影响。'),
    okText: t('知道了')
  })
}
function onRowMore(key, record) {
  if (key === 'student') { openView(record); return }
  if (key === 'copy') { navigator.clipboard?.writeText(record.name); message.success(t('已复制名称')); return }
  if (key === 'del') remove(record)
}
function remove(record) {
  rows.value = rows.value.filter(r => r.id !== record.id)
  selected.value = selected.value.filter(k => k !== record.id)
  message.success(t('已删除「{name}」', { name: record.name }))
}
function batchDelete() {
  Modal.confirm({
    title: t('确定删除选中的 {n} 条记录？', { n: selected.value.length }),
    content: t('批量删除不可撤销。'),
    okText: t('删除'),
    okType: 'danger',
    cancelText: t('取消'),
    onOk() {
      rows.value = rows.value.filter(r => !selected.value.includes(r.id))
      message.success(t('已删除 {n} 条', { n: selected.value.length }))
      selected.value = []
    }
  })
}

/* ---------- 弹窗 ---------- */
const editOpen = ref(false)
const viewOpen = ref(false)
const isEdit = ref(false)
const current = ref(null)
const formRef = ref()
const form = reactive({ id: null, name: '', type: 'core', count: 40, status: 1, remark: '' })
const rules = {
  name: [{ required: true, message: t('请输入班级名称'), trigger: 'blur' }]
}

function openAdd() {
  isEdit.value = false
  Object.assign(form, { id: null, name: '', type: 'core', count: 40, status: 1, remark: '' })
  editOpen.value = true
}
function openEdit(row) {
  isEdit.value = true
  Object.assign(form, { ...row })
  editOpen.value = true
}
function openView(row) {
  current.value = row
  viewOpen.value = true
}
async function submit() {
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }
  saving.value = true
  setTimeout(() => {
    saving.value = false
    if (isEdit.value) {
      const i = rows.value.findIndex(r => r.id === form.id)
      if (i > -1) rows.value[i] = { ...rows.value[i], ...form, typeText: labelOf(form.type) }
      message.success(t('已保存'))
    } else {
      rows.value.unshift({
        ...form,
        id: Date.now(),
        typeText: labelOf(form.type),
        time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      })
      message.success(t('已新增'))
    }
    editOpen.value = false
  }, 500)
}
function labelOf(v) {
  return typeOptions.value.find(o => o.value === v)?.label || v
}
</script>

<style lang="scss" scoped>
.kitchen { max-width: none; }

/* 锚点导航 */
.anchors {
  position: sticky; top: 0; z-index: 5; display: flex; gap: 6px; flex-wrap: wrap;
  padding: 8px 0 12px; background: var(--c-bg);
}
.anchors a {
  font-size: 11.5px; color: var(--c-text-2); background: #fff; border: 1px solid var(--c-line);
  border-radius: 20px; padding: 3px 11px; transition: .15s;
}
.anchors a:hover { color: var(--c-pri); border-color: var(--c-pri-line); background: var(--c-pri-soft); }

.demo-row .ant-btn + .ant-btn { margin-left: 0; }
/* 演示行里的控件不要被 flex 压缩 */
.demo-row > .ant-input,
.demo-row > .ant-input-affix-wrapper,
.demo-row > .ant-select,
.demo-row > .ant-picker,
.demo-row > .ant-input-number,
.demo-row > .ant-upload-wrapper { flex: none; }

.name-cell a { color: var(--c-text); font-weight: 500; }
.name-cell a:hover { color: var(--c-pri); }
.num { font-variant-numeric: tabular-nums; }

.table-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-top: 1px solid var(--c-line); font-size: 11.5px; color: var(--c-muted);
}
.tab-body { font-size: 12px; color: var(--c-text-2); padding: 8px 0; }

/* 折叠面板做成浅底块，避免跟白卡片糊在一起 */
:deep(.ant-collapse) { background: var(--c-soft); border: 1px solid var(--c-line); border-radius: 6px; }
:deep(.ant-collapse-item) { border-bottom: 1px solid var(--c-line); }
:deep(.ant-collapse-item:last-child) { border-bottom: 0; }
:deep(.ant-collapse-header) { padding: 9px 12px !important; }
:deep(.ant-collapse-content-box) { padding: 0 12px 10px !important; color: var(--c-text-2); }

/* 进度演示：标签 + 进度条一行，两列排布 */
.progress-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 26px; }
.pitem { display: flex; align-items: center; gap: 10px; }
.pitem .pl { width: 84px; flex: none; }
.pitem .ant-progress { flex: 1; max-width: 340px; margin: 0; line-height: 1; }
.pl { font-size: 11.5px; color: var(--c-muted); }

:deep(.ant-table-thead > tr > th) { font-size: 11.5px; }
:deep(.ant-empty-normal) { margin: 18px 0; }
</style>
