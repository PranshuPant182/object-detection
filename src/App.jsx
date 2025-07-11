"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
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

  const createModelWrapper = (tfModel) => {
    const CLASSES = [
      "Flight",
      "Aerobridge Docked",
      "Aerobridge Retracted",
      "Cattering Truck",
      "Cargo And Baggage Truck",
      "Cargo Door",
      "Push Back Machine",
      "Fuel Truck"
    ];

    const postprocess = (outputTensor, videoWidth, videoHeight) => {
      let tensor = Array.isArray(outputTensor) ? outputTensor[0] : outputTensor;

      if (!tensor || typeof tensor.arraySync !== "function") return [];

      const outputArray = tensor.arraySync();
      const predictions = outputArray[0]; // shape: [N, 6]

      const detections = [];
      const threshold = 0.5;
      const modelInputSize = 640;
      const scaleX = videoWidth / modelInputSize;
      const scaleY = videoHeight / modelInputSize;

      predictions.forEach((pred) => {
        if (!Array.isArray(pred) || pred.length !== 6) return;
        const [x1, y1, x2, y2, confidence, classId] = pred;
        if (confidence < threshold) return;

        const classIndex = Math.round(classId);
        if (classIndex < 0 || classIndex >= CLASSES.length) return;

        detections.push({
          bbox: [
            x1 * scaleX,
            y1 * scaleY,
            (x2 - x1) * scaleX,
            (y2 - y1) * scaleY
          ],
          class: CLASSES[classIndex],
          score: confidence
        });
      });

      return detections;
    };

    return {
      detect: async (video) => {
        try {
          const inputTensor = tf.tidy(() =>
            tf.browser.fromPixels(video)
              .resizeBilinear([640, 640])
              .div(255.0)
              .expandDims(0)
          );

          const output = await tfModel.executeAsync(inputTensor);
          const predictions = postprocess(output, video.videoWidth, video.videoHeight);

          tf.dispose([inputTensor, ...(Array.isArray(output) ? output : [output])]);
          return predictions;
        } catch (error) {
          console.error("❌ Detection error:", error);
          return [];
        }
      }
    };
  };

  const detectFrame = useCallback(async () => {
    const net = modelRef.current;
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;

    if (net && canvas && video?.readyState === 4) {
      // Resize canvas only if needed
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext("2d");
      const predictions = await net.detect(video);
      renderPredictions(predictions, ctx);
    }

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  }, []);

  const loadModel = useCallback(async () => {
    setIsLoading(true);
    try {
      const tfModel = await tf.loadGraphModel("/models/Models/640_NMS/model.json");
      modelRef.current = createModelWrapper(tfModel);
      console.log("✅ Custom model loaded");
      setIsLoading(false);

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    } catch (err) {
      console.error("❌ Error loading model:", err);
      setIsLoading(false);
    }
  }, [detectFrame]);

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
    loadModel();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [facingMode, loadModel]);

  const videoConstraints = { facingMode };

  return (
    <div className="relative w-screen h-screen bg-black">
      {isLoading ? (
        <div className="text-white text-center text-xl mt-4">Loading AI Model...</div>
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


export default ObjectDetection;