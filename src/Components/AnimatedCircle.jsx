import React, { useEffect, useState } from 'react';

const AnimatedCircularProgress = ({ activityList, setProgressPercentage }) => {
  const [progress, setProgress] = useState(0);
  const [allCompleted, setAllCompleted] = useState(false);
  const [completedActivities, setCompletedActivities] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, []);

  useEffect(() => {
    const total = activityList?.length || 0;
    const completed = activityList.filter(activity =>
      activity.status?.trim().toUpperCase() === "COMPLETED"
    ).length;

    const InProgress = activityList.filter(activity =>
      activity.status?.trim().toUpperCase() === "INPROGRESS"
    ).length

    setTotalActivities(total);
    setCompletedActivities(InProgress + completed);

    if (total === 0) {
      setProgress(0);
      setAllCompleted(false);
    } else {
      setProgress(Math.min(((completed) / total) * 100, 100));
      setProgressPercentage(Math.round(Math.min((completed / total) * 100, 100)));
      setAllCompleted(completed === total);
    }
  }, [activityList]);


  const progressColor = allCompleted ? '#06fc46' : '#F7E32B';
  const blurColor = allCompleted ? '#28ad44' : '#F7E32B';
  const completedCount = activityList.filter(activity =>
    activity.status?.trim().toUpperCase() === "COMPLETED"
  ).length;

  const inProgressCount = completedActivities - completedCount;


  return (
    <div className="relative aspect-square flex items-center justify-center w-full h-full sm:w-[13vw] sm:h-[13vw] xl:w-[13vw] xl:h-[13vw] 2xl:w-[13vw] 2xl:h-[13vw] max-w-[175px] max-h-[175px]">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${progressColor} 0% ${progress}%, #222222 ${progress}% 100%)`,
          padding: '6px',
        }}
        title={`Activity Status:\nIn Progress: ${inProgressCount}, Completed: ${completedCount}`}

      >
        <div className="h-full w-full flex items-center justify-center rounded-full bg-[#2c2c2c] relative overflow-hidden">
          <div
            className="absolute inset-0 rounded-full z-0 pointer-events-none"
            style={{
              background: `conic-gradient(${blurColor} ${progress}%, transparent ${progress}%)`,
              filter: 'blur(12px)',
              opacity: 0.8,
            }}
          />
          <div className="w-[75%] aspect-square rounded-full bg-[#4d4c52] shadow-inner flex items-center justify-center z-10">
            <div className="w-[80%] aspect-square rounded-full bg-[#333333] shadow-[inset_4px_4px_10px_#222,inset_-4px_-4px_10px_#555] flex items-center justify-center">
              <span
                className="text-sm sm:text-lg font-bold"
                style={{ color: progressColor }}
              >
                {completedActivities}/{totalActivities}
              </span>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedCircularProgress;