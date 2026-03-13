import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GeneralTab from '@/components/settings/GeneralTab';
import CategoriesTab from '@/components/settings/CategoriesTab';
import ProofTypeCategoriesTab from '@/components/settings/ProofTypeCategoriesTab';
import AdmissionTemplatesTab from '@/components/settings/AdmissionTemplatesTab';
import RolesTab from '@/components/settings/RolesTab';
import CredentialsTab from '@/components/settings/CredentialsTab';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-blue-600" />
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