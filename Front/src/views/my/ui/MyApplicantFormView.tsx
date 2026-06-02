import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import type { ApplicantInfo } from "@/entities/report";
import {
  clearApplicantInfo,
  emptyApplicantInfo,
  loadApplicantInfo,
  saveApplicantInfo,
} from "@/features/applicant-info";

interface MyApplicantFormViewProps {
  onBack: () => void;
  /** 저장 직후 호출 (예: PDF wizard에서 진입했을 때 사용). */
  onSaved?: (info: ApplicantInfo) => void;
}

/**
 * 진정인(본인) 정보 입력 화면 — 로컬(AsyncStorage)에만 저장.
 * 백엔드에 절대 전송되지 않음. 진정서 PDF 생성 시점에 메모리로 읽혀 채워짐.
 */
export function MyApplicantFormView({
  onBack,
  onSaved,
}: MyApplicantFormViewProps): JSX.Element {
  const [info, setInfo] = useState<ApplicantInfo>(emptyApplicantInfo());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const existing = await loadApplicantInfo();
      if (existing !== null) setInfo(existing);
      setLoading(false);
    })();
  }, []);

  const patch = (k: keyof ApplicantInfo, v: string | boolean): void => {
    setInfo((prev) => ({ ...prev, [k]: v }));
  };

  const canSave = info.fullName.length > 0 && info.address.length > 0;

  const handleSave = async (): Promise<void> => {
    if (!canSave) {
      Alert.alert("입력 확인", "성명과 주소는 필수입니다.");
      return;
    }
    await saveApplicantInfo(info);
    Alert.alert("저장됨", "진정인 정보가 이 기기에 저장되었어요.");
    if (onSaved !== undefined) onSaved(info);
  };

  const handleClear = (): void => {
    Alert.alert(
      "정보 삭제",
      "이 기기에 저장된 진정인 정보를 모두 삭제할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            void clearApplicantInfo();
            setInfo(emptyApplicantInfo());
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      <ScreenHeader showLogo />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          gap: 8,
        }}
      >
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          진정인 정보 (본인)
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            backgroundColor: "#EBF3FF",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            flexDirection: "row",
            gap: 6,
            alignItems: "flex-start",
            borderWidth: 1,
            borderColor: "#B5D4F4",
          }}
        >
          <Ionicons
            name="lock-closed"
            size={14}
            color="#185FA5"
            style={{ marginTop: 1 }}
          />
          <Text
            style={{ flex: 1, fontSize: 12, color: "#185FA5", lineHeight: 18 }}
          >
            {
              "여기 입력한 정보는 이 기기에만 저장되며 서버로 전송되지 않습니다. 진정서 PDF 생성 시에만 사용됩니다."
            }
          </Text>
        </View>

        {loading ? (
          <Text style={{ color: "#94A3B8", textAlign: "center", padding: 24 }}>
            불러오는 중...
          </Text>
        ) : (
          <>
            <LabeledInput
              label="성명"
              required
              value={info.fullName}
              onChange={(v) => patch("fullName", v)}
              placeholder="예: 홍길동"
            />
            <LabeledInput
              label="주민등록번호"
              value={info.rrn}
              onChange={(v) => patch("rrn", v)}
              placeholder="000000-0000000"
              keyboardType="default"
            />
            <LabeledInput
              label="주소"
              required
              value={info.address}
              onChange={(v) => patch("address", v)}
              placeholder="예: 서울 강남구 ..."
            />
            <LabeledInput
              label="전화번호"
              value={info.phone}
              onChange={(v) => patch("phone", v)}
              placeholder="02-1234-5678"
              keyboardType="phone-pad"
            />
            <LabeledInput
              label="휴대전화"
              value={info.mobile}
              onChange={(v) => patch("mobile", v)}
              placeholder="010-1234-5678"
              keyboardType="phone-pad"
            />
            <LabeledInput
              label="이메일"
              value={info.email}
              onChange={(v) => patch("email", v)}
              placeholder="example@email.com"
              keyboardType="default"
            />

            <ToggleRow
              label="처리 결과를 SMS·이메일로 받기"
              value={info.wantsResultNotice}
              onChange={(v) => patch("wantsResultNotice", v)}
            />
            <ToggleRow
              label="노동지청 별도 안내 수신"
              value={info.wantsLaborOfficeNotice}
              onChange={(v) => patch("wantsLaborOfficeNotice", v)}
            />

            <Pressable
              onPress={() => void handleSave()}
              disabled={!canSave}
              style={{
                marginTop: 20,
                backgroundColor: canSave ? "#3182F6" : "#CBD5E1",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
              >
                저장하기
              </Text>
            </Pressable>

            <Pressable
              onPress={handleClear}
              style={{
                marginTop: 8,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#DC2626", fontSize: 13, fontWeight: "600" }}>
                이 기기에서 정보 삭제
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LabeledInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "numeric";
}): JSX.Element {
  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 6,
        }}
      >
        <Text style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}>
          {label}
        </Text>
        {required === true ? (
          <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "600" }}>
            *
          </Text>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType ?? "default"}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 14,
          color: "#0F172A",
        }}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      <Text style={{ fontSize: 13, color: "#0F172A", flex: 1, paddingRight: 8 }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#CBD5E1", true: "#3182F6" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
