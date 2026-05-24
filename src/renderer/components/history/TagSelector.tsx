import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { usePLCStore } from '../../stores/plcStore';
import { useHistoryStore } from '../../stores/historyStore';
import type { TagConfig } from '@shared/types';

function TagSelector() {
  const { t } = useTranslation();
  const tags = usePLCStore((s) => s.tags);
  const selectedTags = useHistoryStore((s) => s.selectedTags);

  const handleChange = (values: string[]) => {
    useHistoryStore.setState({ selectedTags: values });
  };

  return (
    <Select
      mode="multiple"
      showSearch
      placeholder={t('history.selectTags')}
      value={selectedTags}
      onChange={handleChange}
      style={{ minWidth: 240 }}
      filterOption={(input, option) => {
        const label = option?.label ?? option?.value ?? '';
        return String(label).toLowerCase().includes(input.toLowerCase());
      }}
      options={tags.map((tag: TagConfig) => ({
        value: tag.name,
        label: `${tag.name}${tag.unit ? ` (${tag.unit})` : ''}`,
      }))}
      allowClear
      maxTagCount="responsive"
    />
  );
}

export default TagSelector;