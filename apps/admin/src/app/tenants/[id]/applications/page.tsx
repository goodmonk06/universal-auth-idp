'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { ApplicationDto } from '@universal-auth-idp/auth-core';

export default function ApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  const [applications, setApplications] = useState<ApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [redirectUris, setRedirectUris] = useState('');
  const [newAppSecret, setNewAppSecret] = useState<{ clientId: string; clientSecret: string } | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [tenantId]);

  const fetchApplications = async () => {
    try {
      const response = await api.get(`/tenants/${tenantId}/applications`);
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post(`/tenants/${tenantId}/applications`, {
        name,
        redirectUris: redirectUris.split('\n').filter(uri => uri.trim()),
      });
      setNewAppSecret({
        clientId: response.data.clientId,
        clientSecret: response.data.clientSecret,
      });
      setShowCreateForm(false);
      setName('');
      setRedirectUris('');
      fetchApplications();
    } catch (error) {
      console.error('Failed to create application:', error);
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    try {
      await api.delete(`/tenants/${tenantId}/applications/${appId}`);
      fetchApplications();
    } catch (error) {
      console.error('Failed to delete application:', error);
    }
  };

  const handleRegenerateSecret = async (appId: string) => {
    if (!confirm('Are you sure? The old secret will stop working immediately.')) return;
    try {
      const response = await api.post(`/tenants/${tenantId}/applications/${appId}/regenerate-secret`);
      const app = applications.find(a => a.id === appId);
      setNewAppSecret({
        clientId: app?.clientId || '',
        clientSecret: response.data.clientSecret,
      });
    } catch (error) {
      console.error('Failed to regenerate secret:', error);
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
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Create Application
          </button>
        </div>

        {newAppSecret && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-yellow-900 mb-2">Save These Credentials!</h2>
            <p className="text-sm text-yellow-700 mb-4">
              This is the only time you'll see the client secret. Store it securely.
            </p>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="font-semibold">Client ID:</span> {newAppSecret.clientId}
              </div>
              <div>
                <span className="font-semibold">Client Secret:</span> {newAppSecret.clientSecret}
              </div>
            </div>
            <button
              onClick={() => setNewAppSecret(null)}
              className="mt-4 text-sm text-yellow-700 hover:text-yellow-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {showCreateForm && (
          <div className="mt-6 bg-white shadow sm:rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Create New Application</h2>
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
                <label className="block text-sm font-medium text-gray-700">
                  Redirect URIs (one per line)
                </label>
                <textarea
                  value={redirectUris}
                  onChange={(e) => setRedirectUris(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                  rows={4}
                  placeholder="http://localhost:4000/callback"
                  required
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
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {applications.map((app) => (
                  <li key={app.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {app.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 font-mono">
                            Client ID: {app.clientId}
                          </p>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Redirect URIs:</p>
                            <ul className="mt-1 text-xs text-gray-600">
                              {app.redirectUris.map((uri, idx) => (
                                <li key={idx} className="font-mono">{uri}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="ml-5 flex gap-2">
                          <button
                            onClick={() => handleRegenerateSecret(app.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Regenerate Secret
                          </button>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                          >
                            Delete
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
