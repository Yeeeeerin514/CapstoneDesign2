import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import axios from "axios";
import { env } from "@/shared/config/env";
import { useAuthStore } from "@/entities/user/model/auth-store";

type Mode = "login" | "signup";

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
      const url =
        mode === "login"
          ? `${env.apiUrl}/auth/login`
          : `${env.apiUrl}/auth/signup`;
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, name: name || email.split("@")[0], phoneNumber: "" };

      const { data } = await axios.post(url, body);
      setAuth(data.token, data.userId, data.name, data.email);
      router.replace("/(tabs)");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? "오류가 발생했습니다.";
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
