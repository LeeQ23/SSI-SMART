import { motion, AnimatePresence } from 'framer-motion';

const Digit = ({ digit }) => {
    return (
        <div className="relative inline-block h-[1.1em] overflow-hidden tabular-nums leading-[1.1em] min-w-[0.6em] text-center">
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={digit}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        opacity: { duration: 0.1 }
                    }}
                >
                    {digit}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const AnimatedNumber = ({ value, decimals = 0, suffix = '', className = '', isTime = false }) => {
    const formatValue = (val) => {
        if (isTime) {
            const totalSeconds = Math.floor(Number(val)) || 0;
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = Math.floor(totalSeconds % 60);
            return `${h}h ${m}m ${s}s`;
        }
        const num = Number(val) || 0;
        return num.toFixed(decimals) + suffix;
    };

    const displayString = formatValue(value);
    const chars = displayString.split('');

    return (
        <span className={`inline-flex items-baseline ${className}`}>
            {chars.map((char, i) => {
                // We use a key based on the index from the RIGHT to ensure that
                // when a number grows (e.g. 9 -> 10), the units place stays stable
                // and the new digit appears correctly at the left.
                const key = `${chars.length - i}-${char}`;

                if (/[0-9]/.test(char)) {
                    return <Digit key={key} digit={char} />;
                }
                return <span key={key} className="inline-block">{char}</span>;
            })}
        </span>
    );
};

export default AnimatedNumber;
