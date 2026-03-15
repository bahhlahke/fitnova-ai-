"use client";

import React from "react";
import { X, Activity, Zap, ShieldAlert, BarChart3, Info } from "lucide-react";
import { Button } from "@/components/ui";

interface SupportingData {
  headline: string;
  value: string;
  context: string;
  type: "chart" | "stat" | "text";
}

interface CoachInsight {
  title: string;
  message: string;
  urgency: "low" | "medium" | "high";
  cta_route?: string;
  supporting_data?: SupportingData;
}

interface CoachInsightDetailProps {
  insight: CoachInsight;
  onClose: () => void;
}

export const CoachInsightDetail: React.FC<CoachInsightDetailProps> = ({
  insight,
  onClose,
}) => {
  const urgencyColor =
    insight.urgency === "high"
      ? "text-red-400 stroke-red-400"
      : insight.urgency === "medium"
      ? "text-amber-400 stroke-amber-400"
      : "text-fn-accent stroke-fn-accent";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-fn-bg/80 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-panel-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background elements */}
        <div className={`absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[100px] opacity-20 ${insight.urgency === 'high' ? 'bg-red-500' : 'bg-fn-accent'}`} />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5 blur-[100px]" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`rounded-2xl bg-white/[0.03] border border-white/10 p-3 ${urgencyColor}`}>
                {insight.urgency === "high" ? <ShieldAlert size={24} /> : insight.urgency === "medium" ? <Zap size={24} /> : <Activity size={24} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Elite Insight Analysis</p>
                <h2 className="text-2xl font-display font-black italic tracking-tight text-white uppercase">{insight.title}</h2>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
              <p className="text-lg leading-relaxed text-white/90 italic font-medium">
                &ldquo;{insight.message}&rdquo;
              </p>
            </div>

            {insight.supporting_data && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-fn-accent" />
                  <p className="text-xs font-black uppercase tracking-widest text-fn-accent">Supporting Metrics</p>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-1">
                  <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:bg-white/[0.05]">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">{insight.supporting_data.headline}</p>
                        <p className="text-4xl font-display font-black italic tracking-tighter text-white">{insight.supporting_data.value}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-fn-accent bg-fn-accent/10 px-3 py-1 rounded-full">{insight.supporting_data.context}</p>
                      </div>
                    </div>
                    {insight.supporting_data.type === 'chart' && (
                      <div className="mt-6 h-12 flex items-end gap-1 px-1">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 95, 75].map((h, i) => (
                          <div 
                            key={i} 
                            className="flex-1 bg-fn-accent/20 rounded-t-sm group-hover:bg-fn-accent/40 transition-all duration-500"
                            style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                <Info size={16} className="mt-1 text-white/40" />
                <p className="text-xs leading-relaxed text-white/50">
                  This analysis is synthesized from your latest {insight.supporting_data?.headline?.toLocaleLowerCase() || 'biometric'} signals and historical performance trends. 
                </p>
              </div>
              
              <div className="flex gap-3 mt-4">
                {insight.cta_route && (
                  <Button 
                    className="flex-1 h-14 text-xs font-black uppercase tracking-[0.2em]"
                    onClick={() => window.location.href = insight.cta_route!}
                  >
                    Action on Insight
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  className={`h-14 text-xs font-black uppercase tracking-[0.2em] ${insight.cta_route ? 'px-8' : 'flex-1'}`}
                  onClick={onClose}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
