import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0">
              <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent">
                General
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent">
                Proof Categories
              </TabsTrigger>
              <TabsTrigger value="proofTypes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent">
                Proof Types
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent">
                Admission Templates
              </TabsTrigger>
              <TabsTrigger value="roles" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent">
                Roles
              </TabsTrigger>
              <TabsTrigger value="credentials" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent">
                Credentials
              </TabsTrigger>
            </TabsList>

            <div className="p-8">
              <TabsContent value="general" className="mt-0">
                <div className="text-slate-500">General Settings — Coming Soon</div>
              </TabsContent>
              <TabsContent value="categories" className="mt-0">
                <div className="text-slate-500">Proof Categories — Coming Soon</div>
              </TabsContent>
              <TabsContent value="proofTypes" className="mt-0">
                <div className="text-slate-500">Proof Types — Coming Soon</div>
              </TabsContent>
              <TabsContent value="templates" className="mt-0">
                <div className="text-slate-500">Admission Templates — Coming Soon</div>
              </TabsContent>
              <TabsContent value="roles" className="mt-0">
                <div className="text-slate-500">Roles — Coming Soon</div>
              </TabsContent>
              <TabsContent value="credentials" className="mt-0">
                <div className="text-slate-500">Credentials — Coming Soon</div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}