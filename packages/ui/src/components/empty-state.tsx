import { Empty, Typography } from '@arco-design/web-react';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Empty
      description={
        <div>
          <Typography.Paragraph style={{ marginBottom: 6 }}>{title}</Typography.Paragraph>
          <Typography.Text type="secondary">{description}</Typography.Text>
        </div>
      }
    />
  );
}
