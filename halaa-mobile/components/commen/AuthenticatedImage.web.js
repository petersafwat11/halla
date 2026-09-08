import React, { useEffect, useState } from "react";
import { Image } from "react-native";

// RN web's Image does not send source.headers. Fetch protected artwork with
// those headers and render a temporary object URL; native Image stays intact.
export default function AuthenticatedImage({ source, onError, ...props }) {
  const uri = source?.uri;
  const headerKey = JSON.stringify(source?.headers || {});
  const needsAuth = !!uri && headerKey !== "{}";
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    if (!needsAuth) return;
    const controller = new AbortController();
    let objectUrl;
    fetch(uri, { headers: JSON.parse(headerKey), signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`Image request failed (${response.status})`); return response.blob(); })
      .then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ uri, headerKey, objectUrl });
      }).catch(error => { if (!controller.signal.aborted) onError?.({ nativeEvent: { error: error.message } }); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // Callback identity must not restart an in-flight image fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, headerKey, needsAuth]);
  const ready = loaded?.uri === uri && loaded?.headerKey === headerKey;
  return <Image {...props} onError={onError} source={needsAuth ? (ready ? { uri: loaded.objectUrl } : undefined) : source} />;
}
