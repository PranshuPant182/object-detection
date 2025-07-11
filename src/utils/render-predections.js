// WORKING CODE FOR EYE ON RAMP 360
import * as tf from "@tensorflow/tfjs";

const COCO_CLASSES = [
  "Aerobridge Docked",
  "Aerobridge Retracted",
  "Cattering Truck",
  "Flight",
  "Cargo And Baggage Truck",
  "Cargo Door",
  "Push Back Machine",
];


export const renderPredictions = (outputTensor, ctx, canvasWidth, canvasHeight) => {
  const outputArray = outputTensor.arraySync(); // [1, 12, 2100]
  const predictions = tf.tensor(outputArray[0]).transpose().arraySync(); // [2100, 12]

  // Adjusted confidence threshold - try lower values first
  const confidenceThreshold = 0.6; // Lowered from 0.0 to 0.01
  const modelInputSize = 320;

  const detectedObjects = [];

  // console.log("🔍 Total Raw Predictions:", predictions.length);
  // console.log("🎯 Confidence Threshold:", confidenceThreshold);

  // Debug: Check first few predictions
  // console.log("📊 First 5 predictions structure:");
  predictions.slice(0, 5).forEach((pred, i) => {
    if (Array.isArray(pred) && pred.length >= 5) {
      console.log(`Prediction ${i}:`, {
        coords: pred.slice(0, 4),
        objConf: pred[4],
        classScores: pred.slice(5)
      });
    }
  });

  let validPredictions = 0;
  let filteredByConfidence = 0;

  predictions.forEach((pred, i) => {
    if (!Array.isArray(pred) || pred.length !== 12) {
      console.log(`⚠️ Invalid prediction ${i}: length=${pred?.length}`);
      return;
    }

    validPredictions++;

    const [x, y, w, h, objConf, ...classScores] = pred;

    if (classScores.length !== COCO_CLASSES.length) {
      console.log(`⚠️ Class scores mismatch for prediction ${i}: expected ${COCO_CLASSES.length}, got ${classScores.length}`);
      return;
    }

    // Check for NaN or invalid values
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h) || isNaN(objConf)) {
      console.log(`⚠️ NaN values in prediction ${i}`);
      return;
    }

    const maxClassScore = Math.max(...classScores);
    const classIndex = classScores.indexOf(maxClassScore);

    // Two different confidence calculation methods to try
    const method1Confidence = objConf * maxClassScore;
    const method2Confidence = Math.max(objConf, maxClassScore);
    const method3Confidence = objConf; // Use object confidence only

    // Try different confidence calculation methods
    let finalConfidence = method1Confidence;

    // If method 1 gives very low values, try alternatives
    if (method1Confidence < 0.001 && method2Confidence > method1Confidence) {
      finalConfidence = method2Confidence;
    }

    if (finalConfidence < 0.001 && method3Confidence > finalConfidence) {
      finalConfidence = method3Confidence;
    }

    // Debug confidence calculations for first few predictions
    if (i < 10) {
      console.log(`🔍 Prediction ${i} confidence methods:`, {
        objConf: objConf.toFixed(6),
        maxClassScore: maxClassScore.toFixed(6),
        method1: method1Confidence.toFixed(6),
        method2: method2Confidence.toFixed(6),
        method3: method3Confidence.toFixed(6),
        final: finalConfidence.toFixed(6),
        className: COCO_CLASSES[classIndex]
      });
    }

    if (finalConfidence > confidenceThreshold) {
      const scaleX = canvasWidth / modelInputSize;
      const scaleY = canvasHeight / modelInputSize;

      const centerX = x * scaleX;
      const centerY = y * scaleY;
      const boxWidth = w * scaleX;
      const boxHeight = h * scaleY;

      const left = centerX - boxWidth / 2;
      const top = centerY - boxHeight / 2;

      const className = COCO_CLASSES[classIndex] || `Class ${classIndex}`;

      const detection = {
        confidence: finalConfidence,
        left,
        top,
        boxWidth,
        boxHeight,
        className,
        rawCoords: { x, y, w, h },
        bbox: { x: left, y: top, width: boxWidth, height: boxHeight }
      };

      detectedObjects.push(detection);

      // console.log(`✅ Detection ${detectedObjects.length}:`, {
      //   className,
      //   confidence: finalConfidence.toFixed(6),
      //   objConf: objConf.toFixed(6),
      //   maxClassScore: maxClassScore.toFixed(6),
      //   bbox: detection.bbox
      // });
    } else {
      filteredByConfidence++;
    }
  });

  // console.log(`📈 Statistics:`, {
  //   totalPredictions: predictions.length,
  //   validPredictions,
  //   filteredByConfidence,
  //   detectedObjects: detectedObjects.length
  // });

  // Apply NMS with a more lenient threshold
  const nmsDetections = applyNMSRender(detectedObjects, 0.5);

  // console.log("🎯 Detections after NMS:", nmsDetections.length);
  // nmsDetections.forEach((det, i) => {
  //   console.log(`→ Final ${i + 1}:`, {
  //     className: det.className,
  //     confidence: det.confidence.toFixed(6),
  //     bbox: det.bbox
  //   });
  // });

  // Enhanced rendering with better visibility
  const colors = ['#25e6bf'];

  nmsDetections.forEach((detection, index) => {
    const { left, top, boxWidth, boxHeight, className, confidence } = detection;

    const clampedLeft = Math.max(0, left);
    const clampedTop = Math.max(0, top);
    const clampedWidth = Math.min(boxWidth, canvasWidth - clampedLeft);
    const clampedHeight = Math.min(boxHeight, canvasHeight - clampedTop);

    const label = `${className} (${(confidence * 100).toFixed(2)}%)`;
    const color = colors[index % colors.length];

    // Draw bounding box with thicker lines
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(clampedLeft, clampedTop, clampedWidth, clampedHeight);

    // Draw label background
    ctx.fillStyle = color;
    ctx.font = "bold 10px Arial";
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = 18;

    const labelTop = clampedTop > 30 ? clampedTop - 30 : clampedTop + clampedHeight + 5;

    // Background for text
    ctx.fillRect(clampedLeft, labelTop, textWidth + 10, textHeight + 6);

    // Draw text
    ctx.fillStyle = "#000000";
    ctx.fillText(label, clampedLeft + 5, labelTop + textHeight);
  });

  // Return detection results for the component
  return nmsDetections;
};

// Enhanced Non-Maximum Suppression for rendering
const applyNMSRender = (detections, iouThreshold) => {
  if (detections.length === 0) return [];

  const sortedDetections = [...detections].sort((a, b) => b.confidence - a.confidence);
  const keepDetections = [];

  // console.log(`🔄 Starting NMS with ${sortedDetections.length} detections, IoU threshold: ${iouThreshold}`);

  while (sortedDetections.length > 0) {
    const current = sortedDetections.shift();
    keepDetections.push(current);

    // console.log(`✅ Keeping detection: ${current.className} (${current.confidence.toFixed(6)})`);

    for (let i = sortedDetections.length - 1; i >= 0; i--) {
      const iou = calculateIoURender(current.bbox, sortedDetections[i].bbox);
      if (iou > iouThreshold) {
        // console.log(`❌ Suppressing detection: ${sortedDetections[i].className} (IoU: ${iou.toFixed(3)})`);
        sortedDetections.splice(i, 1);
      }
    }
  }

  return keepDetections;
};

// Enhanced Calculate Intersection over Union for rendering
const calculateIoURender = (box1, box2) => {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  if (x2 <= x1 || y2 <= y1) return 0;

  const intersection = (x2 - x1) * (y2 - y1);
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const union = area1 + area2 - intersection;

  return intersection / union;
};