import React from 'react';

const LogoLoader = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center">
                {/* Outer Winding Circle - Scaled 2.5x (320px) */}
                <div className="absolute w-80 h-80 border-[5px] border-transparent border-t-accent border-r-accent/20 rounded-full animate-spin-slow shadow-[0_0_30px_rgba(0,116,217,0.15)]"></div>

                {/* Inner Static/Pulse Ring - Scaled 2.5x (280px) */}
                <div className="absolute w-72 h-72 border border-white/5 rounded-full"></div>

                {/* Logo with subtle pulse - Scaled 2.5x */}
                <div className="relative z-10 p-10 bg-gray-900/50 rounded-full backdrop-blur-sm shadow-inner border border-white/5 animate-pulse-gentle">
                    <img
                        src="/logo.png"
                        alt="SSI Logo"
                        className="w-32 h-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    />
                </div>
            </div>

            {message && (
                <div className="mt-8 text-gray-400 text-sm font-medium tracking-widest uppercase animate-pulse-gentle">
                    {message}
                </div>
            )}

        </div>
    );
};

export default LogoLoader;
