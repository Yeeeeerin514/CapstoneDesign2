import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { apiClient } from "@/shared/api/axios-instance";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { syncFcmToken } from "@/entities/user";

type Mode = "login" | "signup";

interface ParsedAuth {
  token: string | null;
  userId: number | null;
  name: string;
  email: string;
}

/**
 * 백엔드 응답이 token/userId/name/email 필드명을 쓰는 것을 VERIFY-1로 확인했지만,
 * 향후 백엔드가 accessToken·id·username 등으로 바뀌어도 클라이언트가 안전하게
 * 동작하도록 fallback 체인을 둔다. token이나 userId가 둘 다 null이면 호출부에서 거부.
 */
function parseAuthResponse(data: unknown): ParsedAuth {
  const d = (data ?? {}) as Record<string, unknown>;
  const rawUserId = d.userId ?? d.id ?? d.user_id;
  const userId =
    typeof rawUserId === "number"
      ? rawUserId
      : typeof rawUserId === "string" && rawUserId !== ""
        ? Number(rawUserId)
        : null;
  const result: ParsedAuth = {
    token: (d.token as string) ?? (d.accessToken as string) ?? (d.jwt as string) ?? null,
    userId: userId !== null && Number.isFinite(userId) ? userId : null,
    name: (d.name as string) ?? (d.username as string) ?? (d.userName as string) ?? "",
    email: (d.email as string) ?? (d.emailAddress as string) ?? "",
  };
  if (result.token === null || result.userId === null) {
    console.error("[Auth] 응답 필드 누락:", data);
  }
  return result;
}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function submit() {
    if (!email || !password) {
      Alert.alert("입력 오류", "이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const body =
        mode === "login"
          ? { email, password }
          : {
              email,
              password,
              name: name || email.split("@")[0],
              phoneNumber: "",
            };

      const { data } = await apiClient.post(path, body);
      const parsed = parseAuthResponse(data);
      if (parsed.token === null || parsed.userId === null) {
        Alert.alert(
          "로그인 실패",
          "서버 응답이 올바르지 않습니다. 잠시 후 다시 시도해주세요.",
        );
        return;
      }
      setAuth(parsed.token, parsed.userId, parsed.name, parsed.email);
      // FCM 토큰 백그라운드 동기화 — 실패해도 로그인 플로우 블로킹 없음
      void syncFcmToken();
      router.replace("/(tabs)");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "오류가 발생했습니다.";
      Alert.alert("실패", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>안심알바</Text>
      <Text style={styles.sub}>
        {mode === "login" ? "로그인" : "회원가입"}
      </Text>

      {mode === "signup" && (
        <TextInput
          style={styles.input}
          placeholder="이름"
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={submit}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setMode(mode === "login" ? "signup" : "login")}
      >
        <Text style={styles.toggle}>
          {mode === "login"
            ? "계정이 없으신가요? 회원가입"
            : "이미 계정이 있으신가요? 로그인"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  sub: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  btn: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: "#93c5fd" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  toggle: { textAlign: "center", color: "#2563EB", marginTop: 16 },
});
