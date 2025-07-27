import React, { useState, useEffect, useMemo } from 'react';
import {
    Plane,
    Utensils,
    Brush,
    Users,
    Fuel,
    Package,
    CheckCircle,
    Settings,
    Truck,
    Bath
} from 'lucide-react';

// Icon mapping for different activities
const getActivityIcon = (activityName) => {
    const name = activityName?.toLowerCase();

    if (name.includes('cabin cleaning') || name.includes('clean')) {
        return <Brush className="w-3 h-3" />;
    }
    if (name.includes('catering') || name.includes('cater')) {
        return <Utensils className="w-3 h-3" />;
    }
    if (name.includes('aerobridge') || name.includes('bridge') || name.includes('dock')) {
        return <Plane className="w-3 h-3" />;
    }
    if (name.includes('passenger') || name.includes('board')) {
        return <Users className="w-3 h-3" />;
    }
    if (name.includes('lavator') || name.includes('service lavator')) {
        return <Bath className="w-3 h-3" />;
    }
    if (name.includes('refuel') || name.includes('fuel')) {
        return <Fuel className="w-3 h-3" />;
    }
    if (name.includes('baggage') || name.includes('load') || name.includes('cargo')) {
        return <Package className="w-3 h-3" />;
    }
    if (name.includes('check') || name.includes('final')) {
        return <CheckCircle className="w-3 h-3" />;
    }
    if (name.includes('truck')) {
        return <Truck className="w-3 h-3" />;
    }

    // Default icon for unknown activities
    return <Settings className="w-3 h-3" />;
};

// Empty state component
const EmptyTimelineState = () => (
    <div className="w-full h-full bg-[#060708] text-white flex items-center justify-center">
        <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">No Activities Available</div>
            <div className="text-gray-500 text-sm">Timeline will appear when activity data is loaded</div>
        </div>
    </div>
);

// Function to convert various date formats to "YYYY-MM-DD HH:mm:ss" format
const convertToStandardFormat = (dateTimeStr) => {
    if (!dateTimeStr) return null;

    try {
        let date;

        // Handle "MM/DD/YYYY HH:mm:ss" format (convert to standard)
        if (dateTimeStr.includes('/') && dateTimeStr.includes(' ')) {
            const [datePart, timePart] = dateTimeStr.split(' ');
            const [month, day, year] = datePart.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart}`;
        }

        // Handle "YYYY-MM-DD HH:mm:ss" format (already standard)
        if (dateTimeStr.includes('-') && dateTimeStr.includes(' ') && dateTimeStr.length >= 19) {
            return dateTimeStr;
        }

        // Handle HH:mm:ss format (add today's date)
        if (dateTimeStr.includes(':') && dateTimeStr.length <= 8) {
            const today = new Date().toISOString().split('T')[0];
            return `${today} ${dateTimeStr}`;
        }

        // Handle ISO format "YYYY-MM-DDTHH:mm:ss"
        if (dateTimeStr.includes('T')) {
            return dateTimeStr.replace('T', ' ');
        }

        // Fallback: try to parse with Date and convert
        date = new Date(dateTimeStr);
        if (!isNaN(date.getTime())) {
            return date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0') + ' ' +
                String(date.getHours()).padStart(2, '0') + ':' +
                String(date.getMinutes()).padStart(2, '0') + ':' +
                String(date.getSeconds()).padStart(2, '0');
        }

        return null;
    } catch (error) {
        console.warn('Failed to convert datetime format:', dateTimeStr, error);
        return null;
    }
};

// Function to parse standardized datetime string to Date object
const parseStandardDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return null;

    try {
        // Convert to ISO format for parsing
        const isoString = dateTimeStr.replace(' ', 'T');
        const date = new Date(isoString);

        if (!isNaN(date.getTime())) {
            return date;
        }

        return null;
    } catch (error) {
        console.warn('Failed to parse standard datetime:', dateTimeStr, error);
        return null;
    }
};

// Simulating react-calendar-timeline functionality with horizontal scrolling
const ReactCalendarTimeline = ({
    groups,
    items,
    defaultTimeStart,
    defaultTimeEnd,
    onItemSelect,
    itemRenderer,
    timeInterval = 20,
    showActivityNames = false,
    activities,
    isDetectionStarted = false,
}) => {
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [visibleTimeStart, setVisibleTimeStart] = useState(defaultTimeStart);
    const [visibleTimeEnd, setVisibleTimeEnd] = useState(defaultTimeEnd);
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });

    // Update visible time range when default times change
    useEffect(() => {
        setVisibleTimeStart(defaultTimeStart);
        setVisibleTimeEnd(defaultTimeEnd);
    }, [defaultTimeStart, defaultTimeEnd]);

    // Calculate timeline dimensions with minimum width for scrolling
    const timelineDuration = visibleTimeEnd - visibleTimeStart;
    const minTimelineWidth = 1200; // Minimum width to ensure scrolling
    const timeMarkerWidth = 120; // Minimum space between time markers

    // Generate time markers with configurable interval
    const timeMarkers = useMemo(() => {
        const markers = [];
        const interval = timeInterval * 60 * 1000;

        const startTime = new Date(visibleTimeStart);
        const startMinutes = startTime.getMinutes();
        const startSeconds = startTime.getSeconds();
        const startMs = startTime.getMilliseconds();

        const minutesToAdd = timeInterval - (startMinutes % timeInterval);
        const roundedStart = new Date(startTime);
        roundedStart.setMinutes(startMinutes + minutesToAdd, 0, 0);

        let current = (minutesToAdd === timeInterval && startSeconds === 0 && startMs === 0)
            ? startTime
            : roundedStart;

        while (current.getTime() <= visibleTimeEnd) {
            markers.push(new Date(current));
            current = new Date(current.getTime() + interval);
        }

        return markers;
    }, [visibleTimeStart, visibleTimeEnd, timeInterval]);

    // Calculate actual timeline width - ensure it's wide enough for proper spacing
    const actualTimelineWidth = Math.max(minTimelineWidth, timeMarkers.length * timeMarkerWidth);

    const getPositionPercent = (time) => {
        const clampedTime = Math.max(visibleTimeStart, Math.min(visibleTimeEnd, time));
        return ((clampedTime - visibleTimeStart) / timelineDuration) * 100;
    };

    useEffect(() => {
        // Only update current time if detection is started
        if (isDetectionStarted) {
            const interval = setInterval(() => {
                setCurrentTime(Date.now());
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isDetectionStarted]);

    const timelineHeight = groups.length * 30;

    return (
        <div className="w-full h-full bg-[#060708] text-white flex flex-col">
            {/* Fixed Activity Names Header */}
            {showActivityNames && (
                <div className="flex-shrink-0 flex border-b border-gray-600">
                    <div className="w-64 border-r border-gray-600 p-4 bg-[#060708] z-50">
                        <span className="text-sm font-medium">Activities</span>
                    </div>
                    <div className="flex-1"></div>
                </div>
            )}

            {/* Main Scrollable Container */}
            <div className="flex-1 flex overflow-hidden">
                {/* Fixed Activity Names Column */}
                {showActivityNames && (
                    <div className="w-64 border-r border-gray-600 flex-shrink-0 bg-gray-800 overflow-y-auto custom-scroll">
                        {/* Empty space for timeline header */}
                        <div className="h-16 border-b border-gray-600 bg-[#060708]"></div>
                        {/* Activity names */}
                        {groups.map((group) => (
                            <div key={group.id} className="h-8 border-b border-gray-700 flex items-center p-2">
                                <span className="text-xs font-medium truncate">{group.title}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Single Scrollable Timeline Container */}
                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scroll">
                    <div
                        className="bg-[#060708]"
                        style={{
                            width: `${actualTimelineWidth}px`,
                            minWidth: '100%'
                        }}
                    >
                        {/* Timeline Header */}
                        <div className="sticky top-0 z-40 bg-[#060708] border-b border-gray-600 h-16">
                            <div className="relative w-full h-full p-2 mt-2 z-50">
                                <div className="relative w-full h-full z-50">
                                    <div className="absolute w-full border-t border-orange-400 z-50" style={{ top: '3.5px' }} />

                                    {timeMarkers.map((marker, index) => {
                                        const position = getPositionPercent(marker.getTime());

                                        return (
                                            <div
                                                key={index}
                                                className="absolute flex flex-col items-center"
                                                style={{
                                                    left: `${position}%`,
                                                    transform: 'translateX(-50%)',
                                                    minWidth: '60px'
                                                }}
                                            >
                                                <div className="w-2 h-2 bg-orange-400 rounded-full mb-1 z-20" />
                                                <span className="text-xs text-gray-300 whitespace-nowrap">
                                                    {marker.toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false
                                                    })}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Timeline Body */}
                        <div
                            className="relative bg-[#060708]"
                            style={{
                                height: `${timelineHeight}px`
                            }}
                        >
                            {/* Vertical grid lines */}
                            {timeMarkers.map((marker, index) => (
                                <div
                                    key={`grid-${index}`}
                                    className="absolute border-l border-gray-600 opacity-30"
                                    style={{
                                        left: `${getPositionPercent(marker.getTime())}%`,
                                        top: '0',
                                        height: `${timelineHeight}px`,
                                        zIndex: 1
                                    }}
                                />
                            ))}

                            {/* Horizontal borders between rows */}
                            {groups.map((group, index) => (
                                <div
                                    key={`border-${group.id}`}
                                    className="absolute w-full border-b border-gray-700"
                                    style={{
                                        top: `${(index + 1) * 30 - 1}px`,
                                        height: '1px'
                                    }}
                                />
                            ))}

                            {/* Activity Icons */}
                            {items.filter(item => item.className === 'planned-bar').map((item) => {
                                const group = groups.find(g => g.id === item.group);
                                const groupIndex = groups.findIndex(g => g.id === item.group);
                                const iconPosition = getPositionPercent(item.start_time);

                                return (
                                    <div
                                        key={`icon-${item.group}`}
                                        className="absolute flex items-center justify-center w-6 h-6 bg-gray-600 rounded-full border-2 border-gray-500 text-white"
                                        style={{
                                            top: `${groupIndex * 30 + 2}px`,
                                            left: `calc(${iconPosition}% - 28px)`,
                                            transform: 'translateY(0)'
                                        }}
                                    >
                                        {getActivityIcon(group.title)}
                                    </div>
                                );
                            })}

                            {/* Timeline Items */}
                            {items.map((item) => {
                                const group = groups.find(g => g.id === item.group);
                                const groupIndex = groups.findIndex(g => g.id === item.group);

                                return (
                                    <div
                                        key={item.id}
                                        className="absolute h-6 cursor-pointer"
                                        style={{
                                            top: `${groupIndex * 30 + 2}px`,
                                            left: `${getPositionPercent(item.start_time)}%`,
                                            width: `${Math.max(getPositionPercent(item.end_time) - getPositionPercent(item.start_time), 1)}%`,
                                            minWidth: '20px',
                                            zIndex: 10
                                        }}
                                        onClick={() => onItemSelect?.(item)}
                                        onMouseEnter={(e) => {
                                            const activityId = item.group;
                                            const activity = activities.find(a => a.activityID === activityId);

                                            if (activity) {
                                                const plannedStart = convertToStandardFormat(activity.startTime) || 'Not set';
                                                const plannedEnd = convertToStandardFormat(activity.endTime) || 'Not set';
                                                const actualStart = convertToStandardFormat(activity.actualStartTime) || 'Not started';
                                                const actualEnd = convertToStandardFormat(activity.actualEndTime) || 'Not ended';
                                                const status = activity.status || 'Unknown';

                                                let pauseInfo = '';
                                                if (activity.pauseEvents && activity.pauseEvents.length > 0) {
                                                    const totalPauses = activity.pauseEvents.length;
                                                    pauseInfo = `\nPauses: ${totalPauses}`;
                                                }

                                                setTooltip({
                                                    visible: true,
                                                    x: e.clientX,
                                                    y: e.clientY - 10,
                                                    content: `${group.title}\nPlanned: ${plannedStart} - ${plannedEnd}\nActual: ${actualStart} - ${actualEnd}\nStatus: ${status}${pauseInfo}`
                                                });
                                            }
                                        }}
                                        onMouseMove={(e) => {
                                            if (tooltip.visible) {
                                                setTooltip(prev => ({
                                                    ...prev,
                                                    x: e.clientX,
                                                    y: e.clientY - 10
                                                }));
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            setTooltip({ visible: false, x: 0, y: 0, content: '' });
                                        }}
                                    >
                                        {itemRenderer ? itemRenderer({ item, getItemProps: () => ({}) }) : (
                                            <div
                                                className="h-full rounded px-1 flex items-center text-xs font-medium"
                                                style={{ backgroundColor: item.color || '#595858' }}
                                                title={item.title}
                                            >
                                                <span className="truncate text-xs">{item.title}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Real-time progress line - only show when detection is started */}
                            {isDetectionStarted && currentTime >= visibleTimeStart && currentTime <= visibleTimeEnd && (
                                <div
                                    className="absolute bg-white z-20"
                                    style={{
                                        left: `${getPositionPercent(currentTime)}%`,
                                        top: '0px', // Start from the top of timeline body (below header)
                                        height: `${timelineHeight}px`, // Only cover the timeline body, not the header
                                        width: '1px',
                                        backgroundImage: 'repeating-linear-gradient(to bottom, white 0px, white 4px, transparent 4px, transparent 8px)',
                                        backgroundColor: 'transparent'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {tooltip.visible && (
                <div
                    className="fixed bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-lg border border-gray-600 z-50 pointer-events-none"
                    style={{
                        left: tooltip.x + 10,
                        top: tooltip.y,
                        whiteSpace: 'pre-line'
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

// Main component implementing your Gantt chart
const GanttTimelineReplacement = ({
    activityList = [],
    isDetectionStarted = false,
    flightID,
    timeInterval = 20,
    showActivityNames = false,
    customTimeRange = null,
    autoCalculateTimeRange = true,
    baseDate = null
}) => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    const getSortedActivityList = (activities) => {
        return [...activities].sort((a, b) => {
            // Priority 1: Items with "INPROGRESS" status come first
            const aInProgress = a.status?.trim().toUpperCase() === "INPROGRESS";
            const bInProgress = b.status?.trim().toUpperCase() === "INPROGRESS";

            if (aInProgress && !bInProgress) return -1;
            if (!aInProgress && bInProgress) return 1;

            // Priority 2: Items with actualStartTime come next
            const aHasStartTime = a.actualStartTime && a.actualStartTime.trim() !== "";
            const bHasStartTime = b.actualStartTime && b.actualStartTime.trim() !== "";

            if (aHasStartTime && !bHasStartTime) return -1;
            if (!aHasStartTime && bHasStartTime) return 1;

            // Priority 3: Items with startTime come next
            const aHasScheduledTime = a.startTime && a.startTime.trim() !== "";
            const bHasScheduledTime = b.startTime && b.startTime.trim() !== "";

            if (aHasScheduledTime && !bHasScheduledTime) return -1;
            if (!aHasScheduledTime && bHasScheduledTime) return 1;

            // Priority 4: Sort by startTime chronologically (earliest first)
            if (a.startTime && b.startTime) {
                return new Date(a.startTime) - new Date(b.startTime);
            }

            // Default: maintain original order
            return 0;
        });
    };

    const activities = useMemo(() => {
        if (!activityList || activityList.length === 0) return [];

        const sortedActivityList = getSortedActivityList(activityList);

        return activityList.map(activity => {
            let processedActivity = {
                activityID: activity.activityID || activity.scheduledId,
                activityName: activity.activityName || activity.activityDescription,
                activityDescription: activity.activityDescription || activity.activityName,
                status: activity.status || 'pending',
                startTime: activity.startTime,
                endTime: activity.endTime,
                actualStartTime: activity.actualStartTime,
                actualEndTime: activity.actualEndTime,
                duration: activity.duration || 10,
                pauseEvents: activity.pauseEvents || []
            };

            // Handle activity instances if they exist
            if (activity.activityInstances && Array.isArray(activity.activityInstances) && activity.activityInstances.length > 0) {
                const instances = activity.activityInstances;

                // CRITICAL FIX: Check if main activity is cancelled first
                // If main activity status is cancelled, don't override it
                const mainActivityCancelled = activity.status &&
                    (activity.status.toLowerCase() === 'cancelled' || activity.status.toLowerCase() === 'canceled');

                // Find actual start time from the earliest instance with a start time
                const instancesWithStartTime = instances.filter(instance => instance.startTime);
                if (instancesWithStartTime.length > 0) {
                    // Sort by creation date and take the earliest actual start
                    const sortedByCreation = instancesWithStartTime.sort((a, b) =>
                        new Date(a.createdDate) - new Date(b.createdDate)
                    );
                    processedActivity.actualStartTime = sortedByCreation[0].startTime;
                }

                // Find actual end time - prioritize cancelled instances if main activity is cancelled
                let actualEndTime = null;
                if (mainActivityCancelled) {
                    // For cancelled activities, find the cancellation instance
                    const cancelledInstance = instances.find(instance =>
                        instance.status &&
                        (instance.status.toLowerCase() === 'cancelled' || instance.status.toLowerCase() === 'canceled')
                    );
                    if (cancelledInstance && cancelledInstance.endTime) {
                        actualEndTime = cancelledInstance.endTime;
                    } else if (cancelledInstance && cancelledInstance.startTime) {
                        // If no endTime in cancelled instance, use startTime as cancellation time
                        actualEndTime = cancelledInstance.startTime;
                    }
                } else {
                    // For non-cancelled activities, find completed instance
                    const firstCompletedInstance = instances.find(instance =>
                        instance.status && instance.status.toLowerCase() === 'completed'
                    );
                    if (firstCompletedInstance && firstCompletedInstance.endTime) {
                        actualEndTime = firstCompletedInstance.endTime;
                    }
                }

                if (actualEndTime) {
                    processedActivity.actualEndTime = actualEndTime;
                }

                // FIXED STATUS DETERMINATION LOGIC
                // Priority: Main activity cancelled > completed > inprogress > paused > original status
                if (mainActivityCancelled) {
                    // If main activity is cancelled, keep it cancelled regardless of instances
                    processedActivity.status = 'cancelled';
                } else {
                    // Only check instances if main activity is not cancelled
                    const hasCompleted = instances.some(instance =>
                        instance.status && instance.status.toLowerCase() === 'completed'
                    );
                    const hasInProgress = instances.some(instance =>
                        instance.status && instance.status.toLowerCase() === 'inprogress'
                    );
                    const hasPaused = instances.some(instance =>
                        instance.status && instance.status.toLowerCase() === 'paused'
                    );

                    if (hasCompleted) {
                        processedActivity.status = 'completed';
                    } else if (hasInProgress) {
                        processedActivity.status = 'inprogress';
                    } else if (hasPaused) {
                        processedActivity.status = 'paused';
                    }
                }

                // Generate pause events from instances by analyzing the sequence
                const pauseEvents = [];

                // Sort instances by creation date to get chronological order
                const sortedInstances = [...instances].sort((a, b) => {
                    const dateA = new Date(a.createdDate);
                    const dateB = new Date(b.createdDate);
                    return dateA - dateB;
                });

                // Track pause/resume cycles - but stop at cancellation
                for (let i = 0; i < sortedInstances.length; i++) {
                    const instance = sortedInstances[i];
                    const status = instance.status ? instance.status.toLowerCase() : '';

                    // If we hit a cancelled instance, stop processing pause events
                    if (status === 'cancelled' || status === 'canceled') {
                        break;
                    }

                    if (status === 'paused') {
                        // Look for the next resume/inprogress instance
                        let resumeTime = null;
                        for (let j = i + 1; j < sortedInstances.length; j++) {
                            const nextInstance = sortedInstances[j];
                            const nextStatus = nextInstance.status ? nextInstance.status.toLowerCase() : '';

                            // Stop looking if we hit a cancellation
                            if (nextStatus === 'cancelled' || nextStatus === 'canceled') {
                                break;
                            }

                            if (nextStatus === 'resumed' || nextStatus === 'inprogress') {
                                resumeTime = nextInstance.startTime;
                                break;
                            }
                        }

                        // Create pause event
                        pauseEvents.push({
                            pauseTime: instance.startTime,
                            resumeTime: resumeTime // null if never resumed or cancelled
                        });
                    }
                }

                // If we have pause events from instances, use them
                if (pauseEvents.length > 0) {
                    processedActivity.pauseEvents = pauseEvents;
                }

                // Store original instances for reference
                processedActivity.instances = instances;
            }

            return processedActivity;
        });
    }, [activityList]);

    // Convert your data to timeline format
    const groups = activities.map((activity) => ({
        id: activity.activityID,
        title: activity.activityName || activity.activityDescription,
        rightTitle: activity.status
    }));

    // FIXED ITEMS CREATION WITH STRICT CURRENT TIME BOUNDARY
    const items = activities.flatMap((activity) => {
        const groupId = activity.activityID;
        const items = [];

        // Convert all times to standard format first
        const standardStartTime = convertToStandardFormat(activity.startTime);
        const standardEndTime = convertToStandardFormat(activity.endTime);
        const standardActualStartTime = convertToStandardFormat(activity.actualStartTime);
        const standardActualEndTime = convertToStandardFormat(activity.actualEndTime);

        // Parse standardized times to Date objects
        const plannedStartTime = parseStandardDateTime(standardStartTime);
        const plannedEndTime = parseStandardDateTime(standardEndTime);
        const actualStartTime = parseStandardDateTime(standardActualStartTime);
        const actualEndTime = parseStandardDateTime(standardActualEndTime);

        // Calculate planned times
        let plannedStart = plannedStartTime?.getTime();
        let plannedEnd = plannedEndTime?.getTime();

        if (!plannedStart && !plannedEnd && activity.duration) {
            const now = new Date();
            plannedStart = now.getTime();
            plannedEnd = plannedStart + (activity.duration * 60 * 1000);
        } else if (plannedStart && !plannedEnd && activity.duration) {
            plannedEnd = plannedStart + (activity.duration * 60 * 1000);
        } else if (!plannedStart && plannedEnd && activity.duration) {
            plannedStart = plannedEnd - (activity.duration * 60 * 1000);
        }

        if (!plannedStart || !plannedEnd) {
            console.warn(`Skipping activity ${activity.activityName}: insufficient time data`);
            return [];
        }

        // 1. Planned/Estimated bar (background) - always gray with activity name
        items.push({
            id: `${groupId}-planned`,
            group: groupId,
            title: `${activity.activityName || activity.activityDescription} (Planned)`,
            start_time: plannedStart,
            end_time: plannedEnd,
            color: '#c5ced6',
            className: 'planned-bar',
            showActivityName: false // Activity name is shown at row start
        });

        // 2. FIXED PROGRESS LOGIC - ENFORCE CURRENT TIME BOUNDARY
        const actualStart = actualStartTime?.getTime();
        const actualEnd = actualEndTime?.getTime();

        // Handle activities that haven't started yet but should have (any type of delay)
        if (!actualStart && plannedStart < currentTime && isDetectionStarted) {
            // Activity should have started but hasn't - show growing delay bar
            const delayDuration = currentTime - plannedStart;
            const delayMinutes = Math.round(delayDuration / (60 * 1000));

            items.push({
                id: `${groupId}-delay`,
                group: groupId,
                title: `${activity.activityName || activity.activityDescription} (Not Started - ${delayMinutes} min overdue)`,
                start_time: plannedStart,
                end_time: Math.min(currentTime, plannedEnd), // Don't exceed planned end initially
                color: '#dc2626', // Unified red color for all delays
                className: 'delay-indicator',
                showActivityName: false // Don't show on delay - will be on planned bar
            });

            // If delay extends beyond planned end time, show overtime delay
            if (currentTime > plannedEnd) {
                items.push({
                    id: `${groupId}-delay-overtime`,
                    group: groupId,
                    title: `${activity.activityName || activity.activityDescription} (Severely Overdue)`,
                    start_time: plannedEnd,
                    end_time: currentTime,
                    color: '#dc2626', // Same unified red color
                    className: 'delay-indicator',
                    showActivityName: false // Don't show name on additional segments
                });
            }

            return items; // Don't process further if activity hasn't started
        }

        if (actualStart) {
            const status = activity.status?.toLowerCase();

            // CRITICAL FIX: Calculate the absolute maximum progress boundary
            let maxProgressTime;

            if (actualEnd && (status === 'completed' || status === 'finished')) {
                // Activity is completed - use actual end time but NEVER exceed current time
                maxProgressTime = Math.min(actualEnd, currentTime);
            } else if (status === 'cancelled' || status === 'canceled') {
                // FIXED: Activity was cancelled - show red progress from start to cancellation point
                // For cancelled activities, actualEndTime represents the cancellation time
                // Use actualEnd (cancellation time) and don't limit by currentTime since it's historical
                maxProgressTime = actualEnd || currentTime;
            } else if (!actualEnd && isDetectionStarted && (status === 'inprogress' || status === 'in progress')) {
                // Activity is actively in progress and detection started
                maxProgressTime = currentTime;
            } else if (status === 'paused') {
                // Activity is paused - progress should continue growing but as paused segments
                maxProgressTime = currentTime;
            } else if (!actualEnd && !isDetectionStarted) {
                // Detection not started yet - no progress beyond start
                maxProgressTime = actualStart;
            } else {
                // Has end time but not completed - still respect current time
                maxProgressTime = Math.min(actualEnd || currentTime, currentTime);
            }

            // ENSURE PROGRESS NEVER GOES INTO THE FUTURE - DOUBLE CHECK
            // Special handling for cancelled activities - they can show historical progress
            let effectiveProgressEnd;
            if (status === 'cancelled' || status === 'canceled') {
                // For cancelled activities, show progress up to cancellation time (actualEndTime)
                effectiveProgressEnd = maxProgressTime;
            } else {
                // For all other activities, respect current time boundary
                effectiveProgressEnd = Math.min(maxProgressTime, currentTime);
            }
            const effectiveProgressStart = actualStart;

            // Only show progress if we have valid time range
            if (effectiveProgressStart <= effectiveProgressEnd) {

                // A. Handle delay indicator (late start) - ALWAYS show if there's a delay
                // const timeDifference = effectiveProgressStart - plannedStart;
                // const thresholdMs = 1 * 60 * 1000; // Reduced to 1 minute threshold for better visibility

                // if (timeDifference > thresholdMs) {
                //     // Late start indicator (red bar from planned start to actual start)
                //     items.push({
                //         id: `${groupId}-late`,
                //         group: groupId,
                //         title: `${activity.activityName || activity.activityDescription} (Delayed Start - ${Math.round(timeDifference / (60 * 1000))} min late)`,
                //         start_time: plannedStart,
                //         end_time: effectiveProgressStart,
                //         color: '#dc2626', // Unified red color for delays
                //         className: 'delay-indicator',
                //         showActivityName: false // Don't show - will be on planned bar
                //     });
                // } else if (timeDifference < -thresholdMs) {
                //     // Early start indicator
                //     items.push({
                //         id: `${groupId}-early`,
                //         group: groupId,
                //         title: `${activity.activityName || activity.activityDescription} (Early Start - ${Math.round(Math.abs(timeDifference) / (60 * 1000))} min early)`,
                //         start_time: effectiveProgressStart,
                //         end_time: plannedStart,
                //         color: '#198529', // Dark green
                //         className: 'early-indicator',
                //         showActivityName: false // Don't show - will be on planned bar
                //     });
                // }

                // CRITICAL FIX: Check if this is a restarted activity
                // If activity was cancelled and restarted, we should only show delay from the NEW start time
                const isRestartedActivity = activity.instances && activity.instances.length > 0 &&
                    activity.instances.some(instance =>
                        instance.status && (instance.status.toLowerCase() === 'cancelled' || instance.status.toLowerCase() === 'canceled')
                    ) && (status === 'inprogress' || status === 'in progress');

                // A. Handle delay indicator (late start) - ALWAYS show if there's a delay
                // For restarted activities, compare against the restart time, not original planned time

                // If it's a restarted activity, we don't show delay against original planned time
                // The new actualStartTime IS the restart time, so no delay indicator needed
                if (!isRestartedActivity) {
                    const timeDifference = effectiveProgressStart - plannedStart;
                    const thresholdMs = 1 * 60 * 1000; // Reduced to 1 minute threshold for better visibility

                    if (timeDifference > thresholdMs) {
                        // Late start indicator (red bar from planned start to actual start)
                        items.push({
                            id: `${groupId}-late`,
                            group: groupId,
                            title: `${activity.activityName || activity.activityDescription} (Delayed Start - ${Math.round(timeDifference / (60 * 1000))} min late)`,
                            start_time: plannedStart,
                            end_time: effectiveProgressStart,
                            color: '#dc2626', // Unified red color for delays
                            className: 'delay-indicator',
                            showActivityName: false // Don't show - will be on planned bar
                        });
                    } else if (timeDifference < -thresholdMs) {
                        // Early start indicator
                        // items.push({
                        //     id: `${groupId}-early`,
                        //     group: groupId,
                        //     title: `${activity.activityName || activity.activityDescription} (Early Start - ${Math.round(Math.abs(timeDifference) / (60 * 1000))} min early)`,
                        //     start_time: effectiveProgressStart,
                        //     end_time: plannedStart,
                        //     color: '#198529', // Dark green
                        //     className: 'early-indicator',
                        //     showActivityName: false // Don't show - will be on planned bar
                        // });
                    }
                }

                // B. FIXED PAUSE EVENTS HANDLING FOR CANCELLED ACTIVITIES
                const pauseEvents = activity.pauseEvents || [];
                const sortedPauseEvents = pauseEvents
                    .filter(event => event.pauseTime)
                    .sort((a, b) => {
                        const timeA = parseStandardDateTime(convertToStandardFormat(a.pauseTime))?.getTime() || 0;
                        const timeB = parseStandardDateTime(convertToStandardFormat(b.pauseTime))?.getTime() || 0;
                        return timeA - timeB;
                    });

                let currentSegmentStart = effectiveProgressStart;
                let segmentIndex = 0;

                // CRITICAL FIX: Check if activity is cancelled to determine segment colors
                // const isCancelled = status === 'cancelled' || status === 'canceled';
                const isCancelled = (status === 'cancelled' || status === 'canceled') && !isRestartedActivity;

                // Process pause events - no activity names on any progress segments
                for (const pauseEvent of sortedPauseEvents) {
                    const pauseTime = parseStandardDateTime(convertToStandardFormat(pauseEvent.pauseTime))?.getTime();
                    const resumeTime = pauseEvent.resumeTime ?
                        parseStandardDateTime(convertToStandardFormat(pauseEvent.resumeTime))?.getTime() : null;

                    if (!pauseTime || pauseTime < currentSegmentStart) continue;

                    // CRITICAL: Clamp pause time to our effective progress boundary
                    const effectivePauseTime = Math.min(pauseTime, effectiveProgressEnd);

                    // Add active segment before pause
                    if (effectivePauseTime > currentSegmentStart) {
                        const activeSegmentEnd = Math.min(effectivePauseTime, effectiveProgressEnd);

                        // Determine if this crosses the planned boundary
                        if (currentSegmentStart < plannedEnd && activeSegmentEnd > plannedEnd) {
                            // Split at planned boundary

                            // Normal progress part - FIXED: Use red if cancelled
                            let normalColor = isCancelled ? '#dc2626' : '#ffd700'; // Red if cancelled, otherwise yellow
                            let normalClassName = isCancelled ? 'canceled-bar' : 'in-progress-bar';
                            let normalTitle = isCancelled ? 'Canceled' : 'In Progress';

                            if (!isCancelled && (status === 'completed' || status === 'finished')) {
                                normalColor = '#14ca74';
                                normalClassName = 'completed-bar';
                                normalTitle = 'Completed';
                            }

                            items.push({
                                id: `${groupId}-active-${segmentIndex}`,
                                group: groupId,
                                title: `${activity.activityName || activity.activityDescription} (${normalTitle})`,
                                start_time: currentSegmentStart,
                                end_time: plannedEnd,
                                color: normalColor,
                                className: normalClassName,
                                showActivityName: false // Don't show - will be on planned bar
                            });

                            // Overtime part (only if there's actual progress beyond planned time)
                            if (activeSegmentEnd > plannedEnd) {
                                let overtimeColor = isCancelled ? '#dc2626' : '#ff0a05'; // Red if cancelled
                                let overtimeClassName = isCancelled ? 'canceled-overtime-bar' : 'overtime-bar';

                                items.push({
                                    id: `${groupId}-overtime-${segmentIndex}`,
                                    group: groupId,
                                    title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Overtime'})`,
                                    start_time: plannedEnd,
                                    end_time: activeSegmentEnd,
                                    color: overtimeColor,
                                    className: overtimeClassName,
                                    showActivityName: false // Don't show - will be on planned bar
                                });
                            }
                        } else {
                            // Single segment (doesn't cross boundary) - FIXED: Use red if cancelled
                            let color = isCancelled ? '#dc2626' : '#ffd700'; // Red if cancelled, otherwise yellow
                            let className = isCancelled ? 'canceled-bar' : 'in-progress-bar';
                            let title = isCancelled ? 'Canceled' : 'In Progress';

                            if (!isCancelled && (status === 'completed' || status === 'finished')) {
                                color = activeSegmentEnd > plannedEnd ? '#ff0a05' : '#14ca74';
                                className = activeSegmentEnd > plannedEnd ? 'overtime-bar' : 'completed-bar';
                                title = activeSegmentEnd > plannedEnd ? 'Overtime Completed' : 'Completed';
                            } else if (!isCancelled && activeSegmentEnd > plannedEnd) {
                                className = 'overtime-in-progress';
                                title = 'Overtime';
                            }

                            items.push({
                                id: `${groupId}-active-${segmentIndex}`,
                                group: groupId,
                                title: `${activity.activityName || activity.activityDescription} (${title})`,
                                start_time: currentSegmentStart,
                                end_time: activeSegmentEnd,
                                color: color,
                                className: className,
                                showActivityName: false // Don't show - will be on planned bar
                            });
                        }
                        segmentIndex++;
                    }

                    // Add pause segment - FIXED: Use red if cancelled
                    if (resumeTime) {
                        const effectiveResumeTime = Math.min(resumeTime, effectiveProgressEnd);

                        if (effectiveResumeTime > effectivePauseTime) {
                            // Handle pause crossing planned boundary
                            if (effectivePauseTime < plannedEnd && effectiveResumeTime > plannedEnd) {
                                // Split pause at boundary - FIXED: Use red if cancelled
                                const pauseColor = isCancelled ? '#dc2626' : '#d3d3d3';
                                const pauseClassName = isCancelled ? 'canceled-bar' : 'paused-segment';

                                items.push({
                                    id: `${groupId}-paused-${segmentIndex}`,
                                    group: groupId,
                                    title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Paused'})`,
                                    start_time: effectivePauseTime,
                                    end_time: plannedEnd,
                                    color: pauseColor,
                                    className: pauseClassName,
                                    showActivityName: false // Don't show - will be on planned bar
                                });

                                if (effectiveResumeTime > plannedEnd) {
                                    const overtimePauseColor = isCancelled ? '#dc2626' : '#d3d3d3';
                                    const overtimePauseClassName = isCancelled ? 'canceled-overtime-bar' : 'paused-overtime';

                                    items.push({
                                        id: `${groupId}-paused-overtime-${segmentIndex}`,
                                        group: groupId,
                                        title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Paused Overtime'})`,
                                        start_time: plannedEnd,
                                        end_time: effectiveResumeTime,
                                        color: overtimePauseColor,
                                        className: overtimePauseClassName,
                                        showActivityName: false // Don't show - will be on planned bar
                                    });
                                }
                            } else {
                                // Single pause segment - FIXED: Use red if cancelled
                                const pauseColor = isCancelled ? '#dc2626' : '#d3d3d3';
                                const pauseClassName = isCancelled ?
                                    (effectiveResumeTime > plannedEnd ? 'canceled-overtime-bar' : 'canceled-bar') :
                                    (effectiveResumeTime > plannedEnd ? 'paused-overtime' : 'paused-segment');

                                items.push({
                                    id: `${groupId}-paused-${segmentIndex}`,
                                    group: groupId,
                                    title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Paused'})`,
                                    start_time: effectivePauseTime,
                                    end_time: effectiveResumeTime,
                                    color: pauseColor,
                                    className: pauseClassName,
                                    showActivityName: false // Don't show - will be on planned bar
                                });
                            }
                        }

                        currentSegmentStart = effectiveResumeTime;
                        segmentIndex++;
                    } else {
                        // Currently paused - pause extends to current progress end and keeps growing
                        // FIXED: Use red if cancelled
                        if (effectiveProgressEnd > effectivePauseTime) {
                            // Handle current pause with potential boundary crossing
                            const currentPauseEnd = effectiveProgressEnd;

                            if (effectivePauseTime < plannedEnd && currentPauseEnd > plannedEnd) {
                                // Split current pause at planned boundary
                                const pauseColor = isCancelled ? '#dc2626' : '#d3d3d3';
                                const pauseClassName = isCancelled ? 'canceled-bar' : 'paused-segment';

                                items.push({
                                    id: `${groupId}-paused-current`,
                                    group: groupId,
                                    title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Paused'})`,
                                    start_time: effectivePauseTime,
                                    end_time: plannedEnd,
                                    color: pauseColor,
                                    className: pauseClassName,
                                    isDynamicPause: !isCancelled, // Don't grow if cancelled
                                    showActivityName: false // Don't show - will be on planned bar
                                });

                                const overtimePauseColor = isCancelled ? '#dc2626' : '#d3d3d3';
                                const overtimePauseClassName = isCancelled ? 'canceled-overtime-bar' : 'paused-overtime';

                                items.push({
                                    id: `${groupId}-paused-current-overtime`,
                                    group: groupId,
                                    title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Paused Overtime'})`,
                                    start_time: plannedEnd,
                                    end_time: currentPauseEnd,
                                    color: overtimePauseColor,
                                    className: overtimePauseClassName,
                                    isDynamicPause: !isCancelled, // Don't grow if cancelled
                                    showActivityName: false // Don't show - will be on planned bar
                                });
                            } else {
                                // Single current pause segment that grows dynamically
                                const pauseColor = isCancelled ? '#dc2626' : '#d3d3d3';
                                const pauseClassName = isCancelled ?
                                    (currentPauseEnd > plannedEnd ? 'canceled-overtime-bar' : 'canceled-bar') :
                                    (currentPauseEnd > plannedEnd ? 'paused-overtime' : 'paused-segment');

                                items.push({
                                    id: `${groupId}-paused-current`,
                                    group: groupId,
                                    title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Paused'})`,
                                    start_time: effectivePauseTime,
                                    end_time: currentPauseEnd,
                                    color: pauseColor,
                                    className: pauseClassName,
                                    isDynamicPause: !isCancelled, // Don't grow if cancelled
                                    showActivityName: false // Don't show - will be on planned bar
                                });
                            }
                        }
                        break; // Currently paused, no more segments
                    }
                }

                // C. Final active segment (if not currently paused and progress remains)
                const isCurrentlyPaused = sortedPauseEvents.length > 0 &&
                    !sortedPauseEvents[sortedPauseEvents.length - 1].resumeTime;

                // Special handling for paused status without explicit pause events
                if (status === 'paused' && sortedPauseEvents.length === 0) {
                    // Entire progress should be shown as growing paused segments
                    // FIXED: Use red if cancelled
                    const finalSegmentEnd = effectiveProgressEnd;

                    if (currentSegmentStart < plannedEnd && finalSegmentEnd > plannedEnd) {
                        // Split paused progress at planned boundary
                        const pauseColor = isCancelled ? '#dc2626' : '#d3d3d3';
                        const pauseClassName = isCancelled ? 'canceled-bar' : 'paused-segment';

                        items.push({
                            id: `${groupId}-paused-main`,
                            group: groupId,
                            title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Paused'})`,
                            start_time: currentSegmentStart,
                            end_time: plannedEnd,
                            color: pauseColor,
                            className: pauseClassName,
                            isDynamicPause: !isCancelled,
                            showActivityName: false // Don't show - will be on planned bar
                        });

                        // Paused overtime part
                        if (finalSegmentEnd > plannedEnd) {
                            const overtimePauseColor = isCancelled ? '#dc2626' : '#d3d3d3';
                            const overtimePauseClassName = isCancelled ? 'canceled-overtime-bar' : 'paused-overtime';

                            items.push({
                                id: `${groupId}-paused-overtime-main`,
                                group: groupId,
                                title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Paused Overtime'})`,
                                start_time: plannedEnd,
                                end_time: finalSegmentEnd,
                                color: overtimePauseColor,
                                className: overtimePauseClassName,
                                isDynamicPause: !isCancelled,
                                showActivityName: false // Never show on overtime segment if already shown
                            });
                        }
                    } else {
                        // Single paused segment
                        const pauseColor = isCancelled ? '#dc2626' : '#d3d3d3';
                        const pauseClassName = isCancelled ?
                            (finalSegmentEnd > plannedEnd ? 'canceled-overtime-bar' : 'canceled-bar') :
                            (finalSegmentEnd > plannedEnd ? 'paused-overtime' : 'paused-segment');

                        items.push({
                            id: `${groupId}-paused-main`,
                            group: groupId,
                            title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Paused'})`,
                            start_time: currentSegmentStart,
                            end_time: finalSegmentEnd,
                            color: pauseColor,
                            className: pauseClassName,
                            isDynamicPause: !isCancelled,
                            showActivityName: false // Don't show - will be on planned bar
                        });
                    }
                } else if (!isCurrentlyPaused && currentSegmentStart < effectiveProgressEnd && status !== 'paused') {
                    // FINAL SAFETY CHECK: For cancelled activities, use the full effective end time
                    let finalSegmentEnd;
                    if (status === 'cancelled' || status === 'canceled') {
                        // For cancelled activities, use the cancellation time directly
                        finalSegmentEnd = effectiveProgressEnd;
                    } else {
                        // For other activities, ensure final segment doesn't exceed current time
                        finalSegmentEnd = Math.min(effectiveProgressEnd, currentTime);
                    }

                    // Handle final segment with potential boundary crossing
                    if (currentSegmentStart < plannedEnd && finalSegmentEnd > plannedEnd) {
                        // Split final segment at planned boundary

                        // Normal part - FIXED: Use red if cancelled
                        let normalColor = isCancelled ? '#dc2626' : '#ffd700'; // Red if cancelled, otherwise yellow
                        let normalClassName = isCancelled ? 'canceled-bar' : 'in-progress-bar';
                        let normalTitle = isCancelled ? 'Canceled' : 'In Progress';

                        if (!isCancelled && (status === 'completed' || status === 'finished')) {
                            normalColor = '#14ca74';
                            normalClassName = 'completed-bar';
                            normalTitle = 'Completed';
                        }

                        items.push({
                            id: `${groupId}-final-active`,
                            group: groupId,
                            title: `${activity.activityName || activity.activityDescription} (${normalTitle})`,
                            start_time: currentSegmentStart,
                            end_time: plannedEnd,
                            color: normalColor,
                            className: normalClassName,
                            showActivityName: false // Don't show - will be on planned bar
                        });

                        // Overtime part - FIXED: Use red if cancelled
                        let overtimeColor = isCancelled ? '#dc2626' : '#ff0a05';
                        let overtimeClassName = isCancelled ? 'canceled-overtime-bar' : 'overtime-bar';

                        if (finalSegmentEnd > plannedEnd) {
                            items.push({
                                id: `${groupId}-final-overtime`,
                                group: groupId,
                                title: `${activity.activityName || activity.activityDescription} (${isCancelled ? 'Canceled' : 'Overtime'})`,
                                start_time: plannedEnd,
                                end_time: finalSegmentEnd,
                                color: overtimeColor,
                                className: overtimeClassName,
                                showActivityName: false // Never show on overtime segment
                            });
                        }
                    } else {
                        // Single final segment - FIXED: Use red if cancelled
                        let color = isCancelled ? '#dc2626' : '#ffd700'; // Red if cancelled, otherwise yellow
                        let className = isCancelled ? 'canceled-bar' : 'in-progress-bar';
                        let title = isCancelled ? 'Canceled' : 'In Progress';

                        if (!isCancelled && (status === 'completed' || status === 'finished')) {
                            color = finalSegmentEnd > plannedEnd ? '#ff0a05' : '#14ca74';
                            className = finalSegmentEnd > plannedEnd ? 'overtime-bar' : 'completed-bar';
                            title = finalSegmentEnd > plannedEnd ? 'Overtime Completed' : 'Completed';
                        } else if (!isCancelled && finalSegmentEnd > plannedEnd) {
                            className = 'overtime-in-progress';
                            title = 'Overtime';
                        }

                        items.push({
                            id: `${groupId}-final-active`,
                            group: groupId,
                            title: `${activity.activityName || activity.activityDescription} (${title})`,
                            start_time: currentSegmentStart,
                            end_time: finalSegmentEnd,
                            color: color,
                            className: className,
                            showActivityName: false // Don't show - will be on planned bar
                        });
                    }
                }
            }
        }

        return items;
    });

    // Timeline bounds calculation including effective progress times
    const timelineBounds = useMemo(() => {
        if (customTimeRange) {
            return {
                start: customTimeRange.start.getTime(),
                end: customTimeRange.end.getTime()
            };
        }

        if (autoCalculateTimeRange && activities.length > 0) {
            const allTimes = [];

            activities.forEach(activity => {
                // Add planned times
                const standardStartTime = convertToStandardFormat(activity.startTime);
                const standardEndTime = convertToStandardFormat(activity.endTime);
                const plannedStart = parseStandardDateTime(standardStartTime);
                const plannedEnd = parseStandardDateTime(standardEndTime);

                if (plannedStart) allTimes.push(plannedStart.getTime());
                if (plannedEnd) allTimes.push(plannedEnd.getTime());

                // Add actual times
                const standardActualStartTime = convertToStandardFormat(activity.actualStartTime);
                const standardActualEndTime = convertToStandardFormat(activity.actualEndTime);
                const actualStart = parseStandardDateTime(standardActualStartTime);
                const actualEnd = parseStandardDateTime(standardActualEndTime);

                if (actualStart) allTimes.push(actualStart.getTime());
                if (actualEnd) allTimes.push(actualEnd.getTime());

                // For in-progress activities, include current time if beyond planned
                if (isDetectionStarted && actualStart) {
                    const status = activity.status?.toLowerCase();
                    if (status === 'inprogress' || status === 'in progress' || status === 'resumed' || status === 'paused') {
                        allTimes.push(currentTime);
                    }
                }
            });

            if (allTimes.length > 0) {
                const earliestTime = Math.min(...allTimes);
                const latestTime = Math.max(...allTimes);
                const StartbufferMs = 10 * 60 * 1000; // 10 minutes buffer
                const EndbufferMs = 20 * 60 * 1000; // 20 minutes buffer

                return {
                    start: earliestTime - StartbufferMs,
                    end: latestTime + EndbufferMs
                };
            }
        }

        // Default range - show a reasonable time window
        const now = currentTime;
        return {
            start: now - 2 * 60 * 60 * 1000, // 2 hours before
            end: now + 2 * 60 * 60 * 1000   // 2 hours after
        };
    }, [activities, customTimeRange, autoCalculateTimeRange, currentTime, isDetectionStarted]);


    const itemRenderer = ({ item, getItemProps }) => {
        const isPlanned = item.className === 'planned-bar';
        const isInProgress = item.className === 'in-progress-bar';
        const isCompleted = item.className === 'completed-bar';
        const isOvertime = item.className === 'overtime-bar';
        const isOvertimeInProgress = item.className === 'overtime-in-progress';
        const isPausedOvertime = item.className === 'paused-overtime';
        const isEarlyIndicator = item.className === 'early-indicator';
        const isDelayIndicator = item.className === 'delay-indicator';
        const isPausedSegment = item.className === 'paused-segment';
        const isCanceled = item.className === 'canceled-bar' || item.className === 'canceled-overtime-bar';

        const activityId = item.group;
        const activity = activities.find(a => a.activityID === activityId);

        const isEarlyStarted = activity && activity.actualStartTime && activity.startTime &&
            parseStandardDateTime(convertToStandardFormat(activity.actualStartTime))?.getTime() <
            parseStandardDateTime(convertToStandardFormat(activity.startTime))?.getTime() - (1 * 60 * 1000); // 1 minute threshold

        // Check if activity is actually completed (has ended)
        const isActivityCompleted = activity && (
            (activity.status?.toLowerCase() === 'completed' || activity.status?.toLowerCase() === 'finished') ||
            (activity.actualEndTime && parseStandardDateTime(convertToStandardFormat(activity.actualEndTime)))
        );

        // Check if activity has overtime
        const hasOvertime = activity && activity.actualEndTime && activity.endTime &&
            parseStandardDateTime(convertToStandardFormat(activity.actualEndTime))?.getTime() >
            parseStandardDateTime(convertToStandardFormat(activity.endTime))?.getTime();

        // Show activity name ONLY on planned bars
        const shouldShowText = () => {
            if (isPlanned) return true;

            // Also show text on early-started progress bars
            if (activity && activity.actualStartTime && activity.startTime) {
                const actualStart = parseStandardDateTime(convertToStandardFormat(activity.actualStartTime))?.getTime();
                const plannedStart = parseStandardDateTime(convertToStandardFormat(activity.startTime))?.getTime();
                const timeDifference = actualStart - plannedStart;
                const thresholdMs = 0 * 60 * 1000;

                if (timeDifference < -thresholdMs && (isInProgress || isCompleted || isCanceled)) {
                    return true;
                }
            }

            return false;
        };

        // Border radius logic
        let borderRadius = '0';

        if (isPlanned) {
            borderRadius = isActivityCompleted ? '3px' : '3px 0 0 3px';
        } else if (isOvertime || isOvertimeInProgress || isPausedOvertime) {
            borderRadius = isActivityCompleted ? '0 3px 3px 0' : '0';
        } else if (isCompleted || isInProgress || isCanceled || isPausedSegment) {
            if (hasOvertime) {
                borderRadius = '3px 0 0 3px';
            } else {
                borderRadius = isActivityCompleted ? '3px' : '3px 0 0 3px';
            }
        } else if (isEarlyIndicator || isDelayIndicator) {
            borderRadius = '3px 0 0 3px';
        }

        let style = {
            backgroundColor: item.color,
            height: '100%',
            borderRadius: borderRadius,
            border: isPlanned ? 'none' : ''
        };

        // Add special patterns for different states
        if ( isDelayIndicator) {
            style.backgroundImage = `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 6px)`;
        }
        

        if (isCanceled) {
            style.backgroundImage = 'none';
        }

        if (isOvertime) {
            style.backgroundImage = `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.6) 6px, rgba(255,255,255,0.6) 8px)`;
        }

        if (isPausedSegment || isPausedOvertime) {
            style.backgroundImage = `repeating-linear-gradient(45deg, ${item.color}, ${item.color} 6px, rgba(255,255,255,0.8) 3px, rgba(255,255,255,0.8) 8px)`;
            style.backgroundAttachment = 'local';
            style.backgroundPosition = '0 0';
        }

        if (isCanceled) {
            style.opacity = 1.0;
            style.border = '1px solid rgba(220, 38, 38, 0.8)';
        }

        // Z-index management for proper layering
        if (isPlanned) {
            style.zIndex = 50; // Higher z-index for planned bars

            // CRITICAL: Make planned bars semi-transparent so progress shows through
            style.backgroundColor = 'rgba(197, 206, 214, 0.3)'; // Very transparent gray
        } else if (isDelayIndicator) {
            style.zIndex = 20; // High priority for delay indicators
        } else if (isPausedSegment) {
            style.zIndex = 15; // Medium z-index for paused segments
        } else {
            style.zIndex = 10; // Lower z-index for all progress bars
        }



        return (
            <div
                {...getItemProps()}
                style={style}
                className="flex items-center relative"
            >
                {shouldShowText() && (
                    <span
                        className="text-xs font-medium truncate"
                        style={{
                            pointerEvents: 'none',
                            lineHeight: '1.5',
                            position: 'absolute',
                            left: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 'calc(400% - 8px)',
                            color: 'white',
                            zIndex: 100, // Very high z-index for text 
                            fontWeight: '700' // Extra bold
                        }}
                    >
                        {activity?.activityName || activity?.activityDescription}
                    </span>
                )}
            </div>
        );
    };

    // Real-time updates - only when detection is started
    useEffect(() => {
        if (isDetectionStarted) {
            const interval = setInterval(() => {
                setCurrentTime(Date.now());
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isDetectionStarted]);

    const sortedItems = items.sort((a, b) => {
        // Planned bars should render last (appear on top)
        if (a.className === 'planned-bar' && b.className !== 'planned-bar') return 1;
        if (a.className !== 'planned-bar' && b.className === 'planned-bar') return -1;
        return 0;
    });

    return (
        <div className="w-full h-full">
            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    100% { opacity: 0.7; }
                }
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0.5; }
                }
                @keyframes glow {
                    0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.4); }
                    100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
                }
                @keyframes pulse-overtime {
                    0% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0.8; transform: scale(1.02); }
                }
                @keyframes blink-stable {
                    0%, 50% { opacity: 0.9; }
                    51%, 100% { opacity: 0.6; }
                }
                @keyframes pause-pulse {
                    0% { opacity: 0.9; transform: scale(1); }
                    100% { opacity: 0.7; transform: scale(1.01); }
                }
                @keyframes fade {
                    0% { opacity: 0.8; }
                    100% { opacity: 0.5; }
                }
                .custom-scroll::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                    background: #374151;
                    border-radius: 4px;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: #6b7280;
                    border-radius: 4px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
            `}</style>

            {activities.length > 0 ? (
                <ReactCalendarTimeline
                    groups={groups}
                    items={sortedItems}
                    defaultTimeStart={timelineBounds.start}
                    defaultTimeEnd={timelineBounds.end}
                    itemRenderer={itemRenderer}
                    timeInterval={timeInterval}
                    showActivityNames={showActivityNames}
                    activities={activities}
                    isDetectionStarted={isDetectionStarted}
                />
            ) : (
                <EmptyTimelineState />
            )}
        </div>
    );
};

export default GanttTimelineReplacement;