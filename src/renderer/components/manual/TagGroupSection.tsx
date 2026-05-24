import { Collapse, Typography, Empty } from 'antd';
import type { TagConfig, TagValue } from '@shared/types';
import { useTranslation } from 'react-i18next';
import TagControlItem from './TagControlItem';

const { Text } = Typography;

interface TagGroupSectionProps {
  title: string;
  tags: TagConfig[];
  tagValues: Map<string, TagValue>;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  disabled: boolean;
}

function TagGroupSection({
  title,
  tags,
  tagValues,
  isCollapsible = true,
  defaultCollapsed = false,
  disabled,
}: TagGroupSectionProps) {
  const { t } = useTranslation();

  if (tags.length === 0) {
    return null;
  }

  const content = (
    <div>
      {tags.map((tag) => (
        <TagControlItem
          key={tag.name}
          tag={tag}
          tagValue={tagValues.get(tag.name)}
          disabled={disabled}
        />
      ))}
    </div>
  );

  if (!isCollapsible) {
    return (
      <div style={{ marginBottom: 16 }}>
        <Text
          strong
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 15,
            padding: '8px 12px',
            background: '#fafafa',
            borderRadius: 4,
          }}
        >
          {title}
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            ({tags.length})
          </Text>
        </Text>
        <div
          style={{
            background: '#fff',
            borderRadius: 4,
            padding: '0 12px',
            border: '1px solid #f0f0f0',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <Collapse
      style={{ marginBottom: 16 }}
      defaultActiveKey={defaultCollapsed ? [] : [title]}
      items={[
        {
          key: title,
          label: (
            <span>
              {title}
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                ({tags.length})
              </Text>
            </span>
          ),
          children: content,
        },
      ]}
    />
  );
}

export default TagGroupSection;