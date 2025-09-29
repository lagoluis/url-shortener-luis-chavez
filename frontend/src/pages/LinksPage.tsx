import { useState, useEffect } from 'react';
import { listLinks, ApiException } from '../lib/api';
import type { Link } from '../lib/api';
import CreateLinkForm from '../components/CreateLinkForm.tsx';
import LinksTable from '../components/LinksTable.tsx';
import Spinner from '../components/Spinner.tsx';
import Alert from '../components/Alert.tsx';

function LinksPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const fetchedLinks = await listLinks();
      setLinks(fetchedLinks);
      setError(null);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to load links');
      }
      console.error('Error fetching links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleLinkCreated = () => {
    // Refresh the list after a new link is created
    fetchLinks();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2>Create New Link</h2>
        <CreateLinkForm onLinkCreated={handleLinkCreated} />
      </div>

      <div>
        <h2>Your Links</h2>
        
        {loading && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '40px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            gap: '12px'
          }}>
            <Spinner size="medium" />
            <span style={{ color: '#6c757d' }}>Loading your links...</span>
          </div>
        )}
        
        {error && (
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {!loading && !error && (
          <LinksTable links={links} />
        )}
      </div>
    </div>
  );
}

export default LinksPage;
