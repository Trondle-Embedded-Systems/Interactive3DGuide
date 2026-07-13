'use client'

import React from 'react'
import { useGLTF } from '@react-three/drei'

// Boundary for content rendered *inside* a <Canvas>. A loader failure (a model
// URL that 404s, an unreachable Environment HDR) surfaces as a throw during
// render. Without a boundary inside the fiber tree that throw escapes to the
// DOM tree, which unmounts the Canvas mid-frame — the renderer loses its WebGL
// context and the whole viewer dies. Catching it here keeps the scene alive and
// lets the surrounding shell show a fallback for just the part that failed.
export default class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    // drei caches the rejected loader promise per URL, so every later render of
    // the same URL rethrows the cached failure until the entry is cleared —
    // including after the file becomes available again.
    if (this.props.clearUrl) useGLTF.clear(this.props.clearUrl)
    if (this.props.onError) this.props.onError(error)
  }

  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
