import { TagConfig } from '../../../shared/types';
import { TagControlItem } from './TagControlItem';

interface TagGroupSectionProps {
  group: string;
  tags: TagConfig[];
  onEdit?: (tag: TagConfig) => void;
  onDelete?: (name: string) => void;
  showActions?: boolean;
}

const GROUP_LABELS: Record<string, string> = {
  temperature: '温度监测',
  pressure: '压力监测',
  power: '功率监测',
  electrical: '电气参数',
  digital_input: '数字输入',
  digital_output: '数字输出',
  db_data: 'DB 数据块',
  custom: '自定义标签',
};

export function TagGroupSection({ group, tags, onEdit, onDelete, showActions }: TagGroupSectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 4,
        }}
      >
        {tags.map((tag) => (
          <TagControlItem
            key={tag.name}
            tag={tag}
            onEdit={onEdit}
            onDelete={onDelete}
            showActions={showActions}
          />
        ))}
      </div>
    </div>
  );
}