'use client'

const Box = ({ size = 24 }) => <span style={{ fontSize: size }} aria-hidden="true">□</span>
const RefreshCw = ({ size = 14 }) => <span style={{ fontSize: size }} aria-hidden="true">↻</span>

export default function ModelUnavailableOverlay({ onRetry }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-neutral-100/95 p-6 text-center dark:bg-neutral-900/95">
      <Box size={24} />
      <p className="m-0 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
        This 3D model is unavailable. Continue with the written instructions.
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      ) : null}
    </div>
  )
}
