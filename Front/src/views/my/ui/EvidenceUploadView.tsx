/**
 * 증빙 자료 업로드 화면 — 멘토 자격(EVIDENCE_UPLOAD) 검증용.
 *
 * 1) 사용자가 시정지시서·입금증·합의서 등 이미지/PDF 선택
 * 2) S3 업로드 → URL 반환
 * 3) 업로드한 URL들을 모아서 MentorRegisterView로 진입 (verification=EVIDENCE_UPLOAD)
 */
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ScreenHeader, colors, radius, spacing, typography } from "@/shared/ui";
import { uploadMentorEvidence } from "@/entities/mentor";
import { MentorRegisterView } from "./MentorRegisterView";

interface Props {
  onBack: () => void;
}

interface EvidenceItem {
  uri: string;
  url?: string;        // S3 업로드 완료 후 채워짐
  uploading?: boolean;
  error?: string;
}

export function EvidenceUploadView({ onBack }: Props): JSX.Element {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [proceeding, setProceeding] = useState(false);

  async function pickFromLibrary(): Promise<void> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      notify("권한 필요", "사진 접근 권한을 허용해주세요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (result.canceled || result.assets[0] === undefined) return;
    const asset = result.assets[0];
    const newItem: EvidenceItem = { uri: asset.uri, uploading: true };
    setItems((prev) => [...prev, newItem]);

    try {
      // 웹은 fetch+blob, 네이티브는 RN multipart 객체
      let fileObj: File | Blob;
      if (Platform.OS === "web") {
        const resp = await fetch(asset.uri);
        fileObj = await resp.blob();
      } else {
        fileObj = {
          uri: asset.uri,
          type: "image/jpeg",
          name: `evidence-${Date.now()}.jpg`,
        } as unknown as Blob;
      }
      const url = await uploadMentorEvidence(fileObj);
      setItems((prev) =>
        prev.map((it) => (it.uri === asset.uri ? { ...it, url, uploading: false } : it)),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "업로드 실패";
      setItems((prev) =>
        prev.map((it) => (it.uri === asset.uri ? { ...it, uploading: false, error: msg } : it)),
      );
    }
  }

  function removeAt(uri: string): void {
    setItems((prev) => prev.filter((it) => it.uri !== uri));
  }

  const uploadedUrls = items.map((it) => it.url).filter((u): u is string => typeof u === "string");
  const allUploaded = items.length > 0 && uploadedUrls.length === items.length;

  if (proceeding) {
    return (
      <MentorRegisterView
        onBack={() => setProceeding(false)}
        verification={{
          method: "EVIDENCE_UPLOAD",
          evidenceUrls: uploadedUrls,
        }}
        onSaved={onBack}
      />
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader showLogo />
      <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: spacing.sm }}>
        <Pressable onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={typography.title1}>증빙 자료 업로드</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <View
          style={{
            backgroundColor: colors.primaryLight,
            borderRadius: radius.md,
            padding: 14,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
              어떤 자료를 올리면 되나요?
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.primary, lineHeight: 18 }}>
            ① 노동청 시정지시서 / 명령서{"\n"}
            ② 체불 임금 입금 내역 (통장 사본){"\n"}
            ③ 합의서 또는 합의 결과 문서{"\n"}
            ④ 노무사·변호사 상담 기록{"\n\n"}
            업로드된 자료는 멘토 풀에 공개되지 않으며, 관리자 검토 후 자격 부여에만 사용됩니다.
          </Text>
        </View>

        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
          업로드한 자료 ({items.length}개)
        </Text>

        {items.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: radius.md,
              padding: spacing.xl,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: "dashed",
              alignItems: "center",
            }}
          >
            <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>
              자료를 1개 이상 업로드해주세요
            </Text>
          </View>
        ) : (
          items.map((it) => (
            <View
              key={it.uri}
              style={{
                backgroundColor: "#fff",
                borderRadius: radius.md,
                padding: 12,
                marginBottom: 8,
                borderWidth: 0.5,
                borderColor: colors.border,
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
              }}
            >
              <Image
                source={{ uri: it.uri }}
                style={{ width: 56, height: 56, borderRadius: 8 }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>
                  {it.uploading === true
                    ? "업로드 중..."
                    : it.url !== undefined
                      ? "✓ 업로드 완료"
                      : "✗ 실패"}
                </Text>
                {it.error !== undefined && (
                  <Text style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>{it.error}</Text>
                )}
                {it.url !== undefined && (
                  <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                    {it.url.substring(0, 60)}…
                  </Text>
                )}
              </View>
              {it.uploading === true ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Pressable onPress={() => removeAt(it.uri)}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          ))
        )}

        <Pressable
          onPress={pickFromLibrary}
          style={{
            marginTop: 12,
            paddingVertical: 12,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: "#fff",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
            자료 추가하기
          </Text>
        </Pressable>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          backgroundColor: "#fff",
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          padding: spacing.lg,
        }}
      >
        <Pressable
          onPress={() => {
            if (!allUploaded) {
              notify("업로드 미완료", "모든 자료가 업로드된 후 다음 단계로 진행할 수 있어요.");
              return;
            }
            setProceeding(true);
          }}
          disabled={!allUploaded}
          style={{
            paddingVertical: 14,
            borderRadius: radius.md,
            alignItems: "center",
            backgroundColor: allUploaded ? colors.primary : "#9CA3AF",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            다음 — 멘토 프로필 입력
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function notify(title: string, message: string): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
