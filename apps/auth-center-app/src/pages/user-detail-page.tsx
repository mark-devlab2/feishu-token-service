import { useEffect, useState } from 'react';
import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Grid,
  Input,
  List,
  Message,
  Modal,
  Space,
  Typography,
} from '@arco-design/web-react';
import IconArrowLeft from '@arco-design/web-react/icon/react-icon/IconArrowLeft';
import IconLink from '@arco-design/web-react/icon/react-icon/IconLink';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusBadge, useMobile } from '@ui';
import {
  addPlatformAccount,
  deletePersonalToken,
  getUserDetail,
  invalidatePersonalToken,
  setPersonalAuthorizationEnabled,
  setPlatformAccountEnabled,
  setUserEnabled,
  UserDetailResponse,
} from '../api/auth-center';

const Row = Grid.Row;
const Col = Grid.Col;

function getPersonalAuthorization(data: UserDetailResponse | null) {
  return data?.personalAuthorizations[0] || null;
}

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

  const authorization = getPersonalAuthorization(data);
  const tokenStatusText = authorization?.hasToken
    ? authorization.tokenStatus
    : authorization?.enabled
      ? 'missing'
      : 'revoked';

  const runDangerAction = (
    title: string,
    content: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    Modal.confirm({
      title,
      content,
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        await action();
        Message.success(successMessage);
        await reload();
      },
    });
  };

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <PageHeader
        title={data?.user.displayName || data?.user.username || '用户详情'}
        description="先确认用户身份与对话准入，再判断 personal 授权是否开启，最后处理 token 生命周期和审计信息。"
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
        <Col xs={12} lg={6}>
          <MetricCard title="对话准入" value={data?.user.status === 'active' ? '已启用' : '已禁用'} extra="控制该用户是否允许与 OpenClaw 对话" />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard title="平台映射数量" value={data?.platformAccounts.length ?? '-'} extra="用于识别当前发送者是谁" />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard title="personal 授权" value={authorization?.enabled ? '已开启' : '未开启'} extra="不开启就不会发起授权链接或使用 user token" />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard title="当前 token" value={authorization?.tokenAvailable ? '可用' : '不可用'} extra="token 生命周期独立于授权开关，但受开关门禁约束" />
        </Col>
      </Row>

      <SectionCard
        title="身份与对话准入"
        description="这一层只解决“这个发送者是谁”以及“是否允许对话”，不承载 personal 数据访问能力。"
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
          <Descriptions.Item label="用户状态">
            {data ? <StatusBadge status={data.user.status} /> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="是否超管">{data?.user.isSuperAdmin ? '是' : '否'}</Descriptions.Item>
        </Descriptions>
      </SectionCard>

      <SectionCard
        title="平台账号映射"
        description="平台账号映射只用于把消息发送者绑定到系统用户，不代表已经允许读取 personal user-scope 数据。"
        extra={
          <Button type="primary" onClick={() => setDrawerVisible(true)}>
            添加映射
          </Button>
        }
      >
        {!data || data.platformAccounts.length === 0 ? (
          <EmptyState title="还没有平台账号映射" description="先绑定 Feishu open_id，系统才能识别消息发自哪个系统用户。" />
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

      <SectionCard
        title="Feishu personal 授权状态"
        description="授权开关是第一层门禁。关闭时，即使 token 仍在库中，也不会继续被用于 personal user-scope 请求。"
        extra={
          <Button
            type={authorization?.enabled ? 'outline' : 'primary'}
            status={authorization?.enabled ? 'warning' : 'normal'}
            onClick={() =>
              void (async () => {
                if (!data) return;
                await setPersonalAuthorizationEnabled('feishu', data.user.id, !authorization?.enabled);
                Message.success(authorization?.enabled ? '已关闭 Feishu personal 授权' : '已开启 Feishu personal 授权');
                await reload();
              })()
            }
          >
            {authorization?.enabled ? '关闭授权开关' : '开启授权开关'}
          </Button>
        }
      >
        {authorization ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={isMobile ? 1 : 2} colon=" :">
              <Descriptions.Item label="账号键">{authorization.accountKey}</Descriptions.Item>
              <Descriptions.Item label="授权开关">
                <StatusBadge status={authorization.enabled ? 'enabled' : 'disabled'} />
              </Descriptions.Item>
              <Descriptions.Item label="授权状态">
                <StatusBadge status={authorization.status} />
              </Descriptions.Item>
              <Descriptions.Item label="token 状态">
                <StatusBadge status={tokenStatusText} />
              </Descriptions.Item>
              <Descriptions.Item label="是否已有 token">
                {authorization.hasToken ? '是' : '否'}
              </Descriptions.Item>
              <Descriptions.Item label="当前是否可用">
                {authorization.tokenAvailable ? '是' : '否'}
              </Descriptions.Item>
              <Descriptions.Item label="过期时间">
                {authorization.expiresAt ? new Date(authorization.expiresAt).toLocaleString() : '暂无'}
              </Descriptions.Item>
              <Descriptions.Item label="刷新过期时间">
                {authorization.refreshExpiresAt ? new Date(authorization.refreshExpiresAt).toLocaleString() : '暂无'}
              </Descriptions.Item>
              <Descriptions.Item label="最近刷新">
                {authorization.lastRefreshAt ? new Date(authorization.lastRefreshAt).toLocaleString() : '暂无'}
              </Descriptions.Item>
              <Descriptions.Item label="最近失败原因">
                {authorization.failureReason || '暂无'}
              </Descriptions.Item>
              <Descriptions.Item label="授权范围">
                {authorization.scopes.length > 0 ? authorization.scopes.join('、') : '当前还没有可用授权范围'}
              </Descriptions.Item>
            </Descriptions>
            <CardHint
              text={
                !authorization.enabled
                  ? '当前 token 已被视为无效，不会自动刷新，也不会继续参与 personal user-scope 请求。'
                  : authorization.hasToken
                    ? '授权开关已开启；后续是否能直接使用 token 仍取决于 token 当前状态与过期时间。'
                    : '授权开关已开启，但当前没有可用 token；下次 personal 请求需要重新授权。'
              }
            />
          </Space>
        ) : (
          <EmptyState title="尚未创建 personal 授权记录" description="先开启授权开关，后续用户触发 personal user-scope 任务时，系统才会生成浏览器授权链接。" />
        )}
      </SectionCard>

      <SectionCard
        title="Token 手动控制"
        description="这一层只处理 token 生命周期，不替代授权开关。危险操作都会要求二次确认。"
      >
        {!authorization ? (
          <EmptyState title="暂无 token 控制对象" description="先创建或开启 personal 授权记录，后续才会出现 token 生命周期控制。" />
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <CardHint
                title="授权开关"
                text="关闭后不会再发起授权链接，也不会继续使用当前 user token；重新打开后再恢复有效性判断。"
                action={
                  <Button
                    long
                    status={authorization.enabled ? 'warning' : 'success'}
                    onClick={() =>
                      runDangerAction(
                        authorization.enabled ? '确认关闭 personal 授权？' : '确认开启 personal 授权？',
                        authorization.enabled
                          ? '关闭后，当前 token 会被视为无效，不再自动刷新，也不会继续参与 personal 请求。'
                          : '开启后，系统会恢复对现有 token 的有效性判断；如 token 不可用，后续请求将触发重新授权。',
                        async () => {
                          await setPersonalAuthorizationEnabled('feishu', data!.user.id, !authorization.enabled);
                        },
                        authorization.enabled ? '已关闭 Feishu personal 授权' : '已开启 Feishu personal 授权',
                      )
                    }
                  >
                    {authorization.enabled ? '关闭授权开关' : '开启授权开关'}
                  </Button>
                }
              />
            </Col>
            <Col xs={24} md={8}>
              <CardHint
                title="Invalidate Token"
                text="保留 token 记录，但立即把当前 token 视为不可用。后续 personal 请求需要重新授权或重新建立有效 token。"
                action={
                  <Button
                    long
                    status="warning"
                    disabled={!authorization.hasToken}
                    onClick={() =>
                      runDangerAction(
                        '确认失效当前 token？',
                        '这个动作不会删除 token 记录，但会让当前 token 立即不可用，并要求后续 personal 请求重新授权。',
                        async () => {
                          await invalidatePersonalToken('feishu', data!.user.id);
                        },
                        '已手动失效当前 token',
                      )
                    }
                  >
                    Invalidate Token
                  </Button>
                }
              />
            </Col>
            <Col xs={24} md={8}>
              <CardHint
                title="Delete Token"
                text="彻底清空当前 token 数据。后续请求必须重新授权，不会自动恢复。"
                action={
                  <Button
                    long
                    status="danger"
                    disabled={!authorization.hasToken}
                    onClick={() =>
                      runDangerAction(
                        '确认删除当前 token？',
                        '这个动作会清空 access token、refresh token、授权范围和过期时间。授权开关会保留，但后续必须重新授权。',
                        async () => {
                          await deletePersonalToken('feishu', data!.user.id);
                        },
                        '已删除当前 token',
                      )
                    }
                  >
                    Delete Token
                  </Button>
                }
              />
            </Col>
          </Row>
        )}
      </SectionCard>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <SectionCard title="最近事件" description="用于确认最近发生的授权、刷新、禁用和 token 管理动作。">
            {!data || data.events.length === 0 ? (
              <EmptyState title="暂无事件" description="执行授权开关或 token 控制后，这里会记录操作轨迹。" />
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
          <SectionCard title="最近告警" description="用来确认 token 失效、刷新失败或需要重新授权等异常。">
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

function CardHint({
  title,
  text,
  action,
}: {
  title?: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--himark-border)',
        borderRadius: 16,
        padding: 16,
        background: '#fbfcff',
        height: '100%',
      }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {title ? <Typography.Text style={{ fontWeight: 600 }}>{title}</Typography.Text> : null}
        <Typography.Text type="secondary">{text}</Typography.Text>
        {action}
      </Space>
    </div>
  );
}
