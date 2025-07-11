// // export const renderPredictions = (predictions, ctx) => {
// //   ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

// //   const font = "16px sans-serif";
// //   ctx.font = font;
// //   ctx.textBaseline = "top";

// //   predictions.forEach((prediction) => {
// //     const [x, y, width, height] = prediction["bbox"];

// //     // Bounding box
// //     ctx.strokeStyle = "#00FFFF";
// //     ctx.lineWidth = 2;
// //     ctx.strokeRect(x, y, width, height);

// //     // Draw label background
// //     ctx.fillStyle = "#00FFFF";
// //     const textWidth = ctx.measureText(prediction.class).width;
// //     const textHeight = parseInt(font, 10);
// //     ctx.fillRect(x, y, textWidth + 4, textHeight + 4);

// //     // Draw label text
// //     ctx.fillStyle = "#000000";
// //     ctx.fillText(prediction.class, x + 2, y + 2);
// //   });
// // };


// export const renderPredictions = (outputTensor, ctx, canvasWidth, canvasHeight) => {
//   const outputArray = outputTensor.arraySync(); // ensure it's a native JS array

//   let predictions;

//   // Check if transposition is needed: shape [1, 84, 8400] → transpose → [1, 8400, 84]
//   if (outputArray.length === 1 && outputArray[0].length === 84) {
//     const transposed = tf.tensor(outputArray[0]).transpose().arraySync(); // [8400, 84]
//     predictions = transposed;
//   } else if (outputArray.length === 1 && outputArray[0].length === 8400) {
//     predictions = outputArray[0]; // already [8400, 84]
//   } else {
//     console.error("Unexpected output tensor shape:", outputTensor.shape);
//     return;
//   }

//   const confidenceThreshold = 0.5;

//   predictions.forEach((pred) => {
//     const [x, y, w, h, objScore, ...classScores] = pred;
//     const classIndex = classScores.indexOf(Math.max(...classScores));
//     const confidence = objScore * classScores[classIndex];

//     if (confidence > confidenceThreshold) {
//       const left = (x - w / 2) * canvasWidth;
//       const top = (y - h / 2) * canvasHeight;
//       const boxWidth = w * canvasWidth;
//       const boxHeight = h * canvasHeight;

//       const label = `Class ${classIndex} (${(confidence * 100).toFixed(1)}%)`;

//       ctx.strokeStyle = "#00FFFF";
//       ctx.lineWidth = 2;
//       ctx.strokeRect(left, top, boxWidth, boxHeight);

//       ctx.fillStyle = "#00FFFF";
//       ctx.font = "16px sans-serif";
//       const textWidth = ctx.measureText(label).width;
//       ctx.fillRect(left, top, textWidth + 4, 20);

//       ctx.fillStyle = "#000000";
//       ctx.fillText(label, left + 2, top + 2);
//     }
//   });
// };




// import * as tf from "@tensorflow/tfjs";

// // COCO dataset class names
// const COCO_CLASSES = [
//   "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
//   "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
//   "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
//   "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
//   "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
//   "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
//   "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
//   "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
//   "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
//   "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
//   "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
//   "toothbrush"
// ];

// export const renderPredictions = (outputTensor, ctx, canvasWidth, canvasHeight) => {
//   const outputArray = outputTensor.arraySync(); // Shape: [1, 84, 2100]

//   console.log("Render - Output tensor shape:", outputTensor.shape);
//   console.log("Render - Canvas dimensions:", canvasWidth, "x", canvasHeight);

//   // For YOLOv11 output format [1, 84, 2100], we need to transpose to [1, 2100, 84]
//   const predictions = tf.tensor(outputArray[0]).transpose().arraySync(); // [2100, 84]

//   const confidenceThreshold = 0.5;
//   const detectedObjects = [];

//   // Model input size (what the model was trained on)
//   const modelInputSize = 320;

//   predictions.forEach((pred, index) => {
//     if (!Array.isArray(pred) || pred.length < 84) return;

//     // YOLOv11 format: [x_center, y_center, width, height, class_0_conf, class_1_conf, ..., class_79_conf]
//     const [x, y, w, h, ...classScores] = pred;

//     if (classScores.length === 0) return;

//     const maxClassScore = Math.max(...classScores);
//     const classIndex = classScores.indexOf(maxClassScore);
//     const confidence = maxClassScore;

//     if (confidence > confidenceThreshold) {
//       // Scale coordinates from model input size (320x320) to actual image size
//       const scaleX = canvasWidth / modelInputSize;
//       const scaleY = canvasHeight / modelInputSize;

//       const centerX = x * scaleX;
//       const centerY = y * scaleY;
//       const boxWidth = w * scaleX;
//       const boxHeight = h * scaleY;

//       const left = centerX - boxWidth / 2;
//       const top = centerY - boxHeight / 2;

//       const className = COCO_CLASSES[classIndex] || `Class ${classIndex}`;

//       detectedObjects.push({
//         confidence,
//         left,
//         top,
//         boxWidth,
//         boxHeight,
//         className,
//         rawCoords: { x, y, w, h }
//       });
//     }
//   });

//   // Sort by confidence and render only the highest confidence detection
//   const sortedObjects = detectedObjects.sort((a, b) => b.confidence - a.confidence);

//   if (sortedObjects.length > 0) {
//     const bestDetection = sortedObjects[0];
//     const { left, top, boxWidth, boxHeight, className, confidence, rawCoords } = bestDetection;

//     console.log("Rendering detection with raw coords:", rawCoords);
//     console.log("Final render coords:", { left, top, boxWidth, boxHeight });

//     // Clamp coordinates to canvas bounds for safety
//     const clampedLeft = Math.max(0, left);
//     const clampedTop = Math.max(0, top);
//     const clampedWidth = Math.min(boxWidth, canvasWidth - clampedLeft);
//     const clampedHeight = Math.min(boxHeight, canvasHeight - clampedTop);

//     console.log("Clamped coords:", { clampedLeft, clampedTop, clampedWidth, clampedHeight });

//     const label = `${className} (${(confidence * 100).toFixed(1)}%)`;

//     // Draw bounding box
//     ctx.strokeStyle = "#00FFFF";
//     ctx.lineWidth = 3;
//     ctx.strokeRect(clampedLeft, clampedTop, clampedWidth, clampedHeight);

//     // Draw label background
//     ctx.fillStyle = "#00FFFF";
//     ctx.font = "18px sans-serif";
//     const textWidth = ctx.measureText(label).width;
//     const labelTop = clampedTop > 25 ? clampedTop - 25 : clampedTop + clampedHeight + 5;
//     ctx.fillRect(clampedLeft, labelTop, textWidth + 8, 25);

//     // Draw label text
//     ctx.fillStyle = "#000000";
//     ctx.fillText(label, clampedLeft + 4, labelTop + 18);

//     console.log("Successfully rendered bounding box");
//   } else {
//     console.log("No detections to render");
//   }
// };



// import * as tf from "@tensorflow/tfjs";

// // COCO dataset class names
// const COCO_CLASSES = [
//   "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
//   "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
//   "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
//   "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
//   "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
//   "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
//   "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
//   "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
//   "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
//   "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
//   "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
//   "toothbrush"
// ];

// export const renderPredictions = (outputTensor, ctx, canvasWidth, canvasHeight) => {
//   const outputArray = outputTensor.arraySync(); // Shape: [1, 84, 2100]

//   // For YOLOv11 output format [1, 84, 2100], we need to transpose to [1, 2100, 84]
//   const predictions = tf.tensor(outputArray[0]).transpose().arraySync(); // [2100, 84]

//   const confidenceThreshold = 0.5;
//   const detectedObjects = [];

//   // Model input size (what the model was trained on)
//   const modelInputSize = 320;

//   predictions.forEach((pred, index) => {
//     if (!Array.isArray(pred) || pred.length < 84) return;

//     // YOLOv11 format: [x_center, y_center, width, height, class_0_conf, class_1_conf, ..., class_79_conf]
//     const [x, y, w, h, ...classScores] = pred;

//     if (classScores.length === 0) return;

//     const maxClassScore = Math.max(...classScores);
//     const classIndex = classScores.indexOf(maxClassScore);
//     const confidence = maxClassScore;

//     if (confidence > confidenceThreshold) {
//       // Scale coordinates from model input size (320x320) to actual image size
//       const scaleX = canvasWidth / modelInputSize;
//       const scaleY = canvasHeight / modelInputSize;

//       const centerX = x * scaleX;
//       const centerY = y * scaleY;
//       const boxWidth = w * scaleX;
//       const boxHeight = h * scaleY;

//       const left = centerX - boxWidth / 2;
//       const top = centerY - boxHeight / 2;

//       const className = COCO_CLASSES[classIndex] || `Class ${classIndex}`;

//       detectedObjects.push({
//         confidence,
//         left,
//         top,
//         boxWidth,
//         boxHeight,
//         className,
//         rawCoords: { x, y, w, h },
//         bbox: { x: left, y: top, width: boxWidth, height: boxHeight }
//       });
//     }
//   });

//   // Apply Non-Maximum Suppression to remove overlapping detections
//   const nmsDetections = applyNMSRender(detectedObjects, 0.4);


//   // Colors for different detections
//   const colors = ['#00FFFF', '#FF00FF', '#FFFF00', '#FF6600', '#00FF00', '#FF0000', '#0000FF', '#FF69B4'];

//   // Render all detections after NMS
//   nmsDetections.forEach((detection, index) => {
//     const { left, top, boxWidth, boxHeight, className, confidence } = detection;

//     // Clamp coordinates to canvas bounds for safety
//     const clampedLeft = Math.max(0, left);
//     const clampedTop = Math.max(0, top);
//     const clampedWidth = Math.min(boxWidth, canvasWidth - clampedLeft);
//     const clampedHeight = Math.min(boxHeight, canvasHeight - clampedTop);

//     const label = `${className} (${(confidence * 100).toFixed(1)}%)`;
//     const color = colors[index % colors.length];

//     // Draw bounding box
//     ctx.strokeStyle = color;
//     ctx.lineWidth = 3;
//     ctx.strokeRect(clampedLeft, clampedTop, clampedWidth, clampedHeight);

//     // Draw label background
//     ctx.fillStyle = color;
//     ctx.font = "16px sans-serif";
//     const textWidth = ctx.measureText(label).width;
//     const labelTop = clampedTop > 25 ? clampedTop - 25 : clampedTop + clampedHeight + 5;
//     ctx.fillRect(clampedLeft, labelTop, textWidth + 8, 25);

//     // Draw label text
//     ctx.fillStyle = "#000000";
//     ctx.fillText(label, clampedLeft + 4, labelTop + 18);
//   });

// };

// // Non-Maximum Suppression for rendering
// const applyNMSRender = (detections, iouThreshold) => {
//   if (detections.length === 0) return [];

//   // Sort by confidence (highest first)
//   const sortedDetections = [...detections].sort((a, b) => b.confidence - a.confidence);
//   const keepDetections = [];

//   while (sortedDetections.length > 0) {
//     const current = sortedDetections.shift();
//     keepDetections.push(current);

//     // Remove detections that have high IoU with current detection
//     for (let i = sortedDetections.length - 1; i >= 0; i--) {
//       const iou = calculateIoURender(current.bbox, sortedDetections[i].bbox);
//       if (iou > iouThreshold) {
//         sortedDetections.splice(i, 1);
//       }
//     }
//   }

//   return keepDetections;
// };

// // Calculate Intersection over Union for rendering
// const calculateIoURender = (box1, box2) => {
//   const x1 = Math.max(box1.x, box2.x);
//   const y1 = Math.max(box1.y, box2.y);
//   const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
//   const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

//   if (x2 <= x1 || y2 <= y1) return 0;

//   const intersection = (x2 - x1) * (y2 - y1);
//   const area1 = box1.width * box1.height;
//   const area2 = box2.width * box2.height;
//   const union = area1 + area2 - intersection;

//   return intersection / union;
// };





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
  const confidenceThreshold = 0.65; // Lowered from 0.0 to 0.01
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