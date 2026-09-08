const BUSINESS_COVER = Object.freeze({
  bytes: 10 * 1024 * 1024,
  pixels: 40000000,
  side: 8192,
  minWidth: 960,
  minHeight: 540,
  outputWidth: 1600,
  outputHeight: 900,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
});

function validCoverDimensions(width, height) {
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width >= BUSINESS_COVER.minWidth &&
    height >= BUSINESS_COVER.minHeight &&
    width <= BUSINESS_COVER.side &&
    height <= BUSINESS_COVER.side &&
    width * height <= BUSINESS_COVER.pixels
  );
}

// Use integer 16:9 rectangles on both platforms, with no output enlargement.
function coverCrop(width, height, x = 0.5, y = 0.5, zoom = 1) {
  const units = Math.floor(
    Math.min(width / 16, height / 9) / Math.max(1, zoom),
  );
  const cropWidth = units * 16;
  const cropHeight = units * 9;
  return {
    originX: Math.floor((width - cropWidth) * Math.min(1, Math.max(0, x))),
    originY: Math.floor((height - cropHeight) * Math.min(1, Math.max(0, y))),
    width: cropWidth,
    height: cropHeight,
    outputWidth: Math.min(BUSINESS_COVER.outputWidth, cropWidth),
    outputHeight: Math.min(BUSINESS_COVER.outputHeight, cropHeight),
  };
}

module.exports = { BUSINESS_COVER, validCoverDimensions, coverCrop };
