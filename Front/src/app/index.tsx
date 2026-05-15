import { Redirect } from "expo-router";
import { useAuthStore } from "@/entities/user/model/auth-store";

export default function Index() {
  const token = useAuthStore((s) => s.token);
  return token ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}
