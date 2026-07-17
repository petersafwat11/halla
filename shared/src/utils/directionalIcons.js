const OPPOSITE_DIRECTION = {
  back: "forward",
  forward: "back",
  left: "right",
  right: "left",
};

/**
 * Resolve an icon name expressed in logical LTR terms for the active layout.
 * Names without a horizontal direction are returned unchanged.
 */
export const resolveDirectionalIconName = (name, isRTL) => {
  if (!isRTL || typeof name !== "string") return name;

  return name.replace(
    /(^|-)(back|forward|left|right)(?=-|$)/,
    (match, separator, direction) =>
      `${separator}${OPPOSITE_DIRECTION[direction]}`
  );
};
