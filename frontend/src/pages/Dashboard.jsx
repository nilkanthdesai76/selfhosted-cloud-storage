import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';
import { getAccessToken, getUser, clearAuthData, isAuthenticated } from '../utils/auth';
import { formatFileSize } from '../utils/format';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ContextMenu from '../components/ContextMenu';
import Modal from '../components/Modal';
import FilePreview from '../components/FilePreview';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentView, setCurrentView] = useState('drive');
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Drive' }]);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [shareSettings, setShareSettings] = useState({ expiryDays: 7, password: '', maxDownloads: 10 });
  const [shareUrl, setShareUrl] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [newName, setNewName] = useState('');
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);

  useEffect(() => { if (!isAuthenticated()) navigate('/login'); }, [navigate]);

  const loadFiles = useCallback(async () => {
    try {
      let url;
      if (currentView === 'recent') url = `${API_URL}/files/recent`;
      else if (currentView === 'starred') url = `${API_URL}/files/starred`;
      else if (currentView === 'trash') url = `${API_URL}/files/trash`;
      else url = currentFolder ? `${API_URL}/files/list?parentId=${currentFolder}` : `${API_URL}/files/list`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${getAccessToken()}` } });
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files.filter(f => !f.isFolder));
        setFolders(data.files.filter(f => f.isFolder));
      } else if (response.status === 401) logout();
    } catch (error) { console.error('Error loading files:', error); }
  }, [currentFolder, currentView]);

  const refreshUserInfo = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${getAccessToken()}` } });
      if (response.ok) { const data = await response.json(); setUser(data.user); localStorage.setItem('user', JSON.stringify(data.user)); }
    } catch (error) { console.error('Error refreshing user info:', error); }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);
  const logout = () => { clearAuthData(); navigate('/'); };

  const switchView = (view) => {
    setCurrentView(view);
    setCurrentFolder(null);
    setSelectedItems([]);
    const names = { drive: 'My Drive', recent: 'Recent', starred: 'Starred', trash: 'Trash' };
    setBreadcrumbs([{ id: null, name: names[view] || 'My Drive' }]);
  };

  const navigateToFolder = (folderId, folderName) => {
    if (currentView !== 'drive') switchView('drive');
    if (folderId === null) { setCurrentFolder(null); setBreadcrumbs([{ id: null, name: 'My Drive' }]); }
    else {
      setCurrentFolder(folderId);
      const idx = breadcrumbs.findIndex(b => b.id === folderId);
      if (idx >= 0) setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
      else setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
    }
    setSelectedItems([]);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/folders/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAccessToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolder })
      });
      if (res.ok) { setNewFolderName(''); setShowNewFolder(false); loadFiles(); }
    } catch (e) { console.error('Error creating folder:', e); }
  };

  const uploadFiles = async (fileList) => {
    setUploading(true); setUploadProgress(0);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolder) formData.append('parentId', currentFolder);
      try {
        const res = await fetch(`${API_URL}/files/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${getAccessToken()}` }, body: formData });
        if (!res.ok) { const d = await res.json(); alert(`Upload failed: ${d.error}`); }
        setUploadProgress(((i + 1) / fileList.length) * 100);
      } catch (e) { alert('Upload error: ' + e.message); }
    }
    setTimeout(() => { setUploading(false); setUploadProgress(0); loadFiles(); refreshUserInfo(); }, 500);
  };

  const handleFileSelect = (e) => { if (e.target.files.length) uploadFiles(e.target.files); e.target.value = ''; };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (currentView === 'drive') uploadFiles(e.dataTransfer.files); };

  const downloadFile = async (fileId, filename) => {
    try {
      const res = await fetch(`${API_URL}/files/download/${fileId}`, { headers: { 'Authorization': `Bearer ${getAccessToken()}` } });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
      }
    } catch (e) { alert('Download error: ' + e.message); }
  };

  const openShareModal = (file) => { setShareFile(file); setShareSettings({ expiryDays: 7, password: '', maxDownloads: 10 }); setShareUrl(''); setShowShareModal(true); };

  const createShare = async () => {
    try {
      const res = await fetch(`${API_URL}/shares/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAccessToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: shareFile.id, expiryDays: shareSettings.expiryDays, password: shareSettings.password || undefined, maxDownloads: shareSettings.maxDownloads })
      });
      if (res.ok) { const d = await res.json(); setShareUrl(d.shareUrl); }
    } catch (e) { alert('Share error: ' + e.message); }
  };

  const deleteItem = async (item) => {
    if (!confirm(`Move "${item.filename || item.name}" to trash?`)) return;
    try {
      const endpoint = item.isFolder ? `${API_URL}/folders/${item.id}` : `${API_URL}/files/${item.id}`;
      const res = await fetch(endpoint, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getAccessToken()}` } });
      if (res.ok) { loadFiles(); refreshUserInfo(); }
    } catch (e) { alert('Delete error: ' + e.message); }
  };

  const toggleStar = async (item) => {
    try {
      const endpoint = item.isFolder ? `${API_URL}/folders/${item.id}/star` : `${API_URL}/files/${item.id}/star`;
      await fetch(endpoint, { method: 'PATCH', headers: { 'Authorization': `Bearer ${getAccessToken()}` } });
      loadFiles();
    } catch (e) { alert('Star error: ' + e.message); }
  };

  const restoreItem = async (item) => {
    try {
      const endpoint = item.isFolder ? `${API_URL}/folders/${item.id}/restore` : `${API_URL}/files/${item.id}/restore`;
      const res = await fetch(endpoint, { method: 'PATCH', headers: { 'Authorization': `Bearer ${getAccessToken()}` } });
      if (res.ok) { loadFiles(); refreshUserInfo(); }
    } catch (e) { alert('Restore error: ' + e.message); }
  };

  const permanentDelete = async (item) => {
    if (!confirm(`Permanently delete "${item.filename || item.name}"? This cannot be undone.`)) return;
    try {
      const endpoint = item.isFolder ? `${API_URL}/folders/${item.id}/permanent` : `${API_URL}/files/${item.id}/permanent`;
      const res = await fetch(endpoint, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getAccessToken()}` } });
      if (res.ok) { loadFiles(); refreshUserInfo(); }
    } catch (e) { alert('Delete error: ' + e.message); }
  };

  const emptyTrash = async () => {
    if (!confirm('Empty trash? All items will be permanently deleted.')) return;
    try {
      const res = await fetch(`${API_URL}/files/trash/empty`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getAccessToken()}` } });
      if (res.ok) { loadFiles(); refreshUserInfo(); }
    } catch (e) { alert('Empty trash error: ' + e.message); }
  };

  const openPreview = (file) => { if (!file.isFolder) setPreviewFile(file); };
  const openRename = (item) => { setRenameItem(item); setNewName(item.filename || item.name); setShowRenameModal(true); };
  const openDetails = (item) => { setDetailsItem(item); setShowDetailsPanel(true); };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    let menuItems;
    
    if (currentView === 'trash') {
      menuItems = [
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>, label: 'Restore' , onClick: () => restoreItem(item) },
        { divider: true },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>, label: 'Delete forever', onClick: () => permanentDelete(item) },
      ];
    } else if (item.isFolder) {
      menuItems = [
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"/></svg>, label: 'Open', onClick: () => navigateToFolder(item.id, item.name) },
        { divider: true },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>, label: 'Rename', onClick: () => openRename(item) },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>, label: item.starred ? 'Remove from starred' : 'Add to starred', onClick: () => toggleStar(item) },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>, label: 'Folder information', onClick: () => openDetails(item) },
        { divider: true },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>, label: 'Move to trash', onClick: () => deleteItem(item) },
      ];
    } else {
      menuItems = [
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>, label: 'Download', onClick: () => downloadFile(item.id, item.filename) },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>, label: 'Rename', onClick: () => openRename(item) },
        { divider: true },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/></svg>, label: 'Share', onClick: () => openShareModal(item) },
        { divider: true },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>, label: item.starred ? 'Remove from starred' : 'Add to starred', onClick: () => toggleStar(item) },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>, label: 'File information', onClick: () => openDetails(item) },
        { divider: true },
        { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>, label: 'Move to trash', onClick: () => deleteItem(item) },
      ];
    }
    setContextMenu({ x: e.clientX, y: e.clientY, items: menuItems });
  };

  const handleItemClick = (item) => { if (item.isFolder) navigateToFolder(item.id, item.name); else if (currentView !== 'trash') openPreview(item); };
  const toggleSelect = (id, e) => { if (e) e.stopPropagation(); setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  const getFileIcon = (mimeType, isFolder, size = 'md') => {
    const sizes = { sm: 'w-5 h-5', md: 'w-10 h-10', lg: 'w-12 h-12' };
    const iconSizes = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-6 h-6' };
    const s = sizes[size], is = iconSizes[size];
    
    if (isFolder) return <div className={`${s} rounded-lg flex items-center justify-center`}><svg className={`${is} text-gray-500`} viewBox="0 0 24 24" fill="#5f6368"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg></div>;
    if (mimeType?.startsWith('image/')) return <div className={`${s} bg-red-100 rounded-lg flex items-center justify-center`}><svg className={`${is} text-red-600`} viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>;
    if (mimeType?.startsWith('video/')) return <div className={`${s} bg-red-100 rounded-lg flex items-center justify-center`}><svg className={`${is} text-red-600`} viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg></div>;
    if (mimeType?.startsWith('audio/')) return <div className={`${s} bg-orange-100 rounded-lg flex items-center justify-center`}><svg className={`${is} text-orange-600`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>;
    if (mimeType?.includes('pdf')) return <div className={`${s} bg-red-100 rounded-lg flex items-center justify-center`}><svg className={`${is} text-red-700`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg></div>;
    if (mimeType?.includes('word') || mimeType?.includes('document')) return <div className={`${s} bg-blue-100 rounded-lg flex items-center justify-center`}><svg className={`${is} text-blue-700`} viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>;
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return <div className={`${s} bg-green-100 rounded-lg flex items-center justify-center`}><svg className={`${is} text-green-700`} viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg></div>;
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('tar')) return <div className={`${s} bg-gray-200 rounded-lg flex items-center justify-center`}><svg className={`${is} text-gray-600`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 6h-2v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2v-2h-2V8h2v2h2v2z"/></svg></div>;
    return <div className={`${s} bg-blue-100 rounded-lg flex items-center justify-center`}><svg className={`${is} text-blue-600`} viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg></div>;
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const sortedItems = [...folders, ...files]
    .filter(item => (item.filename || item.name).toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      const nameA = a.filename || a.name, nameB = b.filename || b.name;
      if (sortBy === 'name') return nameA.localeCompare(nameB);
      if (sortBy === 'date') return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      if (sortBy === 'size') return Number(b.size || 0) - Number(a.size || 0);
      return 0;
    });

  const storageUsed = Number(user?.storageUsed || 0);
  const storageLimit = Number(user?.plan?.storageLimit || 5368709120);
  const storagePercent = Math.min((storageUsed / storageLimit) * 100, 100);

  return (
    <div className="h-screen flex bg-[#f8fafd]" onClick={() => { setProfileOpen(false); setShowNewMenu(false); }}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-[256px]' : 'w-[72px]'} bg-[#f8fafd] flex flex-col transition-all duration-200 shrink-0 pt-2`}>
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 mb-4">
            <img src="/applogo_dark_text.png" alt="NDX Cloud" className="h-20 w-auto object-contain" />
          </div>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowNewMenu(!showNewMenu); }} className={`flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-gray-700 font-medium ${sidebarOpen ? 'pr-6' : 'justify-center w-12 h-12 p-0'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              {sidebarOpen && <span>New</span>}
            </button>
            {showNewMenu && (
              <div className="absolute left-0 top-full mt-2 w-[300px] bg-white rounded-lg shadow-[0_2px_16px_rgba(0,0,0,0.15)] border py-2 z-50">
                <button onClick={() => { setShowNewFolder(true); setShowNewMenu(false); }} className="w-full px-4 py-2.5 text-left text-[14px] text-gray-700 hover:bg-gray-100 flex items-center gap-4">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
                  New folder
                </button>
                <div className="border-t my-1.5"/>
                <button onClick={() => { document.getElementById('file-input').click(); setShowNewMenu(false); }} className="w-full px-4 py-2.5 text-left text-[14px] text-gray-700 hover:bg-gray-100 flex items-center gap-4">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                  File upload
                </button>
                <button onClick={() => { document.getElementById('folder-input').click(); setShowNewMenu(false); }} className="w-full px-4 py-2.5 text-left text-[14px] text-gray-700 hover:bg-gray-100 flex items-center gap-4">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15"/></svg>
                  Folder upload
                </button>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {[
            { id: 'drive', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2m0 18H5V4h14"/></svg>, label: 'My Drive' },
            { id: 'recent', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>, label: 'Recent' },
            { id: 'starred', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>, label: 'Starred' },
            { id: 'trash', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13z"/></svg>, label: 'Trash' },
          ].map(item => (
            <button key={item.id} onClick={() => switchView(item.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-[14px] transition-colors ${currentView === item.id ? 'bg-[#c2e7ff] text-[#001d35] font-medium' : 'text-gray-700 hover:bg-gray-200/60'} ${!sidebarOpen && 'justify-center'}`}>
              <span className={currentView === item.id ? 'text-[#001d35]' : 'text-gray-600'}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        {sidebarOpen && (
          <div className="p-4 mx-3 mb-3 bg-white rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
              <span className="text-[13px] text-gray-600">Storage</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all ${storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${storagePercent}%` }}/>
            </div>
            <p className="text-[12px] text-gray-500">{formatFileSize(storageUsed)} of {formatFileSize(storageLimit)} used</p>
            <button className="mt-3 w-full py-2 text-[13px] text-blue-600 border border-gray-300 rounded-full hover:bg-blue-50 font-medium">Get more storage</button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white rounded-tl-2xl shadow-sm">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-full shrink-0 lg:hidden">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
          </button>
          <div className="flex-1 max-w-[720px]">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
              <input type="text" placeholder="Search in Drive" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-[#edf2fc] hover:bg-[#e3e8f2] focus:bg-white rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:shadow-md transition-all text-[15px]"/>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button className="p-2.5 hover:bg-gray-100 rounded-full" title="Support"><svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg></button>
            <button className="p-2.5 hover:bg-gray-100 rounded-full" title="Settings"><svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
            <div className="relative ml-2">
              <button onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }} className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm hover:shadow-md transition-shadow">{user?.email?.[0]?.toUpperCase() || '?'}</button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-[320px] bg-white rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.15)] border py-3 z-50">
                  <div className="px-5 py-4 text-center border-b">
                    <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-3">{user?.email?.[0]?.toUpperCase()}</div>
                    <p className="font-medium text-gray-900">{user?.email}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{user?.plan?.name || 'Free'} Plan</p>
                  </div>
                  <div className="py-2">
                    <Link to="/settings" className="flex items-center gap-4 px-5 py-2.5 hover:bg-gray-100 text-gray-700 text-[14px]"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Manage your Account</Link>
                    <button onClick={() => { setShowChangePassword(true); setProfileOpen(false); }} className="w-full flex items-center gap-4 px-5 py-2.5 hover:bg-gray-100 text-gray-700 text-[14px]"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>Change Password</button>
                    <Link to="/devices" className="flex items-center gap-4 px-5 py-2.5 hover:bg-gray-100 text-gray-700 text-[14px]"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/></svg>Trusted Devices</Link>
                  </div>
                  <div className="border-t pt-2"><button onClick={logout} className="w-full flex items-center gap-4 px-5 py-2.5 hover:bg-gray-100 text-gray-700 text-[14px]"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>Sign out</button></div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Toolbar */}
        <div className="px-4 py-2 flex items-center justify-between shrink-0 border-b">
          <div className="flex items-center gap-1 text-[14px] overflow-x-auto">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id || 'root'} className="flex items-center shrink-0">
                {i > 0 && <svg className="w-5 h-5 text-gray-400 mx-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>}
                <button onClick={() => currentView === 'drive' ? navigateToFolder(crumb.id, crumb.name) : null} className={`px-2 py-1 rounded hover:bg-gray-100 ${i === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : 'text-gray-600'}`}>{crumb.name}</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {currentView === 'trash' && sortedItems.length > 0 && (
              <button onClick={emptyTrash} className="mr-2 px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-100 rounded-lg">Empty trash</button>
            )}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`} title="List view"><svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/></svg></button>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`} title="Grid view"><svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg></button>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-full ml-1" title="View details" onClick={() => setShowDetailsPanel(!showDetailsPanel)}><svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-4" onDragOver={(e) => { e.preventDefault(); if (currentView === 'drive') setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
            {uploading && (
              <div className="mb-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3 mb-2"><div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"/><span className="text-sm text-blue-800 font-medium">Uploading... {uploadProgress.toFixed(0)}%</span></div>
                <div className="h-1 bg-blue-200 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all rounded-full" style={{ width: `${uploadProgress}%` }}/></div>
              </div>
            )}
            {dragOver && (
              <div className="fixed inset-0 bg-blue-500/5 border-2 border-dashed border-blue-500 z-40 flex items-center justify-center m-2 rounded-2xl">
                <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg></div>
                  <p className="text-xl font-medium text-gray-800">Drop files to upload</p>
                </div>
              </div>
            )}
            {sortedItems.length === 0 && !uploading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                {currentView === 'trash' ? (
                  <><div className="w-40 h-40 mb-6 text-gray-200"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13z"/></svg></div><p className="text-lg text-gray-600 mb-1">Trash is empty</p><p className="text-gray-400 text-sm">Items moved to trash will be deleted forever after 30 days</p></>
                ) : currentView === 'starred' ? (
                  <><div className="w-40 h-40 mb-6 text-gray-200"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg></div><p className="text-lg text-gray-600 mb-1">No starred files</p><p className="text-gray-400 text-sm">Add stars to things that you want to easily find later</p></>
                ) : currentView === 'recent' ? (
                  <><div className="w-40 h-40 mb-6 text-gray-200"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div><p className="text-lg text-gray-600 mb-1">No recent files</p><p className="text-gray-400 text-sm">Files you use will show up here</p></>
                ) : (
                  <><div className="w-48 h-48 mb-4"><svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="240" cy="300" rx="180" ry="40" fill="#f3f4f6"/><path d="M120 120h240v160c0 11-9 20-20 20H140c-11 0-20-9-20-20V120z" fill="#e5e7eb"/><path d="M100 100h280l-20 20H120l-20-20z" fill="#d1d5db"/><rect x="160" y="160" width="160" height="8" rx="4" fill="#9ca3af"/><rect x="160" y="180" width="120" height="8" rx="4" fill="#9ca3af"/><rect x="160" y="200" width="80" height="8" rx="4" fill="#9ca3af"/><circle cx="360" cy="260" r="60" fill="#3b82f6"/><path d="M360 230v60m-30-30h60" stroke="white" strokeWidth="8" strokeLinecap="round"/></svg></div><p className="text-lg text-gray-600 mb-1">Welcome to Drive</p><p className="text-gray-400 text-sm mb-6">Drop files here or use the New button</p></>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
                {sortedItems.map(item => (
                  <div key={item.id} onContextMenu={(e) => handleContextMenu(e, item)} onClick={() => handleItemClick(item)}
                    className={`group relative bg-white rounded-xl cursor-pointer border transition-all hover:shadow-md ${selectedItems.includes(item.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="aspect-[4/3] rounded-t-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                      {item.mimeType?.startsWith('image/') ? (
                        <img src={`${API_URL}/files/preview/${item.id}?token=${getAccessToken()}`} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}/>
                      ) : null}
                      <div className={`${item.mimeType?.startsWith('image/') ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>{getFileIcon(item.mimeType, item.isFolder, 'lg')}</div>
                    </div>
                    <div className="p-3 flex items-center gap-2">
                      {getFileIcon(item.mimeType, item.isFolder, 'sm')}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-gray-800 truncate font-medium">{item.filename || item.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{currentView === 'trash' && item.daysUntilPermanentDelete !== undefined ? `${item.daysUntilPermanentDelete} days left` : formatDate(item.updatedAt || item.createdAt)}</p>
                      </div>
                      {item.starred && <svg className="w-4 h-4 text-yellow-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>}
                      <button onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item); }} className="p-1 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition shrink-0"><svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50/80 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider border-b">
                    <tr>
                      <th className="px-4 py-3 w-8"><input type="checkbox" className="rounded border-gray-300"/></th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3 hidden md:table-cell">Owner</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Last modified</th>
                      <th className="px-4 py-3 hidden lg:table-cell">File size</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedItems.map(item => (
                      <tr key={item.id} onContextMenu={(e) => handleContextMenu(e, item)} onClick={() => handleItemClick(item)} className={`group cursor-pointer transition-colors ${selectedItems.includes(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-2"><input type="checkbox" checked={selectedItems.includes(item.id)} onChange={(e) => toggleSelect(item.id, e)} className="rounded border-gray-300" onClick={e => e.stopPropagation()}/></td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            {getFileIcon(item.mimeType, item.isFolder, 'sm')}
                            <span className="text-[14px] text-gray-800 truncate max-w-[200px] lg:max-w-[300px]">{item.filename || item.name}</span>
                            {item.starred && <svg className="w-4 h-4 text-yellow-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-[13px] text-gray-600 hidden md:table-cell">me</td>
                        <td className="px-4 py-2 text-[13px] text-gray-600 hidden sm:table-cell">{currentView === 'trash' && item.daysUntilPermanentDelete !== undefined ? <span className="text-red-500">{item.daysUntilPermanentDelete} days left</span> : formatDate(item.updatedAt || item.createdAt)}</td>
                        <td className="px-4 py-2 text-[13px] text-gray-600 hidden lg:table-cell">{item.isFolder ? '—' : formatFileSize(Number(item.size))}</td>
                        <td className="px-4 py-2"><button onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item); }} className="p-1.5 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition"><svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Details Panel */}
          {showDetailsPanel && (
            <div className="w-[320px] border-l bg-white shrink-0 overflow-auto">
              {detailsItem ? (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 truncate">{detailsItem.filename || detailsItem.name}</h3>
                    <button onClick={() => setShowDetailsPanel(false)} className="p-1 hover:bg-gray-100 rounded-full"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                  </div>
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">{getFileIcon(detailsItem.mimeType, detailsItem.isFolder, 'lg')}</div>
                  <div className="space-y-3 text-[13px]">
                    <div><p className="text-gray-500 mb-0.5">Type</p><p className="text-gray-800">{detailsItem.isFolder ? 'Folder' : detailsItem.mimeType || 'Unknown'}</p></div>
                    {!detailsItem.isFolder && <div><p className="text-gray-500 mb-0.5">Size</p><p className="text-gray-800">{formatFileSize(Number(detailsItem.size))}</p></div>}
                    <div><p className="text-gray-500 mb-0.5">Created</p><p className="text-gray-800">{new Date(detailsItem.createdAt).toLocaleString()}</p></div>
                    <div><p className="text-gray-500 mb-0.5">Modified</p><p className="text-gray-800">{new Date(detailsItem.updatedAt || detailsItem.createdAt).toLocaleString()}</p></div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">Select a file to see details</div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Context Menu */}
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}

      {/* Change Password Modal */}
      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />

      {/* New Folder Modal */}
      <Modal isOpen={showNewFolder} onClose={() => setShowNewFolder(false)} title="New folder">
        <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Untitled folder" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px]" autoFocus onKeyDown={(e) => e.key === 'Enter' && createFolder()} />
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={() => setShowNewFolder(false)} className="px-5 py-2 text-[14px] text-blue-600 hover:bg-blue-50 rounded-full font-medium">Cancel</button>
          <button onClick={createFolder} className="px-5 py-2 text-[14px] bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700">Create</button>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title="Rename">
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px]" autoFocus onKeyDown={(e) => e.key === 'Enter' && setShowRenameModal(false)} />
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={() => setShowRenameModal(false)} className="px-5 py-2 text-[14px] text-blue-600 hover:bg-blue-50 rounded-full font-medium">Cancel</button>
          <button onClick={() => setShowRenameModal(false)} className="px-5 py-2 text-[14px] bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700">OK</button>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Share">
        {shareFile && (
          <div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              {getFileIcon(shareFile.mimeType, false, 'sm')}
              <span className="text-[14px] text-gray-800 truncate">{shareFile.filename}</span>
            </div>
            {!shareUrl ? (
              <>
                <div className="space-y-4">
                  <div><label className="block text-[13px] text-gray-600 mb-1.5">Link expires in</label><select value={shareSettings.expiryDays} onChange={(e) => setShareSettings({ ...shareSettings, expiryDays: parseInt(e.target.value) })} className="w-full p-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-blue-500"><option value={1}>1 day</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></div>
                  <div><label className="block text-[13px] text-gray-600 mb-1.5">Password protection (optional)</label><input type="password" value={shareSettings.password} onChange={(e) => setShareSettings({ ...shareSettings, password: e.target.value })} placeholder="Enter password" className="w-full p-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-blue-500" /></div>
                  <div><label className="block text-[13px] text-gray-600 mb-1.5">Download limit</label><input type="number" value={shareSettings.maxDownloads} onChange={(e) => setShareSettings({ ...shareSettings, maxDownloads: parseInt(e.target.value) || 10 })} min="1" max="100" className="w-full p-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-blue-500" /></div>
                </div>
                <button onClick={createShare} className="w-full mt-6 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 text-[14px]">Create link</button>
              </>
            ) : (
              <div>
                <p className="text-[13px] text-gray-600 mb-2">Anyone with this link can download</p>
                <div className="flex gap-2">
                  <input type="text" value={shareUrl} readOnly className="flex-1 p-2.5 border border-gray-300 rounded-lg bg-gray-50 text-[13px]" />
                  <button onClick={() => { navigator.clipboard.writeText(shareUrl); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-[13px] font-medium">Copy</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* File Preview */}
      {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} onDownload={downloadFile} onShare={openShareModal} />}

      {/* Hidden file inputs */}
      <input type="file" id="file-input" className="hidden" onChange={handleFileSelect} multiple />
      <input type="file" id="folder-input" className="hidden" onChange={handleFileSelect} webkitdirectory="" directory="" multiple />
    </div>
  );
}
