// Shown on every page of the staging deployment (NEXT_PUBLIC_DEPLOY_ENV=staging) so nobody
// mistakes it for the live site. Not dismissable and not fixed: it pushes the page down.
export function StagingBar() {
  return (
    <div
      role="note"
      className="w-full bg-amber-400 px-4 py-1 text-center text-[12px] font-semibold text-black"
    >
      Staging: not the live site
    </div>
  );
}
