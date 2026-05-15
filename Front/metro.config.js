/**
 * Metro 설정 (Expo SDK 51 + NativeWind v4).
 *
 * 1) Expo 기본 Metro 설정 로드
 * 2) Watch scope를 프로젝트 루트로 제한 — node_modules 전체 fs.watch가
 *    macOS FSEvents 한도를 초과해 EMFILE을 일으키는 문제 회피.
 *    (watchman 사용 시에도 안전망 역할)
 * 3) 빌드 산출물/IDE 캐시를 resolver에서 제외 — 불필요한 모듈 후보를 줄여
 *    번들링 속도와 안정성 개선.
 * 4) NativeWind v4 wrapper로 className 변환 활성화.
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// 1) Watch 범위 — 프로젝트 루트 한 군데로 제한.
config.watchFolders = [projectRoot];

// 2) 빌드 산출물·IDE 캐시 제외 (Metro resolver).
//    NOTE: 정규식에서 점(`.`)은 반드시 `\.`로 이스케이프할 것.
//    그렇지 않으면 `/@expo/` 같은 경로도 매칭되어
//    `@expo/metro-runtime` 모듈을 찾지 못해 번들링이 실패한다.
config.resolver.blockList = [
  /\/\.expo\//,
  /\/ios\/build\//,
  /\/android\/build\//,
  /\/android\/\.gradle\//,
  // 주의: `/\/dist\//` 같은 패턴은 절대 추가하지 말 것.
  // node_modules 안 수많은 패키지가 dist/ 폴더에 빌드 산출물을 두기 때문에
  // (예: react-native-css-interop/dist/runtime/jsx-runtime.js)
  // 그걸 막으면 Metro가 SHA-1을 계산 못 해 번들링이 실패한다.
];

// 3) `react-native-css-interop/jsx-runtime` 수동 redirect.
//    sub-package.json의 main이 `"../dist/runtime/jsx-runtime"` (확장자 없음 +
//    부모 디렉토리 참조) 형태라 Metro의 platform-aware resolver가 잘못 풀어
//    번들링이 실패한다. Node의 require.resolve는 정상 동작하므로 그 결과를
//    Metro에 직접 주입한다.
const cssInteropJsxRuntime = path.resolve(
  projectRoot,
  "node_modules/react-native-css-interop/dist/runtime/jsx-runtime.js",
);
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-css-interop/jsx-runtime") {
    return { filePath: cssInteropJsxRuntime, type: "sourceFile" };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  // NativeWind가 컴파일할 글로벌 CSS 진입점.
  input: "./src/global.css",
});
