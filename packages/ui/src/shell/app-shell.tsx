import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Drawer,
  Grid,
  Layout,
  Menu,
  Space,
  Typography,
} from '@arco-design/web-react';
import {
  IconApps,
  IconDashboard,
  IconMenuFold,
  IconPoweroff,
  IconSafe,
  IconSettings,
} from '@arco-design/web-react/icon';
import { ADMIN_SUBTITLE, AdminMenuItem } from '@config';

const { Header, Content, Sider } = Layout;

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <IconDashboard />,
  auth: <IconSafe />,
  cars: <IconApps />,
  openclaw: <IconSettings />,
};

export function AppShell({
  brand,
  currentPath,
  menus,
  userLabel,
  onLogout,
  onNavigate,
  children,
}: {
  brand: string;
  currentPath: string;
  menus: AdminMenuItem[];
  userLabel: string;
  onLogout: () => Promise<void>;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const breakpoints = Grid.useBreakpoint();
  const isMobile = !breakpoints.md;
  const selectedKey = useMemo(
    () => menus.find((menu) => currentPath.startsWith(menu.path))?.key || 'dashboard',
    [currentPath, menus],
  );

  const menuNode = (
    <Menu
      selectedKeys={[selectedKey]}
      onClickMenuItem={(key: string) => {
        const target = menus.find((menu) => menu.key === key);
        if (target) {
          onNavigate(target.path);
          setMobileOpen(false);
        }
      }}
      style={{ width: '100%', borderRight: 0 }}
    >
      {menus
        .filter((menu) => !isMobile || menu.mobileVisible)
        .map((menu) => (
          <Menu.Item key={menu.key}>
            <Space>
              {iconMap[menu.icon] || <IconDashboard />}
              {menu.label}
            </Space>
          </Menu.Item>
        ))}
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          visible={mobileOpen}
          width={280}
          title={brand}
          footer={null}
          onCancel={() => setMobileOpen(false)}
          unmountOnExit
        >
          {menuNode}
        </Drawer>
      ) : (
        <Sider
          width={240}
          style={{
            background: 'rgba(255,255,255,0.92)',
            borderRight: '1px solid var(--himark-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ padding: 24 }}>
            <Typography.Title heading={5} style={{ marginBottom: 6 }}>
              {brand}
            </Typography.Title>
            <Typography.Text type="secondary">{ADMIN_SUBTITLE}</Typography.Text>
          </div>
          {menuNode}
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            height: 68,
            padding: '0 20px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            {isMobile && (
              <Button
                shape="circle"
                icon={<IconMenuFold />}
                onClick={() => setMobileOpen(true)}
              />
            )}
            <div>
              <Typography.Title heading={6} style={{ marginBottom: 4 }}>
                {brand}
              </Typography.Title>
              <Typography.Text type="secondary">统一入口 · 子应用可插拔接入</Typography.Text>
            </div>
          </Space>
          <Space size={16}>
            <Avatar style={{ backgroundColor: 'var(--himark-primary)' }}>
              {userLabel.slice(0, 1).toUpperCase()}
            </Avatar>
            {!isMobile && <Typography.Text>{userLabel}</Typography.Text>}
            <Button icon={<IconPoweroff />} status="danger" type="outline" onClick={() => void onLogout()}>
              退出
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: isMobile ? 16 : 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
