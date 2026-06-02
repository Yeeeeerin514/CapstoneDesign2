import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type {
  EvidenceAcceptType,
  EvidenceFile,
  FileEvidenceKey,
} from "@/entities/report";

/**
 * 권한 요청 — 카메라 + 미디어 라이브러리.
 * 사용 측에선 결과의 camera/gallery 플래그를 보고 그 경로만 실행하면 됨.
 */
export async function requestEvidencePermissions(): Promise<{
  camera: boolean;
  gallery: boolean;
}> {
  const camera = await ImagePicker.requestCameraPermissionsAsync();
  const gallery = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return {
    camera: camera.status === "granted",
    gallery: gallery.status === "granted",
  };
}

/** ActionSheet 옵션 — acceptTypes에 따라 "파일에서 선택" 노출 여부 분기. */
export function buildActionSheetOptions(acceptTypes: EvidenceAcceptType): {
  options: string[];
  cancelButtonIndex: number;
} {
  const base = ["📷 사진 촬영", "🖼 갤러리에서 선택"];
  if (acceptTypes === "imageAndPdf" || acceptTypes === "imageAndDoc") {
    base.push("📄 파일에서 선택 (PDF 등)");
  }
  base.push("취소");
  return { options: base, cancelButtonIndex: base.length - 1 };
}

type ShowActionSheet = (
  options: {
    options: string[];
    cancelButtonIndex: number;
    title?: string;
    tintColor?: string;
  },
  callback: (buttonIndex: number | undefined) => void,
) => void;

interface PickParams {
  evidenceType: FileEvidenceKey;
  acceptTypes: EvidenceAcceptType;
  /** @expo/react-native-action-sheet 의 useActionSheet().showActionSheetWithOptions */
  showActionSheetWithOptions: ShowActionSheet;
}

/**
 * 증거 파일 선택 — ActionSheet로 카메라/갤러리/문서 분기.
 * 반환값: 추가된 파일 배열 또는 null (취소/실패).
 *   - 카메라: 1장
 *   - 갤러리: 다중 선택 (최대 5장)
 *   - 문서: PDF 등 다중 선택
 */
export async function pickEvidenceFile(
  params: PickParams,
): Promise<EvidenceFile[] | null> {
  const { evidenceType, acceptTypes, showActionSheetWithOptions } = params;
  const { options, cancelButtonIndex } = buildActionSheetOptions(acceptTypes);

  return new Promise<EvidenceFile[] | null>((resolve) => {
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: "증거 추가 방법을 선택하세요",
        tintColor: "#1A5FAF",
      },
      (buttonIndex) => {
        if (buttonIndex === undefined || buttonIndex === cancelButtonIndex) {
          resolve(null);
          return;
        }

        void (async () => {
          try {
            // ── 카메라
            if (buttonIndex === 0) {
              const { camera } = await requestEvidencePermissions();
              if (!camera) {
                resolve(null);
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.85,
                allowsEditing: false,
              });
              if (result.canceled || result.assets[0] === undefined) {
                resolve(null);
                return;
              }
              const asset = result.assets[0];
              resolve([
                {
                  id: `file_${Date.now()}_0`,
                  evidenceType,
                  uri: asset.uri,
                  name: `${evidenceType}_${Date.now()}.jpg`,
                  fileType: "image",
                  addedAt: new Date().toISOString(),
                  isAutoCollected: false,
                  thumbnail: asset.uri,
                },
              ]);
              return;
            }

            // ── 갤러리
            if (buttonIndex === 1) {
              const { gallery } = await requestEvidencePermissions();
              if (!gallery) {
                resolve(null);
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.85,
                allowsMultipleSelection: true,
                selectionLimit: 5,
              });
              if (result.canceled || result.assets.length === 0) {
                resolve(null);
                return;
              }
              const stamp = Date.now();
              resolve(
                result.assets.map((asset, i) => ({
                  id: `file_${stamp}_${i}`,
                  evidenceType,
                  uri: asset.uri,
                  name:
                    asset.fileName ?? `${evidenceType}_${stamp}_${i}.jpg`,
                  fileType: "image" as const,
                  addedAt: new Date().toISOString(),
                  isAutoCollected: false,
                  thumbnail: asset.uri,
                })),
              );
              return;
            }

            // ── 문서 (PDF 등) — 옵션 인덱스 2일 때만 노출됨
            if (buttonIndex === 2) {
              const mimeTypes =
                acceptTypes === "imageAndDoc"
                  ? ["image/*", "application/pdf", "*/*"]
                  : ["image/*", "application/pdf"];
              const result = await DocumentPicker.getDocumentAsync({
                type: mimeTypes,
                multiple: true,
                copyToCacheDirectory: true,
              });
              if (
                result.canceled === true ||
                result.assets === null ||
                result.assets === undefined ||
                result.assets.length === 0
              ) {
                resolve(null);
                return;
              }
              const stamp = Date.now();
              resolve(
                result.assets.map((asset, i) => ({
                  id: `file_${stamp}_${i}`,
                  evidenceType,
                  uri: asset.uri,
                  name: asset.name,
                  fileType:
                    asset.mimeType !== undefined &&
                    asset.mimeType.includes("pdf")
                      ? "pdf"
                      : "document",
                  addedAt: new Date().toISOString(),
                  isAutoCollected: false,
                })),
              );
              return;
            }

            resolve(null);
          } catch (error) {
            console.error("[evidence-file-picker] error:", error);
            resolve(null);
          }
        })();
      },
    );
  });
}
