// EYE ON RAMP CODE 
// "use client";

// import React, { useRef, useState, useEffect } from "react";
// import * as tf from "@tensorflow/tfjs";
// import { renderPredictions } from "./utils/render-predections";

// const ObjectDetection = () => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [modelLoaded, setModelLoaded] = useState(false);
//   const [detectionResults, setDetectionResults] = useState([]);
//   const [facingMode, setFacingMode] = useState("user"); // 🔁 default: back camera
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const modelRef = useRef(null);
//   const animationFrameRef = useRef(null);
//   const streamRef = useRef(null);

//   const runModel = async () => {
//     try {
//       modelRef.current = await tf.loadGraphModel("/models/airplane/model.json");
//       setModelLoaded(true);
//       setIsLoading(false);
//     } catch (err) {
//       console.error("Error loading model:", err);
//       setIsLoading(false);
//     }
//   };

//   const setupWebcam = async () => {
//     if (streamRef.current) {
//       // Stop existing stream before switching camera
//       streamRef.current.getTracks().forEach((track) => track.stop());
//     }

//     const stream = await navigator.mediaDevices.getUserMedia({
//       video: {
//         facingMode: facingMode, // dynamic facingMode
//       },
//       audio: false,
//     });

//     videoRef.current.srcObject = stream;
//     streamRef.current = stream;

//     await new Promise((resolve) => {
//       videoRef.current.onloadedmetadata = () => {
//         resolve();
//       };
//     });

//     videoRef.current.play();
//   };

//   const detectFrame = async () => {
//     if (!videoRef.current || !modelRef.current) return;

//     const video = videoRef.current;
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");

//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;

//     const inputTensor = tf.tidy(() =>
//       tf.browser
//         .fromPixels(video)
//         .resizeBilinear([320, 320])
//         .div(255.0)
//         .expandDims(0)
//     );

//     const model = modelRef.current;
//     const outputTensor = model.execute(inputTensor);
//     const results = await renderPredictions(outputTensor, ctx, canvas.width, canvas.height);

//     setDetectionResults(results || []);
//     tf.dispose([inputTensor, outputTensor]);

//     animationFrameRef.current = requestAnimationFrame(detectFrame);
//   };

//   const flipCamera = async () => {
//     setFacingMode((prev) => (prev === "environment" ? "user" : "environment")); // 🔁 flip value
//   };

//   useEffect(() => {
//     (async () => {
//       await runModel();
//     })();
//   }, []);

//   useEffect(() => {
//     (async () => {
//       await setupWebcam();
//       animationFrameRef.current = requestAnimationFrame(detectFrame);
//     })();

//     return () => {
//       cancelAnimationFrame(animationFrameRef.current);
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, [facingMode]); //re-run when camera flips

//   return (
//     <div className="relative w-screen h-screen bg-black">
//       {isLoading ? (
//         <div className="flex items-center justify-center h-full text-white">
//           <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mb-4"></div>
//           <div className="text-xl">Loading AI Model...</div>
//         </div>
//       ) : !modelLoaded ? (
//         <div className="flex items-center justify-center h-full text-white">
//           <div className="text-xl text-red-500">❌ Model Failed to Load</div>
//         </div>
//       ) : (
//         <>
//           <video
//             ref={videoRef}
//             className="absolute top-0 left-0 w-full h-full object-cover z-0"
//             playsInline
//             muted
//           />
//           <canvas
//             ref={canvasRef}
//             className="absolute top-0 left-0 z-10 w-full h-full"
//           />
//           <div className="absolute top-4 left-4 bg-black bg-opacity-60 p-3 rounded-md text-white z-20 space-y-2">
//             <div className="text-sm font-bold">Real-time Detections</div>
//             <button
//               onClick={flipCamera}
//               className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
//             >
//               Flip Camera
//             </button>
//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// export default ObjectDetection;





// TEST CODE
"use client";

import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import { renderPredictions } from "./utils/render-predections";

const ObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [detectionResults, setDetectionResults] = useState([]);
  const [facingMode, setFacingMode] = useState("environment"); // Start with back camera for better object detection
  const [modelInfo, setModelInfo] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  const runModel = async () => {
    try {
      console.log("🚀 Loading TensorFlow.js model...");
      modelRef.current = await tf.loadGraphModel("/models/airplane/model.json");
      
      // Log model information
      const inputShape = modelRef.current.inputs[0].shape;
      const outputShape = modelRef.current.outputs[0].shape;
      
      setModelInfo({
        inputShape,
        outputShape,
        inputName: modelRef.current.inputs[0].name,
        outputName: modelRef.current.outputs[0].name
      });
      
      console.log("✅ Model loaded successfully!");
      console.log("📊 Input shape:", inputShape);
      console.log("📊 Output shape:", outputShape);
      
      setModelLoaded(true);
      setIsLoading(false);
    } catch (err) {
      console.error("❌ Error loading model:", err);
      setIsLoading(false);
    }
  };

  const setupWebcam = async () => {
    try {
      if (streamRef.current) {
        // Stop existing stream before switching camera
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      console.log(`📹 Setting up camera with facing mode: ${facingMode}`);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve) => {
        videoRef.current.onloadedmetadata = () => {
          console.log(`📹 Video loaded: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
          resolve();
        };
      });

      videoRef.current.play();
    } catch (err) {
      console.error("❌ Error setting up webcam:", err);
    }
  };

  const detectFrame = async () => {
    if (!videoRef.current || !modelRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Prepare input tensor with proper preprocessing
      const inputTensor = tf.tidy(() => {
        return tf.browser
          .fromPixels(video)
          .resizeBilinear([320, 320]) // YOLOv5 typical input size
          .div(255.0)               // Normalize to [0, 1]
          .expandDims(0);           // Add batch dimension
      });

      // Run inference
      const outputTensor = model.execute(inputTensor);
      
      // Process predictions and render
      const results = await renderPredictions(outputTensor, ctx, canvas.width, canvas.height);

      setDetectionResults(results || []);

      // Clean up tensors
      tf.dispose([inputTensor, outputTensor]);

    } catch (err) {
      console.error("❌ Error during detection:", err);
    }

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  const flipCamera = async () => {
    console.log("🔄 Flipping camera...");
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const toggleDetection = () => {
    if (animationFrameRef.current) {
      console.log("⏸️ Pausing detection");
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    } else {
      console.log("▶️ Resuming detection");
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    }
  };

  // Load model on component mount
  useEffect(() => {
    runModel();
  }, []);

  // Setup webcam when facingMode changes or model loads
  useEffect(() => {
    if (!modelLoaded) return;
    
    const initCamera = async () => {
      await setupWebcam();
      // Start detection after a short delay to ensure video is ready
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
      }, 500);
    };

    initCamera();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, modelLoaded]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-white space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
          <div className="text-xl font-semibold">Loading AI Model...</div>
          <div className="text-sm text-gray-300">Please wait while we prepare the detection system</div>
        </div>
      ) : !modelLoaded ? (
        <div className="flex flex-col items-center justify-center h-full text-white space-y-4">
          <div className="text-2xl text-red-500">❌ Model Failed to Load</div>
          <div className="text-sm text-gray-300">Please check the model path and try again</div>
          <button 
            onClick={runModel}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry Loading Model
          </button>
        </div>
      ) : (
        <>
          {/* Video feed */}
          <video
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full object-cover z-0"
            playsInline
            muted
            autoPlay
          />
          
          {/* Detection overlay canvas */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 z-10 w-full h-full pointer-events-none"
          />
          
          {/* Control panel */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-75 p-4 rounded-lg text-white z-20 space-y-3 min-w-[250px]">
            <div className="text-lg font-bold text-blue-400">Airport Object Detection</div>
            
            {/* Detection count */}
            <div className="text-sm">
              <span className="text-green-400">Active Detections:</span> {detectionResults.length}
            </div>
            
            {/* Model info */}
            {modelInfo && (
              <div className="text-xs text-gray-300 space-y-1">
                <div>Input: {modelInfo.inputShape?.join('×')}</div>
                <div>Output: {modelInfo.outputShape?.join('×')}</div>
              </div>
            )}
            
            {/* Controls */}
            <div className="flex flex-col space-y-2">
              <button
                onClick={flipCamera}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                📷 Flip Camera ({facingMode === "environment" ? "Back" : "Front"})
              </button>
              
              <button
                onClick={toggleDetection}
                className={`px-4 py-2 text-white text-sm rounded transition-colors ${
                  animationFrameRef.current 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {animationFrameRef.current ? "⏸️ Pause" : "▶️ Resume"} Detection
              </button>
            </div>
          </div>

          {/* Detection results panel */}
          {detectionResults.length > 0 && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-75 p-3 rounded-lg text-white z-20 max-w-[300px]">
              <div className="text-sm font-bold mb-2 text-green-400">Current Detections:</div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {detectionResults.map((detection, index) => (
                  <div key={index} className="text-xs bg-gray-800 p-2 rounded">
                    <div className="font-semibold text-blue-300">{detection.className}</div>
                    <div className="text-gray-300">
                      Confidence: {(detection.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ObjectDetection;