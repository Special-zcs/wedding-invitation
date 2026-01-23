import { useEffect, useRef, useState } from 'react';
import { useConfig } from '../context/ConfigContext';

const BackgroundEffects = () => {
  const { config } = useConfig();
  const { theme } = config;
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000, isPressed: false });
  const [imageLoaded, setImageLoaded] = useState(false);
  const particleImageRef = useRef(new Image());

  // Load particle image
  useEffect(() => {
    const img = new Image();
    img.src = theme.animation.particleImage || "https://purepng.com/public/uploads/large/purepng.com-pink-heartheartlovepink-heart-1421526557567shq8t.png";
    img.onload = () => {
      particleImageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
        // If image fails, we will fallback to drawing a shape, so we still set loaded to true to start loop
        setImageLoaded(true);
    }
  }, [theme.animation.particleImage]);

  useEffect(() => {
    if (!theme.animation.enableParticles || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Particle Class
    class Particle {
      constructor(x, y, type = 'ambient') {
        this.x = x || Math.random() * canvas.width;
        this.y = y || Math.random() * canvas.height;
        this.size = Math.random() * (theme.animation.particleSize?.max - theme.animation.particleSize?.min || 15) + (theme.animation.particleSize?.min || 10);
        this.speedX = (Math.random() - 0.5) * 1;
        this.speedY = Math.random() * 1 + 0.5; // Falling down by default
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 2;
        // Increased base opacity for better visibility
        this.opacity = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
        this.type = type; // 'ambient', 'trail', 'explosion'
        
        if (type === 'explosion') {
          this.speedX = (Math.random() - 0.5) * 10;
          this.speedY = (Math.random() - 0.5) * 10;
          this.life = 100; // Frames to live
          this.opacity = 1;
        }
        
        if (type === 'trail') {
           this.speedX = (Math.random() - 0.5) * 2;
           this.speedY = (Math.random() - 0.5) * 2;
           this.life = 60;
           this.size = this.size * 0.8;
           this.opacity = 0.9;
        }
      }

      update() {
        // Basic Movement
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        // Interaction: Attraction to Mouse (Gathering)
        if (theme.animation.interaction.enableHoverAttraction && this.type === 'ambient') {
             const dx = mouseRef.current.x - this.x;
             const dy = mouseRef.current.y - this.y;
             const distance = Math.sqrt(dx * dx + dy * dy);
             const forceDistance = 150; // Attraction range

             if (distance < forceDistance) {
                 const force = (forceDistance - distance) / forceDistance;
                 this.speedX += (dx / distance) * force * 0.5;
                 this.speedY += (dy / distance) * force * 0.5;
             }
        }

        // Life cycle for temporary particles
        if (this.type !== 'ambient') {
            this.life--;
            this.opacity -= 0.01;
        }

        // Wrap around screen for ambient particles
        if (this.type === 'ambient') {
            if (this.y > canvas.height) this.y = -50;
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
        }
      }

      draw() {
        if (this.opacity <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;
        if (particleImageRef.current && particleImageRef.current.complete && particleImageRef.current.naturalWidth > 0) {
            ctx.drawImage(particleImageRef.current, -this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            // Fallback shape - Heart
            ctx.fillStyle = theme.colors.primary || '#e8a8bf';
            ctx.beginPath();
            // Draw a heart shape
            const s = this.size / 2;
            ctx.moveTo(0, 0 + s/4);
            ctx.bezierCurveTo(0, 0 - s/4, -s, -s/4, -s, 0 + s/4);
            ctx.bezierCurveTo(-s, 0 + s, 0, 0 + s*1.5, 0, 0 + s*1.5);
            ctx.bezierCurveTo(0, 0 + s*1.5, s, 0 + s, s, 0 + s/4);
            ctx.bezierCurveTo(s, -s/4, 0, -s/4, 0, 0 + s/4);
            ctx.fill();
        }
        ctx.restore();
      }
    }

    // Initialize Ambient Particles
    const initParticles = () => {
      particlesRef.current = [];
      const count = theme.animation.particleCount || 30;
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(new Particle());
      }
    };
    initParticles();

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and Draw Particles
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.update();
        p.draw();

        // Remove dead particles
        if (p.type !== 'ambient' && p.life <= 0) {
            particlesRef.current.splice(i, 1);
            i--;
        }
      }

      // Trail Effect Logic: Add particles at mouse position periodically if moving
      if (theme.animation.interaction.enableMouseTrail && Math.random() > 0.8 && mouseRef.current.x > 0) {
          particlesRef.current.push(new Particle(mouseRef.current.x, mouseRef.current.y, 'trail'));
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme.animation, imageLoaded]);

  // Event Handlers
  // Note: These handlers are attached to the window in a wrapper component or passed down
  // But since we are using the internal logic here, we need to ensure they are updated or ref'd correctly.
  // The logic below is duplicated from the wrapper. 
  // Wait, I should update the Wrapper component which is the one actually being used and exported.
  // The component structure in the file is:
  // 1. BackgroundEffects (Internal implementation, not exported default)
  // 2. BackgroundEffectsWrapper (Exported default, wraps CanvasEffects)
  // 3. CanvasEffects (The one doing the work with window listeners)
  
  // I need to update CanvasEffects!
  
  return null;
};

// ... (Wrapper is fine)

// Actual component being used
const CanvasEffects = ({ config }) => {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const particleImageRef = useRef(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = config.theme.animation.particleImage || "https://purepng.com/public/uploads/large/purepng.com-pink-heartheartlovepink-heart-1421526557567shq8t.png";
        img.onload = () => {
            particleImageRef.current = img;
            setReady(true);
        };
        img.onerror = () => {
             setReady(true); 
        };
    }, [config.theme.animation.particleImage]);

    useEffect(() => {
        if (!ready || !config.theme.animation.enableParticles) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        class Particle {
            constructor(x, y, type = 'ambient') {
                this.x = x || Math.random() * canvas.width;
                this.y = y || Math.random() * canvas.height;
                // Use config size
                const minSize = config.theme.animation.particleSize?.min || 15;
                const maxSize = config.theme.animation.particleSize?.max || 35;
                this.size = Math.random() * (maxSize - minSize) + minSize;
                
                this.baseX = this.x;
                this.baseY = this.y;
                this.density = (Math.random() * 30) + 1;
                this.type = type;
                this.rotation = Math.random() * 360;
                
                if (type === 'ambient') {
                    this.speedX = Math.random() * 1 - 0.5;
                    this.speedY = Math.random() * 1 + 0.5;
                    // Increased opacity
                    this.opacity = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
                } else if (type === 'trail') {
                    this.speedX = Math.random() * 2 - 1;
                    this.speedY = Math.random() * 2 - 1;
                    this.opacity = 0.9;
                    this.life = 50;
                    this.size = Math.random() * 10 + 10;
                } else if (type === 'explosion') {
                    this.speedX = Math.random() * 10 - 5;
                    this.speedY = Math.random() * 10 - 5;
                    this.opacity = 1;
                    this.life = 80;
                }
            }

            update() {
                this.rotation += 2;

                if (this.type === 'ambient') {
                    this.y += this.speedY;
                    this.x += this.speedX;

                    // Hover Attraction
                    if (config.theme.animation.interaction.enableHoverAttraction) {
                        let dx = mouseRef.current.x - this.x;
                        let dy = mouseRef.current.y - this.y;
                        let distance = Math.sqrt(dx * dx + dy * dy);
                        let forceDirectionX = dx / distance;
                        let forceDirectionY = dy / distance;
                        let maxDistance = 150;
                        let force = (maxDistance - distance) / maxDistance;

                        if (distance < maxDistance) {
                            this.x += forceDirectionX * force * 2;
                            this.y += forceDirectionY * force * 2;
                        }
                    }

                    // Reset
                    if (this.y > canvas.height) {
                        this.y = 0 - this.size;
                        this.x = Math.random() * canvas.width;
                    }
                } else {
                    // Trail & Explosion
                    this.x += this.speedX;
                    this.y += this.speedY;
                    this.life -= 1;
                    this.opacity -= 0.01;
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation * Math.PI / 180);
                ctx.globalAlpha = this.opacity;
                
                if (particleImageRef.current && particleImageRef.current.complete && particleImageRef.current.naturalWidth > 0) {
                    ctx.drawImage(particleImageRef.current, -this.size/2, -this.size/2, this.size, this.size);
                } else {
                    // Fallback to circle if image fails
                    ctx.fillStyle = config.theme.colors.primary;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        const init = () => {
            particlesRef.current = [];
            for (let i = 0; i < (config.theme.animation.particleCount || 50); i++){
                particlesRef.current.push(new Particle());
            }
        };
        init();

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesRef.current.length; i++){
                particlesRef.current[i].update();
                particlesRef.current[i].draw();
                
                if (particlesRef.current[i].life <= 0) {
                    particlesRef.current.splice(i, 1);
                    i--;
                }
            }
            // Trail generation
            if (config.theme.animation.interaction.enableMouseTrail && mouseRef.current.x > 0 && Math.random() > 0.8) {
                particlesRef.current.push(new Particle(mouseRef.current.x, mouseRef.current.y, 'trail'));
            }
            animationFrameId = requestAnimationFrame(animate);
        }
        animate();

        // Event Listeners
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        
        const handleTouchMove = (e) => {
             if (e.touches.length > 0) {
                mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
             }
        };

        const handleClick = (e) => {
            if (!config.theme.animation.interaction.enableClickExplosion) return;
            const x = e.clientX || (e.touches && e.touches[0].clientX);
            const y = e.clientY || (e.touches && e.touches[0].clientY);
            for(let i=0; i<15; i++) {
                particlesRef.current.push(new Particle(x, y, 'explosion'));
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('click', handleClick);
        window.addEventListener('touchstart', handleClick);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('touchstart', handleClick);
            cancelAnimationFrame(animationFrameId);
        };

    }, [ready, config.theme.animation]);

    if (!config.theme.animation.enableParticles) return null;

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

const BackgroundEffectsWrapper = () => {
    const { config } = useConfig();
    return <CanvasEffects config={config} />;
};

export default BackgroundEffectsWrapper;
