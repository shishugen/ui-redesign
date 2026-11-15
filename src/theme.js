/**
 * 全局主题 v4「靛青工作台」
 * 与 src/styles/design-system.scss 同源：改一处必须同步另一处
 */

export const palette = {
  pri: '#2F54EB',
  pri600: '#1D39C4',
  pri50: '#F3F6FF',
  pri100: '#E7EDFF',
  pri200: '#C9D6FD',
  ink: '#0F172A',
  ink2: '#334155',
  ink3: '#64748B',
  ink4: '#94A3B8',
  panel: '#FFFFFF',
  bg: '#F5F7FB',
  bgSoft: '#FAFBFD',
  line: '#E6EAF2',
  line2: '#D5DCEA',
  line3: '#EEF1F7',
  ok: '#0E9F6E',
  warn: '#D97706',
  danger: '#DC2626'
}

const fontFamily = '"PingFang SC", "Hiragino Sans GB", "Source Han Sans SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif'

export const themeConfig = {
  token: {
    colorPrimary: palette.pri,
    colorInfo: palette.pri,
    colorSuccess: palette.ok,
    colorWarning: palette.warn,
    colorError: palette.danger,
    colorText: palette.ink,
    colorTextSecondary: palette.ink2,
    colorTextTertiary: palette.ink3,
    colorTextQuaternary: palette.ink4,
    colorBorder: palette.line2,
    colorBorderSecondary: palette.line,
    colorSplit: palette.line3,
    colorBgLayout: palette.bg,
    colorBgContainer: palette.panel,
    colorBgElevated: palette.panel,
    colorFillAlter: palette.bgSoft,
    colorFillSecondary: palette.bg,
    colorLink: palette.pri,
    colorLinkHover: '#4A6BF0',
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    controlHeight: 34,
    fontSize: 13,
    fontFamily,
    lineWidth: 1,
    wireframe: false,
    boxShadow: '0 4px 14px rgba(15, 23, 42, .07)',
    boxShadowSecondary: '0 14px 40px rgba(15, 23, 42, .14)'
  },
  components: {
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontWeight: 500,
      paddingInline: 14,
      controlHeight: 34,
      controlHeightSM: 28,
      controlHeightLG: 42
    },
    Table: {
      headerBg: palette.bgSoft,
      headerColor: palette.ink3,
      headerSplitColor: 'transparent',
      borderColor: palette.line3,
      rowHoverBg: palette.bgSoft,
      cellPaddingBlock: 12,
      cellPaddingInline: 14,
      footerBg: palette.bgSoft,
      headerBorderRadius: 0
    },
    Input: {
      activeShadow: '0 0 0 3px rgba(47,84,235,.12)',
      hoverBorderColor: palette.line2,
      activeBorderColor: palette.pri,
      paddingBlock: 4
    },
    Select: {
      optionSelectedBg: palette.pri50,
      optionSelectedColor: palette.pri,
      optionActiveBg: palette.bg,
      optionHeight: 32
    },
    Menu: {
      itemColor: palette.ink2,
      itemHoverColor: palette.pri,
      itemSelectedColor: palette.pri,
      itemSelectedBg: palette.pri50,
      itemHoverBg: palette.bg,
      horizontalItemSelectedColor: palette.pri,
      horizontalItemHoverBg: 'transparent',
      itemBorderRadius: 8,
      itemHeight: 36
    },
    Modal: { titleFontSize: 15, headerBg: palette.panel, contentBg: palette.panel },
    Message: { contentPadding: '10px 16px', borderRadiusLG: 10 },
    Tabs: { itemColor: palette.ink3, itemSelectedColor: palette.pri, inkBarColor: palette.pri, horizontalItemPadding: '11px 0', titleFontSize: 13 },
    Tag: { defaultBg: palette.bg, defaultColor: palette.ink3, borderRadiusSM: 6 },
    Progress: { defaultColor: palette.pri, remainingColor: palette.line3 },
    Segmented: { itemSelectedBg: palette.panel, itemSelectedColor: palette.pri, trackBg: palette.bg },
    Descriptions: { labelBg: palette.bgSoft, titleMarginBottom: 12 },
    Pagination: { itemActiveBg: palette.pri, borderRadius: 6 },
    Checkbox: { borderRadiusSM: 4 },
    Radio: { borderRadiusSM: 6 },
    Alert: { defaultPadding: '10px 14px', borderRadiusLG: 10 },
    Tooltip: { colorBgSpotlight: '#1E293B', borderRadius: 6 },
    Dropdown: { borderRadiusLG: 10, paddingBlock: 5 },
    Drawer: { footerPaddingBlock: 12 },
    Card: { headerFontSize: 14 }
  }
}
