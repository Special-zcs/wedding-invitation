import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

const Loading = () => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-pink-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="text-primary mb-4"
        >
           <Heart size={64} fill="currentColor" />
        </motion.div>
        <h2 className="text-xl font-serif text-gray-600 tracking-widest uppercase">Loading Love...</h2>
      </motion.div>
    </div>
  );
};

export default Loading;
