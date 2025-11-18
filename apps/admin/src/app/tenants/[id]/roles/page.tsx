'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { RoleDto, PermissionDto } from '@universal-auth-idp/auth-core';

export default function RolesPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get(`/tenants/${tenantId}/roles`),
        api.get(`/tenants/${tenantId}/permissions`),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/tenants/${tenantId}/roles`, { name, description });
      setShowCreateForm(false);
      setName('');
      setDescription('');
      fetchData();
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/tenants/${tenantId}/roles/${roleId}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-0">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push(`/tenants/${tenantId}/users`)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              ← Back to Users
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Create Role
          </button>
        </div>

        {showCreateForm && (
          <div className="mt-6 bg-white shadow sm:rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Create New Role</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <div key={role.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{role.name}</h3>
                      {role.description && (
                        <p className="mt-1 text-sm text-gray-500">{role.description}</p>
                      )}
                      {role.permissions && role.permissions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Permissions:</p>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.map((perm) => (
                              <span
                                key={perm.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800"
                              >
                                {perm.key}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
