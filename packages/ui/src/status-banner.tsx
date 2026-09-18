export default function StatusBanner() {
  return (
    <div
      role="status"
      className="w-full bg-amber-100 text-amber-900 text-sm text-center py-2 px-4 border-b border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
    >
      We are aware of a service-impacting issue and are actively working to fix it.
    </div>
  );
}