import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import Gallery from './components/Gallery';
import Story from './components/Story';
import Wishes from './components/Wishes';
import BackgroundEffects from './components/BackgroundEffects';
import Loading from './components/ui/Loading';
import SettingsPanel from './components/ui/SettingsPanel';
import DanmakuLayer from './components/DanmakuLayer';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { DanmakuProvider } from './context/DanmakuContext';

// Inner component to use the context
const AppContent = () => {
  const { config } = useConfig();
  const [loading, setLoading] = useState(true);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    // Simulate loading resources
    const timer = setTimeout(() => {
        setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="relative min-h-screen font-sans selection:bg-primary/30 text-text bg-secondary/30">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-300 to-primary origin-left z-50"
        style={{ scaleX }}
      />
      
      <BackgroundEffects />
      <DanmakuLayer />
      
      <main className="relative z-10">
        <Hero />
        <Story />
        <Gallery />
        <Wishes />
        
        {/* Footer */}
        <footer className="bg-white py-12 text-center text-gray-400 text-sm border-t border-gray-100">
          <p className="mb-2">Designed & Developed with ❤️ for {config.hero.names.bride} & {config.hero.names.groom}</p>
          <p>© {new Date().getFullYear()} Wedding Celebration</p>
        </footer>
      </main>

      <SettingsPanel />
    </div>
  );
};

function App() {
  return (
    <ConfigProvider>
      <DanmakuProvider>
        <AppContent />
      </DanmakuProvider>
    </ConfigProvider>
  );
}

export default App;
