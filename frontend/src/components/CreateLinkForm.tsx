import { useState } from 'react';
import { createLink, ApiException } from '../lib/api';
import Spinner from './Spinner.tsx';
import Alert from './Alert.tsx';

interface CreateLinkFormProps {
  onLinkCreated: () => void;
}

function CreateLinkForm({ onLinkCreated }: CreateLinkFormProps) {
  const [targetUrl, setTargetUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{targetUrl?: string; slug?: string}>({});
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors and success
    setError(null);
    setFieldErrors({});
    setSuccess(null);
    
    // Client-side validation
    const errors: {targetUrl?: string; slug?: string} = {};
    
    if (!targetUrl.trim()) {
      errors.targetUrl = 'Target URL is required';
    }
    
    if (slug.trim() && !/^[A-Za-z0-9_-]{1,64}$/.test(slug.trim())) {
      errors.slug = 'Slug must be 1-64 characters (letters, numbers, underscore, dash only)';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      
      await createLink({
        targetUrl: targetUrl.trim(),
        slug: slug.trim() || undefined
      });
      
      // Clear form on success
      setTargetUrl('');
      setSlug('');
      setSuccess('Short link created successfully!');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
      // Notify parent to refresh list
      onLinkCreated();
      
    } catch (err) {
      if (err instanceof ApiException) {
        // Handle specific error types
        if (err.message.includes('slug') && err.message.includes('taken')) {
          setFieldErrors({ slug: 'This slug is already taken. Please choose another.' });
        } else if (err.message.includes('URL')) {
          setFieldErrors({ targetUrl: err.message });
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to create link. Please try again.');
      }
      console.error('Error creating link:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formStyle = {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '600px',
    margin: '0 auto'
  };

  const getInputStyle = (hasError: boolean) => ({
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${hasError ? '#dc2626' : '#ccc'}`,
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    backgroundColor: hasError ? '#fef2f2' : 'white'
  });

  const buttonStyle = {
    backgroundColor: submitting ? '#6c757d' : '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: submitting ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s'
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      {success && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </div>
      )}
      
      {error && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}
      
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="targetUrl" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
          Target URL *
        </label>
        <input
          type="url"
          id="targetUrl"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://example.com"
          required
          disabled={submitting}
          style={getInputStyle(!!fieldErrors.targetUrl)}
          aria-describedby={fieldErrors.targetUrl ? "targetUrl-error" : "targetUrl-help"}
        />
        {fieldErrors.targetUrl && (
          <div 
            id="targetUrl-error"
            style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}
            role="alert"
          >
            {fieldErrors.targetUrl}
          </div>
        )}
        <small 
          id="targetUrl-help"
          style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}
        >
          The URL to redirect to when the short link is clicked
        </small>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="slug" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
          Custom Slug (optional)
        </label>
        <input
          type="text"
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="my-custom-slug"
          disabled={submitting}
          style={getInputStyle(!!fieldErrors.slug)}
          aria-describedby={fieldErrors.slug ? "slug-error" : "slug-help"}
        />
        {fieldErrors.slug && (
          <div 
            id="slug-error"
            style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}
            role="alert"
          >
            {fieldErrors.slug}
          </div>
        )}
        <small 
          id="slug-help"
          style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}
        >
          Leave empty to generate a random slug. Must be 1-64 characters (letters, numbers, underscore, dash)
        </small>
      </div>
      
      <button
        type="submit"
        disabled={submitting}
        style={buttonStyle}
      >
        {submitting ? (
          <>
            <Spinner size="small" color="white" />
            <span style={{ marginLeft: '8px' }}>Creating...</span>
          </>
        ) : (
          'Create Short Link'
        )}
      </button>
    </form>
  );
}

export default CreateLinkForm;
