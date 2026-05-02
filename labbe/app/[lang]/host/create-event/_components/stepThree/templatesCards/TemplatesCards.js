import React from "react";
import Image from "next/image";
import { FaCheckCircle } from "react-icons/fa";
import styles from "./templatesCards.module.css";

const TemplatesCards = ({ templates, selectedTemplate, onTemplateSelect }) => {
  return (
    <div className={styles.templatesGrid}>
      {templates.map((template) => {
        const isSelected = selectedTemplate?.id === template.id;
        
        return (
          <div
            key={template.id}
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
              <Image
                src={template.src}
                alt={template.name || `Template ${template.id}`}
                width={129}
                height={172}
                className={styles.templateImage}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TemplatesCards;
