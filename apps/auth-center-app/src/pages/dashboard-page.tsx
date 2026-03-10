import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Grid,
  Input,
  List,
  Message,
  Space,
  Table,
  Typography,
} from '@arco-design/web-react';
import IconCheckCircle from '@arco-design/web-react/icon/react-icon/IconCheckCircle';
import IconExclamationCircle from '@arco-design/web-react/icon/react-icon/IconExclamationCircle';
import IconLink from '@arco-design/web-react/icon/react-icon/IconLink';
import IconPlus from '@arco-design/web-react/icon/react-icon/IconPlus';
import { Link } from 'react-router-dom';
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusBadge, useMobile } from '@ui';
import {
  DashboardResponse,
  createUser,
  getDashboard,
  setAppAuthorizationEnabled,
  setUserEnabled,
} from '../api/auth-center';

const Row = Grid.Row;
const Col = Grid.Col;

export function AuthCenterDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const isMobile = useMobile();
  const [form] = Form.useForm();

  const reload = async () => {
    setLoading(true);
    try {
      const next = await getDashboard();
      setData(next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const todoItems = useMemo(() => {
    if (!data) {
      return [];
    }
    return [
      {
        title: '待开启 personal 授权',
        value: data.summary.pendingPersonalAuthorizations,
        description:
          data.summary.pendingPersonalAuthorizations > 0
            ? '这些用户目前无法发起 personal user-scope 授权。'
            : '所有已接入用户都已具备 personal 授权记录。',
      },
      {
        title: '待处理 token 异常',
        value: data.summary.tokenIssues,
        description:
          data.summary.tokenIssues > 0
            ? '存在 token 缺失、过期或需要重新授权的用户。'
            : '当前没有需要管理员介入的 token 异常。',
      },
      {
        title: '禁用但仍有绑定',
        value: data.summary.disabledUsersWithBindings,
        description:
          data.summary.disabledUsersWithBindings > 0
            ? '这些用户已禁用，但仍保留平台映射或授权配置。'
            : '禁用用户与已有绑定关系没有异常积压。',
      },
    ];
  }, [data]);

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <PageHeader
        title="授权中心"
        description="先总览全局状态，再定位待处理用户，最后进入详情页执行授权与 token 控制。"
        extra={
          <Space wrap>
            <Button onClick={() => void reload()}>刷新数据</Button>
            <Button type="primary" icon={<IconPlus />} onClick={() => setDrawerVisible(true)}>
              添加用户
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <MetricCard title="启用用户" value={data?.summary.activeUsers ?? '-'} extra="当前允许与 OpenClaw 对话的用户" />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard title="平台账号映射" value={data?.summary.linkedPlatformAccounts ?? '-'} extra="已绑定的平台主体数量" />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard title="已开启 personal 授权" value={data?.summary.enabledPersonalAuthorizations ?? '-'} extra="允许读取个人数据的用户数" />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard title="待处理告警" value={data?.summary.openAlerts ?? '-'} extra="优先关注授权与刷新异常" />
        </Col>
      </Row>

      <SectionCard title="待处理事项" description="优先聚焦需要管理员介入的对象，而不是直接钻进大表格。">
        <Row gutter={[16, 16]}>
          {todoItems.map((item) => {
            const isHealthy = item.value === 0;
            return (
              <Col xs={24} md={8} key={item.title}>
                <Card bordered style={{ background: '#f9fbff', height: '100%' }}>
                  <Space align="start" size={12}>
                    {isHealthy ? (
                      <IconCheckCircle style={{ color: 'var(--himark-success)', fontSize: 20 }} />
                    ) : (
                      <IconExclamationCircle style={{ color: 'var(--himark-warning)', fontSize: 20 }} />
                    )}
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Typography.Text style={{ fontWeight: 600 }}>{item.title}</Typography.Text>
                      <Typography.Title heading={5} style={{ marginBottom: 0 }}>
                        {item.value}
                      </Typography.Title>
                      <Typography.Text type="secondary">{item.description}</Typography.Text>
                    </Space>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      </SectionCard>

      <SectionCard title="用户目录" description="这里只承担定位入口。具体授权、token 和审计动作统一进入用户详情页处理。">
        {!data || data.users.length === 0 ? (
          <EmptyState title="还没有可对话用户" description="先添加用户，再建立平台映射与 personal 授权。" />
        ) : isMobile ? (
          <List
            dataSource={data.users}
            render={(item: DashboardResponse['users'][number]) => {
              const authorization = item.personalAuthorizations[0];
              const needsAttention =
                !authorization ||
                !authorization.enabled ||
                authorization.status === 'expired' ||
                authorization.status === 'reauthorization_required' ||
                !authorization.hasToken;
              return (
                <Card bordered style={{ marginBottom: 12, background: '#fbfcff' }}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <Typography.Text style={{ fontWeight: 600 }}>{item.displayName || item.username}</Typography.Text>
                        <br />
                        <Typography.Text type="secondary">{item.username}</Typography.Text>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <Descriptions column={1} colon=" :" size="small">
                      <Descriptions.Item label="平台映射">{item.platformAccounts.length}</Descriptions.Item>
                      <Descriptions.Item label="personal 授权">
                        {authorization ? (authorization.enabled ? '已开启' : '已关闭') : '未配置'}
                      </Descriptions.Item>
                      <Descriptions.Item label="token 状态">
                        {authorization ? <StatusBadge status={authorization.hasToken ? authorization.status : 'missing'} /> : '未配置'}
                      </Descriptions.Item>
                    </Descriptions>
                    {needsAttention ? (
                      <Typography.Text type="warning">该用户存在待处理授权或 token 状态。</Typography.Text>
                    ) : null}
                    <Space wrap>
                      <Link to={`/auth-center/users/${item.id}`}>
                        <Button type="primary">查看详情</Button>
                      </Link>
                      <Button
                        status={item.status === 'active' ? 'warning' : 'success'}
                        onClick={() =>
                          void (async () => {
                            await setUserEnabled(item.id, item.status !== 'active');
                            Message.success(item.status === 'active' ? '已禁用用户' : '已启用用户');
                            await reload();
                          })()
                        }
                      >
                        {item.status === 'active' ? '禁用用户' : '启用用户'}
                      </Button>
                    </Space>
                  </Space>
                </Card>
              );
            }}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            data={data.users}
            pagination={false}
            columns={[
              {
                title: '用户',
                render: (_: unknown, record: DashboardResponse['users'][number]) => (
                  <Space direction="vertical" size={4}>
                    <Link to={`/auth-center/users/${record.id}`}>
                      <Typography.Text style={{ color: 'var(--himark-primary)', fontWeight: 600 }}>
                        {record.displayName || record.username}
                      </Typography.Text>
                    </Link>
                    <Typography.Text type="secondary">{record.username}</Typography.Text>
                  </Space>
                ),
              },
              {
                title: '对话准入',
                render: (_: unknown, record: DashboardResponse['users'][number]) => <StatusBadge status={record.status} />,
              },
              {
                title: '平台映射',
                render: (_: unknown, record: DashboardResponse['users'][number]) =>
                  record.platformAccounts.length > 0 ? (
                    <Space direction="vertical" size={6}>
                      {record.platformAccounts.map((account) => (
                        <div key={account.id}>
                          <Typography.Text style={{ fontWeight: 500 }}>{account.provider.displayName}</Typography.Text>
                          <Typography.Text type="secondary">
                            {' '}
                            · {account.displayName || account.externalSubjectId}
                          </Typography.Text>
                        </div>
                      ))}
                    </Space>
                  ) : (
                    <Typography.Text type="secondary">暂无映射</Typography.Text>
                  ),
              },
              {
                title: 'personal 授权',
                render: (_: unknown, record: DashboardResponse['users'][number]) => {
                  const authorization = record.personalAuthorizations[0];
                  return authorization ? (
                    <Space direction="vertical" size={4}>
                      <StatusBadge status={authorization.enabled ? 'enabled' : 'disabled'} />
                      <Typography.Text type="secondary">
                        {authorization.enabled ? '允许 personal user-scope' : '当前不会发起 personal 授权'}
                      </Typography.Text>
                    </Space>
                  ) : (
                    <Typography.Text type="secondary">未配置</Typography.Text>
                  );
                },
              },
              {
                title: 'token 状态',
                render: (_: unknown, record: DashboardResponse['users'][number]) => {
                  const authorization = record.personalAuthorizations[0];
                  if (!authorization) {
                    return <Typography.Text type="secondary">未配置</Typography.Text>;
                  }
                  return <StatusBadge status={authorization.hasToken ? authorization.status : 'missing'} />;
                },
              },
              {
                title: '操作',
                width: 220,
                render: (_: unknown, record: DashboardResponse['users'][number]) => (
                  <Space wrap>
                    <Link to={`/auth-center/users/${record.id}`}>
                      <Button type="primary">详情</Button>
                    </Link>
                    <Button
                      status={record.status === 'active' ? 'warning' : 'success'}
                      onClick={() =>
                        void (async () => {
                          await setUserEnabled(record.id, record.status !== 'active');
                          Message.success(record.status === 'active' ? '已禁用用户' : '已启用用户');
                          await reload();
                        })()
                      }
                    >
                      {record.status === 'active' ? '禁用用户' : '启用用户'}
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <SectionCard title="全局 App 授权" description="这里管理系统级共享能力，与个人 user token 生命周期分开。">
            {!data || data.appAuthorizations.length === 0 ? (
              <EmptyState title="暂无全局 App 授权" description="先启用 Feishu App 授权，供机器人和系统级能力使用。" />
            ) : (
              <List
                dataSource={data.appAuthorizations}
                render={(item: DashboardResponse['appAuthorizations'][number]) => (
                  <List.Item
                    key={item.id}
                    actionLayout="vertical"
                    actions={[
                      <Button
                        key="toggle"
                        status={item.enabled ? 'warning' : 'success'}
                        onClick={() =>
                          void (async () => {
                            await setAppAuthorizationEnabled(item.provider.type.toLowerCase(), !item.enabled);
                            Message.success(item.enabled ? '已关闭 App 授权' : '已启用 App 授权');
                            await reload();
                          })()
                        }
                      >
                        {item.enabled ? '关闭' : '启用'}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${item.provider.displayName} · ${item.accountKey}`}
                      description={
                        <Space direction="vertical" size={6}>
                          <StatusBadge status={item.status} />
                          <Typography.Text type="secondary">
                            {item.enabled ? '当前可供系统级能力直接调用' : '当前不会参与任何系统级能力调用'}
                          </Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </SectionCard>
        </Col>

        <Col xs={24} xl={12}>
          <SectionCard title="最近告警" description="只保留高优先级异常的快速视图，便于先发现问题。">
            {!data || data.alerts.length === 0 ? (
              <EmptyState title="暂无告警" description="当前没有授权或刷新相关异常。" />
            ) : (
              <List
                dataSource={data.alerts}
                render={(item: DashboardResponse['alerts'][number]) => (
                  <List.Item key={item.id}>
                    <List.Item.Meta
                      title={
                        <Space>
                          <StatusBadge status={item.status} />
                          <Typography.Text>{item.kind}</Typography.Text>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Typography.Text>{item.message}</Typography.Text>
                          <Typography.Text type="secondary">{new Date(item.createdAt).toLocaleString()}</Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="最近授权事件" description="用于确认最近发生的授权、刷新、禁用或 token 管理动作。">
        {!data || data.events.length === 0 ? (
          <EmptyState title="暂无事件" description="执行授权开关或 token 控制后，这里会记录操作轨迹。" />
        ) : (
          <List
            dataSource={data.events}
            render={(item: DashboardResponse['events'][number]) => (
              <List.Item key={item.id}>
                <List.Item.Meta
                  avatar={<IconLink style={{ color: 'var(--himark-primary)' }} />}
                  title={item.type}
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text>{item.message}</Typography.Text>
                      <Typography.Text type="secondary">{new Date(item.createdAt).toLocaleString()}</Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </SectionCard>

      <Drawer
        title="添加用户"
        width={isMobile ? '100%' : 420}
        visible={drawerVisible}
        footer={null}
        onCancel={() => setDrawerVisible(false)}
        unmountOnExit
      >
        <Typography.Paragraph type="secondary">
          用户目录决定谁可以与 OpenClaw 对话。平台映射与 personal 授权可以在用户详情页继续补齐。
        </Typography.Paragraph>
        <Form
          form={form}
          layout="vertical"
          onSubmit={async (values: { username: string; display_name?: string }) => {
            await createUser(values);
            Message.success('已添加用户');
            form.resetFields();
            setDrawerVisible(false);
            await reload();
          }}
        >
          <Form.Item field="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="例如 mark" />
          </Form.Item>
          <Form.Item field="display_name" label="显示名">
            <Input placeholder="例如 马超" />
          </Form.Item>
          <Button type="primary" htmlType="submit" long>
            确认添加
          </Button>
        </Form>
      </Drawer>
    </Space>
  );
}
