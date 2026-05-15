/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4: content에 모든 RN 소스 파일 경로 지정
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/app/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ─────────────────────────────────────────
        // 브랜드 컬러 — 알바지킴이 메인 팔레트
        // ─────────────────────────────────────────
        primary: {
          DEFAULT: "#2563EB", // 메인 블루 (출근/등록 CTA)
          light: "#DBEAFE",
          dark: "#1D4ED8",
        },
        warning: {
          DEFAULT: "#F97316", // 주황 (퇴근/연장 CTA)
          light: "#FFEDD5",
          dark: "#EA580C",
        },
        danger: {
          DEFAULT: "#EF4444", // 빨강 (위법/위험)
          light: "#FEE2E2",
          dark: "#DC2626",
        },
        caution: {
          DEFAULT: "#EAB308", // 노랑 (주의)
          light: "#FEF9C3",
          dark: "#CA8A04",
        },
        info: {
          DEFAULT: "#3B82F6", // 파랑 (참고/안내)
          light: "#DBEAFE",
          dark: "#2563EB",
        },
        success: {
          DEFAULT: "#22C55E", // 초록 (완료/이상없음)
          light: "#DCFCE7",
          dark: "#16A34A",
        },
        // ─────────────────────────────────────────
        // 서페이스 / 배경 토큰
        // ─────────────────────────────────────────
        surface: "#F8FAFC",    // 앱 기본 배경
        card: "#FFFFFF",       // 카드 배경
        border: "#E2E8F0",     // 구분선
        // ─────────────────────────────────────────
        // 텍스트 토큰
        // ─────────────────────────────────────────
        "text-primary": "#0F172A",   // 제목
        "text-secondary": "#475569", // 본문
        "text-disabled": "#94A3B8",  // 비활성
        "text-on-primary": "#FFFFFF", // 버튼 위 텍스트
        // ─────────────────────────────────────────
        // 위험도 배지 배경 (투명도 있는 느낌)
        // ─────────────────────────────────────────
        "badge-danger": "#FEE2E2",
        "badge-caution": "#FEF9C3",
        "badge-info": "#DBEAFE",
        "badge-success": "#DCFCE7",
      },
      fontFamily: {
        sans: ["System"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [],
};
