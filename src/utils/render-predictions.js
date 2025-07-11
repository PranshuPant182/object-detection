import * as tf from "@tensorflow/tfjs";

const COCO_CLASSES = [
  "Flight",
  "Aerobridge Docked",
  "Aerobridge Retracted",
  "Cattering Truck",
  "Cargo And Baggage Truck",
  "Cargo Door",
  "Push Back Machine",
  "Fuel Truck"
];

export const renderPredictions = (predictions, ctx) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const boxColor = "#25e6bf";

  predictions.forEach((prediction) => {
    const [x, y, width, height] = prediction.bbox;
    const text = `${prediction.class} ${(prediction.score * 100).toFixed(2)}%`;

    const clampedX = Math.max(0, x);
    const clampedY = Math.max(0, y);
    const clampedWidth = Math.min(width, ctx.canvas.width - clampedX);
    const clampedHeight = Math.min(height, ctx.canvas.height - clampedY);

    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(clampedX, clampedY, clampedWidth, clampedHeight);

    ctx.fillStyle = boxColor;
    ctx.font = "bold 10px Arial";
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = 18;

    const labelTop = clampedY > 30 ? clampedY - 30 : clampedY + clampedHeight + 5;

    ctx.fillRect(clampedX, labelTop, textWidth + 10, textHeight + 6);

    ctx.fillStyle = "#000000";
    ctx.fillText(text, clampedX + 5, labelTop + textHeight);
  });
};

