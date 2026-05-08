import React from "react";
import Image from "next/image";
import { FaCheckCircle } from "react-icons/fa";
import styles from "./templatesCards.module.css";

const TemplatesCards = ({ templates, selectedTemplate, onTemplateSelect }) => {
  return (
    <div className={styles.templatesGrid}>
      {templates.map((template) => {
        // ids may be numeric (legacy hardcoded demo IDs) or Mongo
        // ObjectIds (backend-served templates); match either way.
        const isSelected =
          (selectedTemplate?.id && selectedTemplate.id === template.id) ||
          (selectedTemplate?._id && selectedTemplate._id === template._id);

        const src = template.thumbnailUrl || template.src || template.imageUrl;
        const alt = template.name || `Template ${template.id || template._id}`;

        return (
          <div
            key={template.id || template._id}
            className={`${styles.templateCard} ${
              isSelected ? styles.selected : ""
            }`}
            onClick={() => onTemplateSelect(template)}
          >
            <div className={styles.templateCardInner}>
              {isSelected && (
                <div className={styles.checkmark}>
                  <FaCheckCircle />
                </div>
              )}
              {src ? (
                <Image
                  src={src}
                  alt={alt}
                  width={129}
                  height={172}
                  className={styles.templateImage}
                  unoptimized={src.startsWith("blob:") || src.startsWith("data:")}
                />
              ) : (
                <div
                  className={styles.templateImage}
                  style={{ width: 129, height: 172, background: "#eee" }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TemplatesCards;
