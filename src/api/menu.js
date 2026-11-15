import request from '@/utils/request'

// 获取路由
export const getRouters = () => {
  return request({
    url: '/getRouters',
    method: 'get'
  })
}

// 获取菜单
export const getMenus = () => {
  return request({
    url: '/getMenus',
    method: 'get'
  })
}
