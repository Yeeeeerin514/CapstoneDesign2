import * as ImagePicker from "expo-image-picker";

export interface PickedImage {
  base64: string;
  uri: string;
}

async function ensurePermission(source: "camera" | "library"): Promise<boolean> {
  if (source === "camera") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === "granted";
  }
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
}

function toPickedImage(
  result: ImagePicker.ImagePickerResult,
): PickedImage | null {
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (asset === undefined) return null;
  if (typeof asset.base64 !== "string" || asset.base64.length === 0) {
    return null;
  }
  return { base64: asset.base64, uri: asset.uri };
}

/** 카메라로 캡처. 권한 거부 시 null. */
export async function pickImageFromCamera(): Promise<PickedImage | null> {
  const granted = await ensurePermission("camera");
  if (!granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.7,
  });
  return toPickedImage(result);
}

/** 갤러리에서 선택. 권한 거부 시 null. */
export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const granted = await ensurePermission("library");
  if (!granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.7,
  });
  return toPickedImage(result);
}
