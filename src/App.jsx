// // "use client";

// // import React, { useEffect, useRef, useState } from "react";
// // import Webcam from "react-webcam";
// // import { load as cocoSSDLoad } from "@tensorflow-models/coco-ssd";
// // import * as tf from "@tensorflow/tfjs";
// // import { renderPredictions } from "./utils/render-predections";

// // let detectInterval;

// // const ObjectDetection = () => {
// //   const [isLoading, setIsLoading] = useState(true);

// //   const webcamRef = useRef(null);
// //   const canvasRef = useRef(null);

// //   // async function runCoco() {
// //   //   setIsLoading(true); // Set loading state to true when model loading starts
// //   //   const net = await cocoSSDLoad();
// //   //   setIsLoading(false); // Set loading state to false when model loading completes

// //   //   detectInterval = setInterval(() => {
// //   //     runObjectDetection(net); // will build this next
// //   //   }, 10);
// //   // }
// //   async function loadYoloModel() {
// //     setIsLoading(true);
// //     const model = await tf.loadGraphModel("/models/yolo/model.json");
// //     setIsLoading(false);
// //     console.log("Model Inputs:", model.inputs);    // array of tf.SymbolicTensor
// //     console.log("Model Outputs:", model.outputs);  // array of tf.SymbolicTensor

// //     detectInterval = setInterval(() => {
// //       runObjectDetection(model);
// //     }, 10);
// //   }

// //   async function runObjectDetection(model) {
// //     const video = webcamRef.current?.video;
// //     const canvas = canvasRef.current;

// //     if (video && canvas && video.readyState === 4) {
// //       canvas.width = video.videoWidth;
// //       canvas.height = video.videoHeight;

// //       const inputTensor = tf.tidy(() =>
// //         tf.browser.fromPixels(video)
// //           .resizeBilinear([640, 640])
// //           .div(255.0)
// //           .expandDims(0) // [1, 640, 640, 3]
// //       );

// //       const outputTensor = await model.executeAsync(inputTensor);

// //       console.log("Output:", outputTensor);

// //       const context = canvas.getContext("2d");
// //       context.clearRect(0, 0, canvas.width, canvas.height);

// //       // Assuming output is [1, 25200, 85] shape
// //       // Decode and draw boxes manually
// //       await renderPredictions(outputTensor, context, canvas.width, canvas.height);

// //       tf.dispose([inputTensor, outputTensor]);
// //     }
// //   }


// //   const showmyVideo = () => {
// //     if (
// //       webcamRef.current !== null &&
// //       webcamRef.current.video?.readyState === 4
// //     ) {
// //       const myVideoWidth = webcamRef.current.video.videoWidth;
// //       const myVideoHeight = webcamRef.current.video.videoHeight;

// //       webcamRef.current.video.width = myVideoWidth;
// //       webcamRef.current.video.height = myVideoHeight;
// //     }
// //   };

// //   useEffect(() => {
// //     loadYoloModel();
// //     showmyVideo();
// //   }, []);

// //   return (
// //     <div className="mt-8">
// //       {isLoading ? (
// //         <div className="gradient-text">Loading AI Model...</div>
// //       ) : (
// //         <div className="relative flex justify-center items-center gradient p-1.5 rounded-md">
// //           {/* webcam */}
// //           <Webcam
// //             ref={webcamRef}
// //             className="rounded-md w-full lg:h-[720px]"
// //             muted
// //           />
// //           {/* canvas */}
// //           <canvas
// //             ref={canvasRef}
// //             className="absolute top-0 left-0 z-99999 w-full lg:h-[720px]"
// //           />
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default ObjectDetection;



// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import * as tf from "@tensorflow/tfjs";
// import { renderPredictions } from "./utils/render-predections";

// const ObjectDetection = () => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [uploadedImage, setUploadedImage] = useState(null);
//   const imageRef = useRef(null);
//   const canvasRef = useRef(null);
//   const modelRef = useRef(null);

//   // Load local YOLO model from /models/yolo/model.json
//   useEffect(() => {
//     const loadModel = async () => {
//       setIsLoading(true);
//       await tf.setBackend("webgl");
//       await tf.ready();

//       const model = await tf.loadGraphModel("/models/yolo/model.json");
//       modelRef.current = model;
//       setIsLoading(false);
//     };

//     loadModel();
//   }, []);

//   const handleImageUpload = (event) => {
//     const file = event.target.files[0];
//     if (file) {
//       const imageURL = URL.createObjectURL(file);
//       setUploadedImage(imageURL);
//     }
//   };

//   const handleImageLoad = async () => {
//     const model = modelRef.current;
//     const image = imageRef.current;
//     const canvas = canvasRef.current;

//     if (model && image && canvas) {
//       canvas.width = image.width;
//       canvas.height = image.height;

//       // Preprocess image
//       const inputTensor = tf.tidy(() =>
//         tf.browser
//           .fromPixels(image)
//           .resizeBilinear([640, 640])
//           .div(255.0)
//           .expandDims(0) // shape [1, 640, 640, 3]
//       );

//       const outputTensor = await model.executeAsync(inputTensor);

//       const ctx = canvas.getContext("2d");
//       ctx.clearRect(0, 0, canvas.width, canvas.height);

//       await renderPredictions(outputTensor, ctx, canvas.width, canvas.height);

//       tf.dispose([inputTensor, outputTensor]);
//     }
//   };

//   return (
//     <div className="min-h-screen min-w-screen bg-black">


//       <div className="mt-8 ">
//         <div className="mb-4">
//           <input
//             type="file"
//             accept="image/*"
//             onChange={handleImageUpload}
//             className="text-white"
//           />
//         </div>

//         {isLoading && <p className="gradient-text">Loading AI Model...</p>}

//         {uploadedImage && (
//           <div className="relative inline-block">
//             <img
//               src={uploadedImage}
//               alt="Uploaded"
//               ref={imageRef}
//               onLoad={handleImageLoad}
//               className="rounded-md max-w-full h-auto"
//             />
//             <canvas
//               ref={canvasRef}
//               className="absolute top-0 left-0 z-50"
//             />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ObjectDetection;




// import React, { useEffect, useRef, useState } from "react";
// import * as tf from "@tensorflow/tfjs";
// import { renderPredictions } from "./utils/render-predections";

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

// const RealTimeObjectDetection = () => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [isWebcamActive, setIsWebcamActive] = useState(false);
//   const [isDetecting, setIsDetecting] = useState(false);
//   const [fps, setFps] = useState(0);
//   const [detectionCount, setDetectionCount] = useState(0);

//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const modelRef = useRef(null);
//   const streamRef = useRef(null);
//   const animationRef = useRef(null);
//   const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

//   // Load local YOLO model and start webcam automatically
//   useEffect(() => {
//     const initializeApp = async () => {
//       setIsLoading(true);
//       await tf.setBackend("webgl");
//       await tf.ready();

//       const model = await tf.loadGraphModel("/models/yolo/model.json");
//       modelRef.current = model;
//       setIsLoading(false);

//       // Automatically start webcam after model loads
//       startWebcam();
//     };

//     initializeApp();
//   }, []);

//   // Start webcam and detection automatically
//   const startWebcam = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           width: { ideal: 640 },
//           height: { ideal: 480 },
//           facingMode: "environment" // Use back camera on mobile
//         }
//       });

//       streamRef.current = stream;
//       const video = videoRef.current;

//       if (video) {
//         video.srcObject = stream;
//         video.onloadedmetadata = () => {
//           video.play();
//           setIsWebcamActive(true);

//           // Set canvas dimensions to match video
//           const canvas = canvasRef.current;
//           if (canvas) {
//             canvas.width = video.videoWidth;
//             canvas.height = video.videoHeight;
//           }

//           console.log("📹 Webcam ready, starting detection automatically...");

//           // Automatically start detection once webcam is ready
//           setTimeout(() => {
//             console.log("🚀 Auto-starting detection...", {
//               hasModel: !!modelRef.current,
//               isLoading: isLoading,
//               hasVideo: !!videoRef.current,
//               hasCanvas: !!canvasRef.current
//             });

//             if (modelRef.current && !isLoading) {
//               setIsDetecting(true);
//               // Call detectFrame directly to start the loop
//               detectFrame();
//             } else {
//               console.warn("⚠️ Model not ready yet, will retry...");
//               // Retry after another second
//               setTimeout(() => {
//                 if (modelRef.current) {
//                   console.log("🔄 Retrying auto-start detection...");
//                   setIsDetecting(true);
//                   detectFrame();
//                 }
//               }, 1000);
//             }
//           }, 500); // Reduced delay
//         };
//       }
//     } catch (error) {
//       console.error("Error accessing webcam:", error);
//       alert("Could not access webcam. Please ensure camera permissions are granted and refresh the page.");
//     }
//   };

//   // Stop webcam
//   const stopWebcam = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//       streamRef.current = null;
//     }
//     setIsWebcamActive(false);
//     setIsDetecting(false);

//     if (animationRef.current) {
//       cancelAnimationFrame(animationRef.current);
//       animationRef.current = null;
//     }
//   };

//   // Start detection automatically when model and webcam are ready
//   const startDetection = () => {
//     if (!modelRef.current || !videoRef.current || !canvasRef.current) {
//       console.error("Model, video, or canvas not ready");
//       return;
//     }

//     setIsDetecting(true);
//     detectFrame();
//   };

//   // Stop detection
//   const stopDetection = () => {
//     setIsDetecting(false);
//     if (animationRef.current) {
//       cancelAnimationFrame(animationRef.current);
//       animationRef.current = null;
//     }

//     // Clear canvas
//     const canvas = canvasRef.current;
//     if (canvas) {
//       const ctx = canvas.getContext("2d");
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//     }
//   };

//   // Detect objects in current video frame
//   const detectFrame = async () => {
//     if (!isDetecting || !modelRef.current || !videoRef.current || !canvasRef.current) {
//       console.log("Detection skipped - not ready:", {
//         isDetecting,
//         hasModel: !!modelRef.current,
//         hasVideo: !!videoRef.current,
//         hasCanvas: !!canvasRef.current
//       });
//       return;
//     }

//     const model = modelRef.current;
//     const video = videoRef.current;
//     const canvas = canvasRef.current;

//     try {
//       // Skip if video not ready
//       if (video.readyState !== 4) {
//         console.log("Video not ready, readyState:", video.readyState);
//         animationRef.current = requestAnimationFrame(detectFrame);
//         return;
//       }

//       console.log("🎥 Processing frame...", {
//         videoWidth: video.videoWidth,
//         videoHeight: video.videoHeight,
//         canvasWidth: canvas.width,
//         canvasHeight: canvas.height
//       });

//       // Preprocess video frame
//       const inputTensor = tf.tidy(() =>
//         tf.browser
//           .fromPixels(video)
//           .resizeBilinear([320, 320])
//           .div(255.0)
//           .expandDims(0) // shape [1, 320, 320, 3] - BHWC format
//       );

//       console.log("📊 Input tensor created:", {
//         shape: inputTensor.shape,
//         dtype: inputTensor.dtype
//       });

//       // Log a sample of input data
//       const inputData = await inputTensor.data();
//       console.log("🔢 Input tensor sample:", {
//         min: Math.min(...inputData.slice(0, 100)),
//         max: Math.max(...inputData.slice(0, 100)),
//         mean: inputData.slice(0, 100).reduce((a, b) => a + b) / 100,
//         first10: Array.from(inputData.slice(0, 10))
//       });

//       const outputTensor = await model.executeAsync(inputTensor);

//       console.log("🧠 Model output tensor:", {
//         shape: outputTensor.shape,
//         dtype: outputTensor.dtype
//       });

//       // Log raw output data
//       const outputArray = outputTensor.arraySync();
//       console.log("📋 Raw output shape:", outputArray.length, "x", outputArray[0]?.length, "x", outputArray[0]?.[0]?.length);

//       // Sample some output values
//       if (outputArray[0] && outputArray[0][0]) {
//         console.log("🎯 Sample raw predictions (first 5):");
//         for (let i = 0; i < Math.min(5, outputArray[0][0].length); i++) {
//           const pred = outputArray[0].map(row => row[i]);
//           console.log(`Prediction ${i}:`, {
//             coords: pred.slice(0, 4),
//             maxClassScore: Math.max(...pred.slice(4)),
//             classScores: pred.slice(4, 14) // First 10 class scores
//           });
//         }
//       }

//       const ctx = canvas.getContext("2d");
//       ctx.clearRect(0, 0, canvas.width, canvas.height);

//       // Get detected objects
//       const detectedObjects = await getDetectedObjects(outputTensor, canvas.width, canvas.height);
//       console.log("✅ Final detected objects:", detectedObjects.length, detectedObjects);
//       setDetectionCount(detectedObjects.length);

//       // Render predictions on canvas
//       await renderPredictions(outputTensor, ctx, canvas.width, canvas.height);

//       // Update FPS counter
//       updateFPS();

//       tf.dispose([inputTensor, outputTensor]);
//     } catch (error) {
//       console.error("❌ Error during detection:", error);
//     }

//     // Continue detection loop
//     if (isDetecting) {
//       animationRef.current = requestAnimationFrame(detectFrame);
//     }
//   };

//   // Update FPS counter
//   const updateFPS = () => {
//     const counter = fpsCounterRef.current;
//     counter.frames++;

//     const now = Date.now();
//     const elapsed = now - counter.lastTime;

//     if (elapsed >= 1000) { // Update every second
//       const currentFps = Math.round((counter.frames * 1000) / elapsed);
//       setFps(currentFps);
//       counter.frames = 0;
//       counter.lastTime = now;
//     }
//   };

//   const getDetectedObjects = async (outputTensor, canvasWidth, canvasHeight) => {
//     console.log("🔍 Processing detections...");
//     const outputArray = outputTensor.arraySync(); // Shape: [1, 84, 2100]

//     console.log("📊 Output array shape:", outputArray.length, "x", outputArray[0]?.length, "x", outputArray[0]?.[0]?.length);

//     // For YOLOv11 output format [1, 84, 2100], we need to transpose to [1, 2100, 84]
//     const predictions = tf.tensor(outputArray[0]).transpose().arraySync(); // [2100, 84]

//     console.log("📋 Transposed predictions shape:", predictions.length, "x", predictions[0]?.length);

//     const confidenceThreshold = 0.3; // Lower threshold for debugging
//     const detectedObjects = [];

//     // Model input size (what the model was trained on)
//     const modelInputSize = 320;

//     let highConfidencePreds = 0;
//     let totalProcessed = 0;

//     predictions.forEach((pred, index) => {
//       if (!Array.isArray(pred) || pred.length < 84) return;

//       totalProcessed++;

//       // YOLOv11 format: [x_center, y_center, width, height, class_0_conf, class_1_conf, ..., class_79_conf]
//       const [x, y, w, h, ...classScores] = pred;

//       if (classScores.length === 0) return;

//       const maxClassScore = Math.max(...classScores);
//       const classIndex = classScores.indexOf(maxClassScore);
//       const confidence = maxClassScore;

//       // Log high confidence predictions for debugging
//       if (confidence > 0.1) {
//         highConfidencePreds++;
//         if (highConfidencePreds <= 10) { // Log first 10 high confidence predictions
//           console.log(`🎯 High confidence prediction ${index}:`, {
//             coords: { x, y, w, h },
//             confidence: confidence.toFixed(4),
//             classIndex,
//             className: COCO_CLASSES[classIndex],
//             classScores: classScores.slice(0, 10).map(s => s.toFixed(3))
//           });
//         }
//       }

//       if (confidence > confidenceThreshold) {
//         // Scale coordinates from model input size (320x320) to actual video size
//         const scaleX = canvasWidth / modelInputSize;
//         const scaleY = canvasHeight / modelInputSize;

//         const centerX = x * scaleX;
//         const centerY = y * scaleY;
//         const boxWidth = w * scaleX;
//         const boxHeight = h * scaleY;

//         const left = centerX - boxWidth / 2;
//         const top = centerY - boxHeight / 2;

//         const detectedObject = {
//           id: index,
//           class: COCO_CLASSES[classIndex] || `Class ${classIndex}`,
//           classIndex: classIndex,
//           confidence: confidence,
//           bbox: {
//             x: left,
//             y: top,
//             width: boxWidth,
//             height: boxHeight
//           },
//           center: {
//             x: centerX,
//             y: centerY
//           }
//         };

//         console.log(`✅ Object detected:`, detectedObject);
//         detectedObjects.push(detectedObject);
//       }
//     });

//     console.log("📊 Detection summary:", {
//       totalProcessed,
//       highConfidencePreds,
//       aboveThreshold: detectedObjects.length,
//       threshold: confidenceThreshold
//     });

//     // Apply Non-Maximum Suppression (NMS) to remove duplicate detections
//     const nmsDetections = applyNMS(detectedObjects, 0.4); // IoU threshold of 0.4

//     console.log("🔄 After NMS:", nmsDetections.length, "objects");

//     return nmsDetections;
//   };

//   // Non-Maximum Suppression to remove overlapping detections
//   const applyNMS = (detections, iouThreshold) => {
//     if (detections.length === 0) return [];

//     // Sort by confidence (highest first)
//     const sortedDetections = [...detections].sort((a, b) => b.confidence - a.confidence);
//     const keepDetections = [];

//     while (sortedDetections.length > 0) {
//       const current = sortedDetections.shift();
//       keepDetections.push(current);

//       // Remove detections that have high IoU with current detection
//       for (let i = sortedDetections.length - 1; i >= 0; i--) {
//         const iou = calculateIoU(current.bbox, sortedDetections[i].bbox);
//         if (iou > iouThreshold) {
//           sortedDetections.splice(i, 1);
//         }
//       }
//     }

//     return keepDetections;
//   };

//   // Calculate Intersection over Union (IoU)
//   const calculateIoU = (box1, box2) => {
//     const x1 = Math.max(box1.x, box2.x);
//     const y1 = Math.max(box1.y, box2.y);
//     const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
//     const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

//     if (x2 <= x1 || y2 <= y1) return 0;

//     const intersection = (x2 - x1) * (y2 - y1);
//     const area1 = box1.width * box1.height;
//     const area2 = box2.width * box2.height;
//     const union = area1 + area2 - intersection;

//     return intersection / union;
//   };

//   // Watch for when both model and webcam are ready, then auto-start detection
//   useEffect(() => {
//     if (!isLoading && isWebcamActive && modelRef.current && !isDetecting) {
//       console.log("🔄 Model and webcam both ready, auto-starting detection...");
//       setIsDetecting(true);
//       // Start detection immediately
//       setTimeout(() => detectFrame(), 100);
//     }
//   }, [isLoading, isWebcamActive, isDetecting]);

//   return (
//     <div className="min-h-screen min-w-screen bg-black p-8">
//       <div className="mb-4 space-y-4">
//         {/* Controls */}
//         <div className="flex gap-4 flex-wrap">
//           {!isWebcamActive ? (
//             <button
//               onClick={startWebcam}
//               disabled={isLoading}
//               className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-md"
//             >
//               {isLoading ? "Loading Model..." : "Start Webcam"}
//             </button>
//           ) : (
//             <>
//               <button
//                 onClick={stopWebcam}
//                 className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
//               >
//                 Stop Webcam
//               </button>

//               {!isDetecting ? (
//                 <button
//                   onClick={startDetection}
//                   disabled={isLoading}
//                   className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-md"
//                 >
//                   Start Detection
//                 </button>
//               ) : (
//                 <button
//                   onClick={stopDetection}
//                   className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
//                 >
//                   Stop Detection
//                 </button>
//               )}
//             </>
//           )}
//         </div>

//         {/* Stats */}
//         {isWebcamActive && (
//           <div className="flex gap-6 text-white text-sm">
//             <div className="bg-gray-800 px-3 py-1 rounded">
//               FPS: <span className="font-mono text-green-400">{fps}</span>
//             </div>
//             <div className="bg-gray-800 px-3 py-1 rounded">
//               Objects: <span className="font-mono text-blue-400">{detectionCount}</span>
//             </div>
//             <div className="bg-gray-800 px-3 py-1 rounded">
//               Status: <span className={`font-mono ${isDetecting ? 'text-green-400' : 'text-gray-400'}`}>
//                 {isDetecting ? 'Detecting' : 'Standby'}
//               </span>
//             </div>
//           </div>
//         )}
//       </div>

//       {isLoading && (
//         <div className="text-white mb-4">
//           <p className="text-lg">Loading AI Model...</p>
//           <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
//             <div className="bg-blue-500 h-2 rounded-full animate-pulse w-1/2"></div>
//           </div>
//         </div>
//       )}

//       {/* Video and Canvas Container */}
//       {isWebcamActive && (
//         <div className="relative inline-block border-2 border-gray-600 rounded-lg overflow-hidden">
//           <video
//             ref={videoRef}
//             autoPlay
//             playsInline
//             muted
//             className="block max-w-full h-auto"
//             style={{ maxWidth: '100%', height: 'auto' }}
//           />
//           <canvas
//             ref={canvasRef}
//             className="absolute top-0 left-0 z-10 pointer-events-none"
//             style={{ maxWidth: '100%', height: 'auto' }}
//           />
//         </div>
//       )}

//       {/* Video element (always rendered but hidden when not active) */}
//       {!isWebcamActive && (
//         <video
//           ref={videoRef}
//           autoPlay
//           playsInline
//           muted
//           className="hidden"
//         />
//       )}

//       {/* Canvas element (always rendered but hidden when not active) */}
//       {!isWebcamActive && (
//         <canvas
//           ref={canvasRef}
//           className="hidden"
//         />
//       )}

//       {/* Instructions */}
//       {!isWebcamActive && !isLoading && (
//         <div className="text-white text-center mt-8">
//           <h2 className="text-2xl mb-4">Real-time Object Detection</h2>
//           <p className="text-gray-400 mb-4">
//             Click "Start Webcam" to begin, then "Start Detection" to analyze objects in real-time.
//           </p>
//           <div className="text-sm text-gray-500">
//             <p>• Uses YOLOv11 for fast object detection</p>
//             <p>• Detects 80 different object classes</p>
//             <p>• Real-time performance with FPS monitoring</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default RealTimeObjectDetection;




// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import * as tf from "@tensorflow/tfjs";
// import { renderPredictions } from "./utils/render-predections";

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

// const ObjectDetection = () => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [uploadedImage, setUploadedImage] = useState(null);
//   const [isDetecting, setIsDetecting] = useState(false);
//   const imageRef = useRef(null);
//   const canvasRef = useRef(null);
//   const modelRef = useRef(null);

//   // Load local YOLO model from /models/yolo/model.json
//   useEffect(() => {
//     const loadModel = async () => {
//       setIsLoading(true);
//       await tf.setBackend("webgl");
//       await tf.ready();

//       const model = await tf.loadGraphModel("/models/yolo/model.json");
//       modelRef.current = model;
//       setIsLoading(false);
//     };

//     loadModel();
//   }, []);

//   const handleImageUpload = (event) => {
//     const file = event.target.files[0];
//     if (file) {
//       const imageURL = URL.createObjectURL(file);
//       setUploadedImage(imageURL);
//     }
//   };

//   const handleDetection = async () => {
//     const model = modelRef.current;
//     const image = imageRef.current;
//     const canvas = canvasRef.current;

//     if (!model || !image || !canvas) {
//       console.error("Model, image, or canvas not ready");
//       return;
//     }

//     setIsDetecting(true);

//     try {
//       canvas.width = image.width;
//       canvas.height = image.height;

//       // Preprocess image - Keep in BHWC format as expected by the model
//       const inputTensor = tf.tidy(() =>
//         tf.browser
//           .fromPixels(image)
//           .resizeBilinear([320, 320])
//           .div(255.0)
//           .expandDims(0) // shape [1, 320, 320, 3] - BHWC format
//       );

//       const outputTensor = await model.executeAsync(inputTensor);

//       const ctx = canvas.getContext("2d");
//       ctx.clearRect(0, 0, canvas.width, canvas.height);

//       // Get detected objects for console logging
//       const detectedObjects = await getDetectedObjects(outputTensor, canvas.width, canvas.height);

//       // Log detected objects to console
//       console.log("Detected Objects:", detectedObjects);

//       // Render predictions on canvas
//       await renderPredictions(outputTensor, ctx, canvas.width, canvas.height);

//       tf.dispose([inputTensor, outputTensor]);
//     } catch (error) {
//       console.error("Error during detection:", error);
//     } finally {
//       setIsDetecting(false);
//     }
//   };

//   const getDetectedObjects = async (outputTensor, canvasWidth, canvasHeight) => {
//     const outputArray = outputTensor.arraySync(); // Shape: [1, 84, 2100]

//     console.log("Output tensor shape:", outputTensor.shape);
//     console.log("Canvas dimensions:", canvasWidth, "x", canvasHeight);

//     // For YOLOv11 output format [1, 84, 2100], we need to transpose to [1, 2100, 84]
//     const predictions = tf.tensor(outputArray[0]).transpose().arraySync(); // [2100, 84]

//     console.log("Predictions shape:", predictions.length, "x", predictions[0]?.length);

//     const confidenceThreshold = 0.5;
//     const detectedObjects = [];

//     // Model input size (what the model was trained on)
//     const modelInputSize = 320;

//     predictions.forEach((pred, index) => {
//       if (!Array.isArray(pred) || pred.length < 84) return;

//       // YOLOv11 format: [x_center, y_center, width, height, class_0_conf, class_1_conf, ..., class_79_conf]
//       const [x, y, w, h, ...classScores] = pred;

//       if (classScores.length === 0) return;

//       const maxClassScore = Math.max(...classScores);
//       const classIndex = classScores.indexOf(maxClassScore);
//       const confidence = maxClassScore;

//       if (confidence > confidenceThreshold) {
//         // Debug raw coordinates
//         console.log(`Raw coordinates for detection ${index}:`, { x, y, w, h, confidence });

//         // Scale coordinates from model input size (320x320) to actual image size
//         const scaleX = canvasWidth / modelInputSize;
//         const scaleY = canvasHeight / modelInputSize;

//         const centerX = x * scaleX;
//         const centerY = y * scaleY;
//         const boxWidth = w * scaleX;
//         const boxHeight = h * scaleY;

//         const left = centerX - boxWidth / 2;
//         const top = centerY - boxHeight / 2;

//         console.log(`Scaled coordinates:`, { centerX, centerY, boxWidth, boxHeight, left, top, scaleX, scaleY });

//         const detectedObject = {
//           id: index,
//           class: COCO_CLASSES[classIndex] || `Class ${classIndex}`,
//           classIndex: classIndex,
//           confidence: confidence,
//           bbox: {
//             x: left,
//             y: top,
//             width: boxWidth,
//             height: boxHeight
//           },
//           center: {
//             x: centerX,
//             y: centerY
//           },
//           rawCoords: { x, y, w, h } // Keep raw for debugging
//         };

//         detectedObjects.push(detectedObject);
//       }
//     });

//     // Apply Non-Maximum Suppression (NMS) to remove duplicate detections
//     const nmsDetections = applyNMS(detectedObjects, 0.4); // IoU threshold of 0.4

//     console.log(`Total detections before NMS: ${detectedObjects.length}`);
//     console.log(`Detections after NMS: ${nmsDetections.length}`);
//     console.log("Final detected objects:", nmsDetections);

//     return nmsDetections;
//   };

//   // Non-Maximum Suppression to remove overlapping detections
//   const applyNMS = (detections, iouThreshold) => {
//     if (detections.length === 0) return [];

//     // Sort by confidence (highest first)
//     const sortedDetections = [...detections].sort((a, b) => b.confidence - a.confidence);
//     const keepDetections = [];

//     while (sortedDetections.length > 0) {
//       const current = sortedDetections.shift();
//       keepDetections.push(current);

//       // Remove detections that have high IoU with current detection
//       for (let i = sortedDetections.length - 1; i >= 0; i--) {
//         const iou = calculateIoU(current.bbox, sortedDetections[i].bbox);
//         if (iou > iouThreshold) {
//           sortedDetections.splice(i, 1);
//         }
//       }
//     }

//     return keepDetections;
//   };

//   // Calculate Intersection over Union (IoU)
//   const calculateIoU = (box1, box2) => {
//     const x1 = Math.max(box1.x, box2.x);
//     const y1 = Math.max(box1.y, box2.y);
//     const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
//     const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

//     if (x2 <= x1 || y2 <= y1) return 0;

//     const intersection = (x2 - x1) * (y2 - y1);
//     const area1 = box1.width * box1.height;
//     const area2 = box2.width * box2.height;
//     const union = area1 + area2 - intersection;

//     return intersection / union;
//   };

//   return (
//     <div className="min-h-screen min-w-screen bg-black p-8">
//       <div className="mb-4">
//         <input
//           type="file"
//           accept="image/*"
//           onChange={handleImageUpload}
//           className="text-white mb-4 block"
//         />

//         {uploadedImage && (
//           <button
//             onClick={handleDetection}
//             disabled={isDetecting || isLoading}
//             className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-md"
//           >
//             {isDetecting ? "Detecting..." : "Detect Objects"}
//           </button>
//         )}
//       </div>

//       {isLoading && <p className="gradient-text">Loading AI Model...</p>}

//       {uploadedImage && (
//         <div className="relative inline-block">
//           <img
//             src={uploadedImage}
//             alt="Uploaded"
//             ref={imageRef}
//             className="rounded-md max-w-full h-auto"
//           />
//           <canvas
//             ref={canvasRef}
//             className="absolute top-0 left-0 z-50"
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// export default ObjectDetection;









// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import Webcam from "react-webcam";
// import { load as cocoSSDLoad } from "@tensorflow-models/coco-ssd";
// import * as tf from "@tensorflow/tfjs";
// import { renderPredictions } from "./utils/render-predections";

// let detectInterval;

// const ObjectDetection = () => {
//   const [isLoading, setIsLoading] = useState(true);

//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);

//   async function runModel() {
//     setIsLoading(true);
//     const model = await tf.loadGraphModel("/models/yolo/model.json");
//     setIsLoading(false);

//     detectInterval = setInterval(() => {
//       runObjectDetection(model);
//     }, 100);
//   }


//   async function runObjectDetection(model) {
//     if (
//       !canvasRef.current ||
//       !webcamRef.current ||
//       webcamRef.current.video?.readyState !== 4
//     ) {
//       return;
//     }

//     const video = webcamRef.current.video;
//     const canvas = canvasRef.current;

//     // Ensure canvas matches video size
//     if (!canvas.width || !canvas.height) {
//       canvas.width = video.videoWidth;
//       canvas.height = video.videoHeight;
//     }

//     try {
//       // Prepare input tensor
//       const inputTensor = tf.tidy(() =>
//         tf.browser
//           .fromPixels(video)
//           .resizeBilinear([320, 320])
//           .div(255.0)
//           .expandDims(0) // [1, 320, 320, 3]
//       );

//       // Run inference (synchronous)
//       const outputTensor = model.execute(inputTensor);

//       // Clear canvas
//       const context = canvas.getContext("2d");
//       context.clearRect(0, 0, canvas.width, canvas.height);

//       // Render predictions (you must define this function)
//       await renderPredictions(outputTensor, context, canvas.width, canvas.height);

//       // Cleanup
//       tf.dispose([inputTensor, outputTensor]);

//     } catch (error) {
//       console.error("❌ Error during detection:", error);
//     }
//   }



//   const showmyVideo = () => {
//     if (
//       webcamRef.current !== null &&
//       webcamRef.current.video?.readyState === 4
//     ) {
//       const myVideoWidth = webcamRef.current.video.videoWidth;
//       const myVideoHeight = webcamRef.current.video.videoHeight;

//       webcamRef.current.video.width = myVideoWidth;
//       webcamRef.current.video.height = myVideoHeight;
//     }
//   };

//   useEffect(() => {
//     runModel();
//     showmyVideo();
//   }, []);

//   return (
//     <div className="mt-8">
//       {isLoading ? (
//         <div className="gradient-text">Loading AI Model...</div>
//       ) : (
//         <div className="relative flex justify-center items-center gradient p-1.5 rounded-md">
//           {/* webcam */}
//           <Webcam
//             ref={webcamRef}
//             className="rounded-md w-full lg:h-[720px]"
//             muted
//           />
//           {/* canvas */}
//           <canvas
//             ref={canvasRef}
//             className="absolute top-0 left-0 z-99999 w-full lg:h-[720px]"
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// export default ObjectDetection;










// WORKING ON GEENRAL LOADED MODEL 
// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import Webcam from "react-webcam";
// import * as tf from "@tensorflow/tfjs";
// import { renderPredictions } from "./utils/render-predections";

// let detectInterval;

// const ObjectDetection = () => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [facingMode, setFacingMode] = useState("user"); // "user" or "environment"

//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);

//   const videoConstraints = {
//     facingMode: facingMode === "user" ? "user" : { exact: "environment" },
//     width: { ideal: 1920 },
//     height: { ideal: 1080 },
//   };

//   const toggleCamera = () => {
//     setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
//   };

//   async function runModel() {
//     setIsLoading(true);
//     const model = await tf.loadGraphModel("/models/yolo/model.json");
//     setIsLoading(false);

//     detectInterval = setInterval(() => {
//       runObjectDetection(model);
//     }, 100);
//   }

//   async function runObjectDetection(model) {
//     if (
//       !canvasRef.current ||
//       !webcamRef.current ||
//       webcamRef.current.video?.readyState !== 4
//     ) return;

//     const video = webcamRef.current.video;
//     const canvas = canvasRef.current;

//     if (!canvas.width || !canvas.height) {
//       canvas.width = video.videoWidth;
//       canvas.height = video.videoHeight;
//     }

//     try {
//       const inputTensor = tf.tidy(() =>
//         tf.browser
//           .fromPixels(video)
//           .resizeBilinear([320, 320])
//           .div(255.0)
//           .expandDims(0)
//       );

//       const outputTensor = model.execute(inputTensor);

//       const context = canvas.getContext("2d");
//       context.clearRect(0, 0, canvas.width, canvas.height);

//       await renderPredictions(outputTensor, context, canvas.width, canvas.height);
//       tf.dispose([inputTensor, outputTensor]);
//     } catch (error) {
//       console.error("❌ Error during detection:", error);
//     }
//   }

//   useEffect(() => {
//     runModel();
//     return () => clearInterval(detectInterval); // Cleanup on unmount
//   }, []);

//   useEffect(() => {
//     if (webcamRef.current?.video?.readyState === 4) {
//       webcamRef.current.video.width = webcamRef.current.video.videoWidth;
//       webcamRef.current.video.height = webcamRef.current.video.videoHeight;
//     }
//   }, [facingMode]);

//   return (
//     <div className="relative w-screen h-screen overflow-hidden">
//       {isLoading ? (
//         <div className="text-center text-xl text-white mt-10">Loading AI Model...</div>
//       ) : (
//         <>
//           <Webcam
//             ref={webcamRef}
//             videoConstraints={videoConstraints}
//             className="absolute top-0 left-0 w-full h-full object-cover"
//             muted
//           />
//           <canvas
//             ref={canvasRef}
//             className="absolute top-0 left-0 w-full h-full z-10"
//           />
//           <button
//             onClick={toggleCamera}
//             className="absolute top-4 right-4 z-20 bg-black bg-opacity-50 text-black px-4 py-2 rounded-md hover:bg-opacity-70"
//           >
//             Flip Camera
//           </button>
//         </>
//       )}
//     </div>
//   );
// };

// export default ObjectDetection;




// DETECTION ON AIRPLANE USING IMAGE
// "use client";

// import React, { useRef, useState, useEffect } from "react";
// import * as tf from "@tensorflow/tfjs";
// import { renderPredictions } from "./utils/render-predections";

// const ObjectDetection = () => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [modelLoaded, setModelLoaded] = useState(false);
//   const [detectionResults, setDetectionResults] = useState([]);
//   const imageCanvasRef = useRef(null); // Canvas for detection
//   const imageRef = useRef(null);       // Image element
//   const modelRef = useRef(null);       // Loaded model

//   const runModel = async () => {
//     try {
//       setIsLoading(true);
//       console.log("🔄 Loading model...");

//       // Load the model
//       modelRef.current = await tf.loadGraphModel("/models/airplane/model.json");

//       console.log("📦 Model loaded successfully");
//       console.log("📦 Model input shape:", modelRef.current.inputs[0].shape);

//       // Check if outputs exist before accessing
//       if (modelRef.current.outputs && modelRef.current.outputs.length > 0) {
//         console.log("📤 Model output shape (from metadata):", modelRef.current.outputs[0].shape);
//       }

//       setModelLoaded(true);
//       setIsLoading(false);
//     } catch (err) {
//       console.error("❌ Error loading model:", err);
//       setIsLoading(false);
//     }
//   };

//   const handleImageUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file || !modelLoaded) return;

//     const img = new Image();
//     img.src = URL.createObjectURL(file);
//     img.onload = async () => {
//       imageRef.current = img;

//       const canvas = imageCanvasRef.current;
//       canvas.width = img.width;
//       canvas.height = img.height;

//       const ctx = canvas.getContext("2d");
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       ctx.drawImage(img, 0, 0);

//       try {
//         console.log("🔍 Starting detection...");

//         const inputTensor = tf.tidy(() => {
//           const t = tf.browser
//             .fromPixels(img)
//             .resizeBilinear([320, 320])
//             .div(255.0)
//             .expandDims(0); // shape: [1, 320, 320, 3]
//           console.log("📸 Input Tensor shape:", t.shape);
//           console.log("📸 Input Tensor min/max:", t.min().dataSync()[0], t.max().dataSync()[0]);
//           return t;
//         });

//         const model = modelRef.current;
//         console.log("🤖 Running model inference...");
//         const outputTensor = model.execute(inputTensor);

//         console.log("📤 Model output shape:", outputTensor.shape);

//         // Get the raw output data for debugging
//         const outputData = outputTensor.arraySync();
//         console.log("📊 Raw output data sample:", outputData[0].slice(0, 5).map(row => row.slice(0, 5)));

//         const results = await renderPredictions(outputTensor, ctx, img.width, img.height);
//         setDetectionResults(results || []);

//         tf.dispose([inputTensor, outputTensor]);
//       } catch (error) {
//         console.error("❌ Error during image detection:", error);
//       }
//     };
//   };

//   useEffect(() => {
//     runModel();
//   }, []);

//   return (
//     <div className="relative w-screen h-screen overflow-hidden bg-gray-900">
//       {isLoading ? (
//         <div className="flex flex-col items-center justify-center h-full text-white">
//           <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mb-4"></div>
//           <div className="text-xl">Loading AI Model...</div>
//           <div className="text-sm text-gray-400 mt-2">Please wait while the model loads</div>
//         </div>
//       ) : !modelLoaded ? (
//         <div className="flex flex-col items-center justify-center h-full text-white">
//           <div className="text-xl text-red-500">❌ Model Failed to Load</div>
//           <div className="text-sm text-gray-400 mt-2">Check console for details</div>
//         </div>
//       ) : (
//         <>
//           <div className="absolute top-4 left-4 z-20 space-y-2">
//             <input
//               type="file"
//               accept="image/*"
//               onChange={handleImageUpload}
//               className="block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer"
//             />
//             <div className="text-white text-sm">
//               Model Status: ✅ Ready
//             </div>
//             {detectionResults.length > 0 && (
//               <div className="bg-black bg-opacity-50 text-white p-2 rounded-md max-w-xs">
//                 <div className="font-bold">Detections: {detectionResults.length}</div>
//                 {detectionResults.slice(0, 3).map((det, i) => (
//                   <div key={i} className="text-xs">
//                     {det.className}: {(det.confidence * 100).toFixed(1)}%
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//           <canvas
//             ref={imageCanvasRef}
//             className="absolute top-20 left-4 border-2 border-white z-10 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)]"
//             style={{
//               objectFit: 'contain',
//               backgroundColor: 'rgba(0,0,0,0.1)'
//             }}
//           />
//         </>
//       )}
//     </div>
//   );
// };

// export default ObjectDetection;



"use client";

import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import { renderPredictions } from "./utils/render-predections";

const ObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [detectionResults, setDetectionResults] = useState([]);
  const [facingMode, setFacingMode] = useState("user"); // 🔁 default: back camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  const runModel = async () => {
    try {
      modelRef.current = await tf.loadGraphModel("/models/airplane/model.json");
      setModelLoaded(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading model:", err);
      setIsLoading(false);
    }
  };

  const setupWebcam = async () => {
    if (streamRef.current) {
      // Stop existing stream before switching camera
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingMode, // dynamic facingMode
      },
      audio: false,
    });

    videoRef.current.srcObject = stream;
    streamRef.current = stream;

    await new Promise((resolve) => {
      videoRef.current.onloadedmetadata = () => {
        resolve();
      };
    });

    videoRef.current.play();
  };

  const detectFrame = async () => {
    if (!videoRef.current || !modelRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const inputTensor = tf.tidy(() =>
      tf.browser
        .fromPixels(video)
        .resizeBilinear([320, 320])
        .div(255.0)
        .expandDims(0)
    );

    const model = modelRef.current;
    const outputTensor = model.execute(inputTensor);
    const results = await renderPredictions(outputTensor, ctx, canvas.width, canvas.height);

    setDetectionResults(results || []);
    tf.dispose([inputTensor, outputTensor]);

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  const flipCamera = async () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment")); // 🔁 flip value
  };

  useEffect(() => {
    (async () => {
      await runModel();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await setupWebcam();
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    })();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]); //re-run when camera flips

  return (
    <div className="relative w-screen h-screen bg-black">
      {isLoading ? (
        <div className="flex items-center justify-center h-full text-white">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-xl">Loading AI Model...</div>
        </div>
      ) : !modelLoaded ? (
        <div className="flex items-center justify-center h-full text-white">
          <div className="text-xl text-red-500">❌ Model Failed to Load</div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full object-cover z-0"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 z-10 w-full h-full"
          />
          <div className="absolute top-4 left-4 bg-black bg-opacity-60 p-3 rounded-md text-white z-20 space-y-2">
            <div className="text-sm font-bold">Real-time Detections</div>
            <button
              onClick={flipCamera}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Flip Camera
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ObjectDetection;
