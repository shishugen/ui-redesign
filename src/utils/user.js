/**
 * A 适配层 · utils/user.js
 *
 * 为 F2 冻结层提供同名导出，冻结层文件本身不改（D1：适配层同名新写）：
 *   - utils/permission.js            → getUserPermissions / getUserRole
 *   - directive/permission/hasPermi.js → getUserPermissions
 *   - directive/permission/hasRole.js  → getUserRole
 *
 * 数据源按 D2 决议取 stores/session，不引入旧项目的 useUserStore。
 * 旧项目从 user 对象里取 roles / permissions；新项目把两者放在 session 顶层，
 * 语义等价（都返回数组，空值返回 []），但取值位置不同，见 docs/迁移设计文档.md §3.3。
 */
import { useSessionStore } from '@/stores/session'

const store = () => useSessionStore()
const roles = () => store().roles || []
const perms = () => store().permissions || []

export const getUserInfo = () => store().user || {}
export const getUserId = () => store().user?.userId ?? ''
export const getUserName = () => store().user?.userName ?? ''
export const getNickName = () => store().user?.nickName ?? ''
export const getUserRole = () => roles()
export const getUserPermissions = () => perms()

const hasRole = name => roles().some(r => String(r).toLowerCase() === name)

/** 判断是否是管理员 */
export const isAdmin = () => hasRole('admin')
/** 判断是否是教师 */
export const isTeacher = () => hasRole('teacher')
/** 判断是否是学生 */
export const isStudent = () => hasRole('student')
/** 判断是否是管理员或教师 */
export const isAdminOrTeacher = () => !!(isAdmin() || isTeacher())
