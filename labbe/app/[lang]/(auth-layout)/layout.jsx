"use client";
import React from "react";
import styles from "./page.module.css";
import ImageCarousel from "@/ui/commen/imageCarousel/ImageCarousel";
import LangToggle from "@/ui/common/LangToggle";
import { usePathname } from "next/navigation";

const Page = ({ children }) => {
  const pathname = usePathname();

  const shouldShowSlider = !pathname.includes("/signup/continue-signup");

  return (
    <div className={"page"}>
      <div className={styles.container}>
        <div
          style={{
            width: pathname.includes("/signup/continue-signup") ? "100%" : "",
          }}
          className={styles.right}
        >
          <div className={styles.langBar}>
            <LangToggle className={styles.langToggle} />
          </div>
          {children}
        </div>
        {shouldShowSlider && (
          <div className={styles.left}>
            <ImageCarousel />
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
