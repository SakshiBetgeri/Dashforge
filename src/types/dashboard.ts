export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'temporal' | 'boolean' | 'currency' | 'percentage' | 'id' | 'string';
  sampleValue: any;
  nulls: number;
}

export interface DashboardData {
  columns: ColumnInfo[];
  rows: any[];
  fileName: string;
  domain?: string;
  summary?: string;
  charts?: ChartConfig[];
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'donut' | 'pie' | 'scatter' | 'area';
  title: string;
  xAxis: string;
  yAxis: string;
  insight: string;
}

export interface InsightCard {
  type: 'anomaly' | 'trend' | 'opportunity';
  title: string;
  description: string;
  icon?: any;
  action?: string;
}
