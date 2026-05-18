import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnInfo, DashboardData, ChartConfig, InsightCard } from '../types/dashboard';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getStatisticalInsights, detectDomain } from './statsUtils';

const genAI = new GoogleGenerativeAI("PASTE_YOUR_GEMINI_KEY_HERE");

export const processFile = async (file: File): Promise<DashboardData> => {
  console.log(`[DashForge] Starting parse for: ${file.name} (${file.size} bytes)`);
  
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const analyzed = analyzeData(results.data, file.name);
            resolve(analyzed);
          } catch (err) {
            reject(err);
          }
        },
        error: (error) => reject(error),
      });
    } else if (['xlsx', 'xls'].includes(extension || '')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          const analyzed = analyzeData(json, file.name);
          resolve(analyzed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Unsupported file format. Please upload CSV or Excel.'));
    }
  });
};

export const analyzeData = (rows: any[], fileName: string): DashboardData => {
  if (rows.length === 0) return { columns: [], rows: [], fileName, charts: [], domain: 'Empty Dataset', summary: 'No data records found.' };

  const cleanRows = rows.filter(row => Object.values(row).some(v => v !== null && v !== undefined && v !== ''));
  const firstSignificantRow = cleanRows[0];
  
  const columns: ColumnInfo[] = Object.keys(firstSignificantRow).map((key) => {
    const values = cleanRows.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== '');
    const sampleValue = values[0];
    const nulls = cleanRows.length - values.length;
    
    let type: ColumnInfo['type'] = 'string';
    const lowerKey = key.toLowerCase();

    if (typeof sampleValue === 'number' || (!isNaN(Number(sampleValue)) && String(sampleValue).trim() !== '')) {
      if (lowerKey.includes('id')) type = 'id';
      else if (lowerKey.includes('price') || lowerKey.includes('revenue') || lowerKey.includes('amount') || lowerKey.includes('cost')) type = 'currency';
      else if (lowerKey.includes('percent') || lowerKey.includes('rate') || String(sampleValue).includes('%')) type = 'percentage';
      else type = 'numeric';
    } else if (typeof sampleValue === 'boolean') {
      type = 'boolean';
    } else if (isValidDate(sampleValue) || lowerKey.includes('date')) {
      type = 'temporal';
    } else if (values.length > 0 && new Set(values).size < values.length * 0.4) {
      type = 'categorical';
    }

    return { name: key, type, sampleValue, nulls };
  });

  const stats = getStatisticalInsights(columns, cleanRows);
  const charts = generateCharts({ columns, rows: cleanRows, fileName, domain: stats.domain, summary: stats.summary, charts: [] });

  return { 
    columns, 
    rows: cleanRows, 
    fileName, 
    domain: stats.domain, 
    summary: stats.summary,
    charts 
  };
};

const isValidDate = (val: any) => {
  if (!val) return false;
  if (typeof val === 'number') return false; 
  if (typeof val === 'string' && val.length < 4) return false;
  const d = new Date(val);
  return d instanceof Date && !isNaN(d.getTime());
};

export const generateCharts = (data: DashboardData): ChartConfig[] => {
  const { columns, rows } = data;
  const charts: ChartConfig[] = [];
  
  const temporal = columns.find(c => c.type === 'temporal');
  const numeric = columns.filter(c => ['numeric', 'currency', 'percentage'].includes(c.type));
  const categorical = columns.filter(c => c.type === 'categorical');

  if (temporal && numeric.length > 0) {
    charts.push({
      id: 'time-series',
      type: 'area',
      title: `${numeric[0].name} Timeline`,
      xAxis: temporal.name,
      yAxis: numeric[0].name,
      insight: `Evolution of ${numeric[0].name} over the selected temporal dimension.`
    });
  }

  if (categorical.length > 0 && numeric.length > 0) {
    const cat = categorical[0];
    const num = numeric.length > 1 ? numeric[1] : numeric[0];
    charts.push({
      id: 'distribution',
      type: 'bar',
      title: `${num.name} by ${cat.name}`,
      xAxis: cat.name,
      yAxis: num.name,
      insight: `Comparative analysis of ${num.name} across ${cat.name} segments.`
    });
  }

  if (categorical.length > 1 && numeric.length > 0) {
    const cat = categorical[1];
    const num = numeric[0];
    charts.push({
      id: 'composition',
      type: 'donut',
      title: `${cat.name} Composition`,
      xAxis: cat.name,
      yAxis: num.name,
      insight: `Proportional weighting of ${cat.name} based on ${num.name}.`
    });
  }

  if (numeric.length >= 2) {
    charts.push({
      id: 'correlation',
      type: 'scatter',
      title: `${numeric[0].name} vs ${numeric[1].name}`,
      xAxis: numeric[0].name,
      yAxis: numeric[1].name,
      insight: `Testing relationship between ${numeric[0].name} and ${numeric[1].name}.`
    });
  }

  return charts.slice(0, 4);
};

export const generateAIInsights = async (data: DashboardData): Promise<InsightCard[]> => {
  const stats = getStatisticalInsights(data.columns, data.rows);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
      Analyze this ${stats.domain} dataset summary and provide 3 strategic business insights.
      Dataset: ${data.fileName}
      Summary: ${stats.summary}
      Columns: ${JSON.stringify(data.columns.map(c => c.name))}
      Sample: ${JSON.stringify(data.rows.slice(0, 5))}
      
      Return a valid JSON array of 3 objects with keys: type (anomaly, trend, opportunity), title, description, action.
      Return ONLY the JSON array.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.warn("[InsightIQ] AI Insight failed, using fallback", error);
    return stats.insights;
  }
};
