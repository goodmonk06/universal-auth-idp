'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { UserDto } from '@universal-auth-idp/auth-core';

export default function UsersPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [tenantId]);

  const fetchUsers = async () => {
    try {
      const response = await api.get(`/tenants/${tenantId}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await api.put(`/tenants/${tenantId}/users/${userId}/active`, { isActive: !isActive });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-0">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push('/tenants')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              ← Back to Tenants
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          </div>
          <div className="mt-3 sm:mt-0 flex gap-2">
            <button
              onClick={() => router.push(`/tenants/${tenantId}/roles`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Manage Roles
            </button>
            <button
              onClick={() => router.push(`/tenants/${tenantId}/applications`)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Manage Applications
            </button>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No users found. Users are created automatically on first login.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {users.map((user) => (
                  <li key={user.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.email}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {user.roles && user.roles.length > 0 && (
                              <span className="text-xs text-gray-500">
                                Roles: {user.roles.map((r) => r.name).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-5 flex-shrink-0">
                          <button
                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded ${
                              user.isActive
                                ? 'text-red-700 bg-red-100 hover:bg-red-200'
                                : 'text-green-700 bg-green-100 hover:bg-green-200'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
