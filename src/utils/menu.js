import defaultSettings from "@/settings.js";
const { defaultMenuFlag } = defaultSettings
//用户菜单key
const menuFlagKey = 'menu_flag'
//设置用户菜单标识
export const setMenuFlag = (value) => {
    sessionStorage.setItem(menuFlagKey,JSON.stringify(value))
}
//获取用户菜单标识
export const getMenuFlag = () => {
    const menuFlag = sessionStorage.getItem(menuFlagKey)
    return menuFlag ? parseInt(menuFlag) : defaultMenuFlag
}
//删除用户菜单标识
export const removeMenuFlag = () => {
    sessionStorage.removeItem(menuFlagKey)
}
