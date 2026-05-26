import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Tag, theme, Dropdown, Space } from 'antd';
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { useResponsive } from '../hooks/useResponsive';

const { Header, Sider, Content } = Layout;

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
  const { isMobile } = useResponsive();

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

  return (
    <Layout style={{ height: '100vh' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={200}
          collapsedWidth={60}
          trigger={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 40,
                color: themeToken.colorTextSecondary,
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
          }
          style={{
            background: themeToken.colorBgElevated,
            borderRight: `1px solid ${themeToken.colorBorderSecondary}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            }}
          >
            <ApiOutlined
              style={{
                fontSize: collapsed ? 18 : 24,
                color: themeToken.colorPrimary,
              }}
            />
            {!collapsed && (
              <span
                style={{
                  color: themeToken.colorPrimary,
                  fontWeight: 700,
                  fontSize: 15,
                  marginLeft: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                HMI System
              </span>
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
              marginTop: 4,
              flex: 1,
            }}
          />
          {collapsed ? (
            <div
              style={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderTop: `1px solid ${themeToken.colorBorderSecondary}`,
                fontSize: 10,
                color: themeToken.colorTextTertiary,
                lineHeight: '14px',
                textAlign: 'center',
                padding: '0 2px',
              }}
            >
              <ApiOutlined style={{ fontSize: 14, color: themeToken.colorPrimary }} />
            </div>
          ) : (
            <div
              style={{
                height: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderTop: `1px solid ${themeToken.colorBorderSecondary}`,
                fontSize: 10,
                color: themeToken.colorTextTertiary,
                lineHeight: '16px',
                padding: '4px 8px',
              }}
            >
              <span>HMI System</span>
              <span>工业人机界面监控系统</span>
            </div>
          )}
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            background: themeToken.colorBgElevated,
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 16px',
            height: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag
              color={connected ? 'green' : 'red'}
              style={{
                fontSize: 10,
                lineHeight: '16px',
                padding: '0 6px',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: connected ? '#52c41a' : '#ff4d4f',
                }}
              />
              {connected ? 'Electron' : '浏览器'}
            </Tag>
            {isAuthenticated && currentUser && (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: 'pointer', color: themeToken.colorText, gap: 4 }}>
                  <UserOutlined style={{ fontSize: 12 }} />
                  {currentUser.username && (
                    <span style={{ fontSize: 12, color: themeToken.colorText }}>
                      {currentUser.username}
                    </span>
                  )}
                  <Tag
                    color={
                      currentUser.role === 'admin' ? 'red' :
                      currentUser.role === 'engineer' ? 'blue' : 'green'
                    }
                    style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px', margin: 0 }}
                  >
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
            margin: 8,
            padding: 8,
            background: themeToken.colorBgContainer,
            borderRadius: themeToken.borderRadius,
            overflow: 'auto',
            height: '100%',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;