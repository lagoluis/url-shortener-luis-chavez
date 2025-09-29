import { Link } from 'react-router-dom';
import type { Link as LinkType } from '../lib/api';

interface LinksTableProps {
  links: LinkType[];
}

function LinksTable({ links }: LinksTableProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Add toast notification for copy success
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        console.log('Copied to clipboard (fallback):', text);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    backgroundColor: 'white',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };

  const thStyle = {
    backgroundColor: '#f8f9fa',
    color: '#495057',
    fontWeight: 'bold',
    padding: '12px 16px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #e9ecef',
    fontSize: '14px'
  };

  const tdStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid #e9ecef',
    fontSize: '14px',
    verticalAlign: 'top' as const
  };

  const buttonStyle = {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  };

  const linkStyle = {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: 'bold'
  };

  if (links.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px', 
        color: '#6c757d',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px'
      }}>
        <p>No links found. Create your first short link above!</p>
        <small>Try running <code>npm run seed</code> in the backend to add sample data.</small>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Analytics</th>
            <th style={thStyle}>Target URL</th>
            <th style={thStyle}>Created</th>
            <th style={thStyle}>Visit Link</th>
            <th style={thStyle}>Copy</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => {
            const backendUrl = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
            const shortUrl = `${backendUrl}/r/${link.slug}`;
            
            return (
              <tr key={link.id}>
                <td style={tdStyle}>
                  <Link to={`/links/${link.id}`} style={linkStyle}>
                    {link.slug}
                  </Link>
                </td>
                <td style={tdStyle}>
                  <span 
                    style={{ color: '#6c757d' }}
                    title={link.targetUrl}
                  >
                    {truncateUrl(link.targetUrl)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ color: '#6c757d' }}>
                    {new Date(link.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td style={tdStyle}>
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#f8f9fa', 
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: '#007bff',
                      textDecoration: 'none',
                      fontFamily: 'monospace',
                      border: '1px solid #e9ecef'
                    }}
                    title="Click to visit the website (tracked)"
                  >
                    {shortUrl}
                  </a>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => copyToClipboard(shortUrl)}
                    style={buttonStyle}
                    onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#218838'}
                    onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#28a745'}
                    title="Copy short URL to clipboard for sharing"
                  >
                    Copy
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default LinksTable;
