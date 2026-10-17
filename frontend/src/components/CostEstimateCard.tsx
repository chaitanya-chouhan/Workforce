import React from 'react';
import { IndianRupee, Info, Calculator } from 'lucide-react';
import { CostEstimate } from '../types';

interface CostEstimateCardProps {
  estimate?: CostEstimate;
}

export const CostEstimateCard: React.FC<CostEstimateCardProps> = ({ estimate }) => {
  if (!estimate) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 flex items-center space-x-2">
        <Info className="w-4 h-4 shrink-0 text-slate-400" />
        <span>Approximate cost estimate is unavailable until matching trade rate cards are configured.</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">Approximate Cost Estimate</h4>
            <span className="text-[11px] text-slate-500">Sample trade: {estimate.skillName}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 block">Indicative Range</span>
          <span className="text-base font-extrabold text-emerald-600">
            ₹{estimate.estimatedCostMin} – ₹{estimate.estimatedCostMax}
          </span>
        </div>
      </div>

      {/* Itemized Cost Breakdown */}
      <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 rounded-xl p-3 border border-slate-100">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Labour Rate</span>
          <span className="font-bold text-sm text-slate-800">₹{estimate.baseLabourRate}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Travel Allowance</span>
          <span className="font-bold text-sm text-slate-800">₹{estimate.travelRate}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Materials (Est.)</span>
          <span className="font-bold text-sm text-slate-800">₹{estimate.materialsAllowance}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-semibold text-slate-700">Indicative Demonstration Total:</span>
        <span className="text-lg font-black text-slate-900">₹{estimate.indicativeTotal}</span>
      </div>

      {/* Required Disclaimer */}
      <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed flex items-start space-x-2">
        <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
        <span>
          {estimate.disclaimer ||
            'Approximate estimate based on the current sample rate card. Actual charges may change after the worker inspects the problem and confirms labour, travel, and materials.'}
        </span>
      </div>
    </div>
  );
};

export default CostEstimateCard;
