import React from "react";
import Link from "next/link";
import styles from "./button.module.css";

const Button = ({
  variant = "primary",
  size,
  icon,
  title,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  style,
  href,
}) => {
  // Admin templates pages use `variant="danger"` and `size="small"`.
  // Map unknown variants/sizes back to the supported set
  // (primary | secondary, regular | small) so the unstyled fallback
  // never ships in production.
  const safeVariant = ["primary", "secondary", "danger"].includes(variant)
    ? variant
    : "primary";
  const sizeClass = size === "small" ? styles.small || "" : "";
  const buttonClass =
    `${styles.button} ${styles[safeVariant] || styles.primary} ${sizeClass} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={buttonClass} style={style}>
        {icon && <img src={icon} alt="" />}
        {title}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {icon && <img src={icon} alt="" />}
      {title && `${title}`}
    </button>
  );
};

export default Button;
