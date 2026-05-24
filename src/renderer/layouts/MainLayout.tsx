import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Tag, theme, Dropdown, Space } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  ExperimentOutlined,
  ToolOutlined,
  HistoryOutlined,
  ApiOutlined,
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { useResponsive } from '../hooks/useResponsive';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const SM_BREAKPOINT = 1280;
const LG_BREAKPOINT = 1920;

const baseMenuItems: MenuProps['items'] = [
  {
    key: '/monitor',
    icon: <DashboardOutlined />,
    label: '状态监控',
  },
  {
    key: '/recipe',
    icon: <ExperimentOutlined />,
    label: '配方控制',
  },
  {
    key: '/manual',
    icon: <ToolOutlined />,
    label: '手动控制',
  },
  {
    key: '/history',
    icon: <HistoryOutlined />,
    label: '历史图表',
  },
];

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [connected, setConnected] = useState(false);
  const { token: themeToken } = theme.useToken();
  const { currentUser, logout, isAuthenticated } = useAuthStore();
  const { breakpoint, isMobile } = useResponsive();

  const autoCollapse = useCallback(() => {
    const width = window.innerWidth;
    if (width < SM_BREAKPOINT) {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    autoCollapse();
    window.addEventListener('resize', autoCollapse);
    return () => window.removeEventListener('resize', autoCollapse);
  }, [autoCollapse]);

  useEffect(() => {
    if (window.electronAPI) {
      setConnected(true);
    }
  }, []);

  const selectedKey = '/' + location.pathname.split('/')[1];

  const menuItems: MenuProps['items'] = [...(baseMenuItems ?? [])];
  if (currentUser?.role === 'admin') {
    menuItems.push({
      key: '/users',
      icon: <TeamOutlined />,
      label: '用户管理',
    });
  }
  menuItems.push(
    { type: 'divider' },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const siderWidth = breakpoint === 'lg' ? 220 : breakpoint === 'md' ? 200 : 0;
  const contentPadding = breakpoint === 'lg' ? 24 : breakpoint === 'md' ? 16 : 12;
  const headerFontSize = breakpoint === 'lg' ? 18 : breakpoint === 'md' ? 16 : 14;

  return (
    <Layout style={{ height: '100vh' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={siderWidth}
          style={{
            background: themeToken.colorBgElevated,
            borderRight: `1px solid ${themeToken.colorBorderSecondary}`,
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            }}
          >
            <ApiOutlined
              style={{
                fontSize: collapsed ? 20 : 28,
                color: themeToken.colorPrimary,
              }}
            />
            {!collapsed && (
              <Text
                strong
                style={{
                  color: themeToken.colorPrimary,
                  fontSize: 16,
                  marginLeft: 10,
                  whiteSpace: 'nowrap',
                }}
              >
                HMI System
              </Text>
            )}
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{
              background: 'transparent',
              borderRight: 0,
              marginTop: 8,
            }}
          />
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            background: themeToken.colorBgElevated,
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${contentPadding}px`,
            height: 64,
          }}
        >
          <Text
            strong
            style={{ fontSize: headerFontSize, color: themeToken.colorText }}
          >
            工业人机界面监控系统
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag
              color={connected ? 'green' : 'red'}
              icon={
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: connected ? '#52c41a' : '#ff4d4f',
                    marginRight: 4,
                  }}
                />
              }
            >
              {connected ? 'Electron 已连接' : '浏览器模式'}
            </Tag>
            {isAuthenticated && currentUser && (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: 'pointer', color: themeToken.colorText }}>
                  <UserOutlined />
                  {!isMobile && (
                    <Text style={{ color: themeToken.colorText }}>
                      {currentUser.username}
                    </Text>
                  )}
                  <Tag color={
                    currentUser.role === 'admin' ? 'red' :
                    currentUser.role === 'engineer' ? 'blue' : 'green'
                  }>
                    {currentUser.role === 'admin' ? '管理员' :
                     currentUser.role === 'engineer' ? '工程师' : '操作员'}
                  </Tag>
                </Space>
              </Dropdown>
            )}
          </div>
        </Header>
        <Content
          style={{
            margin: isMobile ? 8 : 16,
            padding: contentPadding,
            background: themeToken.colorBgContainer,
            borderRadius: themeToken.borderRadius,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;