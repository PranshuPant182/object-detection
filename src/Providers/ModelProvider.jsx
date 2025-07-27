// ModelProvider.jsx - Global model manager that starts loading on app initialization
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useWorkerManager } from '../hooks/useWorkerManager';

// Create context for global model state
const ModelContext = createContext({
  isModelReady: false,
  modelStatus: {
    isLoaded: false,
    isWarmedUp: false,
    isLoading: false,
    isWarmingUp: false,
    error: null
  },
  loadingProgress: 0,
  initializeModel: () => {},
  getModelInstance: () => null
});

export const useGlobalModel = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useGlobalModel must be used within ModelProvider');
  }
  return context;
};

export const ModelProvider = ({ children }) => {
  const [isModelReady, setIsModelReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelError, setModelError] = useState(null);
  const [initStarted, setInitStarted] = useState(false);

  // Worker manager for model operations
  const {
    isWorkerReady,
    workerError,
    workerStatus,
    loadModel: workerLoadModel,
    warmupModel: workerWarmupModel,
    detectObjects: workerDetectObjects,
    checkWorkerHealth
  } = useWorkerManager();

  // Combined model status
  const modelStatus = {
    isLoaded: workerStatus.isLoaded,
    isWarmedUp: workerStatus.isWarmedUp,
    isLoading: workerStatus.isLoading,
    isWarmingUp: workerStatus.isWarmingUp,
    error: modelError || workerError,
    tfReady: workerStatus.tfReady,
    backend: workerStatus.backend
  };

  // Initialize model - can be called from anywhere in the app
  const initializeModel = useCallback(async () => {
    if (initStarted || isModelReady) {
      return;
    }

    setInitStarted(true);
    setModelError(null);
    setLoadingProgress(0);

    try {
      // Wait for worker to be ready
      if (!isWorkerReady) {
        setLoadingProgress(10);
        
        // Wait up to 10 seconds for worker
        let attempts = 0;
        while (!isWorkerReady && attempts < 100) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!isWorkerReady) {
          throw new Error('Worker failed to initialize within timeout');
        }
      }

      setLoadingProgress(20);

      // Load model
      const modelPaths = [
        '/models/airplane_model/model.json',
        '/EyeOnRampwebappDev/models/airplane_model/model.json',
        './models/airplane_model/model.json'
      ];

      const loadResult = await workerLoadModel(modelPaths);
      
      if (!loadResult.success) {
        throw new Error(`Model loading failed: ${loadResult.error}`);
      }

      setLoadingProgress(60);

      // Warmup model
      const warmupResult = await workerWarmupModel();
      
      if (!warmupResult.success) {
        console.warn('⚠️ Model warmup failed, but continuing:', warmupResult.error);
        // Don't fail completely if warmup fails - some models work without it
      }

      setLoadingProgress(90);

      // Verify model is working with a quick health check
      const isHealthy = await checkWorkerHealth();
      if (!isHealthy) {
        throw new Error('Model health check failed');
      }

      setLoadingProgress(100);
      setIsModelReady(true);

    } catch (error) {
      console.error('❌ Model initialization failed:', error);
      setModelError(error.message);
      setLoadingProgress(0);
      setInitStarted(false);
    }
  }, [initStarted, isModelReady, isWorkerReady, workerLoadModel, workerWarmupModel, checkWorkerHealth]);

  // Auto-initialize when worker becomes ready
  useEffect(() => {
    if (isWorkerReady && !initStarted && !isModelReady && !workerError) {
      // Add a small delay to ensure everything is settled
      setTimeout(() => {
        initializeModel();
      }, 500);
    }
  }, [isWorkerReady, initStarted, isModelReady, workerError, initializeModel]);

  // Monitor worker status changes
  useEffect(() => {
    if (workerStatus.isLoaded && workerStatus.isWarmedUp && !isModelReady) {
      setIsModelReady(true);
      setLoadingProgress(100);
    }
  }, [workerStatus.isLoaded, workerStatus.isWarmedUp, isModelReady]);

  // Get model instance for detection
  const getModelInstance = useCallback(() => {
    if (!isModelReady) {
      console.warn('Model not ready yet');
      return null;
    }
    
    return {
      detectObjects: workerDetectObjects,
      isReady: isModelReady,
      status: modelStatus
    };
  }, [isModelReady, workerDetectObjects, modelStatus]);

  // Context value
  const contextValue = {
    isModelReady,
    modelStatus,
    loadingProgress,
    initializeModel,
    getModelInstance
  };

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  );
};