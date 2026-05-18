import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Table, Copy, Check, Lock } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredData: any[];
  insights: any;
  onToast: (msg: string, type: 'success' | 'error' | 'copy') => void;
}

export function ShareModal({ isOpen, onClose, filteredData, insights, onToast }: ShareModalProps) {
  const [isCopied, setIsCopied] = React.useState(false);

  const exportCSV = () => {
    if (!filteredData?.length) { alert('No data!'); return; }
    const headers = Object.keys(filteredData[0]).join(',');
    const rows = filteredData.map(row =>
      Object.values(row).map(v =>
        typeof v === 'string' && v.includes(',') ? '"'+v+'"' : v
      ).join(',')
    ).join('\n');
    const blob = new Blob([headers+'\n'+rows], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'insightiq-'+Date.now()+'.csv';
    a.click();
    alert('✓ CSV Downloaded!');
  };

  const copyInsights = () => {
    const text = `InsightIQ Report - ${new Date().toLocaleString()}
Domain: ${insights?.domain}
Summary: ${insights?.summary}
Anomaly: ${insights?.anomaly?.title} - ${insights?.anomaly?.description}
Trend: ${insights?.trend?.title} - ${insights?.trend?.description}
Opportunity: ${insights?.opportunity?.title} - ${insights?.opportunity?.description}`;
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('✓ Report Copied!');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 no-print">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass rounded-[48px] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent">
                  <Share2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Intelligence Export</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Select format for deployment</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-2">Download Formats</h3>
                <button
                  onClick={exportCSV}
                  className="w-full flex items-center gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-brand-accent/30 hover:bg-white/[0.05] transition-all group cursor-pointer"
                >
                  <div className="p-3 bg-white/5 rounded-xl text-gray-400 group-hover:text-brand-accent transition-colors">
                    <Table size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white uppercase italic">Clean CSV</div>
                    <div className="text-[10px] text-gray-500 font-medium">Best for re-analysis</div>
                  </div>
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-2">Cloud Distribution</h3>
                <div className="p-8 rounded-[40px] bg-brand-accent/5 border border-brand-accent/10 space-y-6">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg">
                        <Lock size={14} />
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Private Analysis Report</span>
                   </div>
                   <p className="text-xs text-gray-400 leading-relaxed italic">Copy the full AI report in markdown format for newsletters or management decks.</p>
                   
                   <button 
                     onClick={copyInsights}
                     className="w-full flex items-center justify-center gap-3 py-4 bg-brand-accent text-brand-bg rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                   >
                      {isCopied ? <Check size={16} /> : <Copy size={16} />}
                      {isCopied ? 'Copied Report!' : 'Copy AI Report'}
                   </button>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex justify-center">
               <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] italic">DashForge Security Protocol v4.2 Enforced</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
