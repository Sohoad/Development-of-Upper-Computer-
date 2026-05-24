import { Table, Tag, Button, Space, Popconfirm, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import type { Recipe } from '@shared/types';
import { useRecipeStore } from '../../stores/recipeStore';
import PermissionGuard from '../common/PermissionGuard';

const { Text } = Typography;

const StatusColorMap: Record<Recipe['status'], string> = {
  ready: 'blue',
  running: 'green',
  paused: 'orange',
  completed: 'gray',
};

interface RecipeListProps {
  onEditRecipe?: (recipe: Recipe) => void;
}

function RecipeList({ onEditRecipe }: RecipeListProps) {
  const { t } = useTranslation();
  const recipes = useRecipeStore((state) => state.recipes);
  const selectedRecipe = useRecipeStore((state) => state.selectedRecipe);
  const selectRecipe = useRecipeStore((state) => state.selectRecipe);
  const deleteRecipe = useRecipeStore((state) => state.deleteRecipe);
  const exportRecipes = useRecipeStore((state) => state.exportRecipes);

  const handleDelete = (id: string) => {
    deleteRecipe(id);
  };

  const columns: ColumnsType<Recipe> = [
    {
      title: t('recipe.recipeName'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t('recipe.number'),
      dataIndex: 'number',
      key: 'number',
      sorter: (a, b) => a.number - b.number,
    },
    {
      title: t('recipe.totalSteps'),
      dataIndex: 'totalSteps',
      key: 'totalSteps',
      sorter: (a, b) => a.totalSteps - b.totalSteps,
    },
    {
      title: t('recipe.statusLabel'),
      dataIndex: 'status',
      key: 'status',
      render: (status: Recipe['status']) => (
        <Tag color={StatusColorMap[status]}>{t(`recipe.status.${status}`)}</Tag>
      ),
    },
    {
      title: t('recipe.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => <Text>{new Date(val).toLocaleDateString()}</Text>,
    },
    {
      title: t('recipe.action'),
      key: 'action',
      render: (_: unknown, record: Recipe) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditRecipe?.(record)}
          >
            {t('recipe.edit')}
          </Button>
          <PermissionGuard requiredRole="engineer">
            <Popconfirm
              title={t('recipe.deleteConfirm')}
              onConfirm={() => handleDelete(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                {t('recipe.delete')}
              </Button>
            </Popconfirm>
          </PermissionGuard>
          <PermissionGuard requiredRole="engineer">
            <Button
              type="link"
              size="small"
              icon={<ExportOutlined />}
              onClick={() => exportRecipes(record.id, 'json')}
            >
              {t('recipe.export')}
            </Button>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <Table<Recipe>
        columns={columns}
        dataSource={recipes}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 600 }}
        rowClassName={(record) =>
          record.id === selectedRecipe?.id ? 'ant-table-row-selected' : ''
        }
        onRow={(record) => ({
          onClick: () => selectRecipe(record.id),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
}

export default RecipeList;