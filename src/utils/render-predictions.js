export const renderPredictions = (predictions, ctx) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const font = "16px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  predictions.forEach((prediction) => {
    const [x, y, width, height] = prediction["bbox"];

    // Draw bounding box
    ctx.strokeStyle = "#00FFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Draw label background
    ctx.fillStyle = "#00FFFF";
    const text = prediction.class;
    const textWidth = ctx.measureText(text).width;
    const textHeight = parseInt(font, 10);
    ctx.fillRect(x, y, textWidth + 4, textHeight + 4);

    // Draw label text
    ctx.fillStyle = "#000000";
    ctx.fillText(text, x, y);
  });
};
