import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, message, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { TagFormData, AvailableTag } from '../../../shared/types';
import { parseAddress, buildAddress } from '../../../shared/addressParser';

interface TagConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TagFormData) => Promise<boolean>;
  initialData?: TagFormData | null;
}

const TAG_TYPES = [
  { label: 'Bool (位)', value: 'bool' },
  { label: 'Byte (字节)', value: 'byte' },
  { label: 'Word (字)', value: 'word' },
  { label: 'DWord (双字)', value: 'dword' },
  { label: 'Real (浮点数)', value: 'real' },
];

const GROUP_OPTIONS = [
  { label: '温度', value: 'temperature' },
  { label: '压力', value: 'pressure' },
  { label: '功率', value: 'power' },
  { label: '电气', value: 'electrical' },
  { label: '数字输入', value: 'digital_input' },
  { label: '数字输出', value: 'digital_output' },
  { label: 'DB 数据', value: 'db_data' },
  { label: '自定义', value: 'custom' },
];

export function TagConfigModal({ open, onClose, onSave, initialData }: TagConfigModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<TagFormData>();
  const [saving, setSaving] = useState(false);
  const [addressWarning, setAddressWarning] = useState<string | null>(null);
  const isEditing = !!initialData;

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
      }
      setAddressWarning(null);
    }
  }, [open, initialData, form]);

  const handleAddressChange = (value: string) => {
    const parsed = parseAddress(value);
    if (parsed) {
      const typeLabel = TAG_TYPES.find(t => t.value === parsed.type)?.label || parsed.type;
      setAddressWarning(`解析成功: 区域=${parsed.area}, DB=${parsed.dbNumber}, 起始=${parsed.start}, 类型=${typeLabel}`);
    } else if (value.trim()) {
      setAddressWarning('地址格式无效，支持格式: IW0, QX0.0, MW100, DB1.DBD4 等');
    } else {
      setAddressWarning(null);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const parsed = parseAddress(values.address);
      if (!parsed) {
        message.error(t('manual.invalidAddress'));
        return;
      }

      setSaving(true);
      const success = await onSave(values);
      if (success) {
        message.success(isEditing ? t('manual.tagUpdated') : t('manual.tagAdded'));
        form.resetFields();
        onClose();
      }
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEditing ? t('manual.editTag') : t('manual.addTag')}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      width={520}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: 'word', group: 'custom', min: 0, max: 1000 }}
        style={{ marginTop: 16 }}
      >
        <Space style={{ width: '100%' }} size="middle">
          <Form.Item
            name="name"
            label={t('manual.tagName')}
            rules={[{ required: true, message: t('manual.required') }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="e.g. Temp_Zone4" disabled={isEditing} />
          </Form.Item>

          <Form.Item
            name="type"
            label={t('manual.dataType')}
            rules={[{ required: true }]}
            style={{ width: 140 }}
          >
            <Select options={TAG_TYPES} />
          </Form.Item>
        </Space>

        <Form.Item
          name="address"
          label={t('manual.s7Address')}
          rules={[{ required: true, message: t('manual.required') }]}
          validateStatus={addressWarning && !addressWarning.includes('成功') ? 'error' : addressWarning ? 'success' : undefined}
          help={addressWarning}
        >
          <Input
            placeholder="e.g. IW0, QX0.0, DB1.DBD4, MW100"
            onChange={(e) => handleAddressChange(e.target.value)}
          />
        </Form.Item>

        <Space style={{ width: '100%' }} size="middle">
          <Form.Item name="unit" label={t('manual.unit')} style={{ flex: 1 }}>
            <Input placeholder="e.g. °C, kW, A" />
          </Form.Item>

          <Form.Item name="group" label={t('manual.group')} style={{ width: 140 }}>
            <Select options={GROUP_OPTIONS} />
          </Form.Item>
        </Space>

        <Space style={{ width: '100%' }} size="middle">
          <Form.Item name="min" label={t('manual.minValue')} style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="max" label={t('manual.maxValue')} style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Form.Item name="description" label={t('manual.description')}>
          <Input.TextArea rows={2} placeholder={t('manual.descriptionPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}