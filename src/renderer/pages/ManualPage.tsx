import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Space, message, Select, Tabs, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined, ApiOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageTransition from '../components/common/PageTransition';
import { TagGroupSection } from '../components/manual/TagGroupSection';
import TagSearchBar from '../components/manual/TagSearchBar';
import { TagConfigModal } from '../components/manual/TagConfigModal';
import { usePLCStore } from '../stores/plcStore';
import { TagConfig, TagFormData } from '../../shared/types';
import { parseAddress } from '../../shared/addressParser';

const AREA_FILTERS = [
  { label: '全部', value: '' },
  { label: '输入 I', value: 'I' },
  { label: '输出 Q', value: 'Q' },
  { label: '位 M', value: 'M' },
  { label: 'DB 块', value: 'DB' },
];

const GROUP_SORT = [
  'temperature', 'pressure', 'power', 'electrical',
  'digital_input', 'digital_output', 'db_data',
];

export default function ManualPage() {
  const { t } = useTranslation();
  const isConnected = usePLCStore((s) => s.connectionStatus.connected);
  const connectionStatus = usePLCStore((s) => s.connectionStatus);
  const writeTag = usePLCStore((s) => s.writeTag);

  const [tags, setTags] = useState<TagConfig[]>([]);
  const [searchText, setSearchText] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagConfig | null>(null);

  const loadTags = useCallback(async () => {
    try {
      const result = await window.electronAPI.tags.getAll();
      setTags(result);
    } catch {
      message.error(t('manual.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    loadTags();
    const timer = setInterval(loadTags, 3000);
    return () => clearInterval(timer);
  }, [loadTags]);

  const handleSaveTag = async (data: TagFormData): Promise<boolean> => {
    try {
      const parsed = parseAddress(data.address);
      if (!parsed) return false;

      const config: TagConfig = {
        name: data.name,
        address: data.address,
        area: parsed.area,
        dbNumber: parsed.dbNumber,
        start: parsed.start,
        size: parsed.size,
        type: data.type,
        unit: data.unit || undefined,
        group: data.group || undefined,
        min: data.min || undefined,
        max: data.max || undefined,
        description: data.description || undefined,
      };

      if (editingTag) {
        await window.electronAPI.tags.update(editingTag.name, config);
      } else {
        await window.electronAPI.tags.add(config);
      }

      await loadTags();
      return true;
    } catch {
      message.error(t('manual.saveFailed'));
      return false;
    }
  };

  const handleDeleteTag = async (name: string) => {
    try {
      await window.electronAPI.tags.remove(name);
      message.success(t('manual.tagDeleted'));
      loadTags();
    } catch {
      message.error(t('manual.deleteFailed'));
    }
  };

  const handleEditTag = (tag: TagConfig) => {
    setEditingTag(tag);
    setConfigOpen(true);
  };

  const handleCloseConfig = () => {
    setConfigOpen(false);
    setEditingTag(null);
  };

  const filteredTags = useMemo(() => {
    return tags.filter((tag) => {
      if (searchText && !tag.name.toLowerCase().includes(searchText.toLowerCase()) &&
          !tag.address.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      if (areaFilter) {
        const parsed = parseAddress(tag.address);
        if (parsed?.area !== areaFilter) return false;
      }
      return true;
    });
  }, [tags, searchText, areaFilter]);

  const groupedTags = useMemo(() => {
    const groups: Record<string, TagConfig[]> = {};
    const ungrouped: TagConfig[] = [];

    for (const tag of filteredTags) {
      const g = tag.group || 'custom';
      if (g === 'custom' || !GROUP_SORT.includes(g)) {
        ungrouped.push(tag);
      } else {
        if (!groups[g]) groups[g] = [];
        groups[g].push(tag);
      }
    }

    const sorted: { group: string; tags: TagConfig[] }[] = [];
    for (const key of GROUP_SORT) {
      if (groups[key]) {
        sorted.push({ group: key, tags: groups[key] });
      }
    }
    if (ungrouped.length > 0) {
      sorted.push({ group: 'custom', tags: ungrouped });
    }
    return sorted;
  }, [filteredTags]);

  const tabItems = groupedTags.map(({ group, tags: groupTags }) => ({
    key: group,
    label: (
      <span style={{ fontSize: 11, padding: '0 2px' }}>
        {t(`manual.group.${group}`, group)}
        <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>{groupTags.length}</span>
      </span>
    ),
    children: (
      <TagGroupSection
        group={group}
        tags={groupTags}
        onEdit={handleEditTag}
        onDelete={handleDeleteTag}
        showActions
      />
    ),
  }));

  return (
    <PageTransition direction="fade">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {t('manual.title')}
            </span>
            <ApiOutlined
              style={{
                fontSize: 14,
                color: isConnected ? '#52c41a' : 'var(--color-text-quaternary)',
              }}
            />
          </div>

          <Space size={4}>
            <TagSearchBar onSearch={setSearchText} />
            <Select
              value={areaFilter}
              onChange={setAreaFilter}
              options={AREA_FILTERS}
              size="small"
              style={{ width: 90 }}
            />
            <Tooltip title={t('manual.refresh')}>
              <Button size="small" icon={<ReloadOutlined />} onClick={loadTags} />
            </Tooltip>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTag(null);
                setConfigOpen(true);
              }}
            >
              {t('manual.addTag')}
            </Button>
          </Space>
        </div>

        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {tabItems.length > 0 ? (
            <Tabs
              items={tabItems}
              size="small"
              tabBarStyle={{ marginBottom: 8, fontSize: 11 }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--color-text-quaternary)',
                fontSize: 12,
              }}
            >
              {t('manual.noTags')}
            </div>
          )}
        </div>

        <TagConfigModal
          open={configOpen}
          onClose={handleCloseConfig}
          onSave={handleSaveTag}
          initialData={editingTag ? {
            name: editingTag.name,
            address: editingTag.address,
            type: editingTag.type,
            unit: editingTag.unit || '',
            group: editingTag.group || 'custom',
            min: editingTag.min ?? 0,
            max: editingTag.max ?? 1000,
            description: editingTag.description || '',
          } : null}
        />
      </div>
    </PageTransition>
  );
}