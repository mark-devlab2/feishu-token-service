import { useEffect, useState } from 'react';
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
  Typography,
} from '@arco-design/web-react';
import IconArrowLeft from '@arco-design/web-react/icon/react-icon/IconArrowLeft';
import IconLink from '@arco-design/web-react/icon/react-icon/IconLink';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusBadge, useMobile } from '@ui';
import {
  addPlatformAccount,
  getUserDetail,
  setPersonalAuthorizationEnabled,
  setPlatformAccountEnabled,
  setUserEnabled,
  UserDetailResponse,
} from '../api/auth-center';

const Row = Grid.Row;
const Col = Grid.Col;

export function AuthCenterUserDetailPage() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const isMobile = useMobile();
  const [form] = Form.useForm();

  const reload = async () => {
    setLoading(true);
    try {
      const next = await getUserDetail(userId);
      setData(next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [userId]);

  if (!loading && !data) {
    return (
      <SectionCard title="用户不存在" description="请返回授权中心首页重新选择用户。">
        <Button type="primary" onClick={() => navigate('/auth-center')}>
          返回授权中心
        </Button>
      </SectionCard>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <PageHeader
        title={data?.user.displayName || data?.user.username || '用户详情'}
        description="先确认用户是否允许对话，再决定是否开启 Feishu personal 授权。两者是不同层级。"
        extra={
          <Space wrap>
            <Link to="/auth-center">
              <Button icon={<IconArrowLeft />}>返回列表</Button>
            </Link>
            <Button onClick={() => void reload()}>刷新数据</Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard title="用户状态" value={data?.user.status === 'active' ? '已启用' : '已禁用'} extra="控制是否允许与 OpenClaw 对话" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard title="平台账号" value={data?.platformAccounts.length ?? '-'} extra="用于识别消息发送者属于哪个系统用户" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard title="Feishu personal 授权" value={data?.personalAuthorizations[0]?.enabled ? '已开启' : '未开启'} extra="开启后才允许触发 Feishu 个人数据能力" />
        </Col>
      </Row>

      <SectionCard
        title="用户概览"
        description="这里是最关键的基础状态：能否对话、是否超管、是否已开启个人数据能力。"
        extra={
          <Button
            status={data?.user.status === 'active' ? 'warning' : 'success'}
            onClick={() =>
              void (async () => {
                if (!data) return;
                await setUserEnabled(data.user.id, data.user.status !== 'active');
                Message.success(data.user.status === 'active' ? '已禁用用户' : '已启用用户');
                await reload();
              })()
            }
          >
            {data?.user.status === 'active' ? '禁用用户' : '启用用户'}
          </Button>
        }
      >
        <Descriptions column={isMobile ? 1 : 2} colon=" :">
          <Descriptions.Item label="用户名">{data?.user.username || '-'}</Descriptions.Item>
          <Descriptions.Item label="显示名">{data?.user.displayName || '-'}</Descriptions.Item>
          <Descriptions.Item label="当前状态">
            {data ? <StatusBadge status={data.user.status} /> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="是否超管">{data?.user.isSuperAdmin ? '是' : '否'}</Descriptions.Item>
        </Descriptions>
      </SectionCard>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <SectionCard
            title="平台账号映射"
            description="平台账号映射只解决“这个发送者是谁”，不代表自动允许读取个人数据。"
            extra={
              <Button type="primary" onClick={() => setDrawerVisible(true)}>
                添加映射
              </Button>
            }
          >
            {!data || data.platformAccounts.length === 0 ? (
              <EmptyState title="还没有平台账号映射" description="先绑定一个 Feishu open_id，系统才能识别该用户的消息来源。" />
            ) : (
              <List
                dataSource={data.platformAccounts}
                render={(item: UserDetailResponse['platformAccounts'][number]) => (
                  <List.Item
                    key={item.id}
                    actionLayout="vertical"
                    actions={[
                      <Button
                        key="toggle"
                        status={item.enabled ? 'warning' : 'success'}
                        onClick={() =>
                          void (async () => {
                            await setPlatformAccountEnabled(item.id, !item.enabled);
                            Message.success(item.enabled ? '已禁用平台账号' : '已启用平台账号');
                            await reload();
                          })()
                        }
                      >
                        {item.enabled ? '禁用' : '启用'}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${item.provider.displayName} · ${item.displayName || item.externalSubjectId}`}
                      description={
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">主体 ID：{item.externalSubjectId}</Typography.Text>
                          <StatusBadge status={item.enabled ? 'enabled' : 'disabled'} />
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
          <SectionCard
            title="Feishu personal 授权"
            description="开启后，该用户才允许通过授权中心触发 Feishu 个人数据读取。未开启时只允许普通对话。"
            extra={
              <Button
                type={data?.personalAuthorizations[0]?.enabled ? 'outline' : 'primary'}
                status={data?.personalAuthorizations[0]?.enabled ? 'warning' : 'normal'}
                onClick={() =>
                  void (async () => {
                    if (!data) return;
                    await setPersonalAuthorizationEnabled(
                      'feishu',
                      data.user.id,
                      !data.personalAuthorizations[0]?.enabled,
                    );
                    Message.success(data.personalAuthorizations[0]?.enabled ? '已关闭 Feishu personal 授权' : '已开启 Feishu personal 授权');
                    await reload();
                  })()
                }
              >
                {data?.personalAuthorizations[0]?.enabled ? '关闭授权开关' : '开启授权开关'}
              </Button>
            }
          >
            {data?.personalAuthorizations[0] ? (
              <Descriptions column={1} colon=" :">
                <Descriptions.Item label="账号键">{data.personalAuthorizations[0].accountKey}</Descriptions.Item>
                <Descriptions.Item label="当前状态">
                  <StatusBadge status={data.personalAuthorizations[0].status} />
                </Descriptions.Item>
                <Descriptions.Item label="是否启用">
                  {data.personalAuthorizations[0].enabled ? '是' : '否'}
                </Descriptions.Item>
                <Descriptions.Item label="授权范围">
                  {data.personalAuthorizations[0].scopes.length > 0 ? data.personalAuthorizations[0].scopes.join('、') : '当前还没有可用授权范围'}
                </Descriptions.Item>
                <Descriptions.Item label="最近刷新">
                  {data.personalAuthorizations[0].lastRefreshAt ? new Date(data.personalAuthorizations[0].lastRefreshAt).toLocaleString() : '暂无'}
                </Descriptions.Item>
                <Descriptions.Item label="最近失败原因">
                  {data.personalAuthorizations[0].failureReason || '暂无'}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <EmptyState title="尚未创建 personal 授权记录" description="先开启授权开关，后续用户在 Feishu 中触发需要个人数据的任务时，系统才会生成浏览器授权链接。" />
            )}
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <SectionCard title="最近事件" description="用于确认最近发生的授权、刷新、启停操作。">
            {!data || data.events.length === 0 ? (
              <EmptyState title="暂无事件" description="启用授权开关、生成授权链接、完成回调后，这里会记录操作轨迹。" />
            ) : (
              <List
                dataSource={data.events}
                render={(item: UserDetailResponse['events'][number]) => (
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
        </Col>
        <Col xs={24} xl={12}>
          <SectionCard title="最近告警" description="当授权失效、刷新失败或需要重新授权时，会在这里出现。">
            {!data || data.alerts.length === 0 ? (
              <EmptyState title="暂无告警" description="当前该用户没有授权异常或刷新异常。" />
            ) : (
              <List
                dataSource={data.alerts}
                render={(item: UserDetailResponse['alerts'][number]) => (
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

      <Drawer
        title="添加平台账号映射"
        width={isMobile ? '100%' : 420}
        visible={drawerVisible}
        footer={null}
        onCancel={() => setDrawerVisible(false)}
        unmountOnExit
      >
        <Typography.Paragraph type="secondary">
          平台账号映射用于识别消息发送者身份。当前第一阶段只支持 Feishu，通常填写该用户的 open_id。
        </Typography.Paragraph>
        <Form
          form={form}
          layout="vertical"
          onSubmit={async (values: { provider: string; external_subject_id: string; display_name?: string }) => {
            await addPlatformAccount(userId, values);
            Message.success('已添加平台账号映射');
            form.resetFields();
            setDrawerVisible(false);
            await reload();
          }}
        >
          <Form.Item initialValue="feishu" field="provider" label="平台">
            <Input disabled />
          </Form.Item>
          <Form.Item
            field="external_subject_id"
            label="平台主体 ID"
            rules={[{ required: true, message: '请输入平台主体 ID' }]}
          >
            <Input placeholder="例如 Feishu open_id" />
          </Form.Item>
          <Form.Item field="display_name" label="平台显示名">
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
