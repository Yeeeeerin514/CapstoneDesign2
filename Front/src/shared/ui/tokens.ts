export const colors = {
  primary: "#3182F6",
  primaryDark: "#1B64DA",
  primaryLight: "#E8F2FF",

  success: "#16C172",
  successLight: "#E5F8EE",
  warning: "#F09A37",
  warningLight: "#FFF3E0",
  danger: "#F04452",
  dangerLight: "#FFEBED",
  info: "#3182F6",
  infoLight: "#E8F2FF",

  white: "#FFFFFF",
  bg: "#F2F4F6",
  bgSecondary: "#F9FAFB",
  surface: "#FFFFFF",
  border: "#F2F4F6",
  borderStrong: "#E5E8EB",

  text: "#191F28",
  textSecondary: "#4E5968",
  textTertiary: "#8B95A1",
  textDisabled: "#B0B8C1",

  textOnPrimary: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: "700" as const, color: colors.text },
  title1: { fontSize: 24, fontWeight: "700" as const, color: colors.text },
  title2: { fontSize: 20, fontWeight: "700" as const, color: colors.text },
  title3: { fontSize: 17, fontWeight: "600" as const, color: colors.text },
  body1: { fontSize: 15, fontWeight: "500" as const, color: colors.text },
  body2: { fontSize: 14, fontWeight: "400" as const, color: colors.text },
  label: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    color: colors.textTertiary,
  },
} as const;

export const cardStyles = {
  default: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  flat: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  highlighted: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
} as const;
