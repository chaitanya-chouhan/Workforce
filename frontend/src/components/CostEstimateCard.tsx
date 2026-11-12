import React from 'react';
import { Info, Calculator, Wrench, Navigation, PackageCheck, AlertCircle } from 'lucide-react';
import { CostEstimate } from '../types';

interface CostEstimateCardProps {
  estimate?: CostEstimate;
}

export const CostEstimateCard: React.FC<CostEstimateCardProps> = ({ estimate }) => {
  if (!estimate) {
    return (
      <div className="bg-[#171B20] border border-[#272D34] rounded-2xl p-4 text-xs text-[#8A94A6] flex items-center space-x-2">
        <Info className="w-4 h-4 shrink-0 text-[#8A94A6]" />
        <span>Approximate cost estimate is unavailable until matching trade rate cards are configured.</span>
      </div>
    );
  }

  const partsAmount = estimate.partsCost ?? (estimate.requiredParts?.reduce((s, p) => s + p.estimatedCost, 0) || estimate.materialsAllowance || 0);
  const travelAmount = estimate.travelCost ?? estimate.travelRate;
  const labourAmount = estimate.labourCost ?? estimate.baseLabourRate;
  const additionalAmount = estimate.additionalCost ?? 0;

  return (
    <div className="bg-[#171B20] border border-[#272D34] rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#272D34] pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#272D34] text-[#FF6A00] flex items-center justify-center font-bold shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#E7EAEE]">Itemized Repair Cost Estimate</h4>
            <div className="flex items-center space-x-2 text-[11px] text-[#8A94A6]">
              <span>Trade: <strong className="text-[#E7EAEE]">{estimate.skillName}</strong></span>
              {estimate.pricingLocality && (
                <span>• Locality: <strong className="text-[#E7EAEE]">{estimate.pricingLocality}</strong></span>
              )}
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-bold text-[#8A94A6] block tracking-wider">
            Estimated Range
          </span>
          <span className="text-lg font-black text-[#FF9A3C]">
            ₹{estimate.estimatedCostMin} – ₹{estimate.estimatedCostMax}
          </span>
        </div>
      </div>

      {/* 4 Separate Cost Components */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        <div className="bg-[#090B0E] rounded-xl p-3 border border-[#272D34] flex flex-col justify-between">
          <div className="flex items-center justify-center space-x-1 text-[#8A94A6] text-[10px] uppercase tracking-wider font-semibold mb-1">
            <PackageCheck className="w-3 h-3 text-[#FF9A3C]" />
            <span>Replacement Parts</span>
          </div>
          <span className="font-bold text-base text-[#E7EAEE]">₹{partsAmount}</span>
          <span className="text-[10px] text-[#8A94A6] mt-0.5">Market benchmark</span>
        </div>

        <div className="bg-[#090B0E] rounded-xl p-3 border border-[#272D34] flex flex-col justify-between">
          <div className="flex items-center justify-center space-x-1 text-[#8A94A6] text-[10px] uppercase tracking-wider font-semibold mb-1">
            <Navigation className="w-3 h-3 text-[#FF9A3C]" />
            <span>Visiting / Travel</span>
          </div>
          <span className="font-bold text-base text-[#E7EAEE]">₹{travelAmount}</span>
          <span className="text-[10px] text-[#8A94A6] mt-0.5">Local callout & transit</span>
        </div>

        <div className="bg-[#090B0E] rounded-xl p-3 border border-[#272D34] flex flex-col justify-between">
          <div className="flex items-center justify-center space-x-1 text-[#8A94A6] text-[10px] uppercase tracking-wider font-semibold mb-1">
            <Wrench className="w-3 h-3 text-[#FF9A3C]" />
            <span>Labour Charge</span>
          </div>
          <span className="font-bold text-base text-[#E7EAEE]">₹{labourAmount}</span>
          <span className="text-[10px] text-[#8A94A6] mt-0.5">
            {estimate.complexityLevel ? `${estimate.complexityLevel} repair` : 'Trade standard'}
          </span>
        </div>

        <div className="bg-[#090B0E] rounded-xl p-3 border border-[#272D34] flex flex-col justify-between">
          <div className="flex items-center justify-center space-x-1 text-[#8A94A6] text-[10px] uppercase tracking-wider font-semibold mb-1">
            <Info className="w-3 h-3 text-[#FF9A3C]" />
            <span>Consumables</span>
          </div>
          <span className="font-bold text-base text-[#E7EAEE]">₹{additionalAmount}</span>
          <span className="text-[10px] text-[#8A94A6] mt-0.5">Fasteners & seals</span>
        </div>
      </div>

      {/* Required Parts List if populated */}
      {estimate.requiredParts && estimate.requiredParts.length > 0 && (
        <div className="bg-[#090B0E] border border-[#272D34] rounded-xl p-3.5 space-y-2">
          <span className="text-[11px] font-bold text-[#E7EAEE] block">
            Identified Damaged / Replaceable Components:
          </span>
          <div className="space-y-1.5">
            {estimate.requiredParts.map((part, pIdx) => (
              <div
                key={pIdx}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#171B20]/60 border border-[#272D34]/50"
              >
                <div>
                  <span className="font-semibold text-[#E7EAEE] block">{part.name}</span>
                  {part.partSpecification && (
                    <span className="text-[10px] text-[#8A94A6]">{part.partSpecification}</span>
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="font-bold text-sm text-[#FF9A3C]">₹{part.estimatedCost}</span>
                  <span className="text-[9px] text-[#8A94A6] block">{part.priceSource}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicative Total Banner */}
      <div className="flex items-center justify-between pt-1 border-t border-[#272D34] px-1">
        <span className="text-xs font-semibold text-[#8A94A6]">
          Calculated Indicative Total:
        </span>
        <span className="text-xl font-black text-[#FF6A00]">₹{estimate.indicativeTotal}</span>
      </div>

      {/* Factors Affecting Final Price */}
      {estimate.factorsAffectingPrice && estimate.factorsAffectingPrice.length > 0 && (
        <div className="bg-[#090B0E] border border-[#272D34] rounded-xl p-3 space-y-1.5 text-xs text-[#8A94A6]">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#FF9A3C]">
            <AlertCircle className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>What could cause the price to adjust upon on-site physical inspection?</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#8A94A6] pl-1">
            {estimate.factorsAffectingPrice.map((factor, fIdx) => (
              <li key={fIdx}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Required Disclaimer */}
      <div className="bg-[#272D34]/40 border border-[#FF6A00]/25 rounded-xl p-3 text-[11px] text-[#FF9A3C] leading-relaxed flex items-start space-x-2">
        <Info className="w-4 h-4 shrink-0 text-[#FF6A00] mt-0.5" />
        <span>
          {estimate.disclaimer ||
            'Approximate estimate based on verified local hardware benchmarks, trade complexity, and travel rates. Final charges may vary after physical on-site inspection.'}
        </span>
      </div>
    </div>
  );
};

export default CostEstimateCard;
