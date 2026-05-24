import { useRef, useState } from 'react';
import { Button, Upload, Select, Space, Alert, message } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Recipe, RecipeStep } from '@shared/types';
import { useRecipeStore } from '../../stores/recipeStore';
import PermissionGuard from '../common/PermissionGuard';

interface ValidationError {
  line: number;
  message: string;
}

function parseImportContent(content: string): { recipes: Partial<Recipe>[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const results: Partial<Recipe>[] = [];

  try {
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed) ? parsed : [parsed];

    items.forEach((item: Record<string, unknown>, index: number) => {
      const lineErrors: string[] = [];

      if (!item.name || typeof item.name !== 'string') {
        lineErrors.push('缺少名称 (name)');
      }

      let steps: RecipeStep[] = [];
      if (item.steps && Array.isArray(item.steps)) {
        steps = item.steps as RecipeStep[];
        steps.forEach((step: RecipeStep, si: number) => {
          if (!step.controlMode || !['temperature', 'power'].includes(step.controlMode)) {
            lineErrors.push(`步骤 ${si + 1}: 无效的 controlMode`);
          }
          if (step.runTime === undefined || step.runTime < 0) {
            lineErrors.push(`步骤 ${si + 1}: runTime 无效`);
          }
        });
      }

      if (lineErrors.length > 0) {
        errors.push({ line: index + 1, message: lineErrors.join('; ') });
      } else {
        results.push({
          name: item.name as string,
          number: (item.number as number) || 0,
          steps,
          totalSteps: steps.length,
        });
      }
    });
  } catch {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      errors.push({ line: 0, message: 'CSV 文件为空或格式不正确' });
      return { recipes: [], errors };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const numberIdx = headers.indexOf('number');
    const stepsIdx = headers.indexOf('steps');

    if (nameIdx < 0) {
      errors.push({ line: 0, message: 'CSV 缺少 name 列' });
      return { recipes: [], errors };
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const lineErrors: string[] = [];

      if (!values[nameIdx]) {
        lineErrors.push('缺少名称');
      }

      let steps: RecipeStep[] = [];
      if (stepsIdx >= 0 && values[stepsIdx]) {
        try {
          steps = JSON.parse(values[stepsIdx]);
        } catch {
          lineErrors.push('steps JSON 解析失败');
        }
      }

      if (lineErrors.length > 0) {
        errors.push({ line: i + 1, message: lineErrors.join('; ') });
      } else {
        results.push({
          name: values[nameIdx],
          number: numberIdx >= 0 ? parseInt(values[numberIdx], 10) || 0 : 0,
          steps,
          totalSteps: steps.length,
        });
      }
    }
  }

  return { recipes: results, errors };
}

function RecipeImportExport() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportRecipeId, setExportRecipeId] = useState<string | undefined>();
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importErrors, setImportErrors] = useState<ValidationError[]>([]);

  const recipes = useRecipeStore((state) => state.recipes);
  const addRecipe = useRecipeStore((state) => state.addRecipe);
  const loadRecipes = useRecipeStore((state) => state.loadRecipes);
  const exportRecipes = useRecipeStore((state) => state.exportRecipes);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const { recipes: parsed, errors } = parseImportContent(content);

      if (errors.length > 0) {
        setImportErrors(errors);
        return;
      }

      if (parsed.length === 0) {
        setImportErrors([{ line: 0, message: '未解析到任何有效配方' }]);
        return;
      }

      let added = 0;
      const now = new Date().toISOString();
      for (const entry of parsed) {
        if (entry.name) {
          const recipe: Recipe = {
            id: crypto.randomUUID(),
            name: entry.name,
            number: entry.number || 0,
            steps: entry.steps || [],
            totalSteps: entry.totalSteps || entry.steps?.length || 0,
            status: 'ready',
            createdAt: now,
            updatedAt: now,
          };
          await addRecipe(recipe);
          added++;
        }
      }

      message.success(t('recipe.importSuccess', { count: added }));
      await loadRecipes();
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    if (!exportRecipeId) {
      message.warning(t('recipe.selectRecipeToExport'));
      return;
    }
    exportRecipes(exportRecipeId, exportFormat);
    message.success(t('recipe.exportSuccess'));
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <PermissionGuard requiredRole="engineer">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Button
          block
          icon={<UploadOutlined />}
          onClick={handleImportClick}
        >
          {t('recipe.import')}
        </Button>
      </PermissionGuard>

      {importErrors.length > 0 && (
        <Alert
          type="error"
          closable
          onClose={() => setImportErrors([])}
          message={t('recipe.importError')}
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {importErrors.map((err, i) => (
                <li key={i}>
                  行 {err.line}: {err.message}
                </li>
              ))}
            </ul>
          }
        />
      )}

      <PermissionGuard requiredRole="engineer">
        <Select
          placeholder={t('recipe.selectRecipeToExport')}
          value={exportRecipeId}
          onChange={setExportRecipeId}
          options={recipes.map((r) => ({ value: r.id, label: r.name }))}
          style={{ width: '100%' }}
          allowClear
        />
        <Select
          value={exportFormat}
          onChange={setExportFormat}
          style={{ width: '100%' }}
          options={[
            { value: 'json', label: 'JSON' },
            { value: 'csv', label: 'CSV' },
          ]}
        />
        <Button
          block
          icon={<DownloadOutlined />}
          onClick={handleExport}
          disabled={!exportRecipeId}
        >
          {t('recipe.export')}
        </Button>
      </PermissionGuard>
    </Space>
  );
}

export default RecipeImportExport;