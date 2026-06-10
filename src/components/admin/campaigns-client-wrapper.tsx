"use client";

import { useState } from "react";
import { ReusableProspectTable } from "@/components/admin/reusable-prospect-table";
import { CampaignSender } from "@/components/admin/campaign-sender";

interface CampaignsClientWrapperProps {
  prospects: any[];
  customTemplates: any[];
}

export function CampaignsClientWrapper({ prospects, customTemplates }: CampaignsClientWrapperProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ReusableProspectTable 
          prospects={prospects}
          showCheckboxes={true}
          selectedIds={selectedIds}
          onSelectIds={setSelectedIds}
          enableSearch={true}
        />
      </div>

      <div className="lg:col-span-1">
        <CampaignSender 
          selectedProspects={selectedIds} 
          customTemplates={customTemplates}
        />
      </div>
    </div>
  );
}