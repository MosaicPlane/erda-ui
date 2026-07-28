// Copyright (c) 2026 MosaicPlane Authors.
// Licensed under the Apache License, Version 2.0.

import React from 'react';
import { Button, Drawer, Form, InputNumber, message, Modal, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import {
  approveProgressiveRelease,
  configureProgressiveRelease,
  getProgressiveReleases,
  rollbackProgressiveRelease,
} from 'runtime/services/runtime';

interface IProps {
  visible: boolean;
  runtimeId: number;
  serviceReplicas: Record<string, number>;
  onClose: () => void;
}

const formatRemaining = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

const ProgressiveRelease = ({ visible, runtimeId, serviceReplicas, onClose }: IProps) => {
  const [form] = Form.useForm();
  const [items, setItems] = React.useState<RUNTIME.ProgressiveReleaseStatus[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<RUNTIME.ProgressiveReleaseStatus>();
  const [now, setNow] = React.useState(Date.now());

  const load = React.useCallback(async () => {
    if (!visible || !runtimeId) return;
    setLoading(true);
    try {
      setItems(await getProgressiveReleases(runtimeId));
    } finally {
      setLoading(false);
    }
  }, [runtimeId, visible]);

  React.useEffect(() => {
    if (!visible) return undefined;
    load();
    const refresh = window.setInterval(load, 5000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [load, visible]);

  const remaining = (record: RUNTIME.ProgressiveReleaseStatus) => {
    if (!record.observationEndsAt) return record.remainingSeconds || 0;
    return Math.max(0, Math.ceil((new Date(record.observationEndsAt).getTime() - now) / 1000));
  };

  const openConfig = (record: RUNTIME.ProgressiveReleaseStatus) => {
    setEditing(record);
    form.setFieldsValue({
      firstBatchReplicas: record.firstBatchReplicas || 1,
      observationMinutes: Math.max(1, Math.ceil((record.observationSeconds || 300) / 60)),
    });
  };

  const saveConfig = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      await configureProgressiveRelease(runtimeId, {
        serviceName: editing.serviceName,
        enabled: true,
        firstBatchReplicas: values.firstBatchReplicas,
        observationSeconds: values.observationMinutes * 60,
      });
      message.success('渐进式发布策略已保存，将在下一次发布时生效');
      setEditing(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const disable = async (record: RUNTIME.ProgressiveReleaseStatus) => {
    await configureProgressiveRelease(runtimeId, {
      serviceName: record.serviceName,
      enabled: false,
      firstBatchReplicas: record.firstBatchReplicas || 1,
      observationSeconds: record.observationSeconds || 300,
    });
    message.success('已停用渐进式发布');
    await load();
  };

  const approve = async (record: RUNTIME.ProgressiveReleaseStatus) => {
    await approveProgressiveRelease(runtimeId, record.serviceName);
    message.success('已批准继续发布');
    await load();
  };

  const rollback = async (record: RUNTIME.ProgressiveReleaseStatus) => {
    await rollbackProgressiveRelease(runtimeId, record.serviceName);
    message.success('已请求回滚到发布前版本');
    await load();
  };

  const columns = [
    {
      title: '服务',
      dataIndex: 'serviceName',
      render: (value: string, record: RUNTIME.ProgressiveReleaseStatus) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray">{record.workloadName}</div>
        </div>
      ),
    },
    {
      title: '策略',
      render: (_: unknown, record: RUNTIME.ProgressiveReleaseStatus) =>
        record.enabled ? (
          <span>
            首批 {record.firstBatchReplicas} 个 · 强制观察 {Math.ceil(record.observationSeconds / 60)} 分钟
          </span>
        ) : (
          <Tag>未启用</Tag>
        ),
    },
    {
      title: '发布状态',
      render: (_: unknown, record: RUNTIME.ProgressiveReleaseStatus) => {
        if (!record.enabled) return '-';
        if (record.currentStepState === 'StepPaused') {
          const seconds = remaining(record);
          return (
            <Space direction="vertical" size={0}>
              <Tag color={seconds > 0 ? 'orange' : 'blue'}>
                第 {record.currentStep}/{record.totalSteps} 批已暂停
              </Tag>
              <span className="text-xs">
                {seconds > 0 ? `观察倒计时 ${formatRemaining(seconds)}` : '观察完成，等待人工确认'}
              </span>
            </Space>
          );
        }
        if (record.currentStepState === 'Complete' || record.currentStepState === 'Completed') {
          return <Tag color="green">发布完成</Tag>;
        }
        if (record.currentStepState === 'RollbackComplete') return <Tag color="green">已回滚</Tag>;
        return record.phase ? <Tag color="processing">{record.message || record.phase}</Tag> : '等待下一次发布';
      },
    },
    {
      title: '操作',
      width: 260,
      render: (_: unknown, record: RUNTIME.ProgressiveReleaseStatus) => {
        if (!record.enabled) return <Button onClick={() => openConfig(record)}>启用并配置</Button>;
        const seconds = remaining(record);
        return (
          <Space>
            <Tooltip title={seconds > 0 ? `还需观察 ${formatRemaining(seconds)}` : undefined}>
              <Button type="primary" disabled={!record.canApprove || seconds > 0} onClick={() => approve(record)}>
                继续发布
              </Button>
            </Tooltip>
            <Popconfirm title="确认立即回滚到发布前的稳定版本？" onConfirm={() => rollback(record)}>
              <Button danger disabled={!record.canRollback}>回滚</Button>
            </Popconfirm>
            <Button disabled={record.currentStepState === 'StepPaused'} onClick={() => openConfig(record)}>
              配置
            </Button>
            <Popconfirm title="确认停用该服务的渐进式发布？" onConfirm={() => disable(record)}>
              <Button
                disabled={
                  !!record.currentStepState &&
                  !['Complete', 'Completed', 'RollbackComplete'].includes(record.currentStepState)
                }
              >
                停用
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Drawer title="渐进式发布" visible={visible} width="80%" onClose={onClose}>
        <div className="mb-4 text-sm text-gray">
          新版本先部署指定数量的 Pod，强制观察期结束后，
          必须由有发布权限的成员人工确认；
          观察期间可随时回滚。
        </div>
        <Table
          rowKey="serviceName"
          loading={loading}
          pagination={false}
          dataSource={items}
          columns={columns}
        />
      </Drawer>
      <Modal
        title={`配置渐进式发布${editing ? ` · ${editing.serviceName}` : ''}`}
        visible={!!editing}
        confirmLoading={saving}
        onOk={saveConfig}
        onCancel={() => setEditing(undefined)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="firstBatchReplicas"
            label="首批 Pod 数量"
            rules={[{ required: true, message: '请输入首批 Pod 数量' }]}
          >
            <InputNumber min={1} max={editing ? serviceReplicas[editing.serviceName] || 1 : 1} precision={0} />
          </Form.Item>
          <Form.Item
            name="observationMinutes"
            label="强制观察时间（分钟）"
            extra="倒计时结束前不能继续发布，但可以立即回滚。"
            rules={[{ required: true, message: '请输入观察时间' }]}
          >
            <InputNumber min={1} max={1440} precision={0} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ProgressiveRelease;
