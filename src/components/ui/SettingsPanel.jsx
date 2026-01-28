import { useState } from 'react';
import { Settings, X, Save, RotateCcw, Trash2, MessageSquare, Layout, Image as ImageIcon, Plus, BookHeart, Upload } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { useDanmaku } from '../../context/DanmakuContext';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div;

// Helper component for image input with file upload support
const ImageInput = ({ label, value, onChange, placeholder, className }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={className}>
      {label && <label className="block text-sm text-gray-600 mb-1">{label}</label>}
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 p-2 border rounded focus:ring-primary focus:border-primary outline-none text-sm"
          placeholder={placeholder}
        />
        <label className="cursor-pointer p-2 bg-gray-50 hover:bg-gray-100 border rounded flex items-center justify-center transition-colors text-gray-600 hover:text-primary" title="Upload Image">
          <Upload size={18} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
};

const SettingsPanel = () => {
  const { config, updateConfig, resetConfig } = useConfig();
  const { wishes, removeWish, clearWishes, isDanmakuEnabled, toggleDanmaku } = useDanmaku();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'gallery' | 'story' | 'wishes'
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    updateConfig(localConfig);
    setIsOpen(false);
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default?')) {
        resetConfig();
        setLocalConfig(config); 
        window.location.reload(); 
    }
  };

  // Helper to update deep state
  const updateField = (path, value) => {
    const keys = path.split('.');
    setLocalConfig(prev => {
      const newState = { ...prev };
      let current = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newState;
    });
  };

  // Gallery Helpers
  const updateGalleryImage = (index, field, value) => {
    setLocalConfig(prev => {
        const newImages = [...prev.gallery.images];
        newImages[index] = { ...newImages[index], [field]: value };
        return {
            ...prev,
            gallery: {
                ...prev.gallery,
                images: newImages
            }
        };
    });
  };

  const removeGalleryImage = (index) => {
      setLocalConfig(prev => ({
          ...prev,
          gallery: {
              ...prev.gallery,
              images: prev.gallery.images.filter((_, i) => i !== index)
          }
      }));
  };

  const addGalleryImage = () => {
      setLocalConfig(prev => ({
          ...prev,
          gallery: {
              ...prev.gallery,
              images: [
                  ...prev.gallery.images,
                  {
                      src: "https://images.unsplash.com/photo-1511285560982-1356c11d4606?auto=format&fit=crop&q=80&w=800",
                      caption: "New Photo",
                      date: "2026-01"
                  }
              ]
          }
      }));
  };

  // Story Helpers
  const updateStoryEvent = (index, field, value) => {
    setLocalConfig(prev => {
        const newEvents = [...prev.story.events];
        newEvents[index] = { ...newEvents[index], [field]: value };
        return {
            ...prev,
            story: {
                ...prev.story,
                events: newEvents
            }
        };
    });
  };

  const removeStoryEvent = (index) => {
      setLocalConfig(prev => ({
          ...prev,
          story: {
              ...prev.story,
              events: prev.story.events.filter((_, i) => i !== index)
          }
      }));
  };

  const addStoryEvent = () => {
      setLocalConfig(prev => ({
          ...prev,
          story: {
              ...prev.story,
              events: [
                  ...prev.story.events,
                  {
                      year: new Date().getFullYear().toString(),
                      title: "New Chapter",
                      desc: "Description of this memorable event...",
                      image: "https://images.unsplash.com/photo-1511285560982-1356c11d4606?auto=format&fit=crop&q=80&w=800"
                  }
              ]
          }
      }));
  };


  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all text-gray-600 hover:text-primary"
        title="Customize Site"
      >
        <Settings size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <MotionDiv
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[60] shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b flex justify-between items-center bg-white z-10">
                  <h2 className="text-2xl font-serif text-gray-800">Settings</h2>
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'general' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <Layout size={16} />
                      <span className="hidden sm:inline">General</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('story')}
                    className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'story' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <BookHeart size={16} />
                      <span className="hidden sm:inline">Story</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('gallery')}
                    className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'gallery' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <ImageIcon size={16} />
                      <span className="hidden sm:inline">Gallery</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('wishes')}
                    className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'wishes' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <MessageSquare size={16} />
                      <span className="hidden sm:inline">Wishes</span>
                  </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'general' && (
                    <div className="space-y-6">
                      {/* Hero Settings */}
                      <section>
                        <h3 className="font-bold text-gray-900 mb-3 pb-2 border-b">Couple Names</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Groom</label>
                            <input
                              type="text"
                              value={localConfig.hero.names.groom}
                              onChange={(e) => updateField('hero.names.groom', e.target.value)}
                              className="w-full p-2 border rounded focus:ring-primary focus:border-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Bride</label>
                            <input
                              type="text"
                              value={localConfig.hero.names.bride}
                              onChange={(e) => updateField('hero.names.bride', e.target.value)}
                              className="w-full p-2 border rounded focus:ring-primary focus:border-primary outline-none"
                            />
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="font-bold text-gray-900 mb-3 pb-2 border-b">Date & Location</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Date</label>
                            <input
                              type="datetime-local"
                              value={localConfig.hero.date.substring(0, 16)} 
                              onChange={(e) => updateField('hero.date', e.target.value)}
                              className="w-full p-2 border rounded focus:ring-primary focus:border-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Location</label>
                            <input
                              type="text"
                              value={localConfig.hero.location}
                              onChange={(e) => updateField('hero.location', e.target.value)}
                              className="w-full p-2 border rounded focus:ring-primary focus:border-primary outline-none"
                            />
                          </div>
                        </div>
                      </section>
                      
                      <section>
                        <h3 className="font-bold text-gray-900 mb-3 pb-2 border-b">Theme & Effects</h3>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                              <input 
                                  type="checkbox"
                                  checked={localConfig.theme.animation.enableParticles}
                                  onChange={(e) => updateField('theme.animation.enableParticles', e.target.checked)}
                                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                              />
                              <label className="text-sm text-gray-700">Enable Particle Effects</label>
                          </div>

                          {localConfig.theme.animation.enableParticles && (
                            <div className="pl-6 space-y-3 border-l-2 border-gray-100">
                              <div>
                                  <ImageInput
                                    label="Particle Image URL"
                                    value={localConfig.theme.animation.particleImage || ''}
                                    onChange={(val) => updateField('theme.animation.particleImage', val)}
                                    placeholder="https://example.com/heart.png"
                                  />
                                  <p className="text-xs text-gray-400 mt-1">Leave empty for circles</p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                  <input 
                                      type="checkbox"
                                      checked={localConfig.theme.animation.interaction.enableMouseTrail}
                                      onChange={(e) => updateField('theme.animation.interaction.enableMouseTrail', e.target.checked)}
                                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                                  />
                                  <label className="text-sm text-gray-700">Mouse Trail</label>
                              </div>

                              <div className="flex items-center gap-2">
                                  <input 
                                      type="checkbox"
                                      checked={localConfig.theme.animation.interaction.enableHoverAttraction}
                                      onChange={(e) => updateField('theme.animation.interaction.enableHoverAttraction', e.target.checked)}
                                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                                  />
                                  <label className="text-sm text-gray-700">Hover Attraction</label>
                              </div>

                              <div className="flex items-center gap-2">
                                  <input 
                                      type="checkbox"
                                      checked={localConfig.theme.animation.interaction.enableClickExplosion}
                                      onChange={(e) => updateField('theme.animation.interaction.enableClickExplosion', e.target.checked)}
                                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                                  />
                                  <label className="text-sm text-gray-700">Click Explosion</label>
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                )}

                {activeTab === 'story' && (
                    <div className="space-y-6">
                        <section>
                             <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                <h3 className="font-bold text-gray-900">Manage Story Events</h3>
                                <button 
                                    onClick={addStoryEvent}
                                    className="text-sm text-primary flex items-center gap-1 hover:text-pink-600"
                                >
                                    <Plus size={16} /> Add Event
                                </button>
                             </div>
                             
                             <div className="space-y-6">
                                 {localConfig.story.events.map((event, index) => (
                                     <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                                         <button 
                                            onClick={() => removeStoryEvent(index)}
                                            className="absolute top-2 right-2 p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title="Remove Event"
                                         >
                                             <Trash2 size={14} />
                                         </button>
                                         
                                         <div className="flex gap-4 items-start mb-3">
                                             <div className="w-20 h-20 shrink-0 bg-gray-200 rounded overflow-hidden">
                                                 <img src={event.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                             </div>
                                             <div className="flex-1 space-y-2">
                                                 <ImageInput
                                                     label="Image URL"
                                                     value={event.image}
                                                     onChange={(val) => updateStoryEvent(index, 'image', val)}
                                                 />
                                             </div>
                                         </div>
                                         
                                         <div className="grid grid-cols-4 gap-3 mb-3">
                                             <div className="col-span-1">
                                                 <label className="block text-xs text-gray-500 mb-1">Year</label>
                                                 <input 
                                                     type="text" 
                                                     value={event.year}
                                                     onChange={(e) => updateStoryEvent(index, 'year', e.target.value)}
                                                     className="w-full p-1.5 text-sm border rounded focus:ring-primary focus:border-primary outline-none"
                                                 />
                                             </div>
                                             <div className="col-span-3">
                                                 <label className="block text-xs text-gray-500 mb-1">Title</label>
                                                 <input 
                                                     type="text" 
                                                     value={event.title}
                                                     onChange={(e) => updateStoryEvent(index, 'title', e.target.value)}
                                                     className="w-full p-1.5 text-sm border rounded focus:ring-primary focus:border-primary outline-none"
                                                 />
                                             </div>
                                         </div>

                                         <div>
                                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                                            <textarea 
                                                rows={2}
                                                value={event.desc}
                                                onChange={(e) => updateStoryEvent(index, 'desc', e.target.value)}
                                                className="w-full p-1.5 text-sm border rounded focus:ring-primary focus:border-primary outline-none resize-none"
                                            />
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </section>
                    </div>
                )}

                {activeTab === 'gallery' && (
                    <div className="space-y-6">
                        <section>
                            <h3 className="font-bold text-gray-900 mb-3 pb-2 border-b">Gallery Settings</h3>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-600 mb-1">View Mode</label>
                                <select 
                                    value={localConfig.gallery.viewMode || 'grid'}
                                    onChange={(e) => updateField('gallery.viewMode', e.target.value)}
                                    className="w-full p-2 border rounded focus:ring-primary focus:border-primary outline-none"
                                >
                                    <option value="grid">Grid</option>
                                    <option value="carousel">Carousel</option>
                                </select>
                            </div>
                        </section>

                        <section>
                             <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                <h3 className="font-bold text-gray-900">Manage Photos</h3>
                                <button 
                                    onClick={addGalleryImage}
                                    className="text-sm text-primary flex items-center gap-1 hover:text-pink-600"
                                >
                                    <Plus size={16} /> Add Photo
                                </button>
                             </div>
                             
                             <div className="space-y-6">
                                 {localConfig.gallery.images.map((img, index) => (
                                     <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                                         <button 
                                            onClick={() => removeGalleryImage(index)}
                                            className="absolute top-2 right-2 p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove Photo"
                                         >
                                             <Trash2 size={14} />
                                         </button>
                                         
                                         <div className="flex gap-4 items-start mb-3">
                                             <div className="w-20 h-20 shrink-0 bg-gray-200 rounded overflow-hidden">
                                                 <img src={img.src} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                             </div>
                                             <div className="flex-1 space-y-2">
                                                 <ImageInput
                                                     label="Image URL"
                                                     value={img.src}
                                                     onChange={(val) => updateGalleryImage(index, 'src', val)}
                                                 />
                                             </div>
                                         </div>
                                         
                                         <div className="grid grid-cols-2 gap-3">
                                             <div>
                                                 <label className="block text-xs text-gray-500 mb-1">Caption</label>
                                                 <input 
                                                     type="text" 
                                                     value={img.caption}
                                                     onChange={(e) => updateGalleryImage(index, 'caption', e.target.value)}
                                                     className="w-full p-1.5 text-sm border rounded focus:ring-primary focus:border-primary outline-none"
                                                 />
                                             </div>
                                             <div>
                                                 <label className="block text-xs text-gray-500 mb-1">Date</label>
                                                 <input 
                                                     type="text" 
                                                     value={img.date}
                                                     onChange={(e) => updateGalleryImage(index, 'date', e.target.value)}
                                                     className="w-full p-1.5 text-sm border rounded focus:ring-primary focus:border-primary outline-none"
                                                 />
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </section>
                    </div>
                )}

                {activeTab === 'wishes' && (
                    <div className="space-y-6">
                        <section>
                            <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                <h3 className="font-bold text-gray-900">Manage Wishes</h3>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600 flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={isDanmakuEnabled} 
                                            onChange={toggleDanmaku}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        Show Danmaku
                                    </label>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-[60vh] overflow-y-auto">
                                {wishes.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        No wishes yet.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {wishes.map((wish, index) => (
                                            <li key={index} className="p-3 flex justify-between items-start gap-4 hover:bg-white transition-colors group">
                                                <span className="text-sm text-gray-700 break-words flex-1">{wish}</span>
                                                <button 
                                                    onClick={() => removeWish(index)}
                                                    className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="mt-4">
                                <button 
                                    onClick={clearWishes}
                                    className="w-full py-2 border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Clear All Wishes
                                </button>
                            </div>
                        </section>
                    </div>
                )}
              </div>

              {/* Footer */}
              {(activeTab !== 'wishes') && (
                  <div className="p-6 border-t flex gap-4 bg-white z-10">
                    <button
                      onClick={handleSave}
                      className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-pink-400 transition-colors flex items-center justify-center gap-2 shadow-md"
                    >
                      <Save size={18} />
                      Save Changes
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      title="Reset to Default"
                    >
                      <RotateCcw size={18} />
                    </button>
                  </div>
              )}
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SettingsPanel;
