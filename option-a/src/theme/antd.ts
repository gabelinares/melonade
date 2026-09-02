/* ══════════════════════════════════════════════════════════════════════════
   OPTION A: the antd bridge.

   Ant Design is the component base here, so the design system has to reach it
   through ConfigProvider rather than by fighting it with CSS. Two rules:

   1. Every value handed to antd is a REAL colour string from the token layer.
      antd derives whole ramps (hover, active, border, bg) from colorPrimary
      with a palette algorithm that cannot read a CSS custom property: pass
      `var(--x)` and it computes against an invalid colour and falls back to
      black. That has bitten this codebase before.
   2. Anything antd cannot express is overridden in antd-overrides.css against
      the SAME tokens, never with a fresh literal.

   The identity decision encoded here: `colorPrimary` is the restrained teal,
   so every selection / checked / focus affordance is the accent, but the
   primary BUTTON is overridden to ink. Coloured buttons are what makes an app
   read as "the blue one"; ink buttons with an accent reserved for state is the
   quiet register this option is going for.
   ══════════════════════════════════════════════════════════════════════════ */

import { theme, type ThemeConfig } from 'antd';
import { palette as p } from '../tokens/palette.ts';
import { lightColors, darkColors, scales } from '../tokens/tokens.ts';

export type Mode = 'light' | 'dark';

/* What the prototype panel's colour switches hand in. antd cannot be re-themed
   by CSS custom properties - it derives hover/active/border ramps from
   colorPrimary with an algorithm that needs a real colour string - so a variant
   has to be pushed through here as well as through the stylesheet, or half the
   screen recolours and the other half does not. Both maps are generated; see
   tokens/proto-themes.ts. */
export interface ThemeOverrides {
  /** primitive ramp values, for the handful of places antd gets a primitive */
  palette?: Record<string, string>;
  /** semantic roles for the mode being rendered */
  roles?: Record<string, string>;
  /** font stacks. antd writes its own font-family onto every component from its
   *  `fontFamily` token, so the CSS variable alone never reaches a table, tab,
   *  input or button - which is most of the page. */
  fonts?: { sans?: string; mono?: string };
  /** corner radius by role, in px. antd wants numbers and computes with them
   *  (inner corners, the segmented thumb), so a CSS variable is no more use
   *  here than it is for a colour. */
  radii?: { chip?: number; control?: number; surface?: number; check?: number };
}

/** px numbers antd wants, kept next to the rem tokens they mirror. */
const px = {
  textXs: 12,
  textSm: 13,
  textMd: 14,
  textLg: 16,
  textXl: 18,
  radiusChip: 2,
  radiusControl: 4,
  radiusSurface: 8,
  radiusCheck: 2,
  controlSm: 26,
  controlMd: 30,
  controlLg: 36,
} as const;

export function antdTheme(mode: Mode, overrides?: ThemeOverrides): ThemeConfig {
  const isDark = mode === 'dark';
  const pv: Record<string, string> = { ...p, ...overrides?.palette };
  const c = { ...(isDark ? darkColors : lightColors), ...overrides?.roles };
  /* Three numbers, and every antd corner in the app comes from one of them.
     The mapping is by ROLE, never by size: `borderRadiusSM` used to be the chip
     value, which is why a small button and a small input came out at 2px while
     our own IconButton beside them sat at 4px. Same object, two shapes, and
     that is the seam Mehdi spotted. */
  const r = {
    chip: overrides?.radii?.chip ?? px.radiusChip,
    control: overrides?.radii?.control ?? px.radiusControl,
    surface: overrides?.radii?.surface ?? px.radiusSurface,
    check: overrides?.radii?.check ?? px.radiusCheck,
  };
  /* A track that wraps controls with 2px of padding. The outer radius has to be
     the inner one PLUS the gap or the two corners are not concentric, which is
     visible at a glance and unfixable by eye. Mirrors --m-radius-track. */
  const track = r.control + 2;

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    /* wireframe:false is the v5+ default but stating it stops a future antd
       default flip from re-introducing 2px rules into a hairline system. */
    token: {
      wireframe: false,

      /* ── brand + semantics ── */
      colorPrimary: pv['a-600'],
      colorInfo: pv['a-600'],
      colorSuccess: isDark ? pv['success-400'] : pv['success-600'],
      colorWarning: isDark ? pv['warning-400'] : pv['warning-600'],
      colorError: isDark ? pv['danger-400'] : pv['danger-600'],
      colorLink: c['content-accent'],
      colorLinkHover: isDark ? pv['a-200'] : pv['a-500'],

      /* ── neutrals, stated explicitly. antd would otherwise derive its own
            grey ramp, which drifts from ours by a few percent per step and
            shows up as a table border that does not match a card border. ── */
      colorTextBase: c['content-primary'],
      colorBgBase: c['surface-default'],
      colorText: c['content-primary'],
      colorTextSecondary: c['content-secondary'],
      colorTextTertiary: c['content-muted'],
      colorTextQuaternary: c['content-disabled'],
      colorTextPlaceholder: c['content-placeholder'],
      colorTextDescription: c['content-muted'],
      colorTextDisabled: c['content-disabled'],
      colorIcon: c['content-decorative'],
      colorIconHover: c['content-primary'],

      colorBorder: c['border-default'],
      colorBorderSecondary: c['border-subtle'],
      colorSplit: c['border-subtle'],

      colorBgContainer: c['surface-default'],
      colorBgElevated: c['surface-raised'],
      colorBgLayout: c['surface-canvas'],
      colorBgSpotlight: c['surface-inverse'],
      colorFillAlter: c['surface-sunken'],
      colorFillContent: c['surface-hover'],
      colorFillSecondary: c['surface-hover'],
      colorFillTertiary: c['surface-hover'],
      colorFillQuaternary: c['surface-sunken'],

      /* ── the row states every popup list shares ───────────────────────────
         Select, Dropdown, Menu, Cascader, Tree and the pickers all draw their
         rows from these three. Setting them per component is how one gets
         missed: `controlItemBgActiveHover` was, and antd derived it from
         `colorPrimary` instead - which for a dark, low-chroma teal comes out of
         the palette algorithm as a muddy mid-tone (rgb 124,163,163), painted
         across the whole selected row. Worse, rc-select marks the selected row
         ACTIVE the moment the popup opens, so that colour was the resting
         state of every dropdown in the app, not an edge case on hover. */
      controlItemBgHover: c['surface-hover'],
      /* ⚠ `surface-active`, NOT `surface-selected`, since 2026-09-02. This is
         THE token behind a selected row in every dropdown, menu and picker in
         the app, and `surface-selected` is the one teal-tinted surface in the
         set - so "the option you already chose" was the only selection in the
         build that meant selection in a different colour. Everything else says
         it with a neutral fill and primary ink: the nav's current row, the
         pager's current page, the segmented thumb, the picker's category rail.
         Gabriel, on the operator dropdown: "this colour in that state is a
         weird semantic token." It was. */
      controlItemBgActive: c['surface-active'],
      /* Hovering the row you already picked must not announce anything: it is
         the same state, and a second, louder tint would read as a third one. */
      controlItemBgActiveHover: c['surface-active'],

      /* ── type ── */
      fontFamily: overrides?.fonts?.sans ?? scales['font-sans'],
      fontFamilyCode: overrides?.fonts?.mono ?? scales['font-mono'],
      fontSize: px.textSm,
      fontSizeSM: px.textXs,
      fontSizeLG: px.textMd,
      fontSizeXL: px.textLg,
      fontSizeHeading5: px.textLg,
      fontSizeHeading4: px.textXl,
      lineHeight: 1.5,
      lineHeightSM: 1.45,

      /* ── shape ── */
      /* A control is a control at every size, so SM is not smaller. LG is the
         surface radius because that is what antd draws popovers, dropdowns,
         drawers and modals with - not because anything here is "large". */
      borderRadius: r.control,
      borderRadiusSM: r.control,
      borderRadiusLG: r.surface,
      borderRadiusXS: r.chip,
      lineWidth: 1,
      lineWidthBold: 1, // there is no 2px rule in this system

      /* ── density ── */
      controlHeight: px.controlMd,
      controlHeightSM: px.controlSm,
      controlHeightLG: px.controlLg,
      paddingContentHorizontal: 12,

      /* ── depth. Cards carry a border, not a shadow: the standing complaint
            about the current app is a panel shadow that reads as "something
            thick". Only floating layers get one. ── */
      boxShadow: scales['shadow-popover'],
      boxShadowSecondary: scales['shadow-popover'],
      boxShadowTertiary: scales['shadow-popover'],

      /* ── motion ── */
      motionDurationFast: scales['duration-instant'],
      motionDurationMid: scales['duration-fast'],
      motionDurationSlow: scales['duration-normal'],
      motionEaseInOut: scales['ease-in-out'],
      motionEaseOut: scales['ease-out'],
    },

    components: {
      /* Primary is INK. This is the one place the app deliberately diverges
         from its own colorPrimary, and it is the departure that makes the
         product stop reading as "the blue one". */
      Button: {
        colorPrimary: c['action-primary-bg'],
        colorPrimaryHover: c['action-primary-bg-hover'],
        colorPrimaryActive: c['action-primary-bg-active'],
        colorPrimaryBorder: c['action-primary-bg'],
        primaryColor: c['action-primary-fg'],
        defaultBg: c['action-secondary-bg'],
        defaultColor: c['action-secondary-fg'],
        defaultBorderColor: c['action-secondary-border'],
        defaultHoverBg: c['action-secondary-bg-hover'],
        defaultHoverColor: c['content-primary'],
        defaultHoverBorderColor: c['border-strong'],
        defaultActiveBg: c['action-secondary-bg-active'],
        textHoverBg: c['action-subtle-bg-hover'],
        fontWeight: 500,
        paddingInline: 10,
        paddingInlineSM: 8,
        contentFontSize: px.textSm,
        contentFontSizeSM: px.textXs,
        borderColorDisabled: c['border-subtle'],
        /* antd's default is a 2px focus shadow; a system with one focus ring
           declares it in CSS so buttons and custom controls agree */
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
      },

      Table: {
        headerBg: c['surface-sunken'],
        headerColor: c['content-muted'],
        headerSplitColor: 'transparent',
        headerBorderRadius: 0,
        borderColor: c['border-subtle'],
        rowHoverBg: c['surface-hover'],
        rowSelectedBg: c['surface-selected'],
        rowSelectedHoverBg: c['surface-selected'],
        cellPaddingBlock: 8,
        cellPaddingInline: 12,
        cellPaddingBlockSM: 6,
        cellFontSize: px.textSm,
        footerBg: 'transparent',
        stickyScrollBarBg: c['border-strong'],
      },

      Segmented: {
        itemColor: c['content-muted'],
        itemHoverColor: c['content-primary'],
        itemSelectedColor: c['content-primary'],
        itemSelectedBg: c['surface-default'],
        trackBg: c['surface-sunken'],
        trackPadding: 2,
        /* A toggle IS a control, so the thumb takes the control radius and the
           track takes control + its 2px padding, which is what makes the two
           corners concentric. Both sizes are spelled out because antd reads the
           TRACK from `borderRadiusSM` at size="small" and the thumb from
           `borderRadiusXS`: leave those alone and the panel's own toggles come
           out a different shape from the identical-looking strip on the
           toolbar, and the thumb sits in its track like a pill in the wrong
           hole. */
        borderRadius: track,
        borderRadiusSM: track,
        borderRadiusXS: r.control,
      },

      /* ⚠ AN OPEN OR FOCUSED CONTROL IS NOT AN ACCENT (Gabriel, 2026-09-02:
         "this colour in that state is a weird semantic token"). antd calls it
         `activeBorderColor` and it fires whenever a field is focused or a
         dropdown is open, so every control in the app was painting the ONE
         accent this design rations to say nothing more than "you are typing in
         me" - which the caret already says, and which the popover says
         unmistakably.

         `border-strong` instead: an open control takes a firmer edge and
         nothing else. The KEYBOARD focus ring is untouched and still accent -
         that is `:focus-visible` in base.css with `--m-focus-ring`, and an
         accent focus indicator is the one place this colour is load-bearing. */
      Input: {
        activeBorderColor: c['border-strong'],
        hoverBorderColor: c['border-strong'],
        activeShadow: 'none',
        errorActiveShadow: 'none',
        warningActiveShadow: 'none',
        paddingInline: 8,
        paddingInlineSM: 8,
      },

      Select: {
        /* ⚠ `surface-active`, NOT `surface-selected`. Selection in this build
           is a NEUTRAL FILL plus primary ink - the nav's current row, the
           pager's current page, the segmented thumb, the picker's own category
           rail - and `surface-selected` is the one teal-tinted surface in the
           set. Used here it made "the option you already chose" the only
           selection in the app that means selection in a different colour,
           which is exactly the semantic drift Gabriel caught. */
        optionSelectedBg: c['surface-active'],
        optionSelectedColor: c['content-primary'],
        optionActiveBg: c['surface-hover'],
        activeBorderColor: c['border-strong'],
        hoverBorderColor: c['border-strong'],
        activeOutlineColor: 'transparent',
        multipleItemBg: c['status-neutral-bg'],
        multipleItemBorderColor: c['border-default'],
      },

      Dropdown: {
        controlItemBgHover: c['surface-hover'],
        controlItemBgActive: c['surface-active'],
        controlItemBgActiveHover: c['surface-active'],
        paddingBlock: 5,
      },

      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemColor: c['content-secondary'],
        itemHoverColor: c['content-primary'],
        itemHoverBg: c['surface-hover'],
        itemSelectedColor: c['content-primary'],
        itemSelectedBg: c['surface-active'],
        itemActiveBg: c['surface-active'],
        itemHeight: 30,
        itemMarginInline: 4,
        itemMarginBlock: 1,
        itemPaddingInline: 8,
        itemBorderRadius: r.control,
        activeBarWidth: 0,
        activeBarBorderWidth: 0,
        groupTitleColor: c['content-muted'],
        groupTitleFontSize: px.textXs,
        iconSize: 15,
        collapsedIconSize: 16,
      },

      Modal: {
        titleFontSize: px.textLg,
        headerBg: c['surface-default'],
        contentBg: c['surface-default'],
        borderRadiusLG: r.surface,
        padding: 20,
        paddingContentHorizontalLG: 20,
      },

      Popover: {
        titleMinWidth: 0,
        borderRadiusLG: r.surface,
      },

      Tooltip: {
        colorBgSpotlight: c['surface-inverse'],
        colorTextLightSolid: c['content-inverse'],
        borderRadius: r.control,
        fontSize: px.textXs,
        paddingSM: 8,
        paddingXS: 6,
      },

      Tag: {
        defaultBg: c['status-neutral-bg'],
        defaultColor: c['status-neutral-fg'],
        borderRadiusSM: r.chip,
      },

      Pagination: {
        itemActiveBg: c['surface-active'],
        itemBg: 'transparent',
        itemSize: px.controlSm,
        colorPrimary: c['content-primary'],
        colorPrimaryHover: c['content-primary'],
      },

      Checkbox: {
        /* THE ONE CAPPED RADIUS. CSS clamps a radius to half the box, so any
           "round" value turns this 14px square into a circle - and a circle
           means one-of-these. It stays a rounded square at every shape. */
        borderRadiusSM: r.check,
        controlInteractiveSize: 14,
      },

      Switch: {
        handleSize: 12,
        trackHeight: 16,
        trackMinWidth: 28,
        colorPrimary: c['action-primary-bg'],
        colorPrimaryHover: c['action-primary-bg-hover'],
      },

      Divider: { colorSplit: c['border-subtle'], marginLG: 12 },

      Tabs: {
        itemColor: c['content-muted'],
        itemSelectedColor: c['content-primary'],
        itemHoverColor: c['content-primary'],
        inkBarColor: c['content-primary'],
        titleFontSize: px.textSm,
        horizontalItemPadding: '8px 0',
        horizontalItemGutter: 20,
      },

      Empty: { colorTextDescription: c['content-muted'] },
    },
  };
}
