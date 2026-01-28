import { useState, useEffect } from 'react';

const calculateTimeLeft = (targetDate) => {
  const difference = +new Date(targetDate) - +new Date();
  if (difference > 0) {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }
  return { days: 0, hours: 0, minutes: 0, seconds: 0 };
};

const TimeBox = ({ value, label }) => (
  <div className="flex flex-col items-center mx-2 md:mx-4">
    <div className="bg-white/20 backdrop-blur-md rounded-lg p-3 md:p-4 w-16 md:w-20 text-center shadow-lg border border-white/30">
      <span className="text-xl md:text-3xl font-bold text-white font-serif block">
        {value < 10 ? `0${value}` : value}
      </span>
    </div>
    <span className="text-white/80 text-xs md:text-sm mt-2 uppercase tracking-wider font-light">{label}</span>
  </div>
);

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    const update = () => setTimeLeft(calculateTimeLeft(targetDate));
    const timer = setInterval(update, 1000);
    const immediate = setTimeout(update, 0);

    return () => {
      clearInterval(timer);
      clearTimeout(immediate);
    };
  }, [targetDate]);

  return (
    <div className="flex justify-center mt-8 md:mt-12 flex-wrap">
      <TimeBox value={timeLeft.days} label="Days" />
      <TimeBox value={timeLeft.hours} label="Hours" />
      <TimeBox value={timeLeft.minutes} label="Mins" />
      <TimeBox value={timeLeft.seconds} label="Secs" />
    </div>
  );
};

export default Countdown;
