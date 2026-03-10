import { Grid, Space, Typography } from '@arco-design/web-react';
import { MetricCard, SectionCard } from '@ui';
import IconApps from '@arco-design/web-react/icon/react-icon/IconApps';
import IconSafe from '@arco-design/web-react/icon/react-icon/IconSafe';
import IconSettings from '@arco-design/web-react/icon/react-icon/IconSettings';
import { Link } from 'react-router-dom';

const Row = Grid.Row;
const Col = Grid.Col;

export function DashboardPage() {
  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Typography.Title heading={3} style={{ marginBottom: 8 }}>
          后台总览
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          这里聚合各服务后台入口。第一阶段先接入授权中心，后续再追加车辆服务、OpenClaw 运维等子应用。
        </Typography.Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <MetricCard title="已接入子应用" value="1" extra="授权中心已接入" />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <MetricCard title="统一登录状态" value="已开启" extra="一次登录访问已接入后台" />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <MetricCard title="移动端支持" value="已覆盖" extra="H5 可查看与执行关键管理动作" />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <SectionCard
            title="已接入服务"
            description="统一后台壳站采用子应用结构，当前优先接入授权中心。"
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Link to="/auth-center">
                <div className="service-entry-card">
                  <div>
                    <Typography.Title heading={6} style={{ marginBottom: 6 }}>
                      授权中心
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      管理用户目录、平台账号映射、Feishu personal 授权与全局 App 授权。
                    </Typography.Text>
                  </div>
                  <IconSafe style={{ fontSize: 22, color: 'var(--himark-primary)' }} />
                </div>
              </Link>
            </Space>
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard
            title="后续接入建议"
            description="后续服务后台按同样的壳站契约接入，不单独再造一套后台。"
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div className="service-entry-card">
                <div>
                  <Typography.Text style={{ fontWeight: 600 }}>车辆服务后台</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">预留 `/cars/*`，承载 TeslaMate 等车辆服务后台。</Typography.Text>
                </div>
                <IconApps style={{ fontSize: 22, color: '#7a52f4' }} />
              </div>
              <div className="service-entry-card">
                <div>
                  <Typography.Text style={{ fontWeight: 600 }}>OpenClaw 运维后台</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">预留 `/openclaw/*`，承载主助理与运维观测面。</Typography.Text>
                </div>
                <IconSettings style={{ fontSize: 22, color: '#ff7d00' }} />
              </div>
            </Space>
          </SectionCard>
        </Col>
      </Row>
    </Space>
  );
}
