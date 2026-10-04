export default function Alert({ message, type, show }) {
  if (!show || !message) return null;
  
  const styles = {
    error: 'bg-red-50 text-red-600 border-red-200',
    success: 'bg-green-50 text-green-600 border-green-200',
    info: 'bg-blue-50 text-blue-600 border-blue-200',
  };
  
  return (
    <div className={`p-3 rounded-lg mb-5 border ${styles[type] || styles.info} animate-fadeIn`}>
      {message}
    </div>
  );
}
