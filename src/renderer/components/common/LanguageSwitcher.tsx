import { Button, Dropdown } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const languageOptions = [
  { key: 'zh-CN', label: '中文' },
  { key: 'en-US', label: 'English' },
];

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = ({ key }: { key: string }) => {
    i18n.changeLanguage(key);
    localStorage.setItem('i18nextLng', key);
  };

  const currentLabel = i18n.language === 'en-US' ? 'English' : '中文';

  return (
    <Dropdown
      menu={{
        items: languageOptions.map((opt) => ({
          key: opt.key,
          label: opt.label,
          disabled: i18n.language === opt.key,
        })),
        onClick: handleLanguageChange,
      }}
      placement="bottomRight"
    >
      <Button
        type="text"
        icon={<GlobalOutlined />}
        style={{ color: 'inherit' }}
      >
        {currentLabel}
      </Button>
    </Dropdown>
  );
}

export default LanguageSwitcher;