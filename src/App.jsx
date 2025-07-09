// "use client";

// import React, { useEffect, useRef, useState, useCallback } from "react";
// import Webcam from "react-webcam";
// import { load as cocoSSDLoad } from "@tensorflow-models/coco-ssd";
// import * as tf from "@tensorflow/tfjs";
// import { renderPredictions } from "./utils/render-predictions";

// let detectInterval;

// const ObjectDetection = () => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [facingMode, setFacingMode] = useState("user"); // front camera by default

//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);

//   // const runCoco = useCallback(async () => {
//   //   setIsLoading(true);
//   //   const net = await cocoSSDLoad();
//   //   setIsLoading(false);

//   //   detectInterval = setInterval(() => {
//   //     runObjectDetection(net);
//   //   }, 10);
//   // }, []);

//   // const runCoco = useCallback(async () => {
//   //   setIsLoading(true);
//   //   const net = await cocoSSDLoad({
//   //     modelUrl: 'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v1/model.json',
//   //   });
//   //   setIsLoading(false);

//   //   detectInterval = setInterval(() => {
//   //     runObjectDetection(net);
//   //   }, 10);
//   // }, []);




//   const runObjectDetection = async (net) => {
//     if (
//       canvasRef.current &&
//       webcamRef.current !== null &&
//       webcamRef.current.video?.readyState === 4
//     ) {
//       canvasRef.current.width = webcamRef.current.video.videoWidth;
//       canvasRef.current.height = webcamRef.current.video.videoHeight;

//       const detectedObjects = await net.detect(webcamRef.current.video);
//       const context = canvasRef.current.getContext("2d");
//       renderPredictions(detectedObjects, context);
//     }
//   };

//   const showmyVideo = () => {
//     if (
//       webcamRef.current !== null &&
//       webcamRef.current.video?.readyState === 4
//     ) {
//       const width = webcamRef.current.video.videoWidth;
//       const height = webcamRef.current.video.videoHeight;
//       webcamRef.current.video.width = width;
//       webcamRef.current.video.height = height;
//     }
//   };

//   const toggleFacingMode = () => {
//     setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
//   };

//   useEffect(() => {
//     runCoco();
//     showmyVideo();

//     return () => {
//       clearInterval(detectInterval);
//     };
//   }, [facingMode]); // re-run when camera is flipped

//   const videoConstraints = {
//     facingMode: facingMode,
//   };

//   return (
//     <div className="fixed inset-0 z-0 bg-black">
//       {isLoading ? (
//         <div className="text-white text-center text-xl mt-4">
//           Loading AI Model...
//         </div>
//       ) : (
//         <div className="relative w-full h-full">
//           <Webcam
//             ref={webcamRef}
//             className="w-full h-full object-cover"
//             videoConstraints={videoConstraints}
//             mirrored={facingMode === "user"} // mirror front cam for natural view
//             audio={false}
//             muted
//           />
//           <canvas
//             ref={canvasRef}
//             className="absolute top-0 left-0 w-full h-full z-10"
//           />
//           <button
//             onClick={toggleFacingMode}
//             className="absolute bottom-4 right-4 z-20 px-4 py-2 bg-white text-black rounded-md shadow-md"
//           >
//             Flip Camera
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ObjectDetection;



"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { load as cocoSSDLoad } from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import { renderPredictions } from "./utils/render-predictions";

let detectInterval;

const ObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState("user"); // front camera by default

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // const runCoco = useCallback(async () => {
  //   setIsLoading(true);
  //   const net = await cocoSSDLoad();
  //   setIsLoading(false);

  //   detectInterval = setInterval(() => {
  //     runObjectDetection(net);
  //   }, 10);
  // }, []);

  // const runCoco = useCallback(async () => {
  //   setIsLoading(true);
  //   const net = await cocoSSDLoad({
  //     modelUrl: 'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v1/model.json',
  //   });
  //   setIsLoading(false);

  //   detectInterval = setInterval(() => {
  //     runObjectDetection(net);
  //   }, 10);
  // }, []);

  //   const runCoco = useCallback(async () => {
  //   setIsLoading(true);
  //     const net = await cocoSSDLoad({ modelUrl: '/models/airplane/model.json' });

  //   setIsLoading(false);

  //   detectInterval = setInterval(() => {
  //     runObjectDetection(net);
  //   }, 10);
  // }, []);

  const runCoco = useCallback(async () => {
    try {
      setIsLoading(true);
      const model = await tf.loadGraphModel("/models/airplane/model.json");
      setIsLoading(false);

      detectInterval = setInterval(() => {
        runObjectDetection(model);
      }, 200); // 5 FPS is more realistic and stable
    } catch (err) {
      console.error("Model load error", err);
      setIsLoading(false);
    }
  }, []);


  const runObjectDetection = async (model) => {
    if (
      canvasRef.current &&
      webcamRef.current?.video?.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const inputTensor = tf.tidy(() =>
        tf.browser.fromPixels(video)
          .resizeBilinear([320, 320])
          .toFloat()
          .div(255.0)
          .expandDims(0)
      );

      try {
        const output = await model.executeAsync(inputTensor); // a single tensor

        const data = await output.array(); // shape: [1, 12, 2100]
        const raw = data[0]; // shape: [12, 2100]
        const boxes = [];

        for (let i = 0; i < 2100; i++) {
          const x = raw[0][i];
          const y = raw[1][i];
          const w = raw[2][i];
          const h = raw[3][i];

          const scores = raw.slice(4).map(cls => cls[i]);
          const maxScore = Math.max(...scores);
          const classId = scores.indexOf(maxScore);

          if (maxScore > 0.5) {
            const centerX = x * videoWidth;
            const centerY = y * videoHeight;
            const boxWidth = w * videoWidth;
            const boxHeight = h * videoHeight;

            boxes.push({
              bbox: [
                centerX - boxWidth / 2,
                centerY - boxHeight / 2,
                boxWidth,
                boxHeight
              ],
              class: `Class ${classId}`,
              score: maxScore
            });
          }
        }

        renderPredictions(boxes, canvasRef.current.getContext("2d"));
        output.dispose();
      } catch (e) {
        console.error("Detection error", e);
      } finally {
        inputTensor.dispose();
      }
    }
  };




  const showmyVideo = () => {
    if (
      webcamRef.current !== null &&
      webcamRef.current.video?.readyState === 4
    ) {
      const width = webcamRef.current.video.videoWidth;
      const height = webcamRef.current.video.videoHeight;
      webcamRef.current.video.width = width;
      webcamRef.current.video.height = height;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    runCoco();
    showmyVideo();

    return () => {
      clearInterval(detectInterval);
    };
  }, [facingMode]); // re-run when camera is flipped

  const videoConstraints = {
    facingMode: facingMode,
  };

  return (
    <div className="fixed inset-0 z-0 bg-black">
      {isLoading ? (
        <div className="text-white text-center text-xl mt-4">
          Loading AI Model...
        </div>
      ) : (
        <div className="relative w-full h-full">
          <Webcam
            ref={webcamRef}
            className="w-full h-full object-cover"
            videoConstraints={videoConstraints}
            mirrored={facingMode === "user"} // mirror front cam for natural view
            audio={false}
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-10"
          />
          <button
            onClick={toggleFacingMode}
            className="absolute bottom-4 right-4 z-20 px-4 py-2 bg-white text-black rounded-md shadow-md"
          >
            Flip Camera
          </button>
        </div>
      )}
    </div>
  );
};

export default ObjectDetection;