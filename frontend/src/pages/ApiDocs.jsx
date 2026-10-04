import { Link } from 'react-router-dom';

export default function ApiDocs() {
  const copyCode = (text) => {
    navigator.clipboard.writeText(text);
  };

  const CodeBlock = ({ children }) => (
    <div className="bg-gray-900 text-gray-200 p-5 rounded-lg overflow-x-auto relative my-4">
      <button onClick={() => copyCode(children)} className="absolute top-2 right-2 px-3 py-1 bg-primary text-white rounded text-xs hover:bg-primary-dark">Copy</button>
      <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap">{children}</pre>
    </div>
  );

  const Endpoint = ({ method, path, desc, auth, params, request, response }) => (
    <div className="mb-10 pb-10 border-b border-gray-200 last:border-0">
      <div className="flex items-center gap-4 mb-3">
        <span className={`px-3 py-1 rounded text-white text-sm font-semibold ${method === 'POST' ? 'bg-green-500' : method === 'GET' ? 'bg-blue-500' : 'bg-red-500'}`}>{method}</span>
        <code className="text-lg text-gray-800">{path}</code>
      </div>
      <p className="text-gray-600 mb-4">{desc}</p>
      {auth && <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4"><strong className="text-yellow-700">🔑 Authentication Required:</strong> {auth}</div>}
      {params && (
        <>
          <h4 className="font-semibold mb-2">Parameters</h4>
          <table className="w-full mb-4 border-collapse">
            <thead><tr className="bg-gray-50"><th className="p-3 text-left border-b-2">Parameter</th><th className="p-3 text-left border-b-2">Type</th><th className="p-3 text-left border-b-2">Required</th><th className="p-3 text-left border-b-2">Description</th></tr></thead>
            <tbody>{params.map(p => <tr key={p.name} className="border-b"><td className="p-3"><code className="bg-gray-100 px-2 py-1 rounded text-pink-600">{p.name}</code></td><td className="p-3 text-gray-600">{p.type}</td><td className="p-3"><span className={p.required ? 'text-red-500 font-semibold' : 'text-green-500 font-semibold'}>{p.required ? 'Required' : 'Optional'}</span></td><td className="p-3 text-gray-600">{p.desc}</td></tr>)}</tbody>
          </table>
        </>
      )}
      {request && <><div className="font-semibold mb-2">Example Request:</div><CodeBlock>{request}</CodeBlock></>}
      {response && <><div className="font-semibold mb-2">Example Response:</div><CodeBlock>{response}</CodeBlock></>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white px-10 py-5 shadow flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">📚 API Documentation</h1>
        <div className="flex gap-5">
          <Link to="/" className="text-primary font-medium hover:underline">Home</Link>
          <Link to="/dashboard" className="text-primary font-medium hover:underline">Dashboard</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-5 mt-5">
        <section className="bg-white p-10 rounded-xl shadow mb-8">
          <h2 className="text-2xl font-bold mb-4">Welcome to NDX Cloud API</h2>
          <p className="text-gray-600 mb-2">This API allows you to programmatically manage files, users, and shares in NDX Cloud.</p>
          <p className="text-gray-600 mb-4">All API requests must be authenticated using either JWT tokens or secret keys.</p>
          <div className="bg-blue-50 border-l-4 border-primary p-4"><strong>Base URL:</strong> <code className="text-primary font-semibold">http://localhost:3000/api</code></div>
        </section>

        <section className="bg-white p-10 rounded-xl shadow mb-8">
          <h2 className="text-2xl font-bold mb-6 pb-4 border-b-2 border-primary">🔐 Authentication</h2>
          <Endpoint method="POST" path="/auth/register" desc="Create a new user account. Returns access token and user information."
            params={[{ name: 'email', type: 'string', required: true, desc: "User's email address" }, { name: 'password', type: 'string', required: true, desc: "User's password (min 6 characters)" }]}
            request={`curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "securepass123"}'`}
            response={`{
  "user": { "id": "cmkdy7s8z0001ftrhvm0uhbxm", "email": "user@example.com", "secretKey": "a9fd4ad4873f318b7a6b48619d3868b3...", "storageUsed": "0", "plan": { "name": "Free", "storageLimit": "5368709120" } },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`} />
          <Endpoint method="POST" path="/auth/login" desc="Login with existing credentials. Returns access token and user information."
            params={[{ name: 'email', type: 'string', required: true, desc: "User's email address" }, { name: 'password', type: 'string', required: true, desc: "User's password" }]}
            request={`curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "securepass123"}'`} />
          <Endpoint method="GET" path="/auth/me" desc="Get current user information including storage usage." auth="Include JWT token in Authorization header"
            request={`curl -X GET http://localhost:3000/api/auth/me \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`} />
        </section>

        <section className="bg-white p-10 rounded-xl shadow mb-8">
          <h2 className="text-2xl font-bold mb-6 pb-4 border-b-2 border-primary">📁 File Management</h2>
          <Endpoint method="POST" path="/files/upload" desc="Upload a file to your storage. Supports automatic deduplication." auth="Use JWT token OR secret key (X-Secret-Key header)"
            params={[{ name: 'file', type: 'file', required: true, desc: 'The file to upload' }, { name: 'parentId', type: 'string', required: false, desc: 'Parent folder ID' }]}
            request={`curl -X POST http://localhost:3000/api/files/upload \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -F "file=@/path/to/your/file.pdf"`}
            response={`{ "file": { "id": "cmke1abc123", "filename": "document.pdf", "size": "1048576", "mimeType": "application/pdf", "createdAt": "2026-01-14T12:00:00.000Z" }, "deduplicated": false }`} />
          <Endpoint method="GET" path="/files/list" desc="List all files for the authenticated user." auth="JWT token or secret key"
            params={[{ name: 'parentId', type: 'string', required: false, desc: 'Filter by parent folder' }]}
            request={`curl -X GET http://localhost:3000/api/files/list \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`} />
          <Endpoint method="GET" path="/files/download/:fileId" desc="Download a specific file by ID." auth="JWT token or secret key"
            request={`curl -X GET http://localhost:3000/api/files/download/FILE_ID \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -o downloaded_file.pdf`} />
          <Endpoint method="DELETE" path="/files/:fileId" desc="Soft delete a file (can be recovered)." auth="JWT token or secret key"
            request={`curl -X DELETE http://localhost:3000/api/files/FILE_ID \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`} />
        </section>

        <section className="bg-white p-10 rounded-xl shadow mb-8">
          <h2 className="text-2xl font-bold mb-6 pb-4 border-b-2 border-primary">🔗 File Sharing</h2>
          <Endpoint method="POST" path="/shares/create" desc="Create a shareable link for a file with optional password and expiry." auth="JWT token or secret key"
            params={[{ name: 'fileId', type: 'string', required: true, desc: 'ID of the file to share' }, { name: 'password', type: 'string', required: false, desc: 'Password protection' }, { name: 'expiryDays', type: 'number', required: false, desc: 'Days until link expires (default: 7)' }, { name: 'maxDownloads', type: 'number', required: false, desc: 'Maximum downloads allowed (default: 10)' }]}
            request={`curl -X POST http://localhost:3000/api/shares/create \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"fileId": "cmke1abc123", "password": "secret123", "expiryDays": 7, "maxDownloads": 5}'`}
            response={`{ "shareUrl": "http://localhost:3000/api/shares/a1b2c3d4e5f6", "share": { "id": "cmke2xyz789", "shareToken": "a1b2c3d4e5f6", "expiresAt": "2026-01-21T12:00:00.000Z", "maxDownloads": 5, "downloadCount": 0 } }`} />
          <Endpoint method="GET" path="/shares/:shareToken" desc="Download a file using a share token. No authentication required."
            params={[{ name: 'password', type: 'string', required: false, desc: 'Required if share is password-protected' }]}
            request={`curl -X GET "http://localhost:3000/api/shares/a1b2c3d4e5f6?password=secret123" \\
  -o shared_file.pdf`} />
        </section>

        <section className="bg-white p-10 rounded-xl shadow">
          <h2 className="text-2xl font-bold mb-6 pb-4 border-b-2 border-primary">⚠️ Error Codes</h2>
          <table className="w-full border-collapse">
            <thead><tr className="bg-gray-50"><th className="p-3 text-left border-b-2">Status Code</th><th className="p-3 text-left border-b-2">Description</th><th className="p-3 text-left border-b-2">Common Causes</th></tr></thead>
            <tbody>
              {[
                { code: '400', desc: 'Bad Request', cause: 'Missing required parameters, invalid input' },
                { code: '401', desc: 'Unauthorized', cause: 'Invalid or missing authentication token' },
                { code: '403', desc: 'Forbidden', cause: 'Storage quota exceeded, download limit reached' },
                { code: '404', desc: 'Not Found', cause: 'File or share not found' },
                { code: '410', desc: 'Gone', cause: 'Share link expired' },
                { code: '500', desc: 'Internal Server Error', cause: 'Server-side error' },
              ].map(e => <tr key={e.code} className="border-b"><td className="p-3"><code className="bg-gray-100 px-2 py-1 rounded">{e.code}</code></td><td className="p-3 text-gray-600">{e.desc}</td><td className="p-3 text-gray-600">{e.cause}</td></tr>)}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
