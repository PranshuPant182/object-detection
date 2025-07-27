import * as tf from "@tensorflow/tfjs";
import { useRef, useCallback, useState, useEffect } from 'react';
import moment from 'moment';
import { activityRepository } from '../ApiManager/RepositoryLayer';
import { useWorkerManager } from './useWorkerManager';

export const useObjectDetection = ({
  activityList = [],
  SelectedOption,
}) => {
  // Worker manager
  const {
    isWorkerReady,
    workerStatus,
    loadModel: workerLoadModel,
    warmupModel: workerWarmupModel,
    detectObjects: workerDetectObjects
  } = useWorkerManager();

  // Local state
  const [isDetecting, setIsDetecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [detectedActivities, setDetectedActivities] = useState({});
  const [ActivityList, setActivityList] = useState(activityList);

  // Refs for detection state
  const animationFrameRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const detectionIntervalRef = useRef(null);
  const detectedClassesRef = useRef(new Set());
  const detectedActivitiesRef = useRef({});
  const activityCountersRef = useRef({});
  const currentDetectionStateRef = useRef({});
  const lastSeenTimestampRef = useRef({});
  const frameCounterRef = useRef(0);
  const lastSeenFrameRef = useRef({});
  const isBatchCompletedRef = useRef({});
  const outTimeThresholdFrames = 15;
  // Add these new refs after your existing refs
  const directModelRef = useRef(null);
  const isDirectModelLoaded = useRef(false);

  // Store reference to current video element and canvas
  const currentVideoElementRef = useRef(null);
  const currentPredictionsRef = useRef([]);
  const currentCanvasRef = useRef(null);

  // Enhanced canvas and video tracking
  const canvasScaleRef = useRef({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
  const videoMetricsRef = useRef({ width: 0, height: 0, aspect: 0 });

  // Activity tracking refs for integration
  const sentInRef = useRef(new Set());
  const sentOutRef = useRef(new Set());
  const finalizedActivitiesRef = useRef(new Set());
  const instanceTrackerRef = useRef({});
  const cateringTruckCounterRef = useRef(0);
  const flightIDRef = useRef(null);

  // these new refs for offline queue management
  const offlineQueueRef = useRef([]);
  const imageQueueRef = useRef([]);
  const isOnlineRef = useRef(navigator.onLine);
  const retryIntervalRef = useRef(null);
  const maxRetryAttempts = 3;
  const retryDelayMs = 2000;

  // New refs for image tracking
  const activityImagesRef = useRef({}); // Track which images have been captured for each activity
  const batchImageStatusRef = useRef({}); // Track batch image status for multi-instance activities

  // Image compression and capture utility
  const compressImageToBase64 = useCallback((canvas, quality = 0.8, maxWidth = 800, maxHeight = 600) => {
    return new Promise((resolve) => {
      // Create a temporary canvas for compression
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = canvas;
      const aspectRatio = width / height;

      if (width > maxWidth || height > maxHeight) {
        if (aspectRatio > 1) {
          width = maxWidth;
          height = maxWidth / aspectRatio;
        } else {
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }
      }

      tempCanvas.width = width;
      tempCanvas.height = height;

      // Draw the original canvas content to the temporary canvas (compressed)
      tempCtx.drawImage(canvas, 0, 0, width, height);

      // Convert to base64 with compression
      const base64 = tempCanvas.toDataURL('image/jpeg', quality);
      resolve(base64);
    });
  }, []);

  // API call to save image
  const saveActivityImage = useCallback(async (activityData, imageBase64, imageType = 'IN') => {
    const imageData = {
      activityData,
      imageBase64,
      imageType,
      timestamp: Date.now(),
      attempts: 0
    };

    if (!isOnlineRef.current) {
      imageQueueRef.current.push(imageData);
      console.log('Added image to offline queue');
      return;
    }

    try {
      const ScheduleID = JSON.parse(localStorage.getItem('ScheduledID')) || 0;
      const userData = JSON.parse(localStorage.getItem('UserData'));
      const userId = userData?.userId;
      const FlightID = JSON.parse(localStorage.getItem('selectedFlightID') || 0);

      const requestBody = {
        activityID: getActivityIdByName(activityData.ActivityName),
        scheduledId: ScheduleID || 0,
        flightID: FlightID || 0,
        image: imageBase64,
        userId: userId || 0,
      };

      await activityRepository.saveActivityImage(requestBody);
    } catch (error) {
      console.error("Error saving activity image:", error);
      imageQueueRef.current.push(imageData);
    }
  }, []);



  // Add these new functions
  const processOfflineQueue = useCallback(async () => {
    if (!isOnlineRef.current || offlineQueueRef.current.length === 0) return;

    console.log(`Processing ${offlineQueueRef.current.length} queued activities`);

    const failedItems = [];

    for (const item of offlineQueueRef.current) {
      try {
        const ScheduleID = JSON.parse(localStorage.getItem('ScheduledID')) || 0;
        const requestBody = {
          scheduleID: ScheduleID,
          activityID: item.activityID,
          locationLabel: "Vision",
          status: item.status,
          startTime: item.startTime || "",
          endTime: item.endTime || "",
          remarks: "",
          userId: item.userId.toString(),
        };

        await activityRepository.saveActivity(requestBody);
        console.log('Successfully sent queued activity:', item.activityID);
      } catch (error) {
        console.error('Failed to send queued activity:', error);
        item.attempts = (item.attempts || 0) + 1;

        if (item.attempts < maxRetryAttempts) {
          failedItems.push(item);
        } else {
          console.error('Max retry attempts reached for activity:', item.activityID);
        }
      }
    }

    offlineQueueRef.current = failedItems;

    // Process image queue
    await processImageQueue();

    // Schedule retry for failed items
    if (failedItems.length > 0) {
      scheduleRetry();
    }
  }, []);

  const processImageQueue = useCallback(async () => {
    if (!isOnlineRef.current || imageQueueRef.current.length === 0) return;

    console.log(`Processing ${imageQueueRef.current.length} queued images`);

    const failedImages = [];

    for (const imageItem of imageQueueRef.current) {
      try {
        const ScheduleID = JSON.parse(localStorage.getItem('ScheduledID')) || 0;
        const userData = JSON.parse(localStorage.getItem('UserData'));
        const userId = userData?.userId;
        const FlightID = JSON.parse(localStorage.getItem('selectedFlightID') || 0);

        const requestBody = {
          activityID: getActivityIdByName(imageItem.activityData.ActivityName),
          scheduledId: ScheduleID || 0,
          flightID: FlightID || 0,
          image: imageItem.imageBase64,
          userId: userId || 0,
        };

        await activityRepository.saveActivityImage(requestBody);
        console.log('Successfully sent queued image');
      } catch (error) {
        console.error('Failed to send queued image:', error);
        imageItem.attempts = (imageItem.attempts || 0) + 1;

        if (imageItem.attempts < maxRetryAttempts) {
          failedImages.push(imageItem);
        }
      }
    }

    imageQueueRef.current = failedImages;
  }, []);

  const scheduleRetry = useCallback(() => {
    if (retryIntervalRef.current) {
      clearTimeout(retryIntervalRef.current);
    }

    retryIntervalRef.current = setTimeout(() => {
      if (isOnlineRef.current) {
        processOfflineQueue();
      }
    }, retryDelayMs);
  }, [processOfflineQueue]);



  // Enhanced frame capture with bounding box and compression
  const captureActivityImage = useCallback(async (videoElement, activityName, imageType, prediction = null) => {
    if (!videoElement || videoElement.readyState < 2) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');

      // Draw the video frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Find the prediction for this activity if not provided
      if (!prediction) {
        const baseClassName = activityName.split(' ').slice(0, -1).join(' ');
        prediction = currentPredictionsRef.current.find(pred => pred.class === baseClassName);
      }

      let boundingBoxData = null;

      // Draw bounding box if prediction exists
      if (prediction) {
        const [x, y, width, height] = prediction.bbox;

        // Store bounding box data
        boundingBoxData = { x, y, width, height };

        // Draw bounding box
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, width, height);

        // Draw label
        const fontSize = Math.max(14, Math.min(20, width / 12));
        ctx.font = `bold ${fontSize}px Arial`;

        const labelText = prediction.class;
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        const labelX = x;
        const labelY = y > textHeight + 10 ? y - 8 : y + height + textHeight + 8;

        ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
        ctx.fillRect(labelX - 3, labelY - textHeight - 3, textWidth + 6, textHeight + 6);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(labelText, labelX, labelY);
      }

      // Compress and convert to base64
      const compressedBase64 = await compressImageToBase64(canvas);

      return {
        base64: compressedBase64,
        boundingBox: boundingBoxData
      };

    } catch (error) {
      console.error('Error capturing activity image:', error);
      return null;
    }
  }, [compressImageToBase64]);

  // Video frame capture for detection
  const captureVideoFrame = useCallback((videoElement) => {
    if (!videoElement || videoElement.readyState < 2) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.error('Error capturing video frame:', error);
      return null;
    }
  }, []);

  // Get activity ID by name (keeping original logic)
  const getActivityIdByName = useCallback((activityName) => {
    if (!activityName) return 0;

    if (activityName.includes("Catering Truck")) return 6;
    if (activityName.includes("Aerobridge Docked")) return 9;
    if (activityName.includes("Cargo Door")) return 16;
    if (activityName.includes("Push Back Machine")) return 17;
    if (activityName.includes("Cargo And Baggage Truck")) return 14;

    return 0;
  }, []);

  const getMaxInstancesForClass = useCallback((className) => {
    const maxInstances = {
      "Flight": 1,
      "Aerobridge Docked": 2,
      "Catering Truck": 6,
      "Cargo And Baggage Truck": 2,
      "Cargo Door": 1,
      "Push Back Machine": 1,
      "Fuel Truck": 1
    };
    return maxInstances[className] || 1;
  }, []);

  const getPersistenceTimeout = useCallback((className) => {
    const timeouts = {
      "Flight": 5000,
      "Aerobridge Docked": 10000,
      "Catering Truck": 3000,
      "Cargo And Baggage Truck": 3000,
      "Cargo Door": 15000,
      "Push Back Machine": 5000,
      "Fuel Truck": 5000
    };
    return timeouts[className] || 3000;
  }, []);

  // Check if activity class supports multiple instances
  // const isMultiInstanceClass = useCallback((className) => {
  //   const multiInstanceClasses = ["Catering Truck", "Aerobridge Docked", "Cargo And Baggage Truck"];
  //   return multiInstanceClasses.includes(className);
  // }, []);
  const isMultiInstanceClass = useCallback((className) => {
    return ActivityList?.some(
      (activity) =>
        activity.activityName === className && activity.allowMultipleOccurrences
    );
  }, [ActivityList]);

  // Save activity function (keeping original logic)
  const saveActivity = useCallback(async ({ activityID, startTime, endTime, status, userId }) => {
    const requestData = {
      activityID, startTime, endTime, status, userId,
      timestamp: Date.now(),
      attempts: 0
    };

    if (!isOnlineRef.current) {
      // Add to offline queue
      offlineQueueRef.current.push(requestData);
      console.log('Added to offline queue:', requestData);
      return;
    }

    try {
      const ScheduleID = JSON.parse(localStorage.getItem('ScheduledID')) || 0;
      const requestBody = {
        scheduleID: ScheduleID,
        activityID: activityID,
        locationLabel: "Vision",
        status: status,
        startTime: startTime || "",
        endTime: endTime || "",
        remarks: "",
        userId: userId.toString(),
      };

      await activityRepository.saveActivity(requestBody);
    } catch (error) {
      console.error("Error saving activity:", error);
      // Add to retry queue on failure
      offlineQueueRef.current.push(requestData);
    }
  }, []);

  useEffect(() => {
    if (activityList && Array.isArray(activityList)) {
      setActivityList(activityList);
    }
  }, [activityList]);

  // network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      console.log('Network restored - processing offline queue');
      processOfflineQueue();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      console.log('Network lost - switching to offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set flight ID function
  const setFlightID = useCallback((flightId) => {
    flightIDRef.current = flightId;
  }, []);

  // Enhanced canvas metrics calculation (keeping original logic)
  const calculateCanvasMetrics = useCallback((videoElement, canvas) => {
    if (!videoElement || !canvas || videoElement.readyState < 2) {
      return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
    }

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    if (canvasWidth === 0 || canvasHeight === 0 || videoWidth === 0 || videoHeight === 0) {
      return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
    }

    const canvasAspect = canvasWidth / canvasHeight;
    const videoAspect = videoWidth / videoHeight;

    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

    if (videoAspect > canvasAspect) {
      drawHeight = canvasHeight;
      drawWidth = drawHeight * videoAspect;
      offsetX = (canvasWidth - drawWidth) / 2;
    } else {
      drawWidth = canvasWidth;
      drawHeight = drawWidth / videoAspect;
      offsetY = (canvasHeight - drawHeight) / 2;
    }

    const scaleX = drawWidth / videoWidth;
    const scaleY = drawHeight / videoHeight;

    const metrics = { scaleX, scaleY, offsetX, offsetY };
    canvasScaleRef.current = metrics;

    return metrics;
  }, []);

  // Enhanced frame capture with better coordinate handling (keeping original logic)
  const captureFrame = useCallback((videoElement, activityName, type) => {
    if (!videoElement || videoElement.readyState < 2) return;

    try {
      const baseClassName = activityName.split(' ').slice(0, -1).join(' ');
      const activityPrediction = currentPredictionsRef.current.find(pred => pred.class === baseClassName);

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      if (activityPrediction) {
        const [x, y, width, height] = activityPrediction.bbox;

        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, width, height);

        const fontSize = Math.max(14, Math.min(20, width / 12));
        ctx.font = `bold ${fontSize}px Arial`;

        const labelText = baseClassName;
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        const labelX = x;
        const labelY = y > textHeight + 10 ? y - 8 : y + height + textHeight + 8;

        ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
        ctx.fillRect(labelX - 3, labelY - textHeight - 3, textWidth + 6, textHeight + 6);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(labelText, labelX, labelY);
      }
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  }, []);

  const formatDateTime = useCallback((date = new Date()) => {
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  }, []);

  const calculateDuration = useCallback((startTime, endTime) => {
    const start = moment(startTime);
    const end = moment(endTime);
    return end.diff(start, 'seconds');
  }, []);


  const updateActivityList = useCallback(async (detectedActivitiesData) => {
    const today = new Date().toISOString().slice(0, 10);

    const incoming = Object.values(detectedActivitiesData).map(activity => ({
      Activity: activity.ActivityName,
      BaseClassName: activity.BaseClassName,
      IN: activity.InTime ? moment(activity.FullInTime).format('HH:mm:ss') : null,
      OUT: activity.OutTime ? moment(activity.FullOutTime).format('HH:mm:ss') : null
    }));

    const multiInstanceActivities = ["Catering Truck", "Aerobridge Docked", "Cargo And Baggage Truck"];

    // Helper function to check if activity already has actual times in ActivityList
    const hasActualTimes = (baseClassName) => {
      if (!ActivityList || !Array.isArray(ActivityList)) return false;

      // Find the activity in the list by matching activityName with baseClassName
      const activityInList = ActivityList.find(item =>
        item.activityName === baseClassName ||
        item.activityName?.toLowerCase().includes(baseClassName.toLowerCase())
      );

      if (!activityInList) return false;

      // Check if both actualStartTime and actualEndTime exist and are not empty/placeholder values
      const hasValidStartTime = activityInList.actualStartTime &&
        activityInList.actualStartTime !== "" &&
        activityInList.actualStartTime !== "1900-01-01 05:30:00";

      const hasValidEndTime = activityInList.actualEndTime &&
        activityInList.actualEndTime !== "" &&
        activityInList.actualEndTime !== "1900-01-01 05:30:00";

      return hasValidStartTime && hasValidEndTime;
    };

    incoming.forEach(act => {
      if (!act.Activity) return;

      const activityID = getActivityIdByName(act.Activity);
      if (activityID === 0) return;

      const baseKey = `${act.Activity}`;
      const inKey = `${baseKey}_${act.IN}`;
      const outKey = `${baseKey}_${act.OUT}`;

      const isMultiInstance = multiInstanceActivities.includes(act.BaseClassName);

      // Check if this is a single-instance activity that already has actual times
      const shouldSkipDueToExistingTimes = !isMultiInstance && hasActualTimes(act.BaseClassName);

      if (shouldSkipDueToExistingTimes) {
        return; // Skip this activity entirely
      }

      const formattedIN = act.IN
        ? moment(`${today} ${act.IN}`, 'YYYY-MM-DD HH:mm:ss').utc().format('YYYY-MM-DD HH:mm:ss')
        : '';

      const formattedOUT = act.OUT
        ? moment(`${today} ${act.OUT}`, 'YYYY-MM-DD HH:mm:ss').utc().format('YYYY-MM-DD HH:mm:ss')
        : '';

      // Send IN activity (START)
      // const shouldSendIN = formattedIN && !sentInRef.current.has(inKey);
      const shouldSendIN = formattedIN && (!sentInRef.current.has(inKey) || !isOnlineRef.current);

      if (shouldSendIN) {
        const payload = {
          activityID,
          startTime: formattedIN,
          endTime: '',
          status: 'inprogress',
          userId: 2,
        };
        saveActivity(payload);
        sentInRef.current.add(inKey);
        instanceTrackerRef.current[baseKey] = formattedIN;
      }

      // Send OUT activity (END)
      const shouldSendOUT = formattedIN && formattedOUT && !sentOutRef.current.has(outKey);

      if (shouldSendOUT) {
        const previousStart = instanceTrackerRef.current[baseKey] || '';
        let status = 'inprogress';

        if (isMultiInstance) {
          // Check if this is the last active instance of this type
          const allActiveInstancesOfThisType = Object.keys(detectedActivitiesRef.current)
            .filter(key =>
              detectedActivitiesRef.current[key].BaseClassName === act.BaseClassName &&
              detectedActivitiesRef.current[key].OutTime !== null // About to be completed
            );

          const stillActiveInstances = Object.keys(detectedActivitiesRef.current)
            .filter(key =>
              detectedActivitiesRef.current[key].BaseClassName === act.BaseClassName &&
              detectedActivitiesRef.current[key].OutTime === null && // Still active
              key !== baseKey // Exclude current one being completed
            );

          if (stillActiveInstances.length === 0) {
            status = 'completed';
            isBatchCompletedRef.current[act.BaseClassName] = true;
          } else {
            status = 'inprogress';
          }
        } else {
          status = 'completed';
        }

        const payload = {
          activityID,
          startTime: previousStart,
          endTime: formattedOUT,
          status: status,
          userId: 2,
        };

        saveActivity(payload);
        sentOutRef.current.add(outKey);
      }
    });
  }, [getActivityIdByName, saveActivity, ActivityList]);

  const resetActivityTracking = useCallback(() => {
    sentInRef.current.clear();
    sentOutRef.current.clear();
    finalizedActivitiesRef.current.clear();
    instanceTrackerRef.current = {};
    cateringTruckCounterRef.current = 0;
    isBatchCompletedRef.current = {};

    // Reset image tracking
    activityImagesRef.current = {};
    batchImageStatusRef.current = {};
  }, []);

  // Check and set out times with enhanced image capture
  const checkAndSetOutTimes = useCallback(async () => {
    const currentFrame = frameCounterRef.current;
    const currentTime = new Date();

    for (const activityId of Object.keys(detectedActivitiesRef.current)) {
      const activity = detectedActivitiesRef.current[activityId];
      const lastSeenFrame = lastSeenFrameRef.current[activityId] || 0;
      const framesSinceLastSeen = currentFrame - lastSeenFrame;

      if (framesSinceLastSeen >= outTimeThresholdFrames && !activity.OutTime) {
        const outTimeFormatted = formatDateTime(currentTime);
        const durationSeconds = calculateDuration(activity.FullInTime, currentTime);

        // Capture OUT image for the activity
        if (currentVideoElementRef.current) {
          const baseClassName = activity.BaseClassName;
          const isMultiInstance = isMultiInstanceClass(baseClassName);
          const prediction = currentPredictionsRef.current.find(pred => pred.class === baseClassName);

          // For multi-instance activities, capture OUT image only for the last instance
          if (isMultiInstance) {
            const allInstancesOfThisType = Object.keys(detectedActivitiesRef.current)
              .filter(key => detectedActivitiesRef.current[key].BaseClassName === baseClassName);

            const stillActiveInstances = allInstancesOfThisType.filter(key =>
              detectedActivitiesRef.current[key].OutTime === null && key !== activityId
            );

            // This is the last active instance
            if (stillActiveInstances.length === 0) {
              const imageData = await captureActivityImage(
                currentVideoElementRef.current,
                activity.ActivityName,
                'OUT',
                prediction
              );

              if (imageData) {
                const activityWithBoundingBox = {
                  ...activity,
                  boundingBox: imageData.boundingBox,
                  FullOutTime: currentTime.toISOString()
                };

                await saveActivityImage(activityWithBoundingBox, imageData.base64, 'OUT');
                batchImageStatusRef.current[baseClassName] = { outCaptured: true };
              }
            }
          } else {
            // For single-instance activities, always capture OUT image
            const imageData = await captureActivityImage(
              currentVideoElementRef.current,
              activity.ActivityName,
              'OUT',
              prediction
            );

            if (imageData) {
              const activityWithBoundingBox = {
                ...activity,
                boundingBox: imageData.boundingBox,
                FullOutTime: currentTime.toISOString()
              };

              await saveActivityImage(activityWithBoundingBox, imageData.base64, 'OUT');

              if (!activityImagesRef.current[activityId]) {
                activityImagesRef.current[activityId] = {};
              }
              activityImagesRef.current[activityId].outCaptured = true;
            }
          }

          // Keep original frame capture for other purposes
          captureFrame(currentVideoElementRef.current, activity.ActivityName, 'OutTime');
        }

        const updatedActivity = {
          ActivityName: activity.ActivityName,
          BaseClassName: activity.BaseClassName,
          InTime: activity.InTime,
          OutTime: outTimeFormatted,
          DurationSeconds: durationSeconds,
          FullInTime: activity.FullInTime,
          FullOutTime: currentTime.toISOString()
        };

        detectedActivitiesRef.current[activityId] = updatedActivity;
        setDetectedActivities(prev => ({
          ...prev,
          [activityId]: updatedActivity
        }));

        const maxInstances = getMaxInstancesForClass(activity.BaseClassName);
        const isMultiInstance = maxInstances > 1;

        let statusMessage = 'Activity Completed';
        if (isMultiInstance) {
          const allInstancesOfThisType = Object.keys(detectedActivitiesRef.current)
            .filter(key => detectedActivitiesRef.current[key].BaseClassName === activity.BaseClassName);

          const completedInstances = allInstancesOfThisType.filter(key =>
            detectedActivitiesRef.current[key].OutTime !== null
          );

          if (completedInstances.length === allInstancesOfThisType.length) {
            statusMessage = `All ${activity.BaseClassName} instances completed`;
          } else {
            statusMessage = `${activity.BaseClassName} instance completed (${completedInstances.length}/${allInstancesOfThisType.length})`;
          }
        }

        setTimeout(() => {
          updateActivityList(detectedActivitiesRef.current);
        }, 100);
      }
    }
  }, [formatDateTime, calculateDuration, captureFrame, updateActivityList, getMaxInstancesForClass,
    isMultiInstanceClass, captureActivityImage, saveActivityImage]);

  const reactivateActivity = useCallback((activityId) => {
    const activity = detectedActivitiesRef.current[activityId];
    if (activity && activity.OutTime) {
      const reactivatedActivity = {
        ActivityName: activity.ActivityName,
        BaseClassName: activity.BaseClassName,
        InTime: activity.InTime,
        OutTime: null,
        DurationSeconds: null,
        FullInTime: activity.FullInTime,
        FullOutTime: null
      };

      detectedActivitiesRef.current[activityId] = reactivatedActivity;
      setDetectedActivities(prev => ({
        ...prev,
        [activityId]: reactivatedActivity
      }));
    }
  }, []);

  const getNextActivityId = useCallback((className) => {
    if (!activityCountersRef.current[className]) {
      activityCountersRef.current[className] = 0;
    }

    activityCountersRef.current[className] += 1;
    const activityId = `${className} ${activityCountersRef.current[className]}`;
    return activityId;
  }, []);

  const findReusableActivity = useCallback((className) => {
    const currentTime = Date.now();
    const persistenceTimeout = getPersistenceTimeout(className);

    const existingActivities = Object.keys(detectedActivitiesRef.current)
      .filter(key => detectedActivitiesRef.current[key].BaseClassName === className);

    for (const activityId of existingActivities) {
      const lastSeen = lastSeenTimestampRef.current[activityId] || 0;
      const timeSinceLastSeen = currentTime - lastSeen;

      if (timeSinceLastSeen > 500 && timeSinceLastSeen < persistenceTimeout) {
        return activityId;
      }
    }

    return null;
  }, [getPersistenceTimeout]);

  // Enhanced processActivityDetections with better multi-instance tracking
  const processActivityDetections = useCallback((classGroups) => {
    const currentTime = Date.now();
    const currentFrame = frameCounterRef.current;

    checkAndSetOutTimes();

    Object.entries(classGroups).forEach(([className, instances]) => {
      const currentCount = instances.length;
      const maxAllowed = getMaxInstancesForClass(className);

      // Handle Aerobridge Docked - allow up to 2 instances with proper numbering
      if (className === "Aerobridge Docked") {
        handleMultiInstanceClass(className, currentCount, maxAllowed, currentTime, currentFrame);
        return;
      }

      // Handle Catering Truck - allow up to 6 instances with proper numbering
      if (className === "Catering Truck") {
        handleMultiInstanceClass(className, currentCount, maxAllowed, currentTime, currentFrame);
        return;
      }

      // Handle Cargo And Baggage Truck - allow up to 2 instances with proper numbering
      if (className === "Cargo And Baggage Truck") {
        handleMultiInstanceClass(className, currentCount, maxAllowed, currentTime, currentFrame);
        return;
      }

      // General processing for other single-instance classes
      handleSingleInstanceClass(className, currentCount, maxAllowed, currentTime, currentFrame);
    });
  }, [getMaxInstancesForClass, checkAndSetOutTimes]);

  // Modified helper function to check if all instances of a class are completed
  const isClassBatchCompleted = useCallback((className) => {
    const existingActivities = Object.keys(detectedActivitiesRef.current)
      .filter(key => detectedActivitiesRef.current[key].BaseClassName === className);

    if (existingActivities.length === 0) {
      return true; // No activities means we can start fresh
    }

    // Check if ALL instances have OutTime (completed)
    const allCompleted = existingActivities.every(activityId =>
      detectedActivitiesRef.current[activityId].OutTime !== null
    );

    return allCompleted;
  }, []);

  // Modified helper function to reset completed batch for fresh start
  const resetCompletedBatch = useCallback((className) => {
    // Clear all completed activities for this class
    const existingActivities = Object.keys(detectedActivitiesRef.current)
      .filter(key => detectedActivitiesRef.current[key].BaseClassName === className);

    existingActivities.forEach(activityId => {
      if (detectedActivitiesRef.current[activityId].OutTime !== null) {
        delete detectedActivitiesRef.current[activityId];
        delete lastSeenTimestampRef.current[activityId];
        delete lastSeenFrameRef.current[activityId];
        delete activityImagesRef.current[activityId]; // Clear image tracking
      }
    });

    // Reset the activity counter for this class to start fresh numbering
    activityCountersRef.current[className] = 0;

    // Mark this batch as no longer completed
    isBatchCompletedRef.current[className] = false;

    // Reset batch image status
    delete batchImageStatusRef.current[className];

  }, []);

  // Enhanced handleMultiInstanceClass function with image capture
  const handleMultiInstanceClass = useCallback(async (className, currentCount, maxAllowed, currentTime, currentFrame) => {
    // Check if the previous batch was completed
    const batchCompleted = isClassBatchCompleted(className);

    // If previous batch was completed and we detect new instances, start fresh
    if (batchCompleted && currentCount > 0) {
      resetCompletedBatch(className);
    }

    // Get currently active activities (not completed ones)
    const existingActivities = Object.keys(detectedActivitiesRef.current)
      .filter(key =>
        detectedActivitiesRef.current[key].BaseClassName === className &&
        detectedActivitiesRef.current[key].OutTime === null // Only active ones
      );

    // Update existing active instances
    existingActivities.slice(0, Math.min(currentCount, maxAllowed)).forEach(activityId => {
      lastSeenTimestampRef.current[activityId] = currentTime;
      lastSeenFrameRef.current[activityId] = currentFrame;
      // No need to reactivate since these are already active
    });

    // Create new instances if needed
    const activeCount = existingActivities.length;
    if (currentCount > activeCount && activeCount < maxAllowed) {
      const newInstancesNeeded = Math.min(currentCount - activeCount, maxAllowed - activeCount);

      for (let i = 0; i < newInstancesNeeded; i++) {
        const instanceNumber = activeCount + i + 1;
        const activityId = `${className} ${instanceNumber}`;

        const currentTimeObj = new Date();
        const timeString = formatDateTime(currentTimeObj);
        const fullDateTime = currentTimeObj.toISOString();

        const activityData = {
          ActivityName: activityId,
          BaseClassName: className,
          InTime: timeString,
          OutTime: null,
          DurationSeconds: null,
          FullInTime: fullDateTime,
          FullOutTime: null
        };

        // Capture IN image for multi-instance activities (only first instance of batch)
        if (currentVideoElementRef.current && activeCount === 0 && i === 0) {
          const prediction = currentPredictionsRef.current.find(pred => pred.class === className);
          const imageData = await captureActivityImage(
            currentVideoElementRef.current,
            activityData.ActivityName,
            'IN',
            prediction
          );

          if (imageData) {
            const activityWithBoundingBox = {
              ...activityData,
              boundingBox: imageData.boundingBox
            };

            await saveActivityImage(activityWithBoundingBox, imageData.base64, 'IN');
            batchImageStatusRef.current[className] = { inCaptured: true };
          }
        }

        if (currentVideoElementRef.current) {
          captureFrame(currentVideoElementRef.current, activityData.ActivityName, 'InTime');
        }

        detectedActivitiesRef.current[activityId] = activityData;
        setDetectedActivities(prev => ({
          ...prev,
          [activityId]: activityData
        }));

        lastSeenTimestampRef.current[activityId] = currentTime;
        lastSeenFrameRef.current[activityId] = currentFrame;

        // Send START activity to server immediately
        setTimeout(() => {
          updateActivityList({ [activityId]: activityData });
        }, 100);
      }
    }
  }, [isClassBatchCompleted, resetCompletedBatch, formatDateTime, captureFrame, updateActivityList,
    captureActivityImage, saveActivityImage]);

  // Enhanced helper function to handle single-instance classes with image capture
  const handleSingleInstanceClass = useCallback(async (className, currentCount, maxAllowed, currentTime, currentFrame) => {
    const existingActivities = Object.keys(detectedActivitiesRef.current)
      .filter(key => detectedActivitiesRef.current[key].BaseClassName === className)
      .slice(0, currentCount);

    existingActivities.forEach(activityId => {
      lastSeenTimestampRef.current[activityId] = currentTime;
      lastSeenFrameRef.current[activityId] = currentFrame;
      reactivateActivity(activityId);
    });

    const recordedCount = existingActivities.length;

    if (currentCount > recordedCount && recordedCount < maxAllowed) {
      const newInstancesNeeded = Math.min(currentCount - recordedCount, maxAllowed - recordedCount);

      for (let i = 0; i < newInstancesNeeded; i++) {
        let activityId = findReusableActivity(className);

        if (activityId) {
          lastSeenTimestampRef.current[activityId] = currentTime;
          lastSeenFrameRef.current[activityId] = currentFrame;
          reactivateActivity(activityId);

          // Check if we need to capture IN image for reactivated activity
          if (currentVideoElementRef.current && !activityImagesRef.current[activityId]?.inCaptured) {
            const prediction = currentPredictionsRef.current.find(pred => pred.class === className);
            const imageData = await captureActivityImage(
              currentVideoElementRef.current,
              detectedActivitiesRef.current[activityId].ActivityName,
              'IN',
              prediction
            );

            if (imageData) {
              const activityWithBoundingBox = {
                ...detectedActivitiesRef.current[activityId],
                boundingBox: imageData.boundingBox
              };

              await saveActivityImage(activityWithBoundingBox, imageData.base64, 'IN');

              if (!activityImagesRef.current[activityId]) {
                activityImagesRef.current[activityId] = {};
              }
              activityImagesRef.current[activityId].inCaptured = true;
            }
          }
        } else {
          activityId = getNextActivityId(className);

          if (!detectedClassesRef.current.has(activityId)) {
            detectedClassesRef.current.add(activityId);

            const currentTimeObj = new Date();
            const timeString = formatDateTime(currentTimeObj);
            const fullDateTime = currentTimeObj.toISOString();

            const activityData = {
              ActivityName: activityId,
              BaseClassName: className,
              InTime: timeString,
              OutTime: null,
              DurationSeconds: null,
              FullInTime: fullDateTime,
              FullOutTime: null
            };

            // Capture IN image for single-instance activities
            if (currentVideoElementRef.current) {
              const prediction = currentPredictionsRef.current.find(pred => pred.class === className);
              const imageData = await captureActivityImage(
                currentVideoElementRef.current,
                activityData.ActivityName,
                'IN',
                prediction
              );

              if (imageData) {
                const activityWithBoundingBox = {
                  ...activityData,
                  boundingBox: imageData.boundingBox
                };

                await saveActivityImage(activityWithBoundingBox, imageData.base64, 'IN');

                if (!activityImagesRef.current[activityId]) {
                  activityImagesRef.current[activityId] = {};
                }
                activityImagesRef.current[activityId].inCaptured = true;
              }

              captureFrame(currentVideoElementRef.current, activityData.ActivityName, 'InTime');
            }

            detectedActivitiesRef.current[activityId] = activityData;
            setDetectedActivities(prev => ({
              ...prev,
              [activityId]: activityData
            }));

            lastSeenTimestampRef.current[activityId] = currentTime;
            lastSeenFrameRef.current[activityId] = currentFrame;

            // Trigger activity list update for server integration
            setTimeout(() => {
              updateActivityList({ [activityId]: activityData });
            }, 100);
          }
        }
      }
    }
  }, [getNextActivityId, findReusableActivity, reactivateActivity, formatDateTime, captureFrame,
    updateActivityList, captureActivityImage, saveActivityImage]);

  const resetActivities = useCallback(() => {
    detectedActivitiesRef.current = {};
    detectedClassesRef.current.clear();
    activityCountersRef.current = {};
    currentDetectionStateRef.current = {};
    lastSeenTimestampRef.current = {};
    frameCounterRef.current = 0;
    lastSeenFrameRef.current = {};
    setDetectedActivities({});

    resetActivityTracking();
  }, [resetActivityTracking]);

  // Load model function using worker
  const loadModel = useCallback(async () => {
    if (!isWorkerReady) {
      console.warn('Worker not ready yet');
      return { success: false, error: 'Worker not ready' };
    }

    try {
      const modelPaths = [
        '/models/airplane_model/model.json',
        '/EyeOnRampwebappDev/models/airplane_model/model.json',
        './models/airplane_model/model.json'
      ];
      const result = await workerLoadModel(modelPaths);

      if (result.success) {
        // Auto-warmup after loading
        setTimeout(async () => {
          try {
            await workerWarmupModel();
          } catch (error) {
            console.error('Auto-warmup failed:', error);
          }
        }, 100);
      }

      return result;
    } catch (error) {
      console.error('Error loading model:', error);
      return { success: false, error: error.message };
    }
  }, [isWorkerReady, workerLoadModel, workerWarmupModel]);

// Add this helper function before your detectObjects function
const detectObjectsDirect = useCallback(async (videoElement, canvasElement, onDetection) => {
  if (!videoElement || videoElement.readyState < 2) return [];

  try {
    // Create input tensor directly from video (like working code)
    const inputTensor = tf.tidy(() =>
      tf.browser.fromPixels(videoElement)
        .resizeBilinear([640, 640])
        .div(255.0)
        .expandDims(0)
    );

    // Simulate worker postprocessing logic
    const CLASSES = [
      "Flight",
      "Aerobridge Docked",
      "Aerobridge Retracted",
      "Catering Truck",
      "Cargo And Baggage Truck",
      "Cargo Door",
      "Push Back Machine",
      "Fuel Truck"
    ];

    // Use the worker's model if available, otherwise skip
    let predictions = [];
    
    if (workerStatus.isLoaded && workerDetectObjects) {
      // Convert tensor to ImageData for worker compatibility
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      
      // Draw resized frame to canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoElement.videoWidth;
      tempCanvas.height = videoElement.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(videoElement, 0, 0);
      
      ctx.drawImage(tempCanvas, 0, 0, 640, 640);
      const imageData = ctx.getImageData(0, 0, 640, 640);
      
      // Send to worker
      const result = await workerDetectObjects(imageData, videoElement.videoWidth, videoElement.videoHeight);
      predictions = result.success ? (result.predictions || []) : [];
    }

    tf.dispose(inputTensor);

    // Apply your existing processing logic
    currentPredictionsRef.current = predictions;

    if (predictions.length > 0) {
      frameCounterRef.current += 1;

      const classGroups = {};
      predictions.forEach(prediction => {
        if (!classGroups[prediction.class]) {
          classGroups[prediction.class] = [];
        }
        classGroups[prediction.class].push(prediction);
      });

      // Process immediately for camera (no setTimeout delays)
      processActivityDetections(classGroups);

      if (onDetection) {
        onDetection(predictions);
      }
    } else {
      frameCounterRef.current += 1;
      checkAndSetOutTimes();
    }

    // Enhanced rendering
    if (currentCanvasRef.current && videoElement) {
      calculateCanvasMetrics(videoElement, currentCanvasRef.current);
      renderVideoWithPredictions(videoElement, predictions, currentCanvasRef.current);
    }

    return predictions;
  } catch (error) {
    console.error("Direct detection error:", error);
    return [];
  }
}, [workerStatus, workerDetectObjects, processActivityDetections, checkAndSetOutTimes, calculateCanvasMetrics]);

// Updated detectObjects function
const detectObjects = useCallback(async (videoElement, canvasElement, onDetection) => {
  if (!videoElement || !canvasElement) {
    return [];
  }

  // For camera input, use direct detection (faster, no worker overhead)
  if (currentVideoElementRef.current === videoElement && 
      videoElement.tagName === 'VIDEO' && 
      videoElement.srcObject) { // This indicates it's a webcam stream
    return detectObjectsDirect(videoElement, canvasElement, onDetection);
  }

  // For file input, use worker-based detection (your original logic)
  if (!workerStatus.isLoaded || !workerStatus.isWarmedUp) {
    return [];
  }

  try {
    return new Promise((resolve) => {
      const processDetection = async () => {
        try {
          // Capture frame data for worker
          const imageData = captureVideoFrame(videoElement);
          if (!imageData) {
            resolve([]);
            return;
          }

          // Send to worker for detection
          const result = await workerDetectObjects(
            imageData,
            videoElement.videoWidth,
            videoElement.videoHeight
          );

          if (!result.success || !result.predictions) {
            resolve([]);
            return;
          }

          const predictions = result.predictions;
          currentPredictionsRef.current = predictions;

          if (predictions.length > 0) {
            frameCounterRef.current += 1;

            const classGroups = {};
            predictions.forEach(prediction => {
              if (!classGroups[prediction.class]) {
                classGroups[prediction.class] = [];
              }
              classGroups[prediction.class].push(prediction);
            });

            setTimeout(() => {
              processActivityDetections(classGroups);
            }, 0);

            if (onDetection) {
              setTimeout(() => onDetection(predictions), 0);
            }
          } else {
            frameCounterRef.current += 1;
            setTimeout(() => checkAndSetOutTimes(), 0);
          }

          // Enhanced rendering with proper metrics calculation
          requestAnimationFrame(() => {
            if (currentCanvasRef.current && videoElement) {
              calculateCanvasMetrics(videoElement, currentCanvasRef.current);
              renderVideoWithPredictions(videoElement, predictions, currentCanvasRef.current);
            }
          });

          resolve(predictions);
        } catch (error) {
          console.error("Detection error:", error);
          resolve([]);
        }
      };

      if (window.scheduler && window.scheduler.postTask) {
        window.scheduler.postTask(processDetection, { priority: 'user-blocking' });
      } else if (window.requestIdleCallback) {
        window.requestIdleCallback(processDetection, { timeout: 50 });
      } else {
        setTimeout(processDetection, 0);
      }
    });
  } catch (error) {
    console.error("Detection error:", error);
    return [];
  }
}, [workerStatus, captureVideoFrame, workerDetectObjects, processActivityDetections, checkAndSetOutTimes, calculateCanvasMetrics, detectObjectsDirect]);


  // Enhanced start detection function
  const startDetection = useCallback(async (videoElement, canvasElement, onDetection, interval = 200) => {
    if (!workerStatus.isLoaded || !workerStatus.isWarmedUp || isDetecting || isInitializing) {
      console.warn('❌ Cannot start detection:', {
        modelLoaded: workerStatus.isLoaded,
        modelWarmedUp: workerStatus.isWarmedUp,
        isDetecting,
        isInitializing
      });
      return;
    }

    currentVideoElementRef.current = videoElement;
    currentCanvasRef.current = canvasElement;
    setIsInitializing(true);

    try {
      await new Promise((resolve) => {
        const checkVideoReady = () => {
          if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
            resolve();
          } else {
            setTimeout(checkVideoReady, 100);
          }
        };
        checkVideoReady();
      });

      setIsDetecting(true);
      setIsInitializing(false);

      resetActivities();

      if (canvasElement && videoElement) {
        const container = canvasElement.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          canvasElement.width = Math.floor(containerRect.width);
          canvasElement.height = Math.floor(containerRect.height);

          calculateCanvasMetrics(videoElement, canvasElement);
        }
      }

      let isDetectionRunning = false;

      const detectFrame = () => {
        if (isDetectionRunning || !videoElement || !currentCanvasRef.current || videoElement.readyState < 2) {
          return;
        }

        isDetectionRunning = true;

        const runDetection = async () => {
          try {
            await detectObjects(videoElement, currentCanvasRef.current, onDetection);
          } catch (error) {
            console.error("Detection frame error:", error);
          } finally {
            isDetectionRunning = false;
          }
        };

        if (window.scheduler && window.scheduler.postTask) {
          window.scheduler.postTask(runDetection, { priority: 'user-blocking' });
        } else {
          runDetection();
        }
      };

      if (SelectedOption === "Camera") {
        // Use requestAnimationFrame for camera (smoother)
        const detectFrameCamera = () => {
          if (isDetectionRunning || !videoElement || !currentCanvasRef.current || videoElement.readyState < 2) {
            return;
          }

          isDetectionRunning = true;

          detectObjects(videoElement, currentCanvasRef.current, onDetection)
            .then(() => {
              isDetectionRunning = false;
              if (detectionIntervalRef.current) {
                detectionIntervalRef.current = requestAnimationFrame(detectFrameCamera);
              }
            })
            .catch(() => {
              isDetectionRunning = false;
            });
        };

        detectionIntervalRef.current = requestAnimationFrame(detectFrameCamera);
      } else {
        // Use setInterval for file processing
        detectionIntervalRef.current = setInterval(detectFrame, interval);
      }

    } catch (error) {
      console.error("Error starting detection:", error);
      setIsInitializing(false);
      setIsDetecting(false);
    }
  }, [workerStatus, isDetecting, isInitializing, detectObjects, resetActivities, calculateCanvasMetrics]);

  // Enhanced function to update canvas reference with proper metrics recalculation
  const updateCanvasReference = useCallback((newCanvasElement) => {
    if (isDetecting && newCanvasElement) {
      currentCanvasRef.current = newCanvasElement;

      const container = newCanvasElement.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        newCanvasElement.width = Math.floor(containerRect.width);
        newCanvasElement.height = Math.floor(containerRect.height);
      }

      if (currentVideoElementRef.current) {
        calculateCanvasMetrics(currentVideoElementRef.current, newCanvasElement);
      }
    }
  }, [isDetecting, calculateCanvasMetrics]);

  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    currentVideoElementRef.current = null;
    currentPredictionsRef.current = [];
    currentCanvasRef.current = null;

    setIsDetecting(false);
    setIsInitializing(false);

    if (Object.keys(detectedActivitiesRef.current).length > 0) {
      const summary = {};
      Object.keys(detectedActivitiesRef.current).forEach(activityId => {
        const activity = detectedActivitiesRef.current[activityId];
        summary[activityId] = {
          ActivityName: activity.ActivityName,
          InTime: activity.InTime,
          OutTime: activity.OutTime,
          DurationSeconds: activity.DurationSeconds
        };
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
      if (retryIntervalRef.current) {
        clearTimeout(retryIntervalRef.current);
      }
    };
  }, [stopDetection]);

  return {
    isModelLoaded: workerStatus.isLoaded,
    isDetecting,
    isInitializing,
    isModelWarmedUp: workerStatus.isWarmedUp,
    detectedActivities,
    loadModel,
    detectObjects,
    startDetection,
    stopDetection,
    resetActivities,
    updateCanvasReference,
    processActivityDetections,
    checkAndSetOutTimes,
    formatDateTime,
    calculateDuration,
    captureFrame,
    detectObjectsDirect,
    // Enhanced image capture functions
    captureActivityImage,
    saveActivityImage,
    compressImageToBase64,
    // Activity integration functions
    setFlightID,
    resetActivityTracking,
    saveActivity,
    updateActivityList,
    getActivityIdByName,
    // Worker status
    isWorkerReady,
    workerStatus,
    processOfflineQueue,
    getQueueStatus: () => ({
      activities: offlineQueueRef.current.length,
      images: imageQueueRef.current.length,
      isOnline: isOnlineRef.current
    }),
    clearQueue: () => {
      offlineQueueRef.current = [];
      imageQueueRef.current = [];
    }
  };
};

// Enhanced rendering function with proper coordinate transformation
const renderVideoWithPredictions = (videoElement, predictions, canvas) => {
  if (!canvas || !videoElement || videoElement.readyState < 2) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const renderFrame = () => {
    // Check if canvas needs resizing
    const container = canvas.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const newWidth = Math.floor(containerRect.width);
      const newHeight = Math.floor(containerRect.height);

      if (Math.abs(canvas.width - newWidth) > 5 || Math.abs(canvas.height - newHeight) > 5) {
        canvas.width = newWidth;
        canvas.height = newHeight;
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate proper aspect ratios and scaling
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    if (canvasWidth === 0 || canvasHeight === 0 || videoWidth === 0 || videoHeight === 0) {
      return;
    }

    const canvasAspect = canvasWidth / canvasHeight;
    const videoAspect = videoWidth / videoHeight;

    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

    if (videoAspect > canvasAspect) {
      // Video is wider than canvas - fit height, center horizontally
      drawHeight = canvasHeight;
      drawWidth = drawHeight * videoAspect;
      offsetX = (canvasWidth - drawWidth) / 2;
    } else {
      // Video is taller than canvas - fit width, center vertically
      drawWidth = canvasWidth;
      drawHeight = drawWidth / videoAspect;
      offsetY = (canvasHeight - drawHeight) / 2;
    }

    // Draw video frame
    ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight);

    // Draw predictions with proper coordinate transformation
    if (predictions && predictions.length > 0) {
      const scaleX = drawWidth / videoWidth;
      const scaleY = drawHeight / videoHeight;
      renderPredictions(predictions, ctx, scaleX, scaleY, offsetX, offsetY);
    }
  };

  requestAnimationFrame(renderFrame);
};

// Enhanced prediction rendering with better coordinate handling
const renderPredictions = (predictions, ctx, scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0) => {
  if (!ctx || !predictions) return;

  const boxColor = "#25e6bf";

  predictions.forEach((prediction) => {
    const [x, y, width, height] = prediction.bbox;
    const text = `${prediction.class}`;

    // Transform coordinates properly
    const scaledX = x * scaleX + offsetX;
    const scaledY = y * scaleY + offsetY;
    const scaledWidth = width * scaleX;
    const scaledHeight = height * scaleY;

    // Ensure coordinates are within canvas bounds
    const clampedX = Math.max(0, Math.min(scaledX, ctx.canvas.width));
    const clampedY = Math.max(0, Math.min(scaledY, ctx.canvas.height));
    const clampedWidth = Math.min(scaledWidth, ctx.canvas.width - clampedX);
    const clampedHeight = Math.min(scaledHeight, ctx.canvas.height - clampedY);

    // Only draw if the box has valid dimensions
    if (clampedWidth > 0 && clampedHeight > 0) {
      // Draw bounding box
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(clampedX, clampedY, clampedWidth, clampedHeight);

      // Draw label
      ctx.fillStyle = boxColor;
      ctx.font = "bold 12px Arial";
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = 16;

      const labelTop = clampedY > 30 ? clampedY - 25 : clampedY + clampedHeight + 5;
      const labelLeft = Math.min(clampedX, ctx.canvas.width - textWidth - 10);

      // Ensure label background is within canvas
      if (labelTop >= 0 && labelTop + textHeight <= ctx.canvas.height &&
        labelLeft >= 0 && labelLeft + textWidth + 10 <= ctx.canvas.width) {

        ctx.fillRect(labelLeft, labelTop, textWidth + 10, textHeight + 6);

        ctx.fillStyle = "#000000";
        ctx.fillText(text, labelLeft + 5, labelTop + textHeight);
      }
    }
  });
};