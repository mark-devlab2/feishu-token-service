import { Card, Space, Typography } from '@arco-design/web-react';

export function MetricCard({
  title,
  value,
  extra,
}: {
  title: string;
  value: string | number;
  extra?: string;
}) {
  return (
    <Card bordered={false} style={{ background: 'rgba(255,255,255,0.94)' }}>
      <Space direction="vertical" size={8}>
        <Typography.Text type="secondary">{title}</Typography.Text>
        <Typography.Title heading={3} style={{ marginBottom: 0 }}>
          {value}
        </Typography.Title>
        {extra ? <Typography.Text type="secondary">{extra}</Typography.Text> : null}
      </Space>
    </Card>
  );
}
