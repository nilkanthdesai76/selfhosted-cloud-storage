import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { getAccessToken } from '../utils/auth';
import { formatFileSize } from '../utils/format';

export default function FilePreview({ file, onClose, onDownload, onShare }) {
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const urlRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    
    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      
      // Revoke previous URL
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      
      console.log('Loading preview for file:', file.id, file.filename, file.mimeType);
      
      try {
        const response = await fetch(`${API_URL}/files/preview/${file.id}`, {
          headers: { 'Authorization': `Bearer ${getAccessToken()}` },
        });
        
        console.log('Preview response status:', response.status, response.statusText);
        
        if (response.ok) {
          const blob = await response.blob();
          console.log('Blob received:', blob.size, blob.type);
          // Create blob with correct MIME type
          const typedBlob = new Blob([blob], { type: file.mimeType || blob.type });
          const url = URL.createObjectURL(typedBlob);
          console.log('Created blob URL:', url);
          urlRef.current = url;
          setPreviewUrl(url);
        } else {
          const errorText = await response.text();
          console.error('Preview failed:', errorText);
          setError('Failed to load preview');
        }
      } catch (err) {
        console.error('Preview error:', err);
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };
    
    loadPreview();
    
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file]);

  const isImage = file?.mimeType?.startsWith('image/');
  const isVideo = file?.mimeType?.startsWith('video/');
  const isAudio = file?.mimeType?.startsWith('audio/');
  const isPdf = file?.mimeType?.includes('pdf');
  const isText = file?.mimeType?.startsWith('text/') || 
    ['application/json', 'application/javascript', 'application/xml'].includes(file?.mimeType);

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"/>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p className="text-lg">Preview not available</p>
          <p className="text-sm mt-1">Download the file to view it</p>
        </div>
      );
    }
    if (isImage) {
      return (
        <img 
          src={previewUrl} 
          alt={file.filename} 
          className="max-h-full max-w-full object-contain"
          onError={(e) => {
            console.error('Image load error:', e);
            setError('Failed to load image');
          }}
        />
      );
    }
    if (isVideo) {
      return <video src={previewUrl} controls className="max-h-full max-w-full" autoPlay/>;
    }
    if (isAudio) {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="w-32 h-32 bg-purple-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-16 h-16 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
            </svg>
          </div>
          <audio src={previewUrl} controls className="w-80"/>
        </div>
      );
    }
    if (isPdf) {
      return <iframe src={previewUrl} className="w-full h-full border-0" title={file.filename}/>;
    }
    // Default: show file info
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
        <svg className="w-32 h-32 mb-4 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
        </svg>
        <p className="text-lg font-medium text-gray-600">{file.filename}</p>
        <p className="text-sm mt-1">{formatFileSize(Number(file.size))}</p>
        <p className="text-sm text-gray-400 mt-4">No preview available for this file type</p>
      </div>
    );
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" onClick={onClose}>
      {/* Header */}
      <header className="h-16 px-4 flex items-center justify-between text-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </button>
          <div>
            <h2 className="font-medium truncate max-w-md">{file.filename}</h2>
            <p className="text-sm text-gray-400">{formatFileSize(Number(file.size))}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onShare(file)} className="p-2 hover:bg-white/10 rounded-full transition" title="Share">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          </button>
          <button onClick={() => onDownload(file.id, file.filename)} className="p-2 hover:bg-white/10 rounded-full transition" title="Download">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition ml-2" title="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={e => e.stopPropagation()}>
        {renderPreview()}
      </div>
    </div>
  );
}
