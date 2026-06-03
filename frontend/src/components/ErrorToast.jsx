import React from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ErrorToast = ({ message, isRetrying = true }) => {
    const { t } = useTranslation();

    const [isVisible, setIsVisible] = React.useState(true);

    React.useEffect(() => {
        if (!isRetrying) {
            const timer = setTimeout(() => setIsVisible(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isRetrying, message]);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-10 duration-500">
            <div className="glass-panel px-4 py-3 flex items-center gap-4 border-red-500/30 bg-red-500/10 shadow-lg shadow-red-900/20 backdrop-blur-md">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                    <WifiOff size={16} className="text-red-400" />
                </div>

                <div className="flex flex-col pr-4">
                    <span className="text-sm font-bold text-white leading-tight">
                        {t('common.sync_issue', 'System Notification')}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                        {isRetrying ? t('common.retrying', 'Auto-retrying...') : message}
                    </span>
                </div>

                {isRetrying ? (
                    <div className="ml-2">
                        <Loader2 size={14} className="text-red-400 animate-spin" />
                    </div>
                ) : (
                    <button onClick={() => setIsVisible(false)} className="ml-2 text-gray-400 hover:text-white">
                        <span className="sr-only">Close</span>
                        &times;
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorToast;
