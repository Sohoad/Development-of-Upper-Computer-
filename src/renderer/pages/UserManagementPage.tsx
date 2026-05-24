import { useState, useEffect } from 'react';
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Space,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UserRole } from '@shared/types';

const { Title } = Typography;

interface UserRecord {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

const roleColorMap: Record<string, string> = {
  admin: 'red',
  engineer: 'blue',
  operator: 'green',
};

const roleLabelMap: Record<string, string> = {
  admin: '管理员',
  engineer: '工程师',
  operator: '操作员',
};

function UserManagementPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.auth.getUsers();
      if ('error' in result) {
        message.error(result.error);
      } else {
        setUsers(result);
      }
    } catch {
      message.error('加载用户列表失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (values: { username: string; password: string; role: string }) => {
    try {
      const result = await window.electronAPI.auth.createUser(values.username, values.password, values.role as UserRole);
      if ('error' in result) {
        message.error(result.error);
      } else {
        message.success('用户创建成功');
        setModalOpen(false);
        form.resetFields();
        loadUsers();
      }
    } catch {
      message.error('创建用户失败');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const result = await window.electronAPI.auth.deleteUser(userId);
      if ('error' in result) {
        message.error(result.error);
      } else {
        message.success('用户已删除');
        loadUsers();
      }
    } catch {
      message.error('删除用户失败');
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const result = await window.electronAPI.auth.updateRole(userId, role as UserRole);
      if ('error' in result) {
        message.error(result.error);
      } else {
        message.success('角色已更新');
        loadUsers();
      }
    } catch {
      message.error('更新角色失败');
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: UserRecord) => (
        <Select
          value={role}
          size="small"
          style={{ width: 100 }}
          onChange={(value) => handleRoleChange(record.id, value)}
          options={[
            { label: '操作员', value: 'operator' },
            { label: '工程师', value: 'engineer' },
            { label: '管理员', value: 'admin' },
          ]}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: UserRecord) => (
        <Popconfirm
          title="确定要删除此用户吗？"
          onConfirm={() => handleDeleteUser(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          用户管理
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          添加用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title="添加用户"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
            initialValue="operator"
          >
            <Select
              options={[
                { label: '操作员', value: 'operator' },
                { label: '工程师', value: 'engineer' },
                { label: '管理员', value: 'admin' },
              ]}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default UserManagementPage;