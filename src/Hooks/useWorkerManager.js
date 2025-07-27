// useWorkerManager.js - Fixed Vite Compatible Version
import { useRef, useCallback, useState, useEffect } from 'react';

export const useWorkerManager = () => {
  const workerRef = useRef(null);
  const messageIdRef = useRef(0);
  const pendingRequestsRef = useRef(new Map());

  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState(null);
  const [workerStatus, setWorkerStatus] = useState({
    isLoaded: false,
    isWarmedUp: false,
    isLoading: false,
    isWarmingUp: false,
    tfReady: false
  });

  useEffect(() => {
    let initTimeout;

    const initializeWorker = async () => {
      try {
        let worker;
        let workerCreated = false;

        // Helper function to test if a URL returns valid JavaScript
        const testWorkerUrl = async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type');
            const text = await response.text();

            // Check if it's actually JavaScript (not HTML)
            if (text.trim().startsWith('<')) {
              throw new Error('Received HTML instead of JavaScript');
            }

            console.log('✅ Worker file found and valid:', url);
            return { url, content: text };
          } catch (error) {
            console.warn(`❌ Worker URL test failed for ${url}:`, error.message);
            throw error;
          }
        };

        // Get potential worker URLs to try
        const getWorkerUrls = () => {
          const currentPath = window.location.pathname;
          const baseUrl = import.meta.env.BASE_URL || '/';

          // Extract base path handling subdirectories
          let basePath = '/';
          if (currentPath.includes('/dashboard')) {
            basePath = currentPath.replace('/dashboard', '') || '/';
          }

          return [
            // Method 1: Vite public directory (most likely)
            new URL('modelWorker.js', window.location.origin + baseUrl).href,

            // Method 2: Relative to current path
            new URL('modelWorker.js', window.location.href.replace(/\/[^\/]*$/, '/')).href,

            // Method 3: Root relative
            new URL('/modelWorker.js', window.location.origin).href,

            // Method 4: Relative to base path
            new URL('modelWorker.js', window.location.origin + basePath).href,

            // Method 5: Public folder with base path
            new URL(basePath + 'modelWorker.js', window.location.origin).href.replace('//', '/'),
          ].filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates
        };

        const workerUrls = getWorkerUrls();

        // Try each URL until one works
        let validWorker = null;
        for (const url of workerUrls) {
          try {
            const { content } = await testWorkerUrl(url);
            worker = new Worker(url);
            validWorker = { url, content };
            workerCreated = true;
            break;
          } catch (error) {
            console.warn(`❌ Failed to create worker from ${url}:`, error.message);
          }
        }

        // If all URLs failed, create inline worker
        if (!workerCreated) {
          console.warn('⚠️ All external worker URLs failed, creating inline worker');

          // Create inline worker with the actual worker code
          const inlineWorkerCode = `
let tf = null;

const CLASSES = [
  "Flight",
  "Aerobridge Docked", 
  "Aerobridge Retracted",
  "Catering Truck",
  "Cargo And Baggage Truck",
  "Cargo Door",
  "Push Back Machine",
  "Fuel Truck",
    "Yellow Line"
];

// Load TensorFlow.js dynamically
async function loadTensorFlow() {
  try {
    if (typeof importScripts !== 'undefined') {
      try {
        importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js');
        tf = self.tf;
      } catch (error) {
        console.warn('Failed to load TF.js 4.15.0, trying 4.10.0...', error);
        importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js');
        tf = self.tf;
      }
    }
    
    if (!tf) {
      throw new Error('TensorFlow.js not available after loading');
    }
    
    await tf.ready();
    
    try {
      await tf.setBackend('webgl');
      await tf.ready();
    } catch (webglError) {
      console.warn('WebGL backend failed, falling back to CPU:', webglError);
      await tf.setBackend('cpu');
      await tf.ready();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to load TensorFlow.js:', error);
    return false;
  }
}

class ModelWorker {
  constructor() {
    this.model = null;
    this.isLoaded = false;
    this.isWarmedUp = false;
    this.isLoading = false;
    this.isWarmingUp = false;
    this.tfReady = false;
    this.initPromise = this.initializeTensorFlow();
  }

  async initializeTensorFlow() {
    try {
      this.tfReady = await loadTensorFlow();
      return this.tfReady;
    } catch (error) {
      console.error('Error initializing TensorFlow.js in worker:', error);
      this.tfReady = false;
      return false;
    }
  }

  async ensureReady() {
    if (this.initPromise) {
      await this.initPromise;
    }
    return this.tfReady;
  }

  async loadModel(modelPaths) {
    if (this.isLoaded || this.isLoading) {
      return { success: true, message: 'Model already loaded or loading' };
    }

    const ready = await this.ensureReady();
    if (!ready) {
      return { success: false, error: 'TensorFlow.js not ready in worker' };
    }

    this.isLoading = true;

    try {
      let tfModel = null;
      let successPath = null;
      let lastError = null;

      for (const path of modelPaths) {
        try {
          tfModel = await tf.loadGraphModel(path, {
            fromTFHub: false,
            onProgress: (fraction) => {
              if (fraction < 1) {
                console.log(\`Loading progress: \${(fraction * 100).toFixed(1)}%\`);
              }
            }
          });
          
          successPath = path;
          break;
        } catch (error) {
          console.warn(\`Failed to load from \${path}:\`, error.message);
          lastError = error;
        }
      }

      if (!tfModel) {
        throw new Error(\`Failed to load model from any path. Last error: \${lastError?.message}\`);
      }

      this.model = tfModel;
      this.isLoaded = true;
      this.isLoading = false;

      return { 
        success: true, 
        message: \`Model loaded successfully from \${successPath}\` 
      };
    } catch (error) {
      this.isLoading = false;
      console.error('Model loading error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  getStatus() {
    return {
      isLoaded: this.isLoaded,
      isWarmedUp: this.isWarmedUp,
      isLoading: this.isLoading,
      isWarmingUp: this.isWarmingUp,
      tfReady: this.tfReady,
      backend: this.tfReady && tf ? tf.getBackend() : 'unknown',
      tfVersion: this.tfReady && tf && tf.version ? tf.version.tfjs : 'unknown',
      memory: this.tfReady && tf && tf.memory ? tf.memory() : null
    };
  }
}

const modelWorker = new ModelWorker();

self.onmessage = async function(e) {
  const { id, type, data } = e.data;

  try {
    let result;

    switch (type) {
      case 'LOAD_MODEL':
        result = await modelWorker.loadModel(data.modelPaths);
        break;

      case 'WARMUP_MODEL':
        result = await modelWorker.warmupModel();
        break;

      case 'DETECT_OBJECTS':
        result = await modelWorker.detectObjects(data.imageData, data.videoWidth, data.videoHeight);
        break;

      case 'GET_STATUS':
        result = { success: true, status: modelWorker.getStatus() };
        break;

      default:
        result = { success: false, error: \`Unknown message type: \${type}\` };
    }

    self.postMessage({ id, ...result });
  } catch (error) {
    console.error('Worker message handling error:', error);
    self.postMessage({ 
      id, 
      success: false, 
      error: error.message 
    });
  }
};

self.onerror = function(error) {
  console.error('Worker global error:', error);
  self.postMessage({
    id: -1,
    success: false,
    error: \`Worker error: \${error.message || error}\`
  });
};
`;

          const blob = new Blob([inlineWorkerCode], { type: 'application/javascript' });
          worker = new Worker(URL.createObjectURL(blob));
          workerCreated = true;
          console.log('✅ Created inline worker as fallback');
        }

        if (!workerCreated) {
          throw new Error('Failed to create worker using any method');
        }

        workerRef.current = worker;

        workerRef.current.onmessage = (e) => {
          const { id, success, error, predictions, status, message } = e.data;

          // Handle status updates
          if (status) {
            setWorkerStatus(status);
          }

          const pendingRequest = pendingRequestsRef.current.get(id);
          if (pendingRequest) {
            pendingRequestsRef.current.delete(id);

            if (success) {
              pendingRequest.resolve({ success, predictions, status, message });
            } else {
              console.log('❌ Request rejected:', { id, error });
              pendingRequest.reject(new Error(error));
            }
          } else if (id !== -1) { // -1 is used for global errors
            console.warn('⚠️ No pending request found for ID:', id);
          }
        };

        workerRef.current.onerror = (error) => {
          console.error('❌ Worker error:', error);
          console.error('  - Filename:', error.filename);
          console.error('  - Line:', error.lineno);
          console.error('  - Column:', error.colno);
          console.error('  - Message:', error.message);

          setWorkerError(error.message || 'Unknown worker error');
          setIsWorkerReady(false);

          // Reject all pending requests
          pendingRequestsRef.current.forEach(({ reject }) => {
            reject(new Error('Worker error occurred'));
          });
          pendingRequestsRef.current.clear();
        };

        workerRef.current.onmessageerror = (error) => {
          console.error('❌ Worker message error:', error);
          setWorkerError('Worker message error');
        };

        // Give the worker time to initialize
        initTimeout = setTimeout(() => {
          if (workerRef.current) {
            setIsWorkerReady(true);
            setWorkerError(null);
            console.log('✅ Worker marked as ready');
          }
        }, 1000); // Increased timeout for better reliability

      } catch (error) {
        console.error('❌ Failed to create worker:', error);
        setWorkerError(error.message);
        setIsWorkerReady(false);
      }
    };

    initializeWorker();

    return () => {
      if (initTimeout) {
        clearTimeout(initTimeout);
      }

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      pendingRequestsRef.current.clear();
      setIsWorkerReady(false);
      setWorkerError(null);
    };
  }, []);

  // Send message to worker with timeout
  const sendMessage = useCallback((type, data = {}, timeout = 30000) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isWorkerReady) {
        reject(new Error('Worker not ready'));
        return;
      }

      if (workerError) {
        reject(new Error(`Worker error: ${workerError}`));
        return;
      }

      const id = ++messageIdRef.current;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        pendingRequestsRef.current.delete(id);
        reject(new Error(`Worker operation timed out after ${timeout}ms`));
      }, timeout);

      const request = {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      };

      pendingRequestsRef.current.set(id, request);

      try {
        workerRef.current.postMessage({ id, type, data });
      } catch (error) {
        pendingRequestsRef.current.delete(id);
        clearTimeout(timeoutId);
        reject(new Error(`Failed to send message to worker: ${error.message}`));
      }
    });
  }, [isWorkerReady, workerError]);

  // Load model
  const loadModel = useCallback(async () => {
    try {
      const modelPaths = ['/models/airplane_model/model.json'];
      const result = await sendMessage('LOAD_MODEL', { modelPaths }, 60000);

      // Update status after loading
      setTimeout(() => {
        updateStatus();
      }, 100);

      return result;
    } catch (error) {
      console.error('❌ Error loading model:', error);
      throw error;
    }
  }, [sendMessage]);

  // Warmup model
  const warmupModel = useCallback(async () => {
    try {
      const result = await sendMessage('WARMUP_MODEL', {}, 30000);

      // Update status after warmup
      setTimeout(() => {
        updateStatus();
      }, 100);

      return result;
    } catch (error) {
      console.error('❌ Error warming up model:', error);
      throw error;
    }
  }, [sendMessage]);

  // Detect objects
  const detectObjects = useCallback(async (imageData, videoWidth, videoHeight) => {
    try {
      const result = await sendMessage('DETECT_OBJECTS', {
        imageData,
        videoWidth,
        videoHeight
      }, 5000);

      return result;
    } catch (error) {
      console.error('❌ Error detecting objects:', error);
      throw error;
    }
  }, [sendMessage]);

  // Update status
  const updateStatus = useCallback(async () => {
    try {
      const result = await sendMessage('GET_STATUS', {}, 5000);
      if (result.success && result.status) {
        setWorkerStatus(result.status);
      }
    } catch (error) {
      console.error('❌ Error getting status:', error);
    }
  }, [sendMessage]);

  // Get current status on worker ready
  useEffect(() => {
    if (isWorkerReady && !workerError) {
      // Give worker time to fully initialize TensorFlow.js
      const statusTimeout = setTimeout(() => {
        updateStatus();
      }, 1500); // Increased delay for TensorFlow.js initialization

      return () => clearTimeout(statusTimeout);
    }
  }, [isWorkerReady, workerError, updateStatus]);

  // Manual worker restart function
  const restartWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    pendingRequestsRef.current.clear();
    setIsWorkerReady(false);
    setWorkerError(null);

    // The useEffect will automatically reinitialize the worker
  }, []);

  // Check worker health
  const checkWorkerHealth = useCallback(async () => {
    try {
      const result = await sendMessage('GET_STATUS', {}, 3000);
      return result.success;
    } catch (error) {
      console.error('❌ Worker health check failed:', error);
      return false;
    }
  }, [sendMessage]);

  return {
    isWorkerReady,
    workerError,
    workerStatus,
    loadModel,
    warmupModel,
    detectObjects,
    updateStatus,
    restartWorker,
    checkWorkerHealth
  };
};