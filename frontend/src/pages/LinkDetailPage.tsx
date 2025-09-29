import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSummary, getDaily, ApiException } from '../lib/api';
import type { DailyStats } from '../lib/api';
import ClicksChart from '../components/ClicksChart.tsx';
import Alert from '../components/Alert.tsx';

function LinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  
  // State for analytics data
  const [totalClicks, setTotalClicks] = useState<number>(0);
  const [dailyData, setDailyData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for date range inputs (default to last 30 days)
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  
  const [toDate, setToDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  });

  const fetchAnalytics = async () => {
    if (!id) {
      setError('Invalid link ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const dateRange = {
        from: new Date(fromDate + 'T00:00:00.000Z').toISOString(),
        to: new Date(toDate + 'T23:59:59.999Z').toISOString()
      };

      // Fetch both summary and daily data in parallel
      const [summary, daily] = await Promise.all([
        getSummary(id, dateRange),
        getDaily(id, dateRange)
      ]);

      setTotalClicks(summary);
      setDailyData(daily);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(`Error: ${err.message}`);
      } else {
        setError('Failed to load analytics data');
      }
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when date range changes
  useEffect(() => {
    fetchAnalytics();
  }, [id, fromDate, toDate]);

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    marginRight: '12px'
  };

  const cardStyle = {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <Link 
          to="/" 
          style={{ 
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            marginBottom: '20px'
          }}
        >
          ← Back to Links
        </Link>
        
        <h2 style={{ margin: '0 0 10px 0' }}>Link Analytics</h2>
        <p style={{ color: '#6c757d', margin: 0 }}>Link ID: {id}</p>
      </div>

      {/* Date Range Controls */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Date Range</h3>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <label htmlFor="fromDate" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
              From:
            </label>
            <input
              type="date"
              id="fromDate"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="toDate" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
              To:
            </label>
            <input
              type="date"
              id="toDate"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <small style={{ color: '#6c757d', marginTop: '20px' }}>
            Adjust the date range to view click analytics for different periods
          </small>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{ marginBottom: '20px' }}>
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {/* Summary Card */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Summary</h3>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
          {loading ? 'Loading...' : `${totalClicks.toLocaleString()} total clicks`}
        </div>
        <small style={{ color: '#6c757d' }}>
          From {new Date(fromDate).toLocaleDateString()} to {new Date(toDate).toLocaleDateString()}
        </small>
      </div>

      {/* Chart */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>Daily Clicks</h3>
        <ClicksChart 
          data={dailyData} 
          loading={loading}
          dateRange={{ from: fromDate, to: toDate }}
        />
      </div>
    </div>
  );
}

export default LinkDetailPage;
