import React from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ErrorToast = ({ message, isRetrying = true }) => {
    const { t } = useTranslation();

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-10 duration-500">
            <div className="glass-panel px-4 py-3 flex items-center gap-4 border-red-500/30 bg-red-500/10 shadow-lg shadow-red-900/20 backdrop-blur-md">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                    <WifiOff size={16} className="text-red-400" />
                </div>

                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white leading-tight">
                        {t('common.sync_issue', 'Connection Issue')}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                        {isRetrying ? t('common.retrying', 'Auto-retrying...') : message}
                    </span>
                </div>

                {isRetrying && (
                    <div className="ml-2">
                        <Loader2 size={14} className="text-red-400 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ErrorToast;
