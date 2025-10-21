// Language switcher component

import { useTranslation } from 'react-i18next';
import { Select } from './Select';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <Select
      value={i18n.language}
      onChange={handleLanguageChange}
      className="text-sm"
      options={languages.map((lang) => ({ value: lang.code, label: lang.name }))}
    />
  );
}
