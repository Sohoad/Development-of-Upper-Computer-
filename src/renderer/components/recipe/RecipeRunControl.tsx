import { useState } from 'react';
import { Button, Space, InputNumber, Typography, Card } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  StepForwardOutlined,
  ForwardOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useRecipeStore } from '../../stores/recipeStore';
import PermissionGuard from '../common/PermissionGuard';

const { Text } = Typography;

function RecipeRunControl() {
  const { t } = useTranslation();
  const selectedRecipe = useRecipeStore((state) => state.selectedRecipe);
  const isRunning = useRecipeStore((state) => state.isRunning);
  const startRecipe = useRecipeStore((state) => state.startRecipe);
  const pauseRecipe = useRecipeStore((state) => state.pauseRecipe);
  const stopRecipe = useRecipeStore((state) => state.stopRecipe);
  const jumpToStep = useRecipeStore((state) => state.jumpToStep);
  const singleStep = useRecipeStore((state) => state.singleStep);

  const [jumpStepNo, setJumpStepNo] = useState<number | null>(1);

  const currentStep = 1;
  const totalSteps = selectedRecipe?.totalSteps ?? 0;
  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  if (!selectedRecipe) {
    return null;
  }

  return (
    <PermissionGuard requiredRole="engineer">
      <Card size="small" title={t('recipe.runControl')}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong>{t('recipe.currentStep')}:</Text>
            <Text>
              {currentStep} / {totalSteps}
            </Text>
            <div
              style={{
                flex: 1,
                height: 6,
                backgroundColor: '#f0f0f0',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: '#1890ff',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>

          <Space size={8}>
            {!isRunning ? (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={startRecipe}
              >
                {t('recipe.start')}
              </Button>
            ) : (
              <Button icon={<PauseCircleOutlined />} onClick={pauseRecipe}>
                {t('recipe.pause')}
              </Button>
            )}
            <Button
              danger
              icon={<StopOutlined />}
              onClick={stopRecipe}
              disabled={!isRunning && selectedRecipe.status !== 'paused'}
            >
              {t('recipe.stop')}
            </Button>
            <Button
              icon={<StepForwardOutlined />}
              onClick={singleStep}
              disabled={!isRunning}
            >
              {t('recipe.singleStep')}
            </Button>
          </Space>

          <Space size={8}>
            <Text>{t('recipe.jumpStep')}:</Text>
            <InputNumber
              size="small"
              min={1}
              max={totalSteps}
              value={jumpStepNo}
              onChange={(val) => setJumpStepNo(val)}
              style={{ width: 70 }}
            />
            <Button
              size="small"
              icon={<ForwardOutlined />}
              onClick={() => {
                if (jumpStepNo) jumpToStep(jumpStepNo);
              }}
              disabled={!isRunning || jumpStepNo === null}
            >
              {t('recipe.jump')}
            </Button>
          </Space>

          <div>
            <Text type="secondary">
              {t('recipe.status')}: {t(`recipe.status.${selectedRecipe.status}`)}
            </Text>
          </div>
        </Space>
      </Card>
    </PermissionGuard>
  );
}

export default RecipeRunControl;