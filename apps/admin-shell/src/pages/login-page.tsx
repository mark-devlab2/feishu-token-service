import { Button, Card, Form, Input, Space, Typography } from '@arco-design/web-react';
import IconLock from '@arco-design/web-react/icon/react-icon/IconLock';
import IconUser from '@arco-design/web-react/icon/react-icon/IconUser';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export function LoginPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8 }}>
              HiMark 管理后台
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              统一管理授权中心与后续接入的服务后台。当前仅超管可登录。
            </Typography.Paragraph>
          </div>

          <Form
            form={form}
            layout="vertical"
            onSubmit={async (values) => {
              await login(values.username, values.password);
              navigate('/dashboard', { replace: true });
            }}
          >
            <Form.Item field="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
              <Input prefix={<IconUser />} placeholder="请输入超管账号" size="large" />
            </Form.Item>
            <Form.Item field="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<IconLock />} placeholder="请输入密码" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" long size="large">
              登录后台
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
