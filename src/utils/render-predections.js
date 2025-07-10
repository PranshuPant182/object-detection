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



import * as tf from "@tensorflow/tfjs";

// COCO dataset class names
const COCO_CLASSES = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
  "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
  "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
  "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
  "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
  "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
  "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
  "toothbrush"
];

export const renderPredictions = (outputTensor, ctx, canvasWidth, canvasHeight) => {
  const outputArray = outputTensor.arraySync(); // Shape: [1, 84, 2100]

  // For YOLOv11 output format [1, 84, 2100], we need to transpose to [1, 2100, 84]
  const predictions = tf.tensor(outputArray[0]).transpose().arraySync(); // [2100, 84]
  
  const confidenceThreshold = 0.5;
  const detectedObjects = [];
  
  // Model input size (what the model was trained on)
  const modelInputSize = 320;

  predictions.forEach((pred, index) => {
    if (!Array.isArray(pred) || pred.length < 84) return;
    
    // YOLOv11 format: [x_center, y_center, width, height, class_0_conf, class_1_conf, ..., class_79_conf]
    const [x, y, w, h, ...classScores] = pred;
    
    if (classScores.length === 0) return;
    
    const maxClassScore = Math.max(...classScores);
    const classIndex = classScores.indexOf(maxClassScore);
    const confidence = maxClassScore;

    if (confidence > confidenceThreshold) {
      // Scale coordinates from model input size (320x320) to actual image size
      const scaleX = canvasWidth / modelInputSize;
      const scaleY = canvasHeight / modelInputSize;
      
      const centerX = x * scaleX;
      const centerY = y * scaleY;
      const boxWidth = w * scaleX;
      const boxHeight = h * scaleY;
      
      const left = centerX - boxWidth / 2;
      const top = centerY - boxHeight / 2;

      const className = COCO_CLASSES[classIndex] || `Class ${classIndex}`;

      detectedObjects.push({
        confidence,
        left,
        top,
        boxWidth,
        boxHeight,
        className,
        rawCoords: { x, y, w, h },
        bbox: { x: left, y: top, width: boxWidth, height: boxHeight }
      });
    }
  });

  // Apply Non-Maximum Suppression to remove overlapping detections
  const nmsDetections = applyNMSRender(detectedObjects, 0.4);


  // Colors for different detections
  const colors = ['#00FFFF', '#FF00FF', '#FFFF00', '#FF6600', '#00FF00', '#FF0000', '#0000FF', '#FF69B4'];
  
  // Render all detections after NMS
  nmsDetections.forEach((detection, index) => {
    const { left, top, boxWidth, boxHeight, className, confidence } = detection;
    
    // Clamp coordinates to canvas bounds for safety
    const clampedLeft = Math.max(0, left);
    const clampedTop = Math.max(0, top);
    const clampedWidth = Math.min(boxWidth, canvasWidth - clampedLeft);
    const clampedHeight = Math.min(boxHeight, canvasHeight - clampedTop);
    
    const label = `${className} (${(confidence * 100).toFixed(1)}%)`;
    const color = colors[index % colors.length];

    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(clampedLeft, clampedTop, clampedWidth, clampedHeight);

    // Draw label background
    ctx.fillStyle = color;
    ctx.font = "16px sans-serif";
    const textWidth = ctx.measureText(label).width;
    const labelTop = clampedTop > 25 ? clampedTop - 25 : clampedTop + clampedHeight + 5;
    ctx.fillRect(clampedLeft, labelTop, textWidth + 8, 25);

    // Draw label text
    ctx.fillStyle = "#000000";
    ctx.fillText(label, clampedLeft + 4, labelTop + 18);
  });

};

// Non-Maximum Suppression for rendering
const applyNMSRender = (detections, iouThreshold) => {
  if (detections.length === 0) return [];
  
  // Sort by confidence (highest first)
  const sortedDetections = [...detections].sort((a, b) => b.confidence - a.confidence);
  const keepDetections = [];
  
  while (sortedDetections.length > 0) {
    const current = sortedDetections.shift();
    keepDetections.push(current);
    
    // Remove detections that have high IoU with current detection
    for (let i = sortedDetections.length - 1; i >= 0; i--) {
      const iou = calculateIoURender(current.bbox, sortedDetections[i].bbox);
      if (iou > iouThreshold) {
        sortedDetections.splice(i, 1);
      }
    }
  }
  
  return keepDetections;
};

// Calculate Intersection over Union for rendering
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