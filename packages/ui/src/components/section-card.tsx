import { Card, Typography } from '@arco-design/web-react';
import React from 'react';

export function SectionCard({
  title,
  description,
  extra,
  children,
}: {
  title: string;
  description?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card
      bordered={false}
      title={<Typography.Text style={{ fontWeight: 600 }}>{title}</Typography.Text>}
      extra={extra}
      style={{ background: 'rgba(255,255,255,0.92)' }}
    >
      {description ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
          {description}
        </Typography.Paragraph>
      ) : null}
      {children}
    </Card>
  );
}
