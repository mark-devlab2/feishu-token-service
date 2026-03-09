import { Tag } from '@arco-design/web-react';

const colorMap: Record<string, string> = {
  active: 'green',
  enabled: 'green',
  available: 'green',
  disabled: 'gray',
  missing: 'gray',
  expiring: 'orange',
  expired: 'red',
  reauthorization_required: 'red',
  revoked: 'red',
  open: 'red',
  acknowledged: 'orange',
  resolved: 'green',
};

const labelMap: Record<string, string> = {
  active: '正常',
  enabled: '已启用',
  available: '可用',
  disabled: '已禁用',
  missing: '未配置',
  expiring: '即将过期',
  expired: '已过期',
  reauthorization_required: '需要重新授权',
  revoked: '已失效',
  open: '待处理',
  acknowledged: '已确认',
  resolved: '已解决',
};

export function StatusBadge({ status }: { status: string }) {
  return <Tag color={colorMap[status] || 'arcoblue'}>{labelMap[status] || status}</Tag>;
}
