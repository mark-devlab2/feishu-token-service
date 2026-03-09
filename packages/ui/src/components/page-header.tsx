import { Space, Typography } from '@arco-design/web-react';
import React from 'react';

export function PageHeader({
  title,
  description,
  extra,
}: {
  title: string;
  description?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      <Space direction="vertical" size={6}>
        <Typography.Title heading={4} style={{ marginBottom: 0 }}>
          {title}
        </Typography.Title>
        {description ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {description}
          </Typography.Paragraph>
        ) : null}
      </Space>
      {extra}
    </div>
  );
}
