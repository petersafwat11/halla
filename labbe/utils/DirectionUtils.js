import { i18nRouterConfig } from "@/localization/i18nRouterConfig";

// Utility functions for direction handling
export const DirectionUtils = {
  // Get direction for a given language
  getDirection: (lang) => i18nRouterConfig.getDirection(lang),

  // Check if language is RTL
  isRTL: (lang) => i18nRouterConfig.isRTL(lang),

  // Get opposite direction
  getOppositeDirection: (direction) => (direction === "rtl" ? "ltr" : "rtl"),

  // Get text alignment based on direction
  getTextAlign: (direction, align = "start") => {
    if (align === "start") {
      return direction === "rtl" ? "right" : "left";
    } else if (align === "end") {
      return direction === "rtl" ? "left" : "right";
    }
    return align;
  },

  // Get margin/padding property for direction-aware spacing
  getDirectionalProperty: (direction, property, side) => {
    const mapping = {
      "margin-left": direction === "rtl" ? "margin-right" : "margin-left",
      "margin-right": direction === "rtl" ? "margin-left" : "margin-right",
      "padding-left": direction === "rtl" ? "padding-right" : "padding-left",
      "padding-right": direction === "rtl" ? "padding-left" : "padding-right",
      left: direction === "rtl" ? "right" : "left",
      right: direction === "rtl" ? "left" : "right",
    };

    const key = `${property}-${side}`;
    return mapping[key] || `${property}-${side}`;
  },

  // Generate direction-aware CSS classes
  getDirectionalClasses: (direction, baseClasses = "") => {
    const directionClass = direction === "rtl" ? "rtl" : "ltr";
    return `${baseClasses} ${directionClass}`.trim();
  },
};

// React component for conditional rendering based on direction
export const DirectionProvider = ({ children, direction, lang }) => {
  const currentDirection =
    direction || (lang ? DirectionUtils.getDirection(lang) : "ltr");

  return (
    <div className={`direction-${currentDirection}`} dir={currentDirection}>
      {children}
    </div>
  );
};

// React component for RTL-only content
export const RTLOnly = ({ children, lang }) => {
  const isRTL = lang ? DirectionUtils.isRTL(lang) : false;
  return isRTL ? children : null;
};

// React component for LTR-only content
export const LTROnly = ({ children, lang }) => {
  const isRTL = lang ? DirectionUtils.isRTL(lang) : false;
  return !isRTL ? children : null;
};

export default DirectionUtils;
 