import { useEffect } from 'react';
import { Typography, Row, Col, Card } from 'antd';
import { useTranslation } from 'react-i18next';
import { PageTransition } from '../components/common';
import {
  RecipeList,
  RecipeStepEditor,
  RecipeImportExport,
  RecipeRunControl,
} from '../components/recipe';
import { useRecipeStore } from '../stores/recipeStore';
import { useResponsive } from '../hooks/useResponsive';

const { Title } = Typography;

function RecipePage() {
  const { t } = useTranslation();
  const loadRecipes = useRecipeStore((state) => state.loadRecipes);
  const { isMobile } = useResponsive();

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  return (
    <PageTransition direction="slide-right">
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: isMobile ? 16 : 24,
          gap: isMobile ? 8 : 0,
        }}
      >
        <Title level={3} style={{ margin: 0, fontSize: isMobile ? 18 : undefined }}>
          {t('recipe.title')}
        </Title>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card className="card-hover" title={t('recipe.recipeList')} size={isMobile ? 'small' : 'small'}>
            <RecipeList />
            <div style={{ marginTop: 16 }}>
              <RecipeImportExport />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card className="card-hover" title={t('recipe.stepEditor')} size="small">
            <RecipeStepEditor />
          </Card>
          <div style={{ marginTop: 16 }}>
            <RecipeRunControl />
          </div>
        </Col>
      </Row>
    </PageTransition>
  );
}

export default RecipePage;