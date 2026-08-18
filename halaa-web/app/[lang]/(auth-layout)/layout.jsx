"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import ImageCarousel from "@/ui/commen/imageCarousel/ImageCarousel";
import LangToggle from "@/ui/common/LangToggle";
import { usePathname } from "next/navigation";
import LegalSurfaceLinks from "@/ui/common/LegalSurfaceLinks";

const Page = ({ children }) => {
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";

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
          <header className={styles.authHeader}>
            <div className={styles.authHeaderInner}>
              <Link href={`/${lang}`} className={styles.authLogo} aria-label="Halaa">
                <Image src="/logo.png" alt="Halaa" width={50} height={50} priority />
              </Link>
              <LangToggle className={styles.authLangToggle} />
            </div>
          </header>
          {children}
          <LegalSurfaceLinks
            lang={lang}
            documents={["terms", "privacy", "community-rules", "support"]}
          />
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
