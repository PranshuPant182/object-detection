"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import { renderPredictions } from "./utils/render-predictions";

const ObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState("user");

  const webcamRef = useRef(null);
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

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    loadModel();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [facingMode, loadModel]);

  const videoConstraints = { facingMode };

  return (
    <div className="fixed inset-0 z-0 bg-black">
      {isLoading ? (
        <div className="text-white text-center text-xl mt-4">Loading AI Model...</div>
      ) : (
        <div className="relative w-full h-full">
          <Webcam
            ref={webcamRef}
            className="w-full h-full object-cover"
            videoConstraints={videoConstraints}
            mirrored={facingMode === "user"}
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
