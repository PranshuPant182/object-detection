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

  const runCoco = useCallback(async () => {
    setIsLoading(true);
    const net = await cocoSSDLoad();
    setIsLoading(false);

    detectInterval = setInterval(() => {
      runObjectDetection(net);
    }, 10);
  }, []);

  const runObjectDetection = async (net) => {
    if (
      canvasRef.current &&
      webcamRef.current !== null &&
      webcamRef.current.video?.readyState === 4
    ) {
      canvasRef.current.width = webcamRef.current.video.videoWidth;
      canvasRef.current.height = webcamRef.current.video.videoHeight;

      const detectedObjects = await net.detect(webcamRef.current.video);
      const context = canvasRef.current.getContext("2d");
      renderPredictions(detectedObjects, context);
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
