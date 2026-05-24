import { useCallback, useRef, useEffect, useState } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface TagSearchBarProps {
  onSearch: (query: string) => void;
}

function TagSearchBar({ onSearch }: TagSearchBarProps) {
  const { t } = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        onSearch(val.trim().toLowerCase());
        timerRef.current = null;
      }, 300);
    },
    [onSearch],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <Input
      prefix={<SearchOutlined />}
      placeholder={`${t('manual.search')}...`}
      allowClear
      value={inputValue}
      onChange={handleChange}
      style={{ marginBottom: 16 }}
      size="large"
    />
  );
}

export default TagSearchBar;