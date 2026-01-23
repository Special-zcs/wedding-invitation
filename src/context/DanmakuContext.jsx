import { createContext, useContext, useState, useEffect } from 'react';

const DanmakuContext = createContext();

export const DanmakuProvider = ({ children }) => {
  // Load wishes from localStorage or use defaults
  const [wishes, setWishes] = useState(() => {
    const saved = localStorage.getItem('wedding-wishes');
    return saved ? JSON.parse(saved) : [
        "Alice : Wishing you a lifetime of love and happiness!",
        "Bob : Congratulations on your wedding day!",
        "Charlie : May your love grow stronger each and every day.",
        "Diana : Best wishes on this wonderful journey, as you build your new lives together."
    ];
  });

  const [isDanmakuEnabled, setIsDanmakuEnabled] = useState(true);

  // Save to localStorage whenever wishes change
  useEffect(() => {
    localStorage.setItem('wedding-wishes', JSON.stringify(wishes));
  }, [wishes]);

  const addWish = (name, message) => {
    // Format: "Guest Name : Message"
    const formattedWish = `${name.trim()} : ${message.trim()}`;
    setWishes(prev => [formattedWish, ...prev]);
  };

  const removeWish = (index) => {
    setWishes(prev => prev.filter((_, i) => i !== index));
  };

  const clearWishes = () => {
      if (window.confirm('Are you sure you want to clear all wishes?')) {
        setWishes([]);
      }
  };

  const toggleDanmaku = () => {
      setIsDanmakuEnabled(prev => !prev);
  }

  return (
    <DanmakuContext.Provider value={{ wishes, addWish, removeWish, clearWishes, isDanmakuEnabled, toggleDanmaku }}>
      {children}
    </DanmakuContext.Provider>
  );
};

export const useDanmaku = () => {
  const context = useContext(DanmakuContext);
  if (!context) {
    throw new Error('useDanmaku must be used within a DanmakuProvider');
  }
  return context;
};
