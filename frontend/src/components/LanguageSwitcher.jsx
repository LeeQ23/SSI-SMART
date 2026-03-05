import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ mini = false }) => {
    const { i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
    };

    if (mini) {
        return (
            <div className="flex flex-col gap-1 items-center">
                <button
                    onClick={() => changeLanguage('en')}
                    className={`w-8 h-8 flex items-center justify-center text-[10px] rounded-lg transition-all ${i18n.language === 'en' ? 'bg-accent text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                    title="English"
                >
                    EN
                </button>
                <button
                    onClick={() => changeLanguage('ja')}
                    className={`w-8 h-8 flex items-center justify-center text-[10px] rounded-lg transition-all ${i18n.language === 'ja' ? 'bg-accent text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                    title="Japanese"
                >
                    JP
                </button>
                <button
                    onClick={() => changeLanguage('id')}
                    className={`w-8 h-8 flex items-center justify-center text-[10px] rounded-lg transition-all ${i18n.language === 'id' ? 'bg-accent text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                    title="Indonesian"
                >
                    ID
                </button>
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
