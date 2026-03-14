import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GeneralTab from '@/components/settings/GeneralTab';
import CategoriesTab from '@/components/settings/CategoriesTab';
import ProofTypeCategoriesTab from '@/components/settings/ProofTypeCategoriesTab';
import AdmissionTemplatesTab from '@/components/settings/AdmissionTemplatesTab';
import RolesTab from '@/components/settings/RolesTab';
import CredentialsTab from '@/components/settings/CredentialsTab';
import TrialPointCategoriesTab from '@/components/settings/TrialPointCategoriesTab';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [error, setError] = React.useState(null);

  useEffect(() => {
    const handleError = (event) => {
      setError(event.message || 'An error occurred');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-semibold text-red-900">Error loading Settings</h3>
            <p className="text-red-700 text-sm mt-2">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0 h-auto">
              <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4">
                General
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4">
                Proof Categories
              </TabsTrigger>
              <TabsTrigger value="proofTypes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4">
                Proof Types
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4">
                Admission Templates
              </TabsTrigger>
              <TabsTrigger value="roles" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4">
                Roles
              </TabsTrigger>
              <TabsTrigger value="credentials" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4">
                Credentials
              </TabsTrigger>
              <TabsTrigger value="trialPointCategories" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4">
                Trial Point Categories
              </TabsTrigger>
            </TabsList>

            <div className="p-8">
              <TabsContent value="general" className="mt-0">
                <GeneralTab />
              </TabsContent>
              <TabsContent value="categories" className="mt-0">
                <CategoriesTab />
              </TabsContent>
              <TabsContent value="proofTypes" className="mt-0">
                <ProofTypeCategoriesTab />
              </TabsContent>
              <TabsContent value="templates" className="mt-0">
                <AdmissionTemplatesTab />
              </TabsContent>
              <TabsContent value="roles" className="mt-0">
                <RolesTab />
              </TabsContent>
              <TabsContent value="credentials" className="mt-0">
                <CredentialsTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}