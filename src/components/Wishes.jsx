import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart, Share2, Facebook, Twitter, Link as LinkIcon } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useDanmaku } from '../context/DanmakuContext';

const Wishes = () => {
  const { config } = useConfig();
  const { wishes } = config;
  const { addWish } = useDanmaku();
  const [form, setForm] = useState({ name: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Add wish to Danmaku Context
    if (form.name && form.message) {
        addWish(form.name, form.message);
    }

    // Simulate submission delay
    setTimeout(() => {
        setSubmitted(true);
        setForm({ name: '', message: '' });
    }, 500);
  };

  const handleShare = (platform) => {
      const url = window.location.href;
      const text = `Celebrating ${config.hero.names.groom} & ${config.hero.names.bride}'s Wedding!`;
      
      let shareUrl = '';
      if (platform === 'facebook') {
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      } else if (platform === 'twitter') {
          shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      } else if (platform === 'copy') {
          navigator.clipboard.writeText(url);
          alert('Link copied to clipboard!');
          return;
      }
      
      if (shareUrl) window.open(shareUrl, '_blank');
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-secondary/30 text-center px-4" id="wishes">
      <div className="max-w-3xl mx-auto">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
        >
            <h2 className="text-3xl md:text-5xl font-serif text-gray-800 mb-4">{wishes.title}</h2>
            <p className="text-gray-500 mb-12">{wishes.subtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Quote / Info */}
            <motion.div 
                className="text-left bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
            >
                <Heart className="w-8 h-8 text-primary mb-4" />
                <p className="text-xl italic text-gray-600 mb-8 font-serif leading-relaxed">
                    "{wishes.defaultMessage}"
                </p>
                
                <div className="mt-8 pt-8 border-t border-gray-100">
                    <p className="font-bold text-gray-800 mb-2">Contact Us</p>
                    <p className="text-gray-500 text-sm mb-1">{wishes.contact.email}</p>
                    <p className="text-gray-500 text-sm">{wishes.contact.phone}</p>
                </div>

                <div className="mt-8">
                     <button 
                        onClick={() => setShowShare(!showShare)}
                        className="flex items-center gap-2 text-primary hover:text-pink-600 transition-colors font-medium"
                     >
                         <Share2 size={18} />
                         Share the joy
                     </button>
                     
                     <AnimatePresence>
                        {showShare && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex gap-4 mt-4 overflow-hidden"
                            >
                                <button onClick={() => handleShare('facebook')} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"><Facebook size={20}/></button>
                                <button onClick={() => handleShare('twitter')} className="p-2 bg-sky-100 text-sky-500 rounded-full hover:bg-sky-200 transition-colors"><Twitter size={20}/></button>
                                <button onClick={() => handleShare('copy')} className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"><LinkIcon size={20}/></button>
                            </motion.div>
                        )}
                     </AnimatePresence>
                </div>
            </motion.div>

            {/* Form */}
            <motion.div 
                className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-primary"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
            >
                {!submitted ? (
                    <form onSubmit={handleSubmit} className="text-left space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                            <input 
                                type="text" 
                                required
                                value={form.name}
                                onChange={e => setForm({...form, name: e.target.value})}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="Guest Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea 
                                required
                                rows={4}
                                value={form.message}
                                onChange={e => setForm({...form, message: e.target.value})}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                placeholder="Write your blessings..."
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-pink-400 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 font-medium shadow-md"
                        >
                            <Send size={18} />
                            Send Wishes
                        </button>
                    </form>
                ) : (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center py-12"
                    >
                        <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Heart className="fill-current" size={32} />
                        </div>
                        <h3 className="text-2xl font-serif text-gray-800 mb-2">Thank You!</h3>
                        <p className="text-gray-500">Your warm wishes have been received.</p>
                        <button 
                            onClick={() => setSubmitted(false)}
                            className="mt-6 text-primary hover:text-pink-600 text-sm font-medium"
                        >
                            Send another message
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Wishes;
