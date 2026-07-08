"use client";
import React from "react";
import styles from "./commentSection.module.css";

// A compact, dependency-free emoji palette. Covers the common reactions
// guests reach for on a celebration post.
const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘",
  "😎", "🤩", "🥳", "😇", "🙂", "😅", "😢", "😭",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💖",
  "👍", "👏", "🙌", "🤲", "🙏", "💪", "🎉", "🎊",
  "🌹", "💐", "🌸", "✨", "🌟", "🔥", "🥂", "🎂",
];

const EmojiPicker = ({ onSelect, onClose }) => {
  return (
    <>
      <div className={styles.emojiBackdrop} onClick={onClose} />
      <div className={styles.emojiPopover} role="menu">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className={styles.emojiOption}
            onClick={() => onSelect(e)}
          >
            {e}
          </button>
        ))}
      </div>
    </>
  );
};

export default EmojiPicker;
