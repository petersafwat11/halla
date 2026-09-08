import { Platform } from "react-native";

export async function appendInvitationImage(form, image) {
  const name = image.name || image.fileName || "invitation.jpg";
  if (Platform.OS === "web") {
    const response = await fetch(image.uri);
    if (!response.ok) throw new Error("INVITATION_IMAGE_READ_FAILED");
    form.append("templateImage", await response.blob(), name);
  } else {
    form.append("templateImage", { uri: image.uri, type: image.type || "image/jpeg", name });
  }
}
