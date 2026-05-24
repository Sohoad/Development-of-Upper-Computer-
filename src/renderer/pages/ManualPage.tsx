import { useState, useMemo, useCallback } from 'react';
import { Typography, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { usePLCStore } from '../stores/plcStore';
import { PageTransition } from '../components/common';
import { TagSearchBar, TagGroupSection } from '../components/manual';
import { useResponsive } from '../hooks/useResponsive';

const { Title } = Typography;

function ManualPage() {
  const { t } = useTranslation();
  const tags = usePLCStore((state) => state.tags);
  const tagValues = usePLCStore((state) => state.tagValues);
  const connectionStatus = usePLCStore((state) => state.connectionStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const { isMobile } = useResponsive();

  const isConnected = connectionStatus.connected;

  const filterBySearch = useCallback(
    (tagList: typeof tags) => {
      if (!searchQuery) return tagList;
      return tagList.filter(
        (tag) =>
          tag.name.toLowerCase().includes(searchQuery) ||
          tag.address.toLowerCase().includes(searchQuery),
      );
    },
    [searchQuery],
  );

  const ioTags = useMemo(
    () => filterBySearch(tags.filter((t) => t.area === 'I' || t.area === 'Q')),
    [tags, filterBySearch],
  );

  const dbTags = useMemo(
    () => filterBySearch(tags.filter((t) => t.area === 'DB')),
    [tags, filterBySearch],
  );

  const mTags = useMemo(
    () => filterBySearch(tags.filter((t) => t.area === 'M')),
    [tags, filterBySearch],
  );

  return (
    <PageTransition direction="slide-left">
      <Title level={3} style={{ marginBottom: isMobile ? 16 : 24, fontSize: isMobile ? 18 : undefined }}>
        {t('manual.title')}
      </Title>

      {!isConnected && (
        <Alert
          message={t('manual.notConnectedWarning')}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <TagSearchBar onSearch={setSearchQuery} />

      <TagGroupSection
        title={t('manual.ioArea')}
        tags={ioTags}
        tagValues={tagValues}
        disabled={!isConnected}
        defaultCollapsed={isMobile}
      />

      <TagGroupSection
        title={t('manual.dbArea')}
        tags={dbTags}
        tagValues={tagValues}
        disabled={!isConnected}
        defaultCollapsed={isMobile}
      />

      <TagGroupSection
        title={t('manual.mArea')}
        tags={mTags}
        tagValues={tagValues}
        disabled={!isConnected}
        defaultCollapsed={isMobile}
      />
    </PageTransition>
  );
}

export default ManualPage;