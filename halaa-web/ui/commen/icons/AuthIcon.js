import React from "react";
import Image from "next/image";
import { FiUser, FiMail, FiLock, FiFileText, FiCopy, FiInfo, FiPhone, FiLink, FiInstagram, FiSettings, FiMapPin, FiBriefcase, FiTrash2, FiMessageSquare } from "react-icons/fi";

const icons = {
  "profile.svg": FiUser,
  "profile-circle.svg": FiUser,
  "email.svg": FiMail,
  "password.svg": FiLock,
  "document.svg": FiFileText,
  "document-copy.svg": FiCopy,
  "info-circle.svg": FiInfo,
  "call-calling.svg": FiPhone,
  "link.svg": FiLink,
  "instagram.svg": FiInstagram,
  "setting-2.svg": FiSettings,
  "location.svg": FiMapPin,
  "building-1.svg": FiBriefcase,
  "trash.svg": FiTrash2,
  "quote-circle.svg": FiMessageSquare,
};

// Keep legacy callers compatible while rendering signup icons as inline SVG.
export default function AuthIcon({ src, width = 24, height = 24, alt = "", ...props }) {
  const Icon = src?.includes("auth/") ? icons[src.split("/").pop()] : null;
  return Icon
    ? <Icon {...props} size={width || height} aria-hidden="true" focusable="false" />
    : <Image {...props} src={src} width={width} height={height} alt={alt} />;
}
