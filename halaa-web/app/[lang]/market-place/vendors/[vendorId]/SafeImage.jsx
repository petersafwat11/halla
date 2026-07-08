"use client";

import Image from "next/image";
import { useState } from "react";

export default function SafeImage({ src, alt = "", fallbackClassName, fallbackText, ...props }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={fallbackClassName} aria-hidden="true">{fallbackText}</div>;
  return <Image src={src} alt={alt} onError={() => setFailed(true)} {...props} />;
}
