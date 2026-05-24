import { useState, useEffect } from 'react';
import { Table, Button, Select, InputNumber, Space, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import type { RecipeStep, Recipe } from '@shared/types';
import { useRecipeStore } from '../../stores/recipeStore';

const { Text } = Typography;

function RecipeStepEditor() {
  const { t } = useTranslation();
  const selectedRecipe = useRecipeStore((state) => state.selectedRecipe);
  const updateRecipe = useRecipeStore((state) => state.updateRecipe);
  const [steps, setSteps] = useState<RecipeStep[]>([]);

  useEffect(() => {
    if (selectedRecipe) {
      setSteps([...selectedRecipe.steps]);
    } else {
      setSteps([]);
    }
  }, [selectedRecipe]);

  const updateStep = (stepNo: number, field: keyof RecipeStep, value: unknown) => {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.stepNo !== stepNo) return step;

        const updated = { ...step, [field]: value };

        if (field === 'controlMode') {
          if (value === 'temperature') {
            delete updated.powerSet;
            delete updated.pressureSet;
            delete updated.pressureUnit;
          } else {
            delete updated.setTemp;
          }
        }

        return updated;
      })
    );
  };

  const addStep = () => {
    const newStepNo = steps.length > 0 ? Math.max(...steps.map((s) => s.stepNo)) + 1 : 1;
    setSteps((prev) => [
      ...prev,
      {
        stepNo: newStepNo,
        runTime: 0,
        timeUnit: 'second',
        controlMode: 'temperature',
        setTemp: 0,
      },
    ]);
  };

  const deleteStep = (stepNo: number) => {
    setSteps((prev) => prev.filter((s) => s.stepNo !== stepNo));
  };

  const saveSteps = () => {
    if (!selectedRecipe) return;
    updateRecipe(selectedRecipe.id, {
      steps,
      totalSteps: steps.length,
    });
  };

  const controlModeColumn = (step: RecipeStep) => {
    if (step.controlMode === 'temperature') {
      return (
        <InputNumber
          size="small"
          min={0}
          value={step.setTemp ?? 0}
          onChange={(val) => updateStep(step.stepNo, 'setTemp', val ?? 0)}
          addonAfter="℃"
          style={{ width: '100%' }}
        />
      );
    }
    return (
      <Space size={4}>
        <InputNumber
          size="small"
          min={0}
          max={100}
          value={step.powerSet ?? 0}
          onChange={(val) => updateStep(step.stepNo, 'powerSet', val ?? 0)}
          addonAfter="%"
          style={{ width: 100 }}
        />
        <InputNumber
          size="small"
          min={0}
          value={step.pressureSet ?? 0}
          onChange={(val) => updateStep(step.stepNo, 'pressureSet', val ?? 0)}
          style={{ width: 100 }}
        />
        <Select
          size="small"
          value={step.pressureUnit ?? 'Pa'}
          onChange={(val) => updateStep(step.stepNo, 'pressureUnit', val)}
          style={{ width: 80 }}
          options={[
            { value: 'Pa', label: 'Pa' },
            { value: 'mBar', label: 'mBar' },
          ]}
        />
      </Space>
    );
  };

  const columns: ColumnsType<RecipeStep> = [
    {
      title: '#',
      dataIndex: 'stepNo',
      key: 'stepNo',
      width: 50,
      render: (_: unknown, __: RecipeStep, index: number) => index + 1,
    },
    {
      title: t('recipe.runTime'),
      dataIndex: 'runTime',
      key: 'runTime',
      width: 130,
      render: (_: unknown, record: RecipeStep) => (
        <InputNumber
          size="small"
          min={0}
          value={record.runTime}
          onChange={(val) => updateStep(record.stepNo, 'runTime', val ?? 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: t('recipe.timeUnit'),
      dataIndex: 'timeUnit',
      key: 'timeUnit',
      width: 110,
      render: (_: unknown, record: RecipeStep) => (
        <Select
          size="small"
          value={record.timeUnit}
          onChange={(val) => updateStep(record.stepNo, 'timeUnit', val)}
          style={{ width: '100%' }}
          options={[
            { value: 'second', label: t('recipe.second') },
            { value: 'minute', label: t('recipe.minute') },
          ]}
        />
      ),
    },
    {
      title: t('recipe.controlMode'),
      dataIndex: 'controlMode',
      key: 'controlMode',
      width: 130,
      render: (_: unknown, record: RecipeStep) => (
        <Select
          size="small"
          value={record.controlMode}
          onChange={(val) => updateStep(record.stepNo, 'controlMode', val)}
          style={{ width: '100%' }}
          options={[
            { value: 'temperature', label: t('recipe.temperature') },
            { value: 'power', label: t('recipe.power') },
          ]}
        />
      ),
    },
    {
      title: t('recipe.setTemp'),
      key: 'tempOrPower',
      render: (_: unknown, record: RecipeStep) => controlModeColumn(record),
    },
    {
      title: t('recipe.action'),
      key: 'action',
      width: 60,
      render: (_: unknown, record: RecipeStep) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => deleteStep(record.stepNo)}
        />
      ),
    },
  ];

  if (!selectedRecipe) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 200,
        }}
      >
        <Text type="secondary">{t('recipe.selectRecipeHint')}</Text>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text strong>
          {t('recipe.editingSteps')}: {selectedRecipe.name}
        </Text>
        <Space>
          <Button size="small" icon={<PlusOutlined />} onClick={addStep}>
            {t('recipe.addStep')}
          </Button>
          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveSteps}>
            {t('recipe.saveSteps')}
          </Button>
        </Space>
      </div>
      <Table<RecipeStep>
        columns={columns}
        dataSource={steps.map((s, idx) => ({ ...s, key: s.stepNo || idx }))}
        rowKey="stepNo"
        size="small"
        pagination={false}
        scroll={{ y: 300 }}
      />
    </div>
  );
}

export default RecipeStepEditor;