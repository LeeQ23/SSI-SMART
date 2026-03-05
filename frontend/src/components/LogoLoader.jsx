import React from 'react';

const LogoLoader = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center">
                {/* Outer Winding Circle */}
                <div className="absolute w-32 h-32 border-4 border-transparent border-t-accent border-r-accent/30 rounded-full animate-spin-slow shadow-[0_0_15px_rgba(0,116,217,0.2)]"></div>

                {/* Inner Static/Pulse Ring */}
                <div className="absolute w-28 h-28 border border-white/5 rounded-full"></div>

                {/* Logo with subtle pulse */}
                <div className="relative z-10 p-4 bg-gray-900/50 rounded-full backdrop-blur-sm shadow-inner border border-white/5 animate-pulse-gentle">
                    <img
                        src="/logo.png"
                        alt="SSI Logo"
                        className="w-12 h-auto object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                    />
                </div>
            </div>

            {message && (
                <div className="mt-8 text-gray-400 text-sm font-medium tracking-widest uppercase animate-pulse-gentle">
                    {message}
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse-gentle {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 1; }
                }
                .animate-spin-slow {
                    animation: spin-slow 1.5s linear infinite;
                }
                .animate-pulse-gentle {
                    animation: pulse-gentle 2s ease-in-out infinite;
                }
            `}} />
        </div>
    );
};

export default LogoLoader;
