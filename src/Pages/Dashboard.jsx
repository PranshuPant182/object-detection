import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock5, Expand, PlaneLanding, Play, Square, X } from 'lucide-react';
import Images from '../Utils/Images';
import Layout from './Layout';
import CustomGanttChart from '../Components/GanttChart';
// import demoVideo from '../assets/output3.mp4';
import demoVideo from '../assets/demo4.mp4';
import '../index.css'
import AnimatedCircularProgress from '../Components/AnimatedCircle';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { activityRepository, flightRepository } from '../ApiManager/RepositoryLayer';
import { useVideoCapture } from '../Hooks/useVideoCapture';
import ActivityCard from '../Components/ActivityCard';
import FlightPopupModal from '../Components/FlightPopupModal';

const VideoFrameProcessor = () => {
    const navigate = useNavigate();
    const [isCapturing, setIsCapturing] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [capturedFrames, setCapturedFrames] = useState(0);
    const [FlightNumber, setFlightNumber] = useState("------");
    const [FlightDestination, setFlightDestination] = useState("");
    const [Gate, setGate] = useState("");
    const [FlightEstimateDepartureTime, setFlightEstimateDepartureTime] = useState("")
    const [FlightScheduledDepartureTime, setFlightScheduledDepartureTime] = useState("")
    const [FlightDate, setFlightDate] = useState("");
    const [allActivitiesCompleted, setAllActivitiesCompleted] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [PopupModal, setPopupModal] = useState(false);
    const [isDetectionStarted, setIsDetectionStarted] = useState(false);
    const [dynamicDelays, setDynamicDelays] = useState({});
    const [mobileActiveTab, setMobileActiveTab] = useState('activity');
    const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
    const [videoMetadata, setVideoMetadata] = useState({
        fps: 0,
        duration: 0,
        width: 0,
        height: 0
    });
    const [processedFrames, setProcessedFrames] = useState([]);
    const [ProgressPercentage, setProgressPercentage] = useState(0);
    const [lastProcessedFrameIndex, setLastProcessedFrameIndex] = useState(0);
    const [SelectedOption, setSelectedOption] = useState("Camera");
    const [FlightID, setFlightID] = useState(null);
    const [FlightPopup, setFlightPopup] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activityList, setActivityList] = useState([]);
    
    const [FlightData, setFlightData] = useState([]);
    const [isMobile, setIsMobile] = useState(false);

    // Refs
    const sentInRef = useRef(new Set());
    const sentOutRef = useRef(new Set());
    const cateringTruckCounterRef = useRef(0);
    const flightIDRef = useRef(null);
    const instanceTrackerRef = useRef({});
    const frameTimesRef = useRef([]);
    const processedFrameAnimationRef = useRef(null);
    const allInEventsRef = useRef([]);
    const allOutEventsRef = useRef([]);
    const mobileCanvasRef = useRef(null);
    const finalizedActivitiesRef = useRef(new Set());

    // Add popup canvas ref
    const popupCanvasRef = useRef(null);

    const {
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
        loadModel
    } = useVideoCapture({
        SelectedOption,
        setIsCapturing,
        isCapturing,
        setPlaying,
        setIsVideoPlaying,
        setVideoMetadata,
        videoMetadata,
        setLastProcessedFrameIndex,
        capturedFrames,
        PopupModal,
        popupCanvasRef,
        activityList,
    });

    // APIs
    const getFlightDetailsByDate = useCallback(async (dateParam) => {
        try {
            const userData = JSON.parse(localStorage.getItem('UserData'));
            // const airportLocationCode = userData?.airports?.[1]?.locationCode;
            const airportLocationCode = "MNL";
            const rawDate = dateParam || selectedDate;
            const formattedDate = moment(rawDate).format('YYYY-MM-DD');
            const response = await flightRepository.getFlightListByDate(formattedDate, airportLocationCode);
            if (response) {
                setFlightData(response?.result)
            }
        } catch (err) {
            console.log(err);
        }
    }, [selectedDate]); // Add selectedDate as dependency

    const getActivityList = useCallback(async () => {
        if (!flightIDRef.current) return;

        const userData = JSON.parse(localStorage.getItem("UserData"));
        const airportID = userData?.airports?.[0]?.locationId;

        const response = await activityRepository.getActivityList(flightIDRef.current, airportID);
        const activityArray = response?.result || [];

        //  Store the scheduledId
        if (activityArray.length > 0 && activityArray[0].scheduledId) {
            localStorage.setItem('ScheduledID', activityArray[0].scheduledId);
        }

        setActivityList(prev => {
            const isSame = prev.length === activityArray.length &&
                prev.every((item, i) =>
                    item.activityID === activityArray[i].activityID &&
                    item.status === activityArray[i].status &&
                    item.startTime === activityArray[i].startTime &&
                    item.endTime === activityArray[i].endTime
                );
            return isSame ? prev : activityArray;
        });
    }, [FlightID]);



    // FUNCTIONS FOR FRAME CAPTURING
    const handleVideoMetadata = () => {
        if (videoRef.current) {
            const video = videoRef.current;
            setVideoMetadata({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                fps: 0
            });
        }
    };

    const handleStartInference = async () => {
        if (isCapturing || isInitializing) {
            stopCapturing();
            setIsDetectionStarted(false);
            return;
        }

        // Better model readiness check
        if (!isModelLoaded) {
            console.error("Model not loaded yet. Please wait...");
            return;
        }

        if (!isModelWarmedUp) {
            console.error("Model still warming up. Please wait...");
            return;
        }

        try {
            await startCapturing();
            setIsDetectionStarted(true);
        } catch (error) {
            console.error("Failed to start detection:", error);
        }
    };

    // HELPER FUNCTIONS
    const handleExpand = useCallback(() => {
        setPopupModal(true);
        // Canvas switching will be handled by the useEffect above
    }, []);

    // 4. Update the popup modal close handler
    const handleClosePopup = useCallback(() => {
        setPopupModal(false);
        // Canvas switching will be handled by the useEffect above
    }, []);

    const handleMoreExpand = () => {
        const container = PopupModal ? popupCanvasRef.current?.parentElement : displayCanvasRef.current?.parentElement;
        if (container && container.requestFullscreen) { //NOSONAR
            container.requestFullscreen();
        }
    }

    const filteredFlights = FlightData.filter((flight) => {
        const flightNo = flight.flightNumber;
        return flightNo.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const isActivityDelayed = () => {
        const delays = {};
        const matched = activityList
            .filter(act => act.actualStartTime && act.startTime)
            .map((act) => ({
                name: act.activityName,
                estimatedIn: timeToSeconds(act.startTime),
                actualIn: timeToSeconds(act.actualStartTime)
            }));

        matched.forEach((item) => {
            const delay = item.estimatedIn - item.actualIn;
            const duration = moment.duration(Math.abs(delay), 'seconds');
            const formatted = moment.utc(duration.asMilliseconds()).format('HH:mm');

            delays[item.name] = {
                label: formatted,
                isDelay: delay < 0
            };
        });

        setDynamicDelays(delays);
    };

    const timeToSeconds = (datetimeStr) => {
        const m = moment(datetimeStr, "YYYY-MM-DD HH:mm:ss");
        return m.hours() * 3600 + m.minutes() * 60 + m.seconds();
    };

    const handleManualFlightSelection = (selectedFlight) => {
        if (selectedFlight) {
            setFlightID(selectedFlight?.flightId);
            flightIDRef.current = selectedFlight?.flightId;
            setFlightNumber(selectedFlight?.flightNumber);
            setFlightDestination(selectedFlight?.destination)
            setFlightEstimateDepartureTime(selectedFlight?.etd)
            setFlightScheduledDepartureTime(selectedFlight?.std)
            setFlightDate(selectedFlight?.flightDate)
            setGate(selectedFlight?.bayNumber)
            setFlightPopup(false);

            localStorage.setItem('selectedFlightID', selectedFlight.flightId);
            localStorage.setItem('selectedFlightNumber', selectedFlight.flightNumber);

            navigate(`/dashboard?flightID=${selectedFlight.flightId}`, { replace: true });
        }
    };


    const getButtonTitle = () => {
        if (!isModelLoaded) return "Please wait for model to load";
        if (!isModelWarmedUp) return "Model is warming up...";
        if (isInitializing) return "Preparing detection...";
        return "";
    };

    // useEffects
    // Add useEffect to detect screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isMobile && isDetecting && mobileCanvasRef.current) {
            // Switch to mobile canvas on small devices
            switchCanvas(mobileCanvasRef);

            // Initialize mobile canvas
            const container = mobileCanvasRef.current.parentElement;
            if (container) {
                mobileCanvasRef.current.width = container.clientWidth;
                mobileCanvasRef.current.height = container.clientHeight;
            }
        } else if (PopupModal && isDetecting && popupCanvasRef.current) {
            // Switch to popup canvas
            switchCanvas(popupCanvasRef);

            // Initialize popup canvas
            const container = popupCanvasRef.current.parentElement;
            if (container) {
                popupCanvasRef.current.width = container.clientWidth;
                popupCanvasRef.current.height = container.clientHeight;
            }
        } else if (!PopupModal && !isMobile && isDetecting && displayCanvasRef.current) {
            // Switch back to normal canvas (desktop only)
            switchCanvas(displayCanvasRef);

            // Initialize normal canvas
            const container = displayCanvasRef.current.parentElement;
            if (container) {
                displayCanvasRef.current.width = container.clientWidth;
                displayCanvasRef.current.height = container.clientHeight;
            }
        }
    }, [PopupModal, isDetecting, isMobile, switchCanvas]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.src = demoVideo;
            videoRef.current.load();
            frameTimesRef.current = [];
            setProcessedFrames([]);
            setLastProcessedFrameIndex(0);
            setCapturedFrames(0);
        }

        return () => {
            if (processedFrameAnimationRef.current) {
                cancelAnimationFrame(processedFrameAnimationRef.current);
            }
        };
    }, []);

    useEffect(() => {
        let animationFrame;

        const renderVideoFrame = () => {
            // Only render when detection is NOT running (to avoid conflicts)
            if (isDetecting) return;

            // Choose the right canvas based on device and popup state
            let canvas;
            if (isMobile) {
                canvas = mobileCanvasRef.current;
            } else if (PopupModal) {
                canvas = popupCanvasRef.current;
            } else {
                canvas = displayCanvasRef.current;
            }

            const video = SelectedOption === "Camera" ? webcamRef.current : videoRef.current;

            if (canvas && video && video.readyState >= 2) {
                const ctx = canvas.getContext('2d');
                const container = canvas.parentElement;

                if (container) {
                    const newWidth = container.clientWidth;
                    const newHeight = container.clientHeight;

                    // Only resize if significantly different
                    if (Math.abs(canvas.width - newWidth) > 10 || Math.abs(canvas.height - newHeight) > 10) {
                        canvas.width = newWidth;
                        canvas.height = newHeight;
                    }
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Calculate aspect ratios for proper scaling with zoom
                const canvasAspect = canvas.width / canvas.height;
                const videoAspect = video.videoWidth / video.videoHeight;

                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

                if (videoAspect > canvasAspect) {
                    drawHeight = canvas.height * Zoom;
                    drawWidth = drawHeight * videoAspect;
                    offsetX = (canvas.width - drawWidth) / 2;
                    offsetY = (canvas.height - drawHeight) / 2;
                } else {
                    drawWidth = canvas.width * Zoom;
                    drawHeight = drawWidth / videoAspect;
                    offsetX = (canvas.width - drawWidth) / 2;
                    offsetY = (canvas.height - drawHeight) / 2;
                }

                ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
            }

            if (isVideoPlaying && !isDetecting) {
                animationFrame = requestAnimationFrame(renderVideoFrame);
            }
        };

        if (isVideoPlaying && !isDetecting) {
            animationFrame = requestAnimationFrame(renderVideoFrame);
        }

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [isVideoPlaying, isDetecting, SelectedOption, PopupModal, Zoom, isMobile]);


    // Handle popup canvas switching
    useEffect(() => {
        if (PopupModal && isDetecting) {
            const activeVideo = SelectedOption === "Camera" ? webcamRef.current : videoRef.current;
            if (activeVideo && popupCanvasRef.current) {
                const container = popupCanvasRef.current.parentElement;
                if (container) {
                    popupCanvasRef.current.width = container.clientWidth;
                    popupCanvasRef.current.height = container.clientHeight;
                }
            }
        }
    }, [PopupModal, isDetecting, SelectedOption]);

    // Load model on component mount
    useEffect(() => {
        loadModel();
    }, [loadModel]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            getActivityList();
        }, 5000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        getFlightDetailsByDate(selectedDate);
    }, [selectedDate, getFlightDetailsByDate]);

    useEffect(() => {
        zoomRef.current = Zoom;

        // Apply zoom to video elements
        if (videoRef.current) {
            videoRef.current.style.transform = `scale(${Zoom})`;
            videoRef.current.style.transformOrigin = "center center";
        }

        if (webcamRef.current) {
            webcamRef.current.style.transform = `scale(${Zoom})`;
            webcamRef.current.style.transformOrigin = "center center";
        }

        // Apply zoom to all canvas elements
        if (displayCanvasRef.current) {
            displayCanvasRef.current.style.transform = `scale(${Zoom})`;
            displayCanvasRef.current.style.transformOrigin = "center center";
        }

        if (popupCanvasRef.current) {
            popupCanvasRef.current.style.transform = `scale(${Zoom})`;
            popupCanvasRef.current.style.transformOrigin = "center center";
        }

        if (mobileCanvasRef.current) {
            mobileCanvasRef.current.style.transform = `scale(${Zoom})`;
            mobileCanvasRef.current.style.transformOrigin = "center center";
        }
    }, [Zoom]);


    useEffect(() => {
        isActivityDelayed();

        const visionActivities = activityList.filter(act => act.isVision);
        const allCompleted = visionActivities.every(
            act => act.status?.trim().toUpperCase() === "COMPLETED"
        );
        const anyInProgress = visionActivities.some(
            act => act.status?.trim().toUpperCase() === "INPROGRESS"
        );
        setAllActivitiesCompleted(allCompleted && !anyInProgress);

        // Check if any activity has actualStartTime and set detection started
        const hasAnyActualStartTime = activityList.some(activity =>
            activity.actualStartTime && activity.actualStartTime.trim() !== ""
        );

        if (hasAnyActualStartTime) {
            setIsDetectionStarted(true);
        }
    }, [activityList]);

    useEffect(() => {
        if (!FlightID) return;

        stopCapturing();
        setIsDetectionStarted(false);

        sentInRef.current = new Set();
        sentOutRef.current = new Set();
        finalizedActivitiesRef.current = new Set();
        instanceTrackerRef.current = {};
        cateringTruckCounterRef.current = 0;
        allInEventsRef.current = [];
        allOutEventsRef.current = [];

        setActivityList([]);
        setProcessedFrames([]);
        setDynamicDelays({});
        setLastProcessedFrameIndex(0);
        frameTimesRef.current = [];

        if (displayCanvasRef.current) {
            const canvas = displayCanvasRef.current;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (popupCanvasRef.current) {
            const canvas = popupCanvasRef.current;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        flightIDRef.current = FlightID;
        getActivityList();
    }, [FlightID]);

    useEffect(() => {
        const checkAndOpenFlightPopup = () => {
            const userData = JSON.parse(localStorage.getItem('UserData'));

            if (userData) {
                setFlightPopup(true);
            }
        };

        // Small delay to ensure all state is properly initialized
        const timer = setTimeout(checkAndOpenFlightPopup, 100);

        return () => clearTimeout(timer);
    }, []);

    let buttonIcon;
    if (isInitializing) {
        buttonIcon = (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
        );
    } else if (playing) {
        buttonIcon = <Square size={14} fill="black" className="ml-[2px]" />;
    } else {
        buttonIcon = <Play size={16} fill="black" className="ml-[2px]" />;
    }

    return (
        <Layout setSelectedOption={setSelectedOption} allActivitiesCompleted={allActivitiesCompleted} FlightDate={FlightDate}>
            <div className="h-[calc(100vh-48px)] hidden overflow-hidden max-w-full md:flex">
                {/* ACTIVITY SECTION */}
                <div className='h-full w-[30%]'>
                    <div className="h-full w-full overflow-y-auto overflow-x-hidden custom-scroll text-white px-2">
                        <div className="grid grid-cols-2" style={{ gridAutoRows: 'minmax(9rem, auto)', maxHeight: 'calc(9rem * 4 + 1.5rem)' }}>
                            {activityList.map((item) => (
                                <ActivityCard key={`${item.activityName}-${item.startTime || 'no-start'}`} item={item} delayInfo={dynamicDelays[item.activityName]} />
                            ))}
                            {/* {getSortedActivityList(activityList).map((item) => (
                                <ActivityCard
                                    key={`${item.activityName}-${item.startTime || 'no-start'}`}
                                    item={item}
                                    delayInfo={dynamicDelays[item.activityName]}
                                />
                            ))} */}
                        </div>
                    </div>
                </div>

                {/* VIDEO SECTION WITH GANTT CHART */}
                <div className='h-full w-[70%] flex flex-col px-2'>
                    <div className="w-[99%] h-[50%] mt-2 flex rounded-2xl">

                        {/* UPDATED RESPONSIVE LEFT SIDE */}
                        <div className="w-full sm:w-[80%] md:w-[60%] lg:w-[40%] h-full flex flex-col gap-4">
                            <div className="w-full h-[35%] flex flex-col sm:flex-col items-center justify-center text-white px-4 sm:px-6 md:px-2 text-center sm:text-left">

                                <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-2">
                                    <div className="flex items-center gap-2">
                                        <PlaneLanding size={20} fill="white" className="text-white" />
                                        <span className="text-sm sm:text-md font-medium text-white" title={`Flight Destination: ${FlightDestination}`}>
                                            {FlightDestination}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Clock5 className="text-white" />
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-white">STD</span>
                                                <span className="text-xs text-white">/</span>
                                                <span className="text-xs text-white">ETD</span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <span className="text-sm sm:text-md font-medium text-white" title={`Scheduled Departure Time (STD): ${FlightScheduledDepartureTime || '--:--'}`}>
                                                    {FlightScheduledDepartureTime?.slice(0, 5) || '--:--'}
                                                </span>
                                                <span className="text-sm sm:text-md font-medium text-white">/</span>
                                                <span className="text-sm sm:text-md font-medium text-white" title={`Estimated Departure Time (ETD): ${FlightEstimateDepartureTime || '--:--'}`}>
                                                    {FlightEstimateDepartureTime?.slice(0, 5) || '--:--'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <img
                                            src={Images.Catering}
                                            alt="Gate Icon"
                                            className="w-6 sm:w-7 h-6 sm:h-7 object-contain"
                                        />
                                        <span className="text-sm sm:text-md font-medium text-white" title={`Bay Number: ${Gate}`}>{Gate}</span>
                                    </div>
                                </div>

                                <div className="w-full flex-1 flex flex-row justify-center items-center sm:items-start gap-1 mt-3 sm:mt-5">
                                    <button className="text-xl sm:text-2xl xl:text-3xl 2xl:text-4xl font-semibold cursor-pointer" onClick={() => {
                                        setFlightPopup(true);
                                    }}>
                                        {FlightNumber ? `${FlightNumber.slice(0, 2)} ${FlightNumber.slice(2)}` : ''}
                                    </button>
                                </div>
                            </div>

                            {/* Progress Section */}
                            <div className="w-full flex justify-center items-center relative">
                                <AnimatedCircularProgress
                                    isDetectionStarted={isDetectionStarted}
                                    isCapturing={isCapturing}
                                    activityList={activityList}
                                    setProgressPercentage={setProgressPercentage}
                                />

                                <div className="absolute bottom-1 right-2 text-[22px] text-green-400 font-bold drop-shadow-sm">
                                    {ProgressPercentage}%
                                </div>
                            </div>
                        </div>

                        {/* Right side - Video with gradient background */}
                        <div className="relative w-full sm:w-[90%] md:w-[80%] lg:w-[56%] h-full p-[4px] bg-gradient-to-r from-[#08E9FC] via-[#0464D4] via-[#4F21D1] via-[#DB6BAE] to-[#DD4C4C] rounded-2xl mx-auto">
                            <div className="relative w-full h-full rounded-2xl bg-white overflow-hidden">

                                {/* Canvas for video display */}
                                {!PopupModal && (
                                    <canvas
                                        ref={displayCanvasRef}
                                        className="absolute top-0 left-0 w-full h-full object-cover rounded-2xl py-1"
                                    />
                                )}

                                {/* Hidden canvas and video tag */}
                                <canvas ref={captureCanvasRef} className="hidden" />

                                {/* Video element for file playback */}
                                <video
                                    ref={videoRef}
                                    className="hidden"
                                    muted
                                    playsInline
                                    onLoadedMetadata={handleVideoMetadata}
                                />

                                {/* Webcam element for camera input */}
                                <video
                                    ref={webcamRef}
                                    className="hidden"
                                    muted
                                    playsInline
                                    autoPlay
                                />

                                {!isModelLoaded && (
                                    <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-md">
                                        Loading AI Model...
                                    </div>
                                )}

                                {isModelLoaded && !isModelWarmedUp && (
                                    <div className="absolute top-3 left-3 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                                        <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                                        Warming up Model...
                                    </div>
                                )}


                                {isModelLoaded && isModelWarmedUp && isInitializing && (
                                    <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                                        <span className="h-2 w-2 bg-white rounded-full animate-pulse" ></span>
                                        Preparing Detection...
                                    </div>
                                )}

                                {/* LIVE Badge */}
                                <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                                    <span className={`h-2 w-2 rounded-full animate-pulse ${isModelWarmedUp ? 'bg-green-500' : 'bg-red-500'}`} />
                                    {playing ? "LIVE" : ""}
                                </div>
                            </div>

                            {/* Start Button */}
                            <div className="absolute left-1/2 transform -translate-x-1/2 bottom-[-20px] flex justify-center w-10 h-10 rounded-full p-[4px] bg-gradient-to-r from-[#08E9FC] via-[#4F21D1] to-[#DD4C4C] shadow-lg">
                                <button
                                    onClick={handleStartInference}
                                    disabled={!isModelLoaded || !isModelWarmedUp || isInitializing}
                                    title={getButtonTitle()}
                                    className="w-8 h-8 bg-[#FFA800] rounded-full disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                                >
                                    {buttonIcon}
                                </button>
                            </div>

                            {/* Expand Button */}
                            <div className="absolute right-3 bottom-3 h-8 w-8 bg-[#1b2130] rounded-md flex items-center justify-center cursor-pointer">
                                <Expand size={20} className="text-white" onClick={handleExpand} />
                            </div>

                            {/* Zoom Controls */}
                            {SelectedOption === "Camera" &&
                                <div className="absolute right-3 top-3 flex items-center gap-1 bg-gray-200 p-1 rounded-md">
                                    <button
                                        onClick={() => handleZoomChange(-0.1)}
                                        disabled={Zoom <= 0.5}
                                        className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
                                    >
                                        -
                                    </button>
                                    <span className="text-sm font-semibold w-[40px] text-center">
                                        {Zoom.toFixed(1)}x
                                    </span>
                                    <button
                                        onClick={() => handleZoomChange(0.1)}
                                        disabled={Zoom >= 3.0}
                                        className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
                                    >
                                        +
                                    </button>
                                </div>}
                        </div>
                    </div>

                    {/* Gantt Chart Section */}
                    <div className='w-full h-[50%] flex justify-center items-center mt-5'>
                        <div className='w-full h-full'>
                            <div className='h-full w-[100%]'>
                                <CustomGanttChart
                                    key={FlightID}
                                    flightID={FlightID}
                                    isCapturing={isCapturing}
                                    isDetectionStarted={isDetectionStarted}
                                    activityList={activityList}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Popup Modal */}
                    {PopupModal && (
                        <div className='absolute right-0 w-[70%] flex-col inset-y-0 backdrop-blur-[3px] z-50 flex justify-center items-center'>
                            <div className='w-full flex justify-end pr-10 rounded-full'>
                                <X size={22} className="mb-2 bg-gray-300 rounded-full cursor-pointer z-20" onClick={handleClosePopup} />
                            </div>
                            <div className="w-[98%] min-h-[85%] flex justify-center items-center rounded-2xl p-[4px] bg-gradient-to-r from-[#08E9FC] via-[#0464D4] via-[#4F21D1] via-[#DB6BAE] to-[#DD4C4C] relative">

                                {/* Zoom Control in Popup */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 bg-gray-200 p-1 rounded-md z-50">
                                    <button
                                        onClick={() => handleZoomChange(-0.1)}
                                        className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 transition-colors text-sm font-medium"
                                        disabled={Zoom <= 0.5}
                                    >
                                        −
                                    </button>
                                    <span className="text-sm font-semibold w-[45px] text-center text-gray-800">
                                        {Zoom.toFixed(1)}×
                                    </span>
                                    <button
                                        onClick={() => handleZoomChange(0.1)}
                                        className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 transition-colors text-sm font-medium"
                                        disabled={Zoom >= 3.0}
                                    >
                                        +
                                    </button>
                                </div>

                                <div className='w-full h-full bg-white rounded-xl flex justify-center items-center relative'>
                                    <canvas
                                        ref={popupCanvasRef}
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                </div>

                                <div className="absolute bottom-5 left-10 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                                    <span className={`h-2 w-2 rounded-full animate-pulse ${playing ? 'bg-red-500' : 'bg-gray-500'}`} />
                                    {playing ? "LIVE" : "STOPPED"}
                                </div>

                                <div className="absolute bottom-5 right-10 bg-black text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                                    <Expand size={20} className='cursor-pointer' onClick={handleMoreExpand} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Mobile Layout */}
            <div className="h-screen grid grid-rows-[1fr_auto_1fr] overflow-hidden md:hidden">
                {/* Video Area */}
                <div className="relative bg-gradient-to-r from-[#08E9FC] via-[#0464D4] via-[#4F21D1] via-[#DB6BAE] to-[#DD4C4C] p-1">
                    <div className="relative w-full h-full bg-white rounded-lg overflow-hidden">
                        {/* Mobile Canvas */}
                        <canvas
                            ref={mobileCanvasRef}
                            className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
                        />

                        {/* Hidden canvas and video elements */}
                        <canvas ref={captureCanvasRef} className="hidden" />
                        <video
                            ref={videoRef}
                            className="hidden"
                            muted
                            playsInline
                            loop={false}
                            autoPlay
                            onLoadedMetadata={handleVideoMetadata}
                        />
                        <video
                            ref={webcamRef}
                            className="hidden"
                            muted
                            playsInline
                            autoPlay
                        />

                        {isModelLoaded && !isModelWarmedUp && (
                            <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                                <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                                Warming up Model...
                            </div>
                        )}

                        {isModelLoaded && isModelWarmedUp && isInitializing && (
                            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                                <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                                Preparing Detection...
                            </div>
                        )}

                        {/* Live badge */}
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full animate-pulse ${isModelWarmedUp ? 'bg-green-500' : 'bg-red-500'}`} />
                            {playing ? "LIVE" : ""}
                        </div>

                        {/* Zoom controls for mobile */}
                        {SelectedOption === "Camera" && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-gray-200 p-1 rounded-md">
                                <button
                                    onClick={() => handleZoomChange(-0.1)}
                                    disabled={Zoom <= 0.5}
                                    className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm"
                                >
                                    -
                                </button>
                                <span className="text-xs font-semibold w-[35px] text-center">
                                    {Zoom.toFixed(1)}x
                                </span>
                                <button
                                    onClick={() => handleZoomChange(0.1)}
                                    disabled={Zoom >= 3.0}
                                    className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm"
                                >
                                    +
                                </button>
                            </div>
                        )}

                        {/* Start/Stop button */}
                        <div className="absolute bottom-2 right-2 flex justify-center items-center w-12 h-12 rounded-full p-[2px] bg-gradient-to-r from-[#08E9FC] via-[#4F21D1] to-[#DD4C4C] shadow-lg">
                            <button
                                onClick={handleStartInference}
                                disabled={!isModelLoaded || !isModelWarmedUp || isInitializing}
                                title={getButtonTitle()}
                                className="w-10 h-10 bg-[#FFA800] rounded-full disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                            >
                                {buttonIcon}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Header with 3 tabs */}
                <header className="px-4 py-2 border-t border-b border-gray-600 flex justify-around items-center bg-[#1a1a1a]">
                    <span className={`h-full w-1/3 text-center border-r border-gray-600 transition-all duration-200 ${mobileActiveTab === 'activity' ? 'bg-gray-800' : 'hover:bg-gray-900'
                        }`}>
                        <button
                            onClick={() => {
                                setMobileActiveTab('activity');
                            }}
                            className={`w-full h-full py-2 transition-all duration-200 ${mobileActiveTab === 'activity'
                                ? 'text-white font-semibold text-sm tracking-wide'
                                : 'text-gray-400 font-medium hover:text-white text-sm'
                                }`}
                        >
                            Activity
                            {mobileActiveTab === 'activity' && (
                                <div className="w-4 h-0.5 bg-cyan-400 mx-auto mt-1 rounded-full"></div>
                            )}
                        </button>
                    </span>

                    <span className={`h-full w-1/3 text-center border-r border-gray-600 transition-all duration-200 ${mobileActiveTab === 'timeline' ? 'bg-gray-800' : 'hover:bg-gray-900'
                        }`}>
                        <button
                            onClick={() => {
                                setMobileActiveTab('timeline');
                            }}
                            className={`w-full h-full py-2 transition-all duration-200 ${mobileActiveTab === 'timeline'
                                ? 'text-white font-semibold text-sm tracking-wide'
                                : 'text-gray-400 font-medium hover:text-white text-sm'
                                }`}
                        >
                            Timeline
                            {mobileActiveTab === 'timeline' && (
                                <div className="w-4 h-0.5 bg-cyan-400 mx-auto mt-1 rounded-full"></div>
                            )}
                        </button>
                    </span>

                    <span className={`h-full w-1/3 text-center transition-all duration-200 ${mobileActiveTab === 'info' ? 'bg-gray-800' : 'hover:bg-gray-900'
                        }`}>
                        <button
                            onClick={() => {
                                setMobileActiveTab('info');
                            }}
                            className={`w-full h-full py-2 transition-all duration-200 ${mobileActiveTab === 'info'
                                ? 'text-white font-semibold text-sm tracking-wide'
                                : 'text-gray-400 font-medium hover:text-white text-sm'
                                }`}
                        >
                            Info
                            {mobileActiveTab === 'info' && (
                                <div className="w-4 h-0.5 bg-cyan-400 mx-auto mt-1 rounded-full"></div>
                            )}
                        </button>
                    </span>
                </header>

                {/* Bottom section for cards, timeline, and info */}
                <div className="overflow-y-auto bg-[#1a1a1a] p-2 custom-scroll">
                    {/* Conditional rendering based on active tab */}
                    {mobileActiveTab === 'activity' ? (
                        /* Activity cards in mobile view - 2x2 grid */
                        <div className="grid grid-cols-2 gap-2">
                            {activityList.map((item) => (
                                <ActivityCard
                                    key={`${item.activityName}-${item.startTime || 'no-start'}`}
                                    item={item}
                                    delayInfo={dynamicDelays[item.activityName]}
                                />
                            ))}
                        </div>
                    ) : mobileActiveTab === 'timeline' ? (
                        /* Timeline/Gantt chart component */
                        <div className="w-full h-full">
                            <CustomGanttChart
                                key={FlightID}
                                flightID={FlightID}
                                isCapturing={isCapturing}
                                isDetectionStarted={isDetectionStarted}
                                activityList={activityList}
                            />
                        </div>
                    ) : (
                        /* Flight Info Section */
                        <div className="w-full h-full flex flex-col gap-6 p-4">
                            {/* Flight Details in One Row */}
                            <div className="w-full flex justify-between items-center px-2 text-white">
                                {/* Destination */}
                                <div className="flex items-center gap-2">
                                    <PlaneLanding size={16} fill="white" className="text-white" />
                                    <span className="text-sm font-medium text-white" title={`Flight Destination: ${FlightDestination}`}>
                                        {FlightDestination}
                                    </span>
                                </div>

                                {/* Time Information */}
                                <div className="flex items-center gap-2">
                                    <Clock5 size={16} className="text-white" />
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-white">STD / ETD</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-medium text-white" title={`Scheduled Departure Time (STD): ${FlightScheduledDepartureTime || '--:--'}`}>
                                                {FlightScheduledDepartureTime?.slice(0, 5) || '--:--'}
                                            </span>
                                            <span className="text-sm font-medium text-white">/</span>
                                            <span className="text-sm font-medium text-white" title={`Estimated Departure Time (ETD): ${FlightEstimateDepartureTime || '--:--'}`}>
                                                {FlightEstimateDepartureTime?.slice(0, 5) || '--:--'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Gate */}
                                <div className="flex items-center gap-2">
                                    <img
                                        src={Images.Catering}
                                        alt="Gate Icon"
                                        className="w-5 h-5 object-contain"
                                    />
                                    <span className="text-sm font-medium text-white" title={`Bay Number: ${Gate}`}>{Gate}</span>
                                </div>
                            </div>

                            {/* Flight Number Section */}
                            <div className="w-full flex justify-center items-center">
                                <button className="text-3xl font-semibold cursor-pointer text-white" onClick={() => {
                                    setFlightPopup(true);
                                }}>
                                    {FlightNumber ? `${FlightNumber.slice(0, 2)} ${FlightNumber.slice(2)}` : ''}
                                </button>
                            </div>

                            {/* Progress Section - Centered */}
                            <div className="w-full flex-1 flex justify-center items-center relative">
                                <AnimatedCircularProgress
                                    isDetectionStarted={isDetectionStarted}
                                    isCapturing={isCapturing}
                                    activityList={activityList}
                                    setProgressPercentage={setProgressPercentage}
                                />

                                <div className="absolute bottom-1 right-2 text-[22px] text-green-400 font-bold drop-shadow-sm">
                                    {ProgressPercentage}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Flight Selection Modal */}
            {FlightPopup && (
                <FlightPopupModal
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filteredFlights={filteredFlights}
                    handleManualFlightSelection={handleManualFlightSelection}
                    setFlightPopup={setFlightPopup}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                />
            )}
        </Layout>
    );
};

export default VideoFrameProcessor;