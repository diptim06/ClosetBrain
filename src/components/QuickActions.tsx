import React, { useState } from 'react';
import { Plus, Sparkles, Calendar, Heart, Check, X } from 'lucide-react';
import { QuickActionItem } from '../data/mockData';

interface QuickActionsProps {
  actions: QuickActionItem[];
  onTriggerAction?: (actionId: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, onTriggerAction }) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [addedSuccess, setAddedSuccess] = useState(false);

  const getIcon = (name: QuickActionItem['iconName']) => {
    switch (name) {
      case 'Plus':
        return Plus;
      case 'Sparkles':
        return Sparkles;
      case 'Calendar':
        return Calendar;
      case 'Heart':
        return Heart;
      default:
        return Plus;
    }
  };

  const handleActionClick = (actionId: string) => {
    if (onTriggerAction) {
      onTriggerAction(actionId);
    }
    setActiveModal(actionId);
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      setActiveModal(null);
      setNewItemName('');
    }, 1200);
  };

  return (
    <>
      <div className="cb-card p-5">
        <h2 className="text-sm font-bold text-[#23201D] uppercase tracking-wider text-[#9E968E] mb-3">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((act) => {
            const IconComp = getIcon(act.iconName);
            return (
              <button
                key={act.id}
                onClick={() => handleActionClick(act.id)}
                className="group bg-[#FBF9F5] border border-[#ECE7DE] hover:border-[#A65D47] hover:bg-[#F3EDE2] p-3 rounded-lg flex flex-col items-center justify-center text-center transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#ECE7DE] text-[#A65D47] flex items-center justify-center mb-2 shadow-2xs group-hover:scale-110 transition-transform">
                  <IconComp size={16} />
                </div>
                <span className="text-xs font-semibold text-[#23201D] group-hover:text-[#A65D47] transition-colors">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Action Modals */}
      {activeModal === 'act-add' && (
        <div className="fixed inset-0 z-50 bg-[#23201D]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#ECE7DE] rounded-xl max-w-md w-full p-6 shadow-xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1 text-[#78716C] hover:text-[#23201D]"
            >
              <X size={18} />
            </button>

            {!addedSuccess ? (
              <form onSubmit={handleAddItemSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#A65D47] uppercase">
                  <Plus size={14} /> Quick Add Garment
                </div>
                <h3 className="text-lg font-bold font-editorial text-[#23201D]">
                  Add New Closet Item
                </h3>

                <div>
                  <label className="block text-xs font-medium text-[#78716C] mb-1">
                    Garment Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Linen Double-Breasted Jacket"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#ECE7DE] focus:border-[#A65D47] rounded-lg p-2.5 text-xs text-[#23201D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#78716C] mb-1">
                    Category:
                  </label>
                  <select className="w-full bg-[#FBF9F5] border border-[#ECE7DE] rounded-lg p-2.5 text-xs text-[#23201D] outline-none">
                    <option>Tops</option>
                    <option>Bottoms</option>
                    <option>Outerwear</option>
                    <option>Shoes</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#A65D47] text-white font-medium text-xs rounded-lg hover:bg-[#964B36] transition-colors"
                >
                  Save to Closet
                </button>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Check size={20} />
                </div>
                <h4 className="text-base font-bold text-[#23201D]">Garment Added!</h4>
                <p className="text-xs text-[#78716C]">{newItemName} is now in your closet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
