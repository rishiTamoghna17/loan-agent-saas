'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteProspect } from '@/app/admin/actions';

export function ProspectDeleteButton({ prospectId }: { prospectId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this prospect? This action can be undone within 7 days.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteProspect(prospectId);
    } catch (error) {
      console.error('Failed to delete prospect:', error);
      alert('Failed to delete prospect. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-slate-400 hover:text-red-600 transition-colors"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  );
}
