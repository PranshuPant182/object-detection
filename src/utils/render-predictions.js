export const renderPredictions = (predictions, ctx, isMirrored = false) => {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  ctx.clearRect(0, 0, width, height);

  const font = "16px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  predictions.forEach((prediction) => {
    const [x, y, w, h] = prediction.bbox;
    const label = prediction.class;

    ctx.save();

    // Apply mirror transform
    if (isMirrored) {
      ctx.scale(-1, 1);
      ctx.translate(-width, 0);
    }

    // Draw bounding box
    ctx.strokeStyle = "#00FFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Draw label background
    ctx.fillStyle = "#00FFFF";
    const textWidth = ctx.measureText(label).width;
    const textHeight = parseInt(font, 10);
    ctx.fillRect(x, y, textWidth + 4, textHeight + 4);

    // Save mirrored x for text before restoring
    const mirroredX = isMirrored ? width - x - textWidth - 4 : x;

    ctx.restore(); // Remove mirroring before drawing text

    // Draw label text (always non-mirrored)
    ctx.fillStyle = "#000000";
    ctx.fillText(label, mirroredX, y);
  });
};
