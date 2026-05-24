import type { ReactNode } from 'react';
import type { UserRole } from '@shared/types';
import { useAuthStore } from '../../stores/authStore';

interface PermissionGuardProps {
  requiredRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

function PermissionGuard({ requiredRole, children, fallback = null }: PermissionGuardProps) {
  const hasPermission = useAuthStore((state) => state.checkPermission(requiredRole));
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

export default PermissionGuard;