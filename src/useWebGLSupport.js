'use client'

import { useEffect, useState } from 'react'

export default function useWebGLSupport() {
  const [supported, setSupported] = useState(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    setSupported(Boolean(context))
    context?.getExtension?.('WEBGL_lose_context')?.loseContext()
  }, [])

  return supported
}
