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
import {
  IconCheckCircle,
  IconExclamationCircle,
  IconLink,
  IconPlus,
  IconUser,
} from '@arco-design/web-react/icon';
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
    const noPersonal = data.users.filter((user: DashboardResponse['users'][number]) => user.personalAuthorizations.length === 0).length;
    const disabledUsers = data.users.filter((user: DashboardResponse['users'][number]) => user.status !== 'active').length;
    return [
      {
        title: '待完成个人授权',
        description: noPersonal > 0 ? `有 ${noPersonal} 位用户尚未配置 Feishu personal 授权。` : '所有已添加用户都已配置 personal 授权记录。',
        status: noPersonal > 0 ? 'warning' : 'done',
      },
      {
        title: '待关注用户状态',
        description: disabledUsers > 0 ? `当前有 ${disabledUsers} 位用户处于禁用状态。` : '所有用户当前都处于启用状态。',
        status: disabledUsers > 0 ? 'warning' : 'done',
      },
    ];
  }, [data]);

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <PageHeader
        title="授权中心"
        description="管理可对话用户、平台账号映射、Feishu personal 授权和全局 App 授权。对话准入与个人授权是两层能力。"
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
          <MetricCard title="启用用户" value={data?.summary.activeUsers ?? '-'} extra="可正常与 OpenClaw 对话的用户数" />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard title="平台账号映射" value={data?.summary.linkedPlatformAccounts ?? '-'} extra="已绑定的平台主体数量" />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard title="已启用 personal 授权" value={data?.summary.enabledPersonalAuthorizations ?? '-'} extra="开启个人数据能力的用户数" />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard title="待处理告警" value={data?.summary.openAlerts ?? '-'} extra="建议优先处理异常授权或刷新失败" />
        </Col>
      </Row>

      <SectionCard title="待处理事项" description="优先展示需要你关注的状态，避免只盯着大表格找问题。">
        <Row gutter={[16, 16]}>
          {todoItems.map((item) => (
            <Col xs={24} md={12} key={item.title}>
              <Card bordered style={{ background: '#f9fbff' }}>
                <Space align="start" size={12}>
                  {item.status === 'done' ? (
                    <IconCheckCircle style={{ color: 'var(--himark-success)', fontSize: 20 }} />
                  ) : (
                    <IconExclamationCircle style={{ color: 'var(--himark-warning)', fontSize: 20 }} />
                  )}
                  <div>
                    <Typography.Text style={{ fontWeight: 600 }}>{item.title}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary">{item.description}</Typography.Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>

      <SectionCard title="用户目录" description="只有已添加且已启用的用户，才允许与 OpenClaw 对话。">
        {!data || data.users.length === 0 ? (
          <EmptyState title="还没有可对话用户" description="先添加一个用户，并绑定对应的平台账号映射。" />
        ) : isMobile ? (
          <List
            dataSource={data.users}
            render={(item: DashboardResponse['users'][number]) => (
              <Card bordered style={{ marginBottom: 12, background: '#fbfcff' }}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <Typography.Text style={{ fontWeight: 600 }}>{item.displayName || item.username}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">{item.username}</Typography.Text>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <Descriptions column={1} colon=" :" size="small">
                    <Descriptions.Item label="超管">{item.isSuperAdmin ? '是' : '否'}</Descriptions.Item>
                    <Descriptions.Item label="平台账号">
                      {item.platformAccounts.length > 0 ? item.platformAccounts.map((account: DashboardResponse['users'][number]['platformAccounts'][number]) => (
                        <div key={account.id}>
                          {account.provider.displayName}：{account.displayName || account.externalSubjectId}
                        </div>
                      )) : '暂无'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Feishu personal">
                      {item.personalAuthorizations[0] ? (
                        <Space direction="vertical" size={4}>
                          <StatusBadge status={item.personalAuthorizations[0].status} />
                          <Typography.Text type="secondary">
                            {item.personalAuthorizations[0].enabled ? '已启用个人数据能力' : '已关闭个人数据能力'}
                          </Typography.Text>
                        </Space>
                      ) : (
                        '未配置'
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                  <Space wrap>
                    <Link to={`/auth-center/users/${item.id}`}>
                      <Button type="primary">查看详情</Button>
                    </Link>
                    <Button status={item.status === 'active' ? 'warning' : 'success'} onClick={() => void (async () => {
                      await setUserEnabled(item.id, item.status !== 'active');
                      Message.success(item.status === 'active' ? '已禁用用户' : '已启用用户');
                      await reload();
                    })()}>
                      {item.status === 'active' ? '禁用用户' : '启用用户'}
                    </Button>
                  </Space>
                </Space>
              </Card>
            )}
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
                title: '状态',
                render: (_: unknown, record: DashboardResponse['users'][number]) => <StatusBadge status={record.status} />,
              },
              {
                title: '超管',
                render: (_: unknown, record: DashboardResponse['users'][number]) => (record.isSuperAdmin ? '是' : '否'),
              },
              {
                title: '平台账号',
                render: (_: unknown, record: DashboardResponse['users'][number]) =>
                  record.platformAccounts.length > 0 ? (
                    <Space direction="vertical" size={6}>
                      {record.platformAccounts.map((account: DashboardResponse['users'][number]['platformAccounts'][number]) => (
                        <div key={account.id}>
                          <Typography.Text style={{ fontWeight: 500 }}>{account.provider.displayName}</Typography.Text>
                          <Typography.Text type="secondary">
                            {' '}
                            · {account.displayName || account.externalSubjectId}
                          </Typography.Text>
                          {!account.enabled ? (
                            <>
                              {' '}
                              <StatusBadge status="disabled" />
                            </>
                          ) : null}
                        </div>
                      ))}
                    </Space>
                  ) : (
                    <Typography.Text type="secondary">暂无映射</Typography.Text>
                  ),
              },
              {
                title: 'Feishu personal',
                render: (_: unknown, record: DashboardResponse['users'][number]) =>
                  record.personalAuthorizations[0] ? (
                    <Space direction="vertical" size={4}>
                      <StatusBadge status={record.personalAuthorizations[0].status} />
                      <Typography.Text type="secondary">
                        {record.personalAuthorizations[0].enabled ? '已启用个人数据能力' : '已关闭个人数据能力'}
                      </Typography.Text>
                    </Space>
                  ) : (
                    <Typography.Text type="secondary">未配置</Typography.Text>
                  ),
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
          <SectionCard title="全局 App 授权" description="App 授权是平台级共享能力，不和普通用户绑定。">
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
                            {item.enabled ? '当前可供系统级调用使用' : '当前不会参与任何系统级能力调用'}
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
          <SectionCard title="最近告警" description="优先关注授权失效、刷新失败等异常。">
            {!data || data.alerts.length === 0 ? (
              <EmptyState title="当前没有告警" description="授权中心运行正常时，这里会保持为空。" />
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
                          <Typography.Text type="secondary">{item.message}</Typography.Text>
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

      <SectionCard title="最近授权事件" description="用于快速确认最近发生的授权、刷新、启停操作。">
        {!data || data.events.length === 0 ? (
          <EmptyState title="还没有授权事件" description="触发授权链接、回调成功、刷新或手动开关后，这里会显示记录。" />
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
        title="添加可对话用户"
        width={isMobile ? '100%' : 420}
        visible={drawerVisible}
        footer={null}
        onCancel={() => setDrawerVisible(false)}
        unmountOnExit
      >
        <Typography.Paragraph type="secondary">
          添加用户只代表“允许与 OpenClaw 对话”。是否允许访问个人平台数据，还需要在用户详情页单独开启 personal 授权。
        </Typography.Paragraph>
        <Form
          layout="vertical"
          form={form}
          onSubmit={async (values: { username: string; display_name?: string }) => {
            await createUser(values);
            Message.success('已添加用户');
            form.resetFields();
            setDrawerVisible(false);
            await reload();
          }}
        >
          <Form.Item field="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<IconUser />} placeholder="用于系统内部唯一标识，例如 mark" />
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
