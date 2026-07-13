const Box = () => <span aria-hidden="true">□</span>

export default function WebGLViewerFallback({ className = '' }) {
  return (
    <div className={`manual-3d-viewport flex aspect-video items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 px-6 text-center dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
      <div>
        <Box />
        <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-200">3D view is unavailable on this device.</p>
        <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">Continue with the written instructions below.</p>
      </div>
    </div>
  )
}
