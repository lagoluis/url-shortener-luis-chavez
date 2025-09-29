import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyStats } from '../lib/api';
import Spinner from './Spinner.tsx';

interface ClicksChartProps {
  data: DailyStats[];
  loading?: boolean;
  dateRange?: { from?: string; to?: string };
}

function ClicksChart({ data, loading, dateRange }: ClicksChartProps) {
  const processData = (rawData: DailyStats[]) => {
    if (rawData.length === 0) return [];

    // Sort data by date
    const sortedData = [...rawData].sort((a, b) => a.day.localeCompare(b.day));
    
    // If we have a date range, fill gaps with 0 counts
    if (dateRange?.from && dateRange?.to) {
      const filledData: DailyStats[] = [];
      const startDate = new Date(dateRange.from);
      const endDate = new Date(dateRange.to);
      
      // Create a map for quick lookup
      const dataMap = new Map(sortedData.map(item => [item.day, item.count]));
      
      // Fill in all days between start and end
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        filledData.push({
          day: dayStr,
          count: dataMap.get(dayStr) || 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return filledData;
    }
    
    return sortedData;
  };

  if (loading) {
    return (
      <div style={{ 
        height: '300px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        gap: '12px'
      }}>
        <Spinner size="medium" />
        <span style={{ color: '#6c757d' }}>Loading analytics...</span>
      </div>
    );
  }

  const processedData = processData(data);

  if (processedData.length === 0) {
    const hasDateRange = dateRange?.from && dateRange?.to;
    const message = hasDateRange 
      ? "No clicks recorded in this date range"
      : "No click data available";
    const suggestion = hasDateRange
      ? "Try expanding the date range or check a different time period"
      : "Wait for clicks to be recorded or try a different date range";

    return (
      <div style={{ 
        height: '300px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        color: '#6c757d',
        textAlign: 'center' as const,
        padding: '20px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
          {message}
        </p>
        <small style={{ margin: 0, lineHeight: '1.4' }}>
          {suggestion}
        </small>
      </div>
    );
  }

  // Format date for display (show month/day for better readability)
  const formatXAxisLabel = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ 
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={processedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="day" 
            tickFormatter={formatXAxisLabel}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            allowDecimals={false}
            label={{ value: 'Clicks', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              });
            }}
            formatter={(value) => [value, 'Clicks']}
          />
          <Bar 
            dataKey="count" 
            fill="#007bff"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ClicksChart;
