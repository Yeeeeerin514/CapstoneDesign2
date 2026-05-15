/**
 * Babel 설정 — NativeWind v4 + Expo Router (SDK 51).
 *
 * 두 preset의 역할:
 *  1) `babel-preset-expo`:
 *     - Expo Router 파일 기반 라우팅 변환 자동 포함 (SDK 50+).
 *     - `jsxImportSource: "nativewind"`: 모든 JSX를 `nativewind/jsx-runtime`을
 *       경유해 변환 → className prop이 실제 RN style로 바뀐다.
 *  2) `nativewind/babel`:
 *     - Tailwind 클래스를 컴파일 타임에 수집해 metro로 넘긴다.
 *
 * 주의:
 *  - `react-native-css-interop`이 root-level `node_modules/`에 hoist되어야 한다.
 *    (이게 없으면 `Unable to resolve 'react-native-css-interop/jsx-runtime'`
 *    에러가 expo-router의 빌드된 파일에서 발생함.)
 *  - `@/*` 경로 별칭은 tsconfig.json의 paths로 처리. Metro가 자동 해석하므로
 *    babel-plugin-module-resolver 불필요.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // react-native-reanimated/plugin은 반드시 plugins 배열의 마지막에 와야 한다.
      // nativewind v4가 native 환경에서 dynamic style 처리에 reanimated를 사용하므로
      // 이 plugin이 없으면 css-interop runtime이 에러를 던진다.
      "react-native-reanimated/plugin",
    ],
  };
};
