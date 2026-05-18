import { ColumnInfo, InsightCard } from '../types/dashboard';

export const detectDomain = (columns: ColumnInfo[]) => {
  const names = columns.map(c => c.name.toLowerCase()).join(' ');
  if (names.match(/patient|health|medical|diagnosis|hospital|drug|disease/)) return 'Healthcare Analytics';
  if (names.match(/sales|revenue|profit|order|customer|product/)) return 'Sales Performance';
  if (names.match(/employee|salary|department|hr|hire|performance/)) return 'HR Dashboard';
  if (names.match(/student|grade|score|course|education/)) return 'Education Analytics';
  if (names.match(/stock|price|market|trade|finance|investment/)) return 'Financial Analytics';
  return 'Data Analytics Dashboard';
};

export const getStatisticalInsights = (columns: ColumnInfo[], data: any[]) => {
  const numericCols = columns.filter(c => c.type === 'numeric' || c.type === 'currency');
  const categoricalCols = columns.filter(c => c.type === 'categorical' || c.type === 'temporal');
  
  const topCol = numericCols[0]?.name || (columns.length > 0 ? columns[0].name : 'value');
  const catCol = categoricalCols[0]?.name || (columns.length > 1 ? columns[1].name : 'category');
  
  const values = data.map(r => Number(r[topCol])).filter(v => !isNaN(v));
  if (values.length === 0) {
    return {
      domain: detectDomain(columns),
      summary: `Analyzed ${data.length} records. No significant numeric trends detected.`,
      insights: []
    };
  }

  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
  const max = Math.max(...values).toFixed(2);
  const min = Math.min(...values).toFixed(2);
  const uniqueCats = [...new Set(data.map(r => r[catCol]))].length;

  const insights: InsightCard[] = [
    {
      type: 'anomaly',
      title: `Extreme Range in ${topCol}`,
      description: `Values span from ${min} to ${max} — a ${((Number(max)-Number(min))/Number(avg)*100).toFixed(0)}% variance indicating significant outliers.`,
      action: `Investigate records where ${topCol} deviates more than 50% from average ${avg}`
    },
    {
      type: 'trend',
      title: `${topCol} Performance Pattern`,
      description: `Average ${topCol} is ${avg}. Top performers reach ${max} which is ${((Number(max)/Number(avg)-1)*100).toFixed(0)}% above average.`,
      action: `Identify and replicate conditions of top performing ${catCol} segments`
    },
    {
      type: 'opportunity',
      title: `High Value Segment Identified`,
      description: `Records above ${(Number(avg)*1.2).toFixed(2)} represent top 20% by ${topCol} — highest ROI potential.`,
      action: `Prioritize resources toward ${catCol} segments with ${topCol} above ${(Number(avg)*1.2).toFixed(2)}`
    }
  ];

  return {
    domain: detectDomain(columns),
    summary: `Dataset has ${data.length} records across ${columns.length} columns. Average ${topCol} is ${avg} ranging from ${min} to ${max} across ${uniqueCats} ${catCol} categories.`,
    insights
  };
};

export const answerFromData = (message: string, columns: any[], data: any[]) => {
  const msg = message.toLowerCase().trim();
  const numericCols = columns.filter(c => c.type === 'numeric' || c.type === 'currency' || c.type === 'percentage');
  const categoricalCols = columns.filter(c => c.type === 'categorical');

  // Find which column user is asking about
  const mentionedCol = columns.find(c => 
    msg.includes(c.name.toLowerCase())
  );

  // Helper functions
  const getValues = (colName: string) => 
    data.map(r => Number(r[colName])).filter(v => !isNaN(v));
  const getAvg = (vals: number[]) => 
    vals.length ? (vals.reduce((a,b) => a+b,0) / vals.length).toFixed(2) : '0';
  const getMax = (vals: number[]) => vals.length ? Math.max(...vals).toFixed(2) : '0';
  const getMin = (vals: number[]) => vals.length ? Math.min(...vals).toFixed(2) : '0';
  const getSum = (vals: number[]) => vals.reduce((a,b) => a+b,0).toFixed(2);

  // If user mentions a specific column
  if (mentionedCol) {
    const vals = getValues(mentionedCol.name);
    if (vals.length > 0) {
      if (msg.includes('average') || msg.includes('avg') || msg.includes('mean'))
        return `The average ${mentionedCol.name} is ${getAvg(vals)} across ${vals.length} records.`;
      if (msg.includes('max') || msg.includes('highest') || msg.includes('most') || msg.includes('best'))
        return `The highest ${mentionedCol.name} is ${getMax(vals)}.`;
      if (msg.includes('min') || msg.includes('lowest') || msg.includes('least') || msg.includes('worst'))
        return `The lowest ${mentionedCol.name} is ${getMin(vals)}.`;
      if (msg.includes('total') || msg.includes('sum'))
        return `The total ${mentionedCol.name} is ${getSum(vals)}.`;
      if (msg.includes('distribution') || msg.includes('spread') || msg.includes('range'))
        return `${mentionedCol.name} ranges from ${getMin(vals)} to ${getMax(vals)} with an average of ${getAvg(vals)}.`;
      return `${mentionedCol.name}: Average ${getAvg(vals)}, Max ${getMax(vals)}, Min ${getMin(vals)}, Total ${getSum(vals)}.`;
    }
    // Categorical column
    const uniqueVals = [...new Set(data.map(r => r[mentionedCol.name]).filter(Boolean))];
    const counts = uniqueVals.map(v => ({
      value: v,
      count: data.filter(r => r[mentionedCol.name] === v).length
    })).sort((a: any, b: any) => b.count - a.count);
    
    if (msg.includes('most') || msg.includes('top') || msg.includes('best') || msg.includes('highest'))
      return `Most frequent ${mentionedCol.name} is "${counts[0]?.value}" with ${counts[0]?.count} records.`;
    if (msg.includes('least') || msg.includes('lowest') || msg.includes('worst'))
      return `Least frequent ${mentionedCol.name} is "${counts[counts.length-1]?.value}" with ${counts[counts.length-1]?.count} records.`;
    return `${mentionedCol.name} has ${uniqueVals.length} unique values. Top: "${counts[0]?.value}" (${counts[0]?.count} records), "${counts[1]?.value}" (${counts[1]?.count} records).`;
  }

  // General questions without specific column
  const topNumCol = numericCols[0]?.name;
  const topCatCol = categoricalCols[0]?.name;
  const topVals = topNumCol ? getValues(topNumCol) : [];

  // Row/record count
  if (msg.includes('how many') && (msg.includes('row') || msg.includes('record') || msg.includes('entry') || msg.includes('data')))
    return `Your dataset has ${data.length} records (rows) and ${columns.length} columns.`;

  // Column info
  if (msg.includes('column') || msg.includes('field') || msg.includes('variable'))
    return `Your dataset has ${columns.length} columns: ${columns.map(c => `${c.name} (${c.type})`).join(', ')}.`;

  // Summary/overview
  if (msg.includes('summary') || msg.includes('overview') || msg.includes('tell me about') || msg.includes('describe') || msg.includes('what is this'))
    return `This is a ${detectDomain(columns)} dataset with ${data.length} records and ${columns.length} columns. ${topNumCol ? `Average ${topNumCol} is ${getAvg(topVals)}.` : ''} ${topCatCol ? `There are ${[...new Set(data.map(r=>r[topCatCol]))].length} unique ${topCatCol} categories.` : ''}`;

  // Trend questions
  if (msg.includes('trend') || msg.includes('growing') || msg.includes('declining') || msg.includes('over time'))
    return topNumCol ? `Analyzing ${topNumCol} trend: First half average is ${getAvg(getValues(topNumCol).slice(0, Math.floor(data.length/2)))}, second half average is ${getAvg(getValues(topNumCol).slice(Math.floor(data.length/2)))}. ${Number(getAvg(getValues(topNumCol).slice(Math.floor(data.length/2)))) > Number(getAvg(getValues(topNumCol).slice(0,Math.floor(data.length/2)))) ? '📈 Upward trend detected.' : '📉 Downward trend detected.'}` : 'No numeric columns found for trend analysis.';

  // Anomaly/outlier
  if (msg.includes('anomaly') || msg.includes('outlier') || msg.includes('unusual') || msg.includes('weird') || msg.includes('strange'))
    return topNumCol ? `In ${topNumCol}, the average is ${getAvg(topVals)}, but values range from ${getMin(topVals)} to ${getMax(topVals)}. Records beyond 2x the average (>${(Number(getAvg(topVals))*2).toFixed(2)}) may be outliers — found ${topVals.filter(v => v > Number(getAvg(topVals))*2).length} such records.` : 'No numeric columns found for anomaly detection.';

  // Best/top performer
  if (msg.includes('best') || msg.includes('top') || msg.includes('highest') || msg.includes('most'))
    return topNumCol ? `Highest ${topNumCol} is ${getMax(topVals)}. ${topCatCol ? `Top ${topCatCol}: "${[...new Set(data.map(r=>r[topCatCol]))].map(cat => ({cat, avg: getAvg(data.filter(r=>r[topCatCol]===cat).map(r=>Number(r[topNumCol])).filter(v=>!isNaN(v)))})).sort((a: any, b: any)=>Number(b.avg)-Number(a.avg))[0]?.cat}"` : ''}` : 'No numeric column found.';

  // Worst/lowest performer  
  if (msg.includes('worst') || msg.includes('lowest') || msg.includes('least') || msg.includes('minimum'))
    return topNumCol ? `Lowest ${topNumCol} is ${getMin(topVals)}.` : 'No numeric column found.';

  // Average
  if (msg.includes('average') || msg.includes('avg') || msg.includes('mean'))
    return topNumCol ? `Average ${topNumCol} across all ${data.length} records is ${getAvg(topVals)}.` : 'No numeric column found.';

  // Total/sum
  if (msg.includes('total') || msg.includes('sum'))
    return topNumCol ? `Total ${topNumCol} across all records is ${getSum(topVals)}.` : 'No numeric column found.';

  // Recommendation
  if (msg.includes('recommend') || msg.includes('suggest') || msg.includes('should') || msg.includes('advice') || msg.includes('improve'))
    return `Based on your ${data.length} records: 1) Focus on top performing ${topCatCol || 'segments'} 2) Investigate records where ${topNumCol || 'metrics'} is below ${topVals.length ? (Number(getAvg(topVals))*0.7).toFixed(2) : 'average'} 3) The highest value segment should be scaled up.`;

  // Comparison
  if (msg.includes('compar') || msg.includes('versus') || msg.includes(' vs '))
    return topCatCol && topNumCol ? `Comparing ${topCatCol} by ${topNumCol}: ${[...new Set(data.map(r=>r[topCatCol]))].slice(0,4).map(cat => { const vals = data.filter(r=>r[topCatCol]===cat).map(r=>Number(r[topNumCol])).filter(v=>!isNaN(v)); return `${cat}: ${getAvg(vals)}`; }).join(', ')}` : 'Please specify which columns to compare.';

  // Help
  if (msg.includes('help') || msg.includes('what can you') || msg.includes('how'))
    return `I can answer questions about your ${data.length}-record dataset! Try asking: "What is the average ${topNumCol || 'value'}?", "Which ${topCatCol || 'category'} performs best?", "Show me trends", "Find anomalies", "Give me a summary", or ask about any specific column by name.`;

  // Default — give useful info
  return `Your dataset has ${data.length} records. ${topNumCol ? `Average ${topNumCol}: ${getAvg(topVals)}, ranging from ${getMin(topVals)} to ${getMax(topVals)}.` : ''} ${topCatCol ? `${[...new Set(data.map(r=>r[topCatCol]))].length} unique ${topCatCol} values.` : ''} Ask me anything specific about your data!`;
};
