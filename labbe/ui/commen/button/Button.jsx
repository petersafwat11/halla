import React from "react";
import Link from "next/link";
import styles from "./button.module.css";

const Button = ({
  variant = "primary",
  icon,
  title,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  style,
  href,
}) => {
  const buttonClass = `${styles.button} ${styles[variant]} ${className}`;

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
