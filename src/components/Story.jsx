import { motion } from 'framer-motion';
import { useConfig } from '../context/ConfigContext';

const MotionDiv = motion.div;

const Story = () => {
  const { config } = useConfig();
  const { story } = config;

  return (
    <section className="py-24 bg-secondary/50 overflow-hidden" id="story">
      <div className="max-w-4xl mx-auto px-4">
        <MotionDiv 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
        >
             <h2 className="text-3xl md:text-5xl font-serif text-gray-800 mb-4">{story.title}</h2>
             <p className="text-gray-500">{story.subtitle}</p>
        </MotionDiv>

        <div className="relative">
           {/* Center Line */}
           <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/0 via-primary/40 to-primary/0 -translate-x-1/2 hidden md:block"></div>
           <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary/0 via-primary/40 to-primary/0 md:hidden"></div>
          
          {story.events.map((event, index) => (
            <MotionDiv 
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: index * 0.1 }}
              className={`flex flex-col md:flex-row items-start md:items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''} gap-8 relative mb-12 last:mb-0`}
            >
              {/* Content Box */}
              <div className={`flex-1 w-full pl-12 md:pl-0 ${index % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                <div className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group`}>
                   {/* Optional Image for Event */}
                   {event.image && (
                       <div className="h-48 overflow-hidden">
                           <img src={event.image} alt={event.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                       </div>
                   )}
                   <div className="p-8 relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300"></div>
                        <span className="text-accent font-bold text-lg block mb-2 tracking-wider">{event.year}</span>
                        <h3 className="text-2xl font-serif mb-3 text-gray-800">{event.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{event.desc}</p>
                   </div>
                </div>
              </div>
              
              {/* Center Dot */}
              <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-4 border-primary rounded-full z-10 shadow-sm mt-8 md:mt-0"></div>
              
              <div className="flex-1 hidden md:block"></div> {/* Spacer */}
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Story;
