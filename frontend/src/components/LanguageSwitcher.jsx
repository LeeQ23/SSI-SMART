import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
    };

    return (
        <div className="flex gap-2 p-2 bg-white/5 rounded-lg">
            <button
                onClick={() => changeLanguage('en')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-all ${i18n.language === 'en' ? 'bg-accent text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                EN
            </button>
            <button
                onClick={() => changeLanguage('ja')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-all ${i18n.language === 'ja' ? 'bg-accent text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                JP
            </button>
            <button
                onClick={() => changeLanguage('id')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-all ${i18n.language === 'id' ? 'bg-accent text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                ID
            </button>
        </div>
    );
};

export default LanguageSwitcher;
