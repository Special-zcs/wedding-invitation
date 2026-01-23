import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react'; 
import { useConfig } from '../context/ConfigContext';

const Gallery = () => {
  const { config } = useConfig();
  const { gallery } = config;
  const [selectedId, setSelectedId] = useState(null);

  // Simple view mode internal state if we want to allow user toggling, 
  // otherwise use config.gallery.viewMode
  // For now, let's stick to the config to drive the initial state
  const viewMode = gallery.viewMode || 'grid'; 

  return (
    <section className="py-24 px-4 bg-white" id="gallery">
      <div className="max-w-7xl mx-auto">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
        >
            <h2 className="text-3xl md:text-5xl font-serif text-gray-800 mb-4">{gallery.title}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{gallery.subtitle}</p>
        </motion.div>

        {viewMode === 'grid' ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
             {gallery.images.map((img, index) => (
               <motion.div
                 key={index}
                 layoutId={`image-${index}`}
                 onClick={() => setSelectedId(index)}
                 className="cursor-pointer overflow-hidden rounded-xl shadow-lg aspect-[3/4] group relative bg-gray-100"
                 whileHover={{ y: -5 }}
                 initial={{ opacity: 0, scale: 0.9 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true, margin: "-50px" }}
                 transition={{ duration: 0.5, delay: index * 0.1 }}
               >
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 z-10 flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100">
                    <p className="text-white font-serif text-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{img.caption}</p>
                    <p className="text-white/80 text-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">{img.date}</p>
                 </div>
                 <img 
                  src={img.src} 
                  alt={img.caption || `Wedding moment ${index + 1}`} 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out" 
                  loading="lazy" 
                  referrerPolicy="no-referrer"
                />
               </motion.div>
             ))}
           </div>
        ) : (
           // Simple Carousel View Placeholder if 'carousel' is selected in config
           <div className="flex overflow-x-auto gap-4 pb-8 snap-x">
              {gallery.images.map((img, index) => (
                  <div key={index} className="snap-center shrink-0 w-[80vw] md:w-[400px] aspect-[3/4] rounded-xl overflow-hidden shadow-lg relative">
                      <img src={img.src} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                          <p className="text-white font-serif">{img.caption}</p>
                      </div>
                  </div>
              ))}
           </div>
        )}

        <AnimatePresence>
          {selectedId !== null && (
            <div 
              className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
              onClick={() => setSelectedId(null)}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 right-4 z-50"
              >
                  <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors">
                      <X size={24} />
                  </button>
              </motion.div>
              
              <motion.div
                layoutId={`image-${selectedId}`}
                className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center rounded-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={gallery.images[selectedId].src} 
                  alt="Selected" 
                  className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-sm" 
                  referrerPolicy="no-referrer"
                />
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 text-center"
                >
                    <h3 className="text-white text-2xl font-serif">{gallery.images[selectedId].caption}</h3>
                    <p className="text-white/60">{gallery.images[selectedId].date}</p>
                </motion.div>
              </motion.div>

              {/* Navigation buttons for Lightbox */}
              <button 
                className="absolute left-4 p-2 text-white/50 hover:text-white transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(prev => (prev === 0 ? gallery.images.length - 1 : prev - 1));
                }}
              >
                <ChevronLeft size={40} />
              </button>

              <button 
                className="absolute right-4 p-2 text-white/50 hover:text-white transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(prev => (prev === gallery.images.length - 1 ? 0 : prev + 1));
                }}
              >
                <ChevronRight size={40} />
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Gallery;
