import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ mini = false }) => {
    const { i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
    };

    const languages = ['en', 'ja', 'id'];
    
    const cycleLanguage = () => {
        const currentIndex = languages.indexOf(i18n.language || 'en');
        const nextIndex = (currentIndex + 1) % languages.length;
        changeLanguage(languages[nextIndex]);
    };

    if (mini) {
        return (
            <div className="relative group flex items-center justify-center">
                <button
                    onClick={cycleLanguage}
                    className="w-10 h-10 flex items-center justify-center text-[11px] font-bold rounded-xl transition-all bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5 uppercase"
                    title="Change Language"
                >
                    {i18n.language || 'en'}
                </button>
                <div className="absolute left-14 px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:left-12 transition-all duration-300 z-50 shadow-2xl">
                    Change Language
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 border-l border-b border-white/10 rotate-45" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-lg w-full">
            <button
                onClick={() => changeLanguage('en')}
                className={`flex-1 px-2 py-1.5 text-xs rounded transition-all ${i18n.language === 'en' ? 'bg-accent text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                EN
            </button>
            <button
                onClick={() => changeLanguage('ja')}
                className={`flex-1 px-2 py-1.5 text-xs rounded transition-all ${i18n.language === 'ja' ? 'bg-accent text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                JP
            </button>
            <button
                onClick={() => changeLanguage('id')}
                className={`flex-1 px-2 py-1.5 text-xs rounded transition-all ${i18n.language === 'id' ? 'bg-accent text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                ID
            </button>
        </div>
    );
};

export default LanguageSwitcher;
