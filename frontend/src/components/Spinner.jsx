export default function Spinner({ className = '' }) {
  return (
    <span className={`inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2 ${className}`} />
  );
}
