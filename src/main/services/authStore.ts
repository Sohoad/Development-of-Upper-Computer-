import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import * as bcrypt from 'bcryptjs';

const storeFile = path.join(os.tmpdir(), 'hmi-users.json');

interface UserData {
  id: string;
  username: string;
  passwordHash: string;
  role: 'operator' | 'engineer' | 'admin';
  createdAt: string;
}

interface UserStoreData {
  users: UserData[];
}

function loadUsers(): UserStoreData {
  try {
    if (!fs.existsSync(storeFile)) {
      return { users: [] };
    }
    const raw = fs.readFileSync(storeFile, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { users: [] };
  }
}

function saveUsers(data: UserStoreData): void {
  const tmpFile = storeFile + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, storeFile);
}

export function initDefaultAdmin(): void {
  const data = loadUsers();
  if (data.users.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);
    data.users.push({
      id: crypto.randomUUID(),
      username: 'admin',
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    saveUsers(data);
  }
}

export async function authenticate(username: string, password: string): Promise<{ id: string; username: string; role: 'operator' | 'engineer' | 'admin'; createdAt: string } | null> {
  const data = loadUsers();
  const user = data.users.find((u) => u.username === username);
  if (!user) {
    return null;
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function getAllUsers(): { id: string; username: string; role: 'operator' | 'engineer' | 'admin'; createdAt: string }[] {
  const data = loadUsers();
  return data.users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.createdAt,
  }));
}

export async function createUser(username: string, password: string, role: 'operator' | 'engineer' | 'admin'): Promise<{ id: string; username: string; role: 'operator' | 'engineer' | 'admin'; createdAt: string }> {
  const data = loadUsers();
  if (data.users.some((u) => u.username === username)) {
    throw new Error('用户名已存在');
  }
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const newUser: UserData = {
    id: crypto.randomUUID(),
    username,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };
  data.users.push(newUser);
  saveUsers(data);
  return {
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
    createdAt: newUser.createdAt,
  };
}

export function deleteUser(userId: string): void {
  const data = loadUsers();
  const user = data.users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  if (user.role === 'admin') {
    throw new Error('不能删除管理员账号');
  }
  data.users = data.users.filter((u) => u.id !== userId);
  saveUsers(data);
}

export function updateUserRole(userId: string, role: 'operator' | 'engineer' | 'admin'): void {
  const data = loadUsers();
  const user = data.users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  user.role = role;
  saveUsers(data);
}