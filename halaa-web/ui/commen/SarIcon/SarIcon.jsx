/**
 * Inline SAR currency icon (Saudi Riyal symbol).
 *
 * Renders /public/svg/sar.svg as a plain <img> so it can be sized in em units
 * and inherit the surrounding text color via parent context. Use alongside
 * the numeric price instead of textual "ر.س"/"SAR".
 */
const SarIcon = ({ size = "0.9em", className = "", style = {} }) => {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/svg/sar.svg"
      alt="SAR"
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-block",
        verticalAlign: "-0.15em",
        ...style,
      }}
    />
  );
};

export default SarIcon;
