import { useEffect, useState, useRef } from 'react';
import { useDanmaku } from '../context/DanmakuContext';
import { MessageSquareOff } from 'lucide-react';

const DanmakuItem = ({ text, style, onComplete, id }) => {
  // Use a ref to track if animation has started to avoid immediate cleanup issues
  const itemRef = useRef(null);

  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;

    const handleAnimationEnd = () => {
      onComplete(id);
    };

    el.addEventListener('animationend', handleAnimationEnd);
    return () => el.removeEventListener('animationend', handleAnimationEnd);
  }, [id, onComplete]);

  return (
    <div
      ref={itemRef}
      className="fixed whitespace-nowrap px-4 py-2 rounded-full shadow-md bg-white/80 backdrop-blur-sm border border-pink-100 text-gray-700 pointer-events-auto cursor-pointer hover:bg-white hover:scale-105 transition-transform z-[9999]"
      style={{
        top: style.top,
        fontSize: style.fontSize,
        color: style.color,
        left: '100%', // Start off-screen right
        animationName: 'scrollLeft',
        animationDuration: `${style.duration}s`,
        animationTimingFunction: 'linear',
        animationFillMode: 'forwards',
        willChange: 'transform, left'
      }}
    >
      {text}
    </div>
  );
};

const DanmakuLayer = () => {
  const { wishes, isDanmakuEnabled, toggleDanmaku } = useDanmaku();
  const [activeDanmaku, setActiveDanmaku] = useState([]);
  
  // Debug log
  useEffect(() => {
    console.log('Danmaku Status:', { isDanmakuEnabled, wishesCount: wishes.length, activeCount: activeDanmaku.length });
  }, [isDanmakuEnabled, wishes.length, activeDanmaku.length]);

  // Throttled generation
  useEffect(() => {
    if (!isDanmakuEnabled || wishes.length === 0) return;

    const burstTimer = setTimeout(() => {
      setActiveDanmaku((prev) => {
        if (prev.length > 0) return prev;
        const initialCount = Math.min(3, wishes.length);
        return Array.from({ length: initialCount }).map((_, i) => ({
          id: Date.now() + i,
          text: wishes[i % wishes.length],
          style: {
            top: `${Math.random() * 60 + 10}%`,
            fontSize: `${Math.random() * 0.5 + 1}rem`,
            color: Math.random() > 0.5 ? '#e8a8bf' : '#d4af37',
            duration: Math.random() * 5 + 10,
          }
        }));
      });
    }, 0);

    const interval = setInterval(() => {
      setActiveDanmaku((prev) => {
        if (prev.length > 15) return prev;
        const randomWish = wishes[Math.floor(Math.random() * wishes.length)];
        const id = Date.now() + Math.random();
        const newItem = {
          id,
          text: randomWish,
          style: {
            top: `${Math.random() * 60 + 10}%`,
            fontSize: `${Math.random() * 0.5 + 1}rem`,
            color: Math.random() > 0.5 ? '#e8a8bf' : '#d4af37',
            duration: Math.random() * 5 + 10,
          }
        };
        return [...prev, newItem];
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(burstTimer);
    };
  }, [isDanmakuEnabled, wishes]);

  const removeDanmaku = (id) => {
    setActiveDanmaku(prev => prev.filter(item => item.id !== id));
  };

  if (!isDanmakuEnabled) return null;

  return (
    <>
      <style>{`
        @keyframes scrollLeft {
          from { transform: translateX(0); left: 100vw; }
          to { transform: translateX(-100%); left: 0; }
        }
        .fixed:hover {
            animation-play-state: paused !important;
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {activeDanmaku.map(item => (
              <DanmakuItem 
                  key={item.id} 
                  id={item.id}
                  text={item.text} 
                  style={item.style} 
                  onComplete={removeDanmaku} 
              />
          ))}
          
          <button 
              onClick={toggleDanmaku}
              className="fixed bottom-24 right-4 pointer-events-auto p-3 bg-white/80 hover:bg-white rounded-full text-gray-500 hover:text-red-500 transition-colors shadow-lg border border-gray-100 backdrop-blur-sm z-[10000]"
              title={isDanmakuEnabled ? "Hide Wishes" : "Show Wishes"}
          >
              <MessageSquareOff size={20} />
          </button>
      </div>
    </>
  );
};

export default DanmakuLayer;
