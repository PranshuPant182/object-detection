import { useRef, useState, useCallback, useEffect } from 'react';
import { useObjectDetection } from './useObjectDetection';

export const useVideoCapture = ({
  SelectedOption,
  setIsCapturing,
  isCapturing,
  setPlaying,
  setIsVideoPlaying,
  setVideoMetadata,
  detectionInterval = 200,
  PopupModal, 
  popupCanvasRef,
  activityList = [],
}) => {
  const [Zoom, setZoom] = useState(1);
  const [CssZoom, setCssZoom] = useState(false);
  
  // Refs
  const zoomRef = useRef(1);
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const displayCanvasRef = useRef(null);
  const webcamRef = useRef(null);
  const streamRef = useRef(null);
  
  // Track orientation and canvas state
  const orientationRef = useRef(window.orientation || 0);
  const lastCanvasSizeRef = useRef({ width: 0, height: 0 });
  const resizeTimeoutRef = useRef(null);

  // Object detection hook with web worker support
  const {
    isModelLoaded,
    isDetecting,
    isInitializing,
    isModelWarmedUp,
    isWorkerReady,
    workerStatus,
    loadModel,
    startDetection,
    stopDetection,
    updateCanvasReference
  } = useObjectDetection({
    activityList,
    SelectedOption,
  });

  // Auto-load model when worker is ready
  useEffect(() => {
    if (isWorkerReady && !workerStatus.isLoaded && !workerStatus.isLoading) {
      console.log('Worker ready, loading model...');
      loadModel().catch(error => {
        console.error('Failed to auto-load model:', error);
      });
    }
  }, [isWorkerReady, workerStatus.isLoaded, workerStatus.isLoading, loadModel]);

  const handleZoomChange = useCallback((delta) => {
    setZoom(prev => {
      const newZoom = Math.max(0.5, Math.min(3, prev + delta));
      zoomRef.current = newZoom;
      return newZoom;
    });
  }, []);

  // Enhanced canvas initialization with proper sizing
  const initializeCanvas = useCallback((canvas, forceResize = false) => {
    if (!canvas) return false;

    const container = canvas.parentElement;
    if (!container) return false;

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const newWidth = Math.floor(containerRect.width);
    const newHeight = Math.floor(containerRect.height);

    // Check if resize is needed
    const sizeChanged = 
      forceResize ||
      Math.abs(canvas.width - newWidth) > 5 || 
      Math.abs(canvas.height - newHeight) > 5;

    if (sizeChanged) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Store last size
      lastCanvasSizeRef.current = { width: newWidth, height: newHeight };
      
      // Clear canvas after resize
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, newWidth, newHeight);
      
      return true;
    }
    
    return false;
  }, []);

  // Enhanced orientation change handler
  const handleOrientationChange = useCallback(() => {
    const newOrientation = window.orientation || 0;
    const orientationChanged = orientationRef.current !== newOrientation;
    
    if (orientationChanged) {
      orientationRef.current = newOrientation;
      
      // Clear any pending resize timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Delay handling to allow DOM to update
      resizeTimeoutRef.current = setTimeout(() => {
        // Reinitialize canvases with force resize
        const activeCanvas = PopupModal ? popupCanvasRef.current : displayCanvasRef.current;
        
        if (activeCanvas) {
          const resized = initializeCanvas(activeCanvas, true);
          
          if (resized && isDetecting) {
            updateCanvasReference(activeCanvas);
          }
        }
        
        // Also update the other canvas if it exists
        const otherCanvas = PopupModal ? displayCanvasRef.current : popupCanvasRef?.current;
        if (otherCanvas) {
          initializeCanvas(otherCanvas, true);
        }
      }, 300); // Give time for layout to settle
    }
  }, [PopupModal, initializeCanvas, isDetecting, updateCanvasReference]);

  // Enhanced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      const activeCanvas = PopupModal ? popupCanvasRef.current : displayCanvasRef.current;
      
      if (activeCanvas) {
        const resized = initializeCanvas(activeCanvas, false);
        
        if (resized && isDetecting) {
          updateCanvasReference(activeCanvas);
        }
      }
    }, 150);
  }, [PopupModal, initializeCanvas, isDetecting, updateCanvasReference]);

  // Set up orientation and resize listeners
  useEffect(() => {
    const orientationEvents = ['orientationchange', 'resize'];
    
    orientationEvents.forEach(event => {
      if (event === 'orientationchange') {
        window.addEventListener(event, handleOrientationChange);
      } else {
        window.addEventListener(event, handleResize);
      }
    });

    return () => {
      orientationEvents.forEach(event => {
        if (event === 'orientationchange') {
          window.removeEventListener(event, handleOrientationChange);
        } else {
          window.removeEventListener(event, handleResize);
        }
      });
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [handleOrientationChange, handleResize]);

  // Handle detection callback
  const handleDetection = useCallback((predictions) => {
    // Apply zoom scaling to prediction coordinates if needed
    const scaledPredictions = predictions.map(prediction => ({
      ...prediction,
      bbox: prediction.bbox ? prediction.bbox.map((coord, index) => {
        // Scale bbox coordinates based on zoom
        return index % 2 === 0 ? coord * zoomRef.current : coord * zoomRef.current;
      }) : prediction.bbox
    }));

    const flightDetections = scaledPredictions.filter(p => p.class === "Flight");
    const cateringDetections = scaledPredictions.filter(p => p.class === "Catering Truck");

    if (flightDetections.length > 0) {
      // Handle flight detection
    }

    if (cateringDetections.length > 0) {
      // Handle catering truck detection
    }
  }, []);

  // Better video readiness checking
  const waitForVideoReady = useCallback((videoElement) => {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (videoElement.readyState >= 2 && 
            videoElement.videoWidth > 0 && 
            videoElement.videoHeight > 0) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }, []);

  // Enhanced canvas switching function
  const switchCanvas = useCallback((newCanvasRef) => {
    if (isDetecting && newCanvasRef && newCanvasRef.current) {
      // Initialize the new canvas properly
      initializeCanvas(newCanvasRef.current, true);
      
      // Update the detection reference
      updateCanvasReference(newCanvasRef.current);
    }
  }, [isDetecting, updateCanvasReference, initializeCanvas]);

  // Enhanced start capturing function with worker status checking
  const startCapturing = useCallback(async () => {
    if (isCapturing) return;

    // Enhanced model readiness check including worker status
    if (!isWorkerReady) {
      console.warn('Worker not ready yet');
      return;
    }

    if (!isModelLoaded || !isModelWarmedUp) {
      console.warn('Model not ready yet. Loaded:', isModelLoaded, 'Warmed up:', isModelWarmedUp);
      
      // If worker is ready but model isn't loaded, try to load it
      if (isWorkerReady && !workerStatus.isLoading && !workerStatus.isLoaded) {
        console.log('Attempting to load model before starting capture...');
        try {
          await loadModel();
          // Wait a bit for warmup to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!workerStatus.isWarmedUp) {
            console.warn('Model still not warmed up after loading');
            return;
          }
        } catch (error) {
          console.error('Failed to load model:', error);
          return;
        }
      } else {
        return;
      }
    }

    try {
      setIsCapturing(true);
      setPlaying(true);

      if (SelectedOption === "Camera") {
        // Start webcam with enhanced constraints for mobile
        const constraints = {
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: 'environment',
            frameRate: { ideal: 30, max: 30 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
          
          webcamRef.current.onloadedmetadata = async () => {
            try {
              await webcamRef.current.play();
              await waitForVideoReady(webcamRef.current);
              
              setVideoMetadata({
                duration: 0,
                width: webcamRef.current.videoWidth,
                height: webcamRef.current.videoHeight,
                fps: 30
              });
              
              setIsVideoPlaying(true);

              // Enhanced canvas initialization with orientation awareness
              const activeCanvas = PopupModal ? popupCanvasRef.current : displayCanvasRef.current;
              if (activeCanvas) {
                initializeCanvas(activeCanvas, true);
                
                // Wait a bit more for mobile to settle and ensure model is ready
                setTimeout(() => {
                  if (isModelLoaded && isModelWarmedUp && webcamRef.current && webcamRef.current.readyState >= 2) {
                    const canvasToUse = PopupModal ? popupCanvasRef.current : displayCanvasRef.current;
                    const interval = SelectedOption === "Camera" ? 33 : detectionInterval; // 33ms = ~30fps for camera
                    startDetection(webcamRef.current, canvasToUse, handleDetection, interval);
                  }
                }, 500); // Increased delay for mobile
              }
              
            } catch (error) {
              console.error("Error starting webcam playback:", error);
              setIsCapturing(false);
              setPlaying(false);
            }
          };
        }
      } else {
        // Enhanced video file handling
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          
          const handleCanPlay = async () => {
            try {
              await videoRef.current.play();
              await waitForVideoReady(videoRef.current);
              
              setIsVideoPlaying(true);

              // Enhanced canvas initialization
              const activeCanvas = PopupModal ? popupCanvasRef.current : displayCanvasRef.current;
              if (activeCanvas) {
                initializeCanvas(activeCanvas, true);
                
                setTimeout(() => {
                  if (isModelLoaded && isModelWarmedUp && videoRef.current && videoRef.current.readyState >= 2) {
                    const canvasToUse = PopupModal ? popupCanvasRef.current : displayCanvasRef.current;
                    startDetection(videoRef.current, canvasToUse, handleDetection, detectionInterval);
                  }
                }, 300);
              }
              
            } catch (error) {
              console.error("Error starting video playback:", error);
              setIsCapturing(false);
              setPlaying(false);
            }
          };

          videoRef.current.oncanplay = handleCanPlay;
          
          if (videoRef.current.readyState >= 3) {
            handleCanPlay();
          }
        }
      }
    } catch (error) {
      console.error("Error starting capture:", error);
      setIsCapturing(false);
      setPlaying(false);
    }
  }, [
    SelectedOption, 
    isCapturing, 
    isWorkerReady, 
    isModelLoaded, 
    isModelWarmedUp, 
    workerStatus, 
    loadModel, 
    startDetection, 
    handleDetection, 
    detectionInterval, 
    waitForVideoReady, 
    PopupModal, 
    initializeCanvas
  ]);

  const stopCapturing = useCallback(() => {
    setIsCapturing(false);
    setPlaying(false);
    setIsVideoPlaying(false);

    // Stop object detection
    stopDetection();

    if (SelectedOption === "Camera" && streamRef.current) {
      // Stop webcam stream
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      if (webcamRef.current) {
        webcamRef.current.srcObject = null;
      }
    } else if (videoRef.current) {
      // Pause video
      videoRef.current.pause();
    }

    // Clear both canvases
    if (displayCanvasRef.current) {
      const ctx = displayCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, displayCanvasRef.current.width, displayCanvasRef.current.height);
    }

    if (popupCanvasRef && popupCanvasRef.current) {
      const ctx = popupCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, popupCanvasRef.current.width, popupCanvasRef.current.height);
    }
  }, [SelectedOption, stopDetection]);

  // Manual model loading function (useful for debugging or manual control)
  const manualLoadModel = useCallback(async () => {
    if (!isWorkerReady) {
      console.warn('Worker not ready');
      return { success: false, error: 'Worker not ready' };
    }

    try {
      console.log('🔄 Manually loading model...');
      const result = await loadModel();
      console.log('Model load result:', result);
      return result;
    } catch (error) {
      console.error('Manual model load failed:', error);
      return { success: false, error: error.message };
    }
  }, [isWorkerReady, loadModel]);

  // Status checking function for debugging
  const getStatus = useCallback(() => {
    return {
      isWorkerReady,
      workerStatus,
      isModelLoaded,
      isModelWarmedUp,
      isDetecting,
      isInitializing,
      isCapturing
    };
  }, [
    isWorkerReady, 
    workerStatus, 
    isModelLoaded, 
    isModelWarmedUp, 
    isDetecting, 
    isInitializing, 
    isCapturing
  ]);

  return {
    Zoom,
    CssZoom,
    handleZoomChange,
    startCapturing,
    stopCapturing,
    switchCanvas,
    zoomRef,
    videoRef,
    captureCanvasRef,
    displayCanvasRef,
    webcamRef,
    isModelLoaded,
    isDetecting,
    isInitializing,
    isModelWarmedUp,
    loadModel,
    // Additional worker-related exports
    isWorkerReady,
    workerStatus,
    manualLoadModel,
    getStatus
  };
};