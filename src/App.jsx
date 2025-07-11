EYE ON RAMP CODE 
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