import type { ThemeConfig } from 'antd';

function cssToken(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) throw new Error(`Missing admin design token: ${name}`);
  return value;
}

/** Ant Design tokens resolved from the CSS palette in tokens.css. */
export const silveramTheme: ThemeConfig = {
  token: {
    colorPrimary: cssToken('--sv-primary'),
    colorPrimaryHover: cssToken('--sv-primary-hover'),
    colorPrimaryActive: cssToken('--sv-primary-active'),
    colorInfo: cssToken('--sv-steel'),
    colorSuccess: cssToken('--sv-success'),
    colorWarning: cssToken('--sv-warning'),
    colorError: cssToken('--sv-danger'),
    colorBgBase: cssToken('--sv-card'),
    colorBgLayout: cssToken('--sv-canvas'),
    colorTextBase: cssToken('--sv-text'),
    colorTextSecondary: cssToken('--sv-text-2'),
    colorTextTertiary: cssToken('--sv-muted'),
    colorTextPlaceholder: cssToken('--sv-muted'),
    colorBorder: cssToken('--sv-card-border'),
    colorBorderSecondary: cssToken('--sv-divider'),
    colorLink: cssToken('--sv-primary'),
    colorLinkHover: cssToken('--sv-primary-hover'),
    fontFamily: "'League Spartan Variable', 'League Spartan', system-ui, sans-serif",
    fontSize: 15,
    borderRadius: 8,
    controlHeight: 40,
    boxShadow: 'none',
    boxShadowSecondary: '0 8px 24px rgb(16 31 52 / 0.12)',
    wireframe: false,
  },
  components: {
    Layout: { siderBg: cssToken('--sv-sidebar'), headerBg: cssToken('--sv-topbar'), bodyBg: cssToken('--sv-canvas'), triggerBg: cssToken('--sv-sidebar-deep'), triggerColor: cssToken('--sv-sidebar-text') },
    Menu: {
      darkItemBg: cssToken('--sv-sidebar'),
      darkSubMenuItemBg: cssToken('--sv-sidebar-deep'),
      darkItemSelectedBg: cssToken('--sv-sidebar-selected'),
      darkItemSelectedColor: cssToken('--sv-sidebar-text-strong'),
      darkItemColor: cssToken('--sv-sidebar-text'),
      darkItemHoverBg: cssToken('--sv-sidebar-hover'),
      darkItemHoverColor: cssToken('--sv-sidebar-text-strong'),
      itemMarginInline: 8,
    },
    Table: {
      headerBg: cssToken('--sv-canvas'), headerColor: cssToken('--sv-text'), rowHoverBg: cssToken('--sv-canvas'), borderColor: cssToken('--sv-divider'), cellPaddingBlock: 12,
      // Sorting must not tint a whole column: the arrow already shows the active sort.
      bodySortBg: 'transparent', headerSortActiveBg: cssToken('--sv-canvas'), headerSortHoverBg: cssToken('--sv-canvas-hover'), headerSplitColor: 'transparent',
    },
    Button: { primaryShadow: 'none', defaultShadow: 'none', fontWeight: 500 },
    Card: { colorBorderSecondary: cssToken('--sv-card-border') },
    Tag: { defaultBg: cssToken('--sv-canvas'), defaultColor: cssToken('--sv-text') },
    Drawer: { colorBgElevated: cssToken('--sv-card') },
    Segmented: { itemSelectedBg: cssToken('--sv-primary'), itemSelectedColor: cssToken('--sv-card') },
  },
};
