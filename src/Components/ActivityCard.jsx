import React from 'react';
import '../index.css';
import moment from 'moment';
import {  Clock } from 'lucide-react';
import Images from '../Utils/Images';

const ActivityCard = ({ item, delayInfo }) => {
    const status = item.status?.trim().toUpperCase();

    // Helper function to determine if activity is delayed/early
    const getActivityTimingStatus = () => {
        // If no delayInfo, return null for default state
        if (!delayInfo) {
            return null;
        }
        
        // If delayInfo.isDelay is true, activity started late (delayed)
        // If delayInfo.isDelay is false, activity started early
        return delayInfo.isDelay;
    };

    // Get timing status
    const timingStatus = getActivityTimingStatus();
    
    // Determine image based on timing instead of status
    let statusImage;
    if (timingStatus === true) {
        // Activity is delayed (started late)
        statusImage = Images?.PendingAC;
    } else if (timingStatus === false) {
        // Activity started early
        statusImage = Images?.EarlyAC;
    } else {
        // Activity is on time or initial state (no delayInfo)
        statusImage = Images?.CompletedAc;
    }

    let statusText = "---------";

    if (item.status) {
        statusText =
            item.status === "InProgress"
                ? "In-Progress"
                : item.status === "Completed"
                    ? "Completed"
                    : item.status;
    }

    const statusAlign = item.status?.trim().toUpperCase();
    let statusClass = "";

    if (statusAlign === "INPROGRESS") {
        statusClass = "status-INPROGRESS-shift-zoomout";
    } else if(statusAlign === "COMPLETED"){
        statusClass = "status-COMPLETED-shift-zoomout";
    } else{
        statusClass = "status-pending-shift-zoomout"
    }

    // Helper function to format end time with restart logic
    const formatEndTime = (item) => {
        // Check if activity has instances
        if (item.activityInstances && item.activityInstances.length > 0) {
            // Sort instances by creation date to get chronological order
            const sortedInstances = [...item.activityInstances].sort((a, b) => 
                new Date(a.createdDate) - new Date(b.createdDate)
            );
            
            // Get the latest instance
            const latestInstance = sortedInstances[sortedInstances.length - 1];
            
            // If latest instance is "Inprogress", show "--:--"
            if (latestInstance.status === "Inprogress") {
                return "--:--";
            }
        }
        
        // Otherwise, use actualEndTime
        const actualEndTime = item.actualEndTime;
        
        // If actualEndTime is null/undefined, show "--:--"
        if (!actualEndTime) {
            return "--:--";
        }
        
        // Handle the specific case where actualEndTime is the default invalid date
        if (actualEndTime === "01/01/1900 00:00:00") {
            return "--:--";
        }
        
        // Format the actual end time
        return moment(actualEndTime, "YYYY-MM-DD HH:mm:ss").format("HH:mm");
    };

    return (
        <div key={`${item.activityName}-${item.startTime || 'no-start'}`} className="relative activity-card p-2 rounded shadow h-40">
            <div className="absolute activity-details text-sm z-10 h-full w-full mt-[3px]" title={item.activityName}>
                <div
                    className={`max-w-full py-3 text-white flex justify-end font-medium ${statusClass}`}
                    style={{
                        fontFamily: 'poppins',
                        lineHeight: '100%',
                        letterSpacing: '0%',
                    }}
                >
                    <p className="-mt-1">{statusText}</p>
                </div>

                {/* Activity Name */}
                <div
                    className={`max-w-full text-white py-1 flex justify-start font-medium mt-1 ml-3 sm:mt-3 xl:mt-2 2xl:mt-1  ${item.activityName === "Cargo and Baggage Truck"
                        ? "text-[12px] sm:text-[11px] xl:text-[12px] 2xl:text-[12px] ml-1 sm:ml-1 xl:ml-2.5"
                        : "text-[14px] sm:text-[13px] xl:text-[15px] 2xl:text-[15px] ml-1.5 sm:ml-2.5 xl:ml-3"
                        }`}
                    style={{ fontFamily: 'poppins-semiBold' }}
                >
                    <p>
                        {item.activityName.length > 20
                            ? `${item.activityName.slice(0, 17)}...`
                            : item.activityName}
                    </p>
                </div>

                {/* Start/End Times */}
                <div className="max-w-[80%] py-1 flex flex-col font-medium space-y-1 sm:space-y-2 xl:space-y-1.5 2xl:space-y-1 ml-4 sm:ml-2 xl:ml-3 2xl:ml-4">
                    <div className="flex justify-between items-center">
                        <span className="text-white flex items-center text-[10px] sm:text-[8px] xl:text-[10px] 2xl:text-[13px]">
                            <Clock size={14} className="mr-1 sm:size-3 xl:size-[14px]" />
                            Planned Time
                        </span>
                        <span className="text-white mr-2 font-bold text-[12px] sm:text-[10px] xl:text-[13px] 2xl:text-[15px]" style={{ fontFamily: 'poppins-semiBold' }}>
                            {item?.startTime ? moment(item?.startTime).format("HH:mm") : "--:--"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white flex items-center text-[10px] sm:text-[8px] xl:text-[10px] 2xl:text-[13px]">
                            <Clock size={14} className="mr-1 sm:size-3 xl:size-[14px]" />
                            Start Time
                        </span>
                        <span className="text-white mr-2 font-bold text-[12px] sm:text-[10px] xl:text-[13px] 2xl:text-[15px]" style={{ fontFamily: 'poppins-semiBold' }}>
                            {item?.actualStartTime ? moment(item?.actualStartTime).format("HH:mm") : "--:--"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white flex items-center text-[10px] sm:text-[8px] xl:text-[10px] 2xl:text-[13px]">
                            <Clock size={14} className="mr-1 sm:size-3 xl:size-[14px]" />
                            End Time
                        </span>
                        <span className="text-white mr-2 font-bold text-[12px] sm:text-[10px] xl:text-[13px] 2xl:text-[15px]" style={{ fontFamily: 'poppins-semiBold' }}>
                            {formatEndTime(item)}
                        </span>
                    </div>
                </div>
            </div>

            <img src={statusImage} alt={`${item.Activity} card`} className="w-full h-40" />
        </div>
    );
};

export default ActivityCard;