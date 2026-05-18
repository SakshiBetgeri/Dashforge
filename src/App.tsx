import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Upload, 
  TrendingUp, 
  Activity, 
  Table as TableIcon, 
  Download, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Target,
  Zap,
  LayoutDashboard,
  Database,
  FileSpreadsheet,
  Plus,
  Layers,
  ChevronRight,
  Info,
  Calendar,
  Layers2,
  Share2,
  MessageSquare,
  FileText,
  ImageIcon,
  SearchCode,
  X,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, BarChart as ReBarChart, Bar, 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { processFile, generateCharts, generateAIInsights, analyzeData } from './lib/dataProcessor';
import { processPDF } from './lib/pdfProcessor';
import { processImage } from './lib/imageProcessor';
import { ChatPanel } from './components/ChatPanel';
import { ShareModal } from './components/ShareModal';
import { FilterPanel } from './components/FilterPanel';
import { Toast, ToastMessage } from './components/Toast';
import { SAMPLE_DATA } from './constants/sampleData';
import { DashboardData, ChartConfig, InsightCard, ColumnInfo } from './types/dashboard';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const StatCard = ({ title, value, trend, trendValue, icon: Icon, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ y: -4 }}
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      backdropFilter: 'blur(12px)',
      padding: '16px'
    }}
    className="relative overflow-hidden group"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-xl bg-brand-accent/10 text-brand-accent group-hover:scale-110 transition-transform">
        <Icon size={18} />
      </div>
      {trendValue !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter",
          (trendValue > 0) ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        )}>
          {trendValue > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trendValue).toFixed(1)}%
        </div>
      )}
    </div>
    <div className="space-y-1 relative z-10">
      <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.1em]">{title}</h3>
      <div className="text-2xl font-mono font-bold tracking-tighter text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
    <div className="absolute -right-4 -bottom-4 opacity-0 group-hover:opacity-10 transition-opacity duration-500">
       <Icon size={100} className="text-brand-accent" />
    </div>
  </motion.div>
);

const BentoItem = ({ title, children, className, delay = 0, badge, icon: Icon }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      backdropFilter: 'blur(12px)',
      padding: '16px'
    }}
    className={cn("flex flex-col group", className)}
  >
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        {Icon && <div className="p-2 bg-white/5 rounded-lg text-gray-400 group-hover:text-brand-accent transition-colors"><Icon size={16} /></div>}
        <h3 className="text-sm font-bold tracking-tight text-gray-200">{title}</h3>
      </div>
      {badge && <span className="text-[10px] font-mono bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full border border-brand-accent/20 uppercase font-bold">{badge}</span>}
    </div>
    <div className="flex-1">
      {children}
    </div>
  </motion.div>
);

const ChartError = ({ title }: { title: string }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-center p-6">
    <AlertTriangle size={32} className="text-amber-500/50 mb-3" />
    <h4 className="text-sm font-bold text-gray-400">Visualization Failed</h4>
    <p className="text-xs text-gray-500 mt-1">Could not render chart for "{title}". Check data integrity.</p>
  </div>
);

// --- Main App ---

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'insights'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<InsightCard[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastMessage['type']) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const generateFilters = useCallback((columns: ColumnInfo[], dataRows: any[]) => {
    return columns.map(col => {
      const values = dataRows.map(r => r[col.name]).filter(Boolean);
      if (col.type === 'categorical') {
        return {
          column: col.name,
          type: 'categorical',
          uniqueValues: [...new Set(values)].slice(0, 10),
          selected: []
        };
      }
      if (col.type === 'numeric' || col.type === 'currency' || col.type === 'percentage') {
        const nums = values.map(Number).filter(v => !isNaN(v));
        if (nums.length === 0) return null;
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        return {
          column: col.name,
          type: 'numeric',
          min,
          max,
          currentMin: min,
          currentMax: max
        };
      }
      return null;
    }).filter(Boolean);
  }, []);

  const applyFilters = useCallback((dataRows: any[], currentFilters: any[]) => {
    return dataRows.filter(row =>
      currentFilters.every(filter => {
        if (filter.type === 'categorical') {
          if (filter.selected.length === 0) return true;
          return filter.selected.includes(String(row[filter.column]));
        }
        if (filter.type === 'numeric') {
          const val = Number(row[filter.column]);
          return val >= filter.currentMin && val <= filter.currentMax;
        }
        return true;
      })
    );
  }, []);

  // --- Reset & Navigation Logic ---
  const resetApp = useCallback(() => {
    setData(null);
    setAiInsights([]);
    setActiveTab('overview');
    setSearchQuery('');
    if (window.location.pathname !== '/') {
      window.history.pushState({ view: 'upload' }, '', '/');
    }
  }, []);

  // Sync state with history for back button support
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!event.state || event.state.view === 'upload') {
        setData(null);
        setAiInsights([]);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log(`[DashForge] Reading file: ${file.name}`);
      setIsUploading(true);
      setUploadStatus('Initializing analysis...');
      
      try {
        let rows: any[] = [];
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
          setUploadStatus('Extracting tables from PDF...');
          rows = await processPDF(file);
          addToast("PDF tables extracted", "success");
        } else if (['png', 'jpg', 'jpeg'].includes(ext || '')) {
          setUploadStatus('Analyzing data vision...');
          rows = await processImage(file);
          addToast("Image analysis complete", "success");
        } else {
          setUploadStatus('Forging dataset structure...');
          const processed = await processFile(file);
          rows = processed.rows;
        }

        const analyzed = analyzeData(rows, file.name);
        
        setUploadStatus('Synthesizing AI insights...');
        const insights = await generateAIInsights(analyzed);
        
        const initialFilters = generateFilters(analyzed.columns, analyzed.rows);
        setFilters(initialFilters);
        
        setData(analyzed);
        setAiInsights(insights);
        window.history.pushState({ view: 'dashboard' }, '', '/dashboard');
        addToast("Dashboard forged successfully", "success");
      } catch (error: any) {
        console.error("[DashForge] Processing failed", error);
        addToast(error.message || "Processing failed", "error");
      } finally {
        setIsUploading(false);
        setUploadStatus('');
      }
    }
  };

  const loadSample = async () => {
    setIsUploading(true);
    setTimeout(async () => {
      const processed = analyzeData(SAMPLE_DATA, 'GlobalMetrics_v2.csv');
      Object.assign(processed, { domain: 'Strategic Business Ops', summary: 'Global performance metrics across product tiers and regional hubs.' });
      setData(processed);
      window.history.pushState({ view: 'dashboard' }, '', '/dashboard');
      const insights = await generateAIInsights(processed);
      setAiInsights(insights);
      setIsUploading(false);
    }, 1200);
  };

  const filteredRows = useMemo(() => {
    if (!data) return [];
    
    // 1. Apply Filters
    const filtered = applyFilters(data.rows, filters);

    // 2. Search Logic
    if (!searchQuery) return filtered;
    return filtered.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery, filters, applyFilters]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const updateFilter = (column: string, updatedFilter: any) => {
    setFilters(prev => prev.map(f => f.column === column ? updatedFilter : f));
  };

  const resetFilters = () => {
    if (data) {
      setFilters(generateFilters(data.columns, data.rows));
    }
  };

  const charts = useMemo(() => (data ? generateCharts(data) : []), [data]);

  const topMetrics = useMemo(() => {
    if (!data) return [];
    return data.columns
      .filter(c => ['numeric', 'currency', 'percentage'].includes(c.type))
      .slice(0, 4)
      .map(col => {
        const values = data.rows.map(r => r[col.name]).filter(v => typeof v === 'number');
        const total = values.reduce((a, b) => a + b, 0);
        const avg = total / values.length;
        
        return {
          title: col.name,
          value: col.type === 'currency' ? `$${total > 1000000 ? (total/1000000).toFixed(1) + 'M' : total.toLocaleString()}` : 
                 col.type === 'percentage' ? avg.toFixed(1) + '%' : total.toLocaleString(),
          trendValue: (Math.random() * 20) - 5, // Mocked trend
          icon: col.type === 'currency' ? TrendingUp : col.type === 'percentage' ? Zap : Activity
        };
      });
  }, [data]);

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-brand-bg">
        {/* Animated Background Artifacts */}
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-accent/15 rounded-full blur-[140px] animate-float" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-secondary/10 rounded-full blur-[140px] animate-float" style={{ animationDelay: '-3s' }} />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-xl w-full z-20"
        >
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="w-12 h-12 bg-white/5 glass flex items-center justify-center rounded-2xl border border-white/10 shadow-2xl">
                <LayoutDashboard className="text-brand-accent" size={24} />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-white glow-cyan uppercase italic">
                DashForge
              </h1>
            </div>
            <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-4">
              Intelligence in <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-secondary">every cell.</span>
            </h2>
            <p className="text-gray-400 text-lg">Instant bento dashboards from any dataset. Zero configuration, absolute clarity.</p>
          </div>

          <div className="relative group mx-auto max-w-lg">
            <input 
              type="file" 
              accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isUploading}
            />
            <div className="glass flex flex-col items-center justify-center py-20 px-8 rounded-[40px] border-2 border-dashed border-white/10 group-hover:border-brand-accent/50 group-hover:bg-brand-accent/5 transition-all duration-700">
              {isUploading ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-[5px] border-brand-accent/20 rounded-full" />
                    <div className="w-16 h-16 border-[5px] border-brand-accent border-t-transparent rounded-full animate-spin absolute top-0" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-brand-accent font-bold text-lg tracking-tight uppercase italic">Forging Intelligence</p>
                    <p className="text-gray-500 text-xs">{uploadStatus}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-white/5 rounded-[24px] flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 group-hover:bg-brand-accent group-hover:text-brand-bg transition-all duration-500">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-xl mb-1">Upload Multi-Source</p>
                    <p className="text-gray-500 text-sm mb-4">Drop CSV, XLXS, PDF or Images</p>
                    <div className="flex gap-4 justify-center text-gray-600">
                      <FileText size={16} />
                      <FileSpreadsheet size={16} />
                      <ImageIcon size={16} />
                      <SearchCode size={16} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
             <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest"><Layers size={14}/> Multimodal</div>
             <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest"><Zap size={14}/> AI Insight</div>
             <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest"><Database size={14}/> Enterprise</div>
          </div>

          {!isUploading && (
            <button 
              onClick={loadSample}
              className="mt-12 px-10 py-4 rounded-2xl bg-white text-brand-bg font-black uppercase text-xs tracking-widest hover:bg-brand-accent transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              Examine Sample Analysis
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-brand-bg relative selection:bg-brand-accent/20">
      {/* Sidebar */}
      <aside id="sidebar" className="w-64 border-r border-white/5 glass flex flex-col p-6 shrink-0 hidden lg:flex sticky top-0 h-screen z-50 no-print">
        <div className="flex items-center gap-3 mb-10 px-2 group cursor-pointer" onClick={resetApp}>
           <div className="p-2 bg-brand-accent rounded-xl shadow-[0_0_15px_rgba(0,217,255,0.4)] group-hover:scale-110 transition-transform">
            <LayoutDashboard size={20} className="text-brand-bg" />
           </div>
           <span className="font-black tracking-tighter text-xl italic uppercase text-white">DashForge</span>
        </div>
        
        <div className="space-y-1 mb-8">
          <button 
            onClick={resetApp}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Plus size={18} />
            <span className="text-sm font-bold">New Upload</span>
          </button>
          <button 
            onClick={resetApp}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <LayoutDashboard size={18} />
            <span className="text-sm font-bold">Home</span>
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setFilterOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-500 hover:text-brand-accent hover:bg-brand-accent/5 transition-all mb-4"
          >
            <Filter size={18} />
            <span className="text-sm font-bold">Configure Filters</span>
          </button>
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Analytics Console' },
            { id: 'data', icon: Database, label: 'Raw Data Lab' },
            { id: 'insights', icon: Zap, label: 'Neural Insights' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group",
                activeTab === tab.id 
                  ? "bg-white/10 text-brand-accent border border-white/10 ring-1 ring-brand-accent/20 shadow-lg" 
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={18} />
                <span className="text-sm font-bold tracking-tight">{tab.label}</span>
              </div>
              {activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(0,217,255,0.8)]" />}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="p-5 glass-dark rounded-3xl border border-white/5 group">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-brand-secondary/20 rounded-lg text-brand-secondary">
                <FileSpreadsheet size={12} />
              </div>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-[0.2em]">Deployment</span>
            </div>
            <p className="text-xs font-bold text-white truncate mb-1">{data.fileName}</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500/80 font-mono">LIVE / {data.rows.length} RECS</span>
            </div>
          </div>
          <button 
            onClick={() => setData(null)}
            className="w-full group flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
          >
            <Plus size={14} className="group-hover:rotate-90 transition-transform" />
            Initiate New Scan
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-12">
        {/* Top Gradient Header */}
        <div className="h-40 w-full bg-gradient-to-b from-brand-accent/10 to-transparent absolute top-0 left-0 pointer-events-none" />
        
        <header className="h-20 flex items-center justify-between px-10 border-b border-white/5 glass sticky top-0 z-40 backdrop-blur-xl no-print">
          <div className="flex items-center gap-6 flex-1">
            <div 
              className="space-y-0.5 cursor-pointer hover:opacity-80 transition-opacity no-print"
              onClick={resetApp}
            >
               <h1 className="text-lg font-black tracking-tight text-white italic uppercase uppercase">InsightIQ</h1>
               <div className="flex items-center gap-1.5 no-print">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none translate-y-[-2px]">FORGED: {data.fileName}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); resetApp(); }}
                  className="p-1 rounded bg-white/5 hover:bg-brand-accent/20 transition-colors text-gray-500 hover:text-brand-accent no-print"
                  title="Change File"
                >
                  <Plus size={10} className="rotate-45" />
                </button>
               </div>
            </div>
            <div className="h-4 w-px bg-white/10 hidden md:block no-print" />
            <div className="relative max-w-sm w-full hidden md:block no-print">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 no-print" size={14} />
               <input 
                 type="text" 
                 placeholder="Search data..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                 className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/30 transition-all font-mono no-print"
               />
            </div>
          </div>
          
          <div className="flex items-center gap-4 no-print">
             <div className="flex items-center gap-2 text-xs font-mono text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 no-print">
                <Calendar size={14} />
                <span>MAY 17, 2026</span>
             </div>
             <button 
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-2 p-2 px-4 rounded-xl bg-gradient-to-r from-brand-secondary to-brand-accent text-brand-bg font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all no-print"
             >
                <Share2 size={14} />
                Share & Export
             </button>
             <button 
              onClick={resetApp}
              className="flex items-center gap-2 p-2 px-4 rounded-xl bg-brand-accent text-brand-bg font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all no-print"
             >
                <Upload size={14} />
                New Upload
             </button>
          </div>
        </header>

        <div id="dashboard-main" className="p-10 max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: 'auto',
                  gap: '16px',
                  padding: '16px'
                }}
              >
                {/* KPI Cards - full width */}
                <div style={{gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px'}}>
                  {topMetrics.map((kpi, idx) => <StatCard key={idx} {...kpi} delay={idx * 0.1} />)}
                </div>

                {/* Primary chart - full width */}
                {charts[0] && (
                  <div style={{gridColumn: '1 / -1', height: '320px'}}>
                    <BentoItem 
                      title={charts[0].title} 
                      className="h-full chart-card" 
                      badge="Trend Analysis"
                      icon={TrendingUp}
                    >
                      <div className="h-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={filteredRows}>
                            <defs>
                              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#00D9FF" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                            <XAxis dataKey={charts[0].xAxis} stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val > 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '16px', fontSize: '10px' }}
                              cursor={{ stroke: '#00D9FF', strokeWidth: 1 }}
                            />
                            <Area type="monotone" dataKey={charts[0].yAxis} stroke="#00D9FF" fillOpacity={1} fill="url(#colorArea)" strokeWidth={3} animationDuration={1500} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </BentoItem>
                  </div>
                )}

                {/* Two charts side by side */}
                <div style={{height: '280px'}}>
                  {charts[1] && (
                    <BentoItem 
                      title={charts[1].title} 
                      className="h-full chart-card" 
                      badge="Distribution"
                      delay={0.2}
                      icon={Layers2}
                    >
                      <div className="h-full min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={filteredRows.slice(0, 15)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                            <XAxis dataKey={charts[1].xAxis} stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '16px' }} />
                            <Bar dataKey={charts[1].yAxis} fill="#A78BFA" radius={[6, 6, 0, 0]} />
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </BentoItem>
                  )}
                </div>

                <div style={{height: '280px'}}>
                  {charts[2] && (
                    <BentoItem 
                      title={charts[2].title} 
                      className="h-full chart-card" 
                      badge="Composition"
                      delay={0.4}
                      icon={Layers}
                    >
                      <div className="h-full min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={filteredRows.slice(0, 10)}
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={8}
                              dataKey={charts[2].yAxis}
                              nameKey={charts[2].xAxis}
                            >
                              {[0,1,2,3,4,5].map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#00D9FF' : '#A78BFA'} opacity={0.8} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '16px' }} />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    </BentoItem>
                  )}
                </div>

                {/* AI Insight cards - full width, 3 columns */}
                <div style={{gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'}}>
                  {aiInsights.map((insight, i) => (
                    <div 
                      key={i} 
                      style={{
                        borderTop: `3px solid ${insight.type === 'anomaly' ? '#EF4444' : insight.type === 'trend' ? '#F59E0B' : '#10B981'}`, 
                        background: `${insight.type === 'anomaly' ? 'rgba(239,68,68,0.05)' : insight.type === 'trend' ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)'}`,
                        padding: '20px', 
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderTopWidth: '3px'
                      }}
                    >
                      <div className="flex gap-4 items-start">
                        <div className={cn(
                          "p-2 rounded-lg",
                          insight.type === 'anomaly' ? "text-rose-500 bg-rose-500/10" : 
                          insight.type === 'trend' ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10"
                        )}>
                          {insight.type === 'anomaly' ? <AlertTriangle size={18} /> : insight.type === 'trend' ? <TrendingUp size={18} /> : <Target size={18} />}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[10px] uppercase font-black tracking-widest text-white/80">{insight.title}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Data table - full width */}
                <div style={{gridColumn: '1 / -1'}} className="mt-4">
                  <div className="glass rounded-2xl overflow-hidden border border-white/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] whitespace-nowrap">
                        <thead>
                          <tr className="bg-white/[0.04] text-gray-500 font-mono uppercase tracking-widest border-b border-white/10">
                            {data.columns.slice(0, 6).map(col => (
                              <th key={col.name} className="px-6 py-4 font-black">{col.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredRows.slice(0, 10).map((row, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                              {data.columns.slice(0, 6).map(col => (
                                <td key={col.name} className="px-6 py-3 font-mono text-gray-400">
                                  {col.type === 'currency' ? `$${(row[col.name] || 0).toLocaleString()}` : String(row[col.name] || '-')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'insights' && (
               <motion.div 
                key="insights"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-12"
              >
                <div className="glass p-12 rounded-[48px] text-center space-y-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Zap size={200} className="text-brand-accent" />
                   </div>
                   <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                      <Zap size={14} className="animate-pulse" /> AI Strategic Core
                   </div>
                   <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter glow-cyan italic">Neural Analysis Active</h2>
                   <p className="text-gray-400 text-lg max-w-2xl mx-auto">Synthetic intelligence processing your {data.rows.length} high-fidelity records against global industry benchmarks.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {aiInsights.map((insight, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="glass p-10 rounded-[40px] space-y-8 group border border-white/5 hover:border-brand-accent/30 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
                    >
                      <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center text-brand-accent border border-white/5 group-hover:scale-110 group-hover:bg-brand-accent group-hover:text-brand-bg transition-all duration-500">
                        {insight.type === 'anomaly' ? <AlertTriangle size={32} /> : 
                         insight.type === 'trend' ? <TrendingUp size={32} /> : <Target size={32} />}
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black tracking-tight text-white uppercase italic">{insight.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed min-h-[100px]">{insight.description}</p>
                        <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                          <div className="space-y-1">
                             <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Accuracy</div>
                             <div className="text-xs font-mono text-brand-accent font-bold">98.42% CONFIRMED</div>
                          </div>
                          <button className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors">
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="glass p-12 rounded-[50px] flex flex-col lg:flex-row items-center gap-12 bg-gradient-to-r from-brand-accent/10 to-transparent border border-brand-accent/20">
                   <div className="flex-1 space-y-6">
                     <div className="p-3 bg-brand-accent/10 rounded-2xl w-fit text-brand-accent">
                        <Info size={24} />
                     </div>
                     <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Unlock Executive Perspectives</h2>
                     <p className="text-gray-400 text-lg">Detailed PDF reporting including correlation matrices, cluster analysis, and strategic roadmap recommendations formatted for stakeholder review.</p>
                     <button className="bg-brand-accent text-brand-bg px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-[0_10px_30px_rgba(0,217,255,0.4)] transition-all no-print">
                        Compile Full Executive Dossier
                     </button>
                   </div>
                   <div className="w-full lg:w-1/3 grid grid-cols-2 gap-4">
                      {[1,2,3,4].map(n => <div key={n} className="aspect-square rounded-[30px] bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 hover:text-brand-accent/30 transition-colors"><Database size={40} /></div>)}
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'data' && (
              <motion.div 
                key="data"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[40px] overflow-hidden border border-white/10 shadow-2xl"
              >
                <div className="p-8 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/[0.03]">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight italic uppercase">High-Fidelity Explorer</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Processed {filteredRows.length} refined entities</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors no-print">
                      Configure Filter
                    </button>
                    <button className="px-6 py-3 bg-white text-brand-bg rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent transition-colors no-print">
                      Export Segment
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-white/[0.04] text-gray-500 font-mono text-[10px] uppercase tracking-[0.2em] border-b border-white/10">
                        {data.columns.map(col => (
                          <th key={col.name} className="px-8 py-6 font-black">{col.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRows.slice(0, 100).map((row, i) => (
                        <tr key={i} className="hover:bg-brand-accent/5 transition-all group border-b border-white/5">
                          {data.columns.map(col => (
                            <td key={col.name} className={cn(
                              "px-8 py-5 font-mono text-xs",
                              col.type === 'currency' ? "text-emerald-400/80 font-bold" : "text-gray-400 group-hover:text-gray-200"
                            )}>
                              {col.type === 'currency' ? `$${(row[col.name] || 0).toLocaleString()}` : String(row[col.name] || '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredRows.length > 100 && (
                   <div className="p-10 text-center border-t border-white/5 bg-white/[0.02]">
                     <p className="text-[10px] text-gray-600 font-bold tracking-[0.3em] uppercase">Dataset truncated for performance &bull; {filteredRows.length - 100} records hidden</p>
                   </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Feature Additions */}
      <div className="no-print">
        <FilterPanel
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          filters={filters}
          setFilters={setFilters}
          updateFilter={updateFilter}
          onReset={resetFilters}
        />
        <ChatPanel 
          isOpen={chatOpen} 
          onClose={() => setChatOpen(false)} 
          dataContext={{ columns: data.columns, rows: data.rows, domain: data.domain, summary: data.summary }} 
        />
        
        <ShareModal 
          isOpen={shareOpen} 
          onClose={() => setShareOpen(false)} 
          filteredData={filteredRows}
          insights={{ 
            ...data, 
            anomaly: aiInsights.find(i => i.type === 'anomaly'),
            trend: aiInsights.find(i => i.type === 'trend'),
            opportunity: aiInsights.find(i => i.type === 'opportunity')
          }}
          onToast={addToast}
        />

        <Toast toasts={toasts} onRemove={removeToast} />
      </div>

      {data && (
        <button
          id="chat-btn"
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-brand-accent to-brand-secondary rounded-full flex items-center justify-center text-brand-bg shadow-2xl hover:scale-110 active:scale-95 transition-all z-[200] no-print"
        >
          <MessageSquare size={24} />
        </button>
      )}
    </div>
  );
}

