import { motion, useScroll, useTransform } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import Countdown from './ui/Countdown';

const MotionDiv = motion.div;

const Hero = () => {
  const { config } = useConfig();
  const { hero } = config;
  const { scrollY } = useScroll();
  
  // Parallax and fade effects for background
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.1]);

  // Dynamic Background Animation variants
  const bgVariants = {
    zoom: {
      scale: [1, hero.bgAnimation?.scale || 1.1],
      transition: { 
        duration: hero.bgAnimation?.duration || 20, 
        repeat: Infinity, 
        repeatType: "reverse",
        ease: "linear" 
      }
    },
    pan: {
      x: ["0%", "-5%"],
      transition: {
         duration: hero.bgAnimation?.duration || 20,
         repeat: Infinity,
         repeatType: "reverse",
         ease: "linear"
      }
    },
    fade: {
        opacity: [0.8, 1],
        transition: {
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse"
        }
    }
  };

  return (
    <section className="h-screen w-full relative overflow-hidden flex items-center justify-center text-center">
      {/* Background Image with Overlay */}
      <MotionDiv 
        style={{ y, opacity, scale }}
        className="absolute inset-0 z-0"
      >
        <MotionDiv
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${hero.bgImage})` }}
            variants={bgVariants}
            animate={hero.bgAnimation?.type || 'zoom'}
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </MotionDiv>

      {/* Content */}
      <MotionDiv
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="z-10 relative px-4 max-w-4xl mx-auto text-white"
      >
        <MotionDiv
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-6 flex justify-center"
        >
             <div className="p-4 border-2 border-white/30 rounded-full bg-white/10 backdrop-blur-sm">
                <Heart className="w-10 h-10 md:w-12 md:h-12 text-pink-200 fill-pink-200/50" />
             </div>
        </MotionDiv>

        <h2 className="text-lg md:text-2xl text-pink-100 mb-4 tracking-[0.3em] uppercase font-light drop-shadow-md">
            {hero.tagline}
        </h2>
        
        <h1 className="text-5xl md:text-7xl lg:text-9xl font-serif text-white mb-6 leading-tight drop-shadow-lg">
          {hero.names.bride} <span className="text-pink-200 text-4xl md:text-7xl align-middle font-light">{hero.names.connector}</span> {hero.names.groom}
        </h1>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-lg md:text-2xl text-white/90 font-light tracking-wide mb-8">
          <span className="border-b border-white/30 pb-1">{new Date(hero.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span className="hidden md:inline text-pink-200">•</span>
          <span className="border-b border-white/30 pb-1">{hero.location}</span>
        </div>

        {/* Countdown Timer */}
        <Countdown targetDate={hero.date} />

        <motion.div
          className="mt-16 absolute bottom-8 left-0 right-0"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <p className="text-xs text-white/60 uppercase tracking-widest mb-2">Scroll Down</p>
          <div className="w-px h-8 bg-gradient-to-b from-white to-transparent mx-auto"></div>
        </motion.div>
      </MotionDiv>
    </section>
  );
};

export default Hero;
