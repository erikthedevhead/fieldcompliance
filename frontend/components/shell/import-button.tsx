'use client'

import Link from 'next/link'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Topbar entry point for bulk import. Drop into topbar.tsx to the LEFT
 * of the search bar:
 *
 *   <ImportButton />
 *   {...search bar...}
 */
export function ImportButton() {
  return (
    <Button variant="secondary" size="sm" asChild>
      <Link href="/import">
        <Upload size={14} strokeWidth={2} />
        Import
      </Link>
    </Button>
  )
}
