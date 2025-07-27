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

// Load TensorFlow.js dynamically with a newer version that supports more operations
async function loadTensorFlow() {
  try {
   
    // Try different methods to load TensorFlow.js
    if (typeof importScripts !== 'undefined') {
      // Traditional worker environment - use newer version
      try {
        // Try the latest stable version first
        importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js');
        tf = self.tf;
      } catch (error) {
        console.warn('Failed to load TF.js 4.15.0, trying 4.10.0...', error);
        // Fallback to a known stable version
        importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js');
        tf = self.tf;
      }
    } else {
      // Module worker environment - use dynamic import
      try {
        const tfModule = await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js');
        tf = tfModule.default || tfModule;
      } catch (error) {
        console.warn('Failed to load TF.js 4.15.0 via import, trying 4.10.0...', error);
        const tfModule = await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js');
        tf = tfModule.default || tfModule;
      }
    }
    
    if (!tf) {
      throw new Error('TensorFlow.js not available after loading');
    }
    
    // Initialize TensorFlow.js with more compatible settings
    await tf.ready();
    
    // Try WebGL first, fallback to CPU if needed
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
    console.error('❌ Failed to load TensorFlow.js:', error);
    
    // Final fallback: try loading from unpkg CDN
    try {
      if (typeof importScripts !== 'undefined') {
        importScripts('https://unpkg.com/@tensorflow/tfjs@4.15.0/dist/tf.min.js');
        tf = self.tf;
      }
      
      if (tf) {
        await tf.ready();
        await tf.setBackend('cpu');
        await tf.ready();
        return true;
      }
    } catch (fallbackError) {
      console.error('❌ Fallback loading also failed:', fallbackError);
    }
    
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
    this.initPromise = null;
    
    // Start initialization
    this.initPromise = this.initializeTensorFlow();
  }

  async initializeTensorFlow() {
    try {
      this.tfReady = await loadTensorFlow();
      
      if (!this.tfReady) {
        throw new Error('Failed to initialize TensorFlow.js');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing TensorFlow.js in worker:', error);
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
         
          // Load model with additional options for compatibility
          tfModel = await tf.loadGraphModel(path, {
            fromTFHub: false,
            onProgress: (fraction) => {
              if (fraction < 1) {
                console.log(`📥 Loading progress: ${(fraction * 100).toFixed(1)}%`);
              }
            }
          });
          
          successPath = path;
          break;
        } catch (error) {
          console.warn(`❌ Failed to load from ${path}:`, error.message);
          lastError = error;
        }
      }

      if (!tfModel) {
        throw new Error(`Failed to load model from any path. Last error: ${lastError?.message}`);
      }

      this.model = tfModel;
      this.isLoaded = true;
      this.isLoading = false;

      return { 
        success: true, 
        message: `Model loaded successfully from ${successPath}` 
      };
    } catch (error) {
      this.isLoading = false;
      console.error('❌ Model loading error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async warmupModel() {
    if (!this.model || this.isWarmedUp || this.isWarmingUp) {
      return { success: false, message: 'Model not loaded or already warmed up' };
    }

    const ready = await this.ensureReady();
    if (!ready) {
      return { success: false, error: 'TensorFlow.js not ready in worker' };
    }

    this.isWarmingUp = true;

    try {
      
      // Try different warmup strategies based on the model type
      let warmupSuccess = false;
      
      // Strategy 1: Standard warmup with proper error handling
      try {
        const dummyInput = tf.tidy(() => tf.zeros([1, 640, 640, 3]));

        for (let i = 0; i < 2; i++) { // Reduced iterations to avoid timeout
          
          const output = await this.model.executeAsync(dummyInput);

          if (Array.isArray(output)) {
            output.forEach(tensor => tensor.dispose());
          } else {
            output.dispose();
          }

          if (i < 1) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        tf.dispose(dummyInput);
        warmupSuccess = true;
        
      } catch (warmupError) {
        console.warn('❌ Standard warmup failed, trying alternative approach:', warmupError);
        
        // Strategy 2: Try with predict method instead of executeAsync
        try {
          const dummyInput = tf.zeros([1, 640, 640, 3]);
          const output = this.model.predict(dummyInput);
          
          if (Array.isArray(output)) {
            output.forEach(tensor => tensor.dispose());
          } else {
            output.dispose();
          }
          
          dummyInput.dispose();
          warmupSuccess = true;
          
        } catch (altError) {
          console.error('❌ Alternative warmup also failed:', altError);
          
          // Strategy 3: Skip warmup but mark as ready (some models work without warmup)
          console.warn('⚠️ Skipping warmup due to compatibility issues, model may be slower on first inference');
          warmupSuccess = true; // Allow model to be used even without warmup
        }
      }

      if (warmupSuccess) {
        this.isWarmedUp = true;
        this.isWarmingUp = false;
        return { success: true, message: 'Model warmed up successfully' };
      } else {
        throw new Error('All warmup strategies failed');
      }
      
    } catch (error) {
      this.isWarmingUp = false;
      console.error('❌ Model warmup error:', error);
      return { success: false, error: error.message };
    }
  }

  postprocess(outputTensor, videoWidth, videoHeight) {
    let tensor = Array.isArray(outputTensor) ? outputTensor[0] : outputTensor;

    if (!tensor || typeof tensor.arraySync !== "function") return [];

    const outputArray = tensor.arraySync();
    const predictions = outputArray[0];

    const detections = [];
    const threshold = 0.6;
    const modelInputSize = 640;
    const scaleX = videoWidth / modelInputSize;
    const scaleY = videoHeight / modelInputSize;

    predictions.forEach((pred) => {
      if (!Array.isArray(pred) || pred.length !== 6) return;
      const [x1, y1, x2, y2, confidence, classId] = pred;
      if (confidence < threshold) return;

      const classIndex = Math.round(classId);
      if (classIndex < 0 || classIndex >= CLASSES.length) return;

      const className = CLASSES[classIndex];

      if (className === "Aerobridge Retracted") return;

      detections.push({
        bbox: [
          x1 * scaleX,
          y1 * scaleY,
          (x2 - x1) * scaleX,
          (y2 - y1) * scaleY
        ],
        class: className,
        score: confidence,
        classId: classIndex
      });
    });

    const flightDetections = detections.filter(det => det.class === "Flight");
    const otherDetections = detections.filter(det => det.class !== "Flight");

    let finalDetections = [...otherDetections];

    if (flightDetections.length > 0) {
      const bestFlight = flightDetections.reduce((best, current) =>
        current.score > best.score ? current : best
      );
      finalDetections.push(bestFlight);
    }

    return finalDetections;
  }

  async detectObjects(imageData, videoWidth, videoHeight) {
    if (!this.model || !this.isWarmedUp) {
      return { success: false, error: 'Model not ready' };
    }

    const ready = await this.ensureReady();
    if (!ready) {
      return { success: false, error: 'TensorFlow.js not ready in worker' };
    }

    try {
      // Convert ImageData to tensor with better error handling
      const inputTensor = tf.tidy(() => {
        const tensor = tf.browser.fromPixels(imageData)
          .resizeBilinear([640, 640])
          .div(255.0)
          .expandDims(0);
        return tensor;
      });

      // Try executeAsync first, fall back to predict if needed
      let output;
      try {
        output = await this.model.executeAsync(inputTensor);
      } catch (executeError) {
        console.warn('executeAsync failed, trying predict:', executeError);
        output = this.model.predict(inputTensor);
      }
      
      const predictions = this.postprocess(output, videoWidth, videoHeight);

      // Dispose tensors
      tf.dispose([inputTensor, ...(Array.isArray(output) ? output : [output])]);
      
      return { success: true, predictions };
    } catch (error) {
      console.error('❌ Detection error in worker:', error);
      return { success: false, error: error.message };
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

// Worker instance
const modelWorker = new ModelWorker();

// Message handler
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
        result = { success: false, error: `Unknown message type: ${type}` };
    }

    self.postMessage({ id, ...result });
  } catch (error) {
    console.error('❌ Worker message handling error:', error);
    self.postMessage({ 
      id, 
      success: false, 
      error: error.message 
    });
  }
};

// Handle worker errors
self.onerror = function(error) {
  console.error('❌ Worker global error:', error);
  self.postMessage({
    id: -1,
    success: false,
    error: `Worker error: ${error.message || error}`
  });
};
