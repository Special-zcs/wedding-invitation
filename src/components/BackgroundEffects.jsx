import { useEffect, useRef, useState } from 'react';
import { useConfig } from '../context/ConfigContext';

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

        const createParticle = (x, y, type = 'ambient') => {
            const minSize = config.theme.animation.particleSize?.min ?? 15;
            const maxSize = config.theme.animation.particleSize?.max ?? 35;
            const particle = {
                x: x ?? Math.random() * canvas.width,
                y: y ?? Math.random() * canvas.height,
                size: Math.random() * (maxSize - minSize) + minSize,
                baseX: 0,
                baseY: 0,
                density: (Math.random() * 30) + 1,
                type,
                rotation: Math.random() * 360,
                speedX: 0,
                speedY: 0,
                opacity: 1,
                life: undefined
            };

            particle.baseX = particle.x;
            particle.baseY = particle.y;

            if (type === 'ambient') {
                particle.speedX = Math.random() * 1 - 0.5;
                particle.speedY = Math.random() * 1 + 0.5;
                particle.opacity = Math.random() * 0.4 + 0.6;
            } else if (type === 'trail') {
                particle.speedX = Math.random() * 2 - 1;
                particle.speedY = Math.random() * 2 - 1;
                particle.opacity = 0.9;
                particle.life = 50;
                particle.size = Math.random() * 10 + 10;
            } else if (type === 'explosion') {
                particle.speedX = Math.random() * 10 - 5;
                particle.speedY = Math.random() * 10 - 5;
                particle.opacity = 1;
                particle.life = 80;
            }

            particle.update = () => {
                particle.rotation += 2;

                if (particle.type === 'ambient') {
                    particle.y += particle.speedY;
                    particle.x += particle.speedX;

                    if (config.theme.animation.interaction.enableHoverAttraction) {
                        const dx = mouseRef.current.x - particle.x;
                        const dy = mouseRef.current.y - particle.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const maxDistance = 150;

                        if (distance > 0 && distance < maxDistance) {
                            const force = (maxDistance - distance) / maxDistance;
                            particle.x += (dx / distance) * force * 2;
                            particle.y += (dy / distance) * force * 2;
                        }
                    }

                    if (particle.y > canvas.height) {
                        particle.y = 0 - particle.size;
                        particle.x = Math.random() * canvas.width;
                    }
                } else {
                    particle.x += particle.speedX;
                    particle.y += particle.speedY;
                    particle.life -= 1;
                    particle.opacity -= 0.01;
                }
            };

            particle.draw = () => {
                if (particle.opacity <= 0) return;
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation * Math.PI / 180);
                ctx.globalAlpha = particle.opacity;

                if (particleImageRef.current && particleImageRef.current.complete && particleImageRef.current.naturalWidth > 0) {
                    ctx.drawImage(particleImageRef.current, -particle.size / 2, -particle.size / 2, particle.size, particle.size);
                } else {
                    ctx.fillStyle = config.theme.colors.primary;
                    ctx.beginPath();
                    ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            };

            return particle;
        };

        const init = () => {
            particlesRef.current = [];
            for (let i = 0; i < (config.theme.animation.particleCount || 50); i++){
                particlesRef.current.push(createParticle());
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
                particlesRef.current.push(createParticle(mouseRef.current.x, mouseRef.current.y, 'trail'));
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
                particlesRef.current.push(createParticle(x, y, 'explosion'));
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

    }, [ready, config.theme.animation, config.theme.colors.primary]);

    if (!config.theme.animation.enableParticles) return null;

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

const BackgroundEffectsWrapper = () => {
    const { config } = useConfig();
    return <CanvasEffects config={config} />;
};

export default BackgroundEffectsWrapper;
