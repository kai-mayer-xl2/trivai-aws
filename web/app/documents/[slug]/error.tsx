'use client'
 
import { useEffect } from 'react'
 
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 bg-white px-8 py-24 dark:bg-black sm:px-16">
        <div className="max-w-md space-y-3">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Document
          </p>
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Ooops! Something went wrong
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            We couldn&apos;t load this document. Try again to continue.
          </p>
        </div>
        <button
          className="h-12 min-h-12 w-full shrink-0 rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] sm:w-fit"
          onClick={() => retry()}
          type="button"
        >
          Try again
        </button>
      </main>
    </div>
  )
}