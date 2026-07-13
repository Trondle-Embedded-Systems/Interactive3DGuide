'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo, memo, Suspense, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { findNamedObject, findObjectByPath, findOrbitCenterObject, getObjectBox, getObjectCenter, getObjectPath } from './modelOrbitCenter'
import SceneErrorBoundary from './SceneErrorBoundary'
import ModelUnavailableOverlay from './ModelUnavailableOverlay'

const Model = memo(function Model({ url, annotations, cameraPosition, position = 'flat', onObjectClick, setModelGroup, setModelReady, centerObject, onModelCenter }) {
  const group = useRef()
  const [selectedBox, setSelectedBox] = useState(null)
  const { scene } = useGLTF(url)
  
  useEffect(() => {
    if (group.current && scene) {
      // Clear previous content
      while(group.current.children.length > 0){
        group.current.remove(group.current.children[0])
      }
      
      // Clone and add scene
      const clonedScene = scene.clone()
      
      // Auto-center and scale model
      const box = new THREE.Box3().setFromObject(clonedScene)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      // Center model
      clonedScene.position.x += (clonedScene.position.x - center.x)
      clonedScene.position.y += (clonedScene.position.y - center.y)
      clonedScene.position.z += (clonedScene.position.z - center.z)
      
      // Apply rotation based on position preset
      switch (position) {
        case 'up':
          clonedScene.rotation.x = 0
          clonedScene.rotation.y = 0
          clonedScene.rotation.z = 0
          break
        case 'down':
          clonedScene.rotation.x = Math.PI
          clonedScene.rotation.y = 0
          clonedScene.rotation.z = 0
          break
        case 'left':
          clonedScene.rotation.x = Math.PI / 2
          clonedScene.rotation.y = 0
          clonedScene.rotation.z = Math.PI / 2
          break
        case 'right':
          clonedScene.rotation.x = Math.PI / 2
          clonedScene.rotation.y = 0
          clonedScene.rotation.z = -Math.PI / 2
          break
        case 'flat':
        default:
          clonedScene.rotation.x = Math.PI / 2
          clonedScene.rotation.y = 0
          clonedScene.rotation.z = 0
          break
      }
      
      // Scale to fit in view (max dimension = 20 units)
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = maxDim > 0 ? 20 / maxDim : 1
      clonedScene.scale.setScalar(scale)
      
      group.current.add(clonedScene)

      const selected = findObjectByPath(group.current, centerObject) || findNamedObject(group.current, centerObject) || findOrbitCenterObject(group.current)
      const target = getObjectCenter(selected)
      if (target && onModelCenter) {
        onModelCenter({ target })
        setSelectedBox(centerObject ? getObjectBox(selected) : null)
      }
      
      // Store reference in ref
      if (setModelGroup) {
        setModelGroup.current = group
      }
      
      // Mark as loaded and ready
      if (setModelReady) {
        setModelReady(true)
      }
    }
  }, [scene, setModelGroup, setModelReady, url, position, centerObject, onModelCenter])

  const handlePointerDown = (event) => {
    event.stopPropagation()
    if (onObjectClick) onObjectClick({ name: event.object.name || 'unnamed', path: getObjectPath(group.current, event.object), object: event.object })
  }

  return <group ref={group} onPointerDown={handlePointerDown}>
    {selectedBox ? <box3Helper args={[selectedBox, '#e30613']} /> : null}
  </group>
})

function getDirectionVector(direction) {
  const vectors = {
    'up': new THREE.Vector3(0, 1, 0),
    'down': new THREE.Vector3(0, -1, 0),
    'north': new THREE.Vector3(0, 0, -1),
    'south': new THREE.Vector3(0, 0, 1),
    'east': new THREE.Vector3(1, 0, 0),
    'west': new THREE.Vector3(-1, 0, 0)
  }
  
  if (vectors[direction]) {
    return vectors[direction]
  }
  
  if (typeof direction === 'object' && direction.x !== undefined) {
    return new THREE.Vector3(direction.x || 0, direction.y || 0, direction.z || 0)
  }
  
  return new THREE.Vector3(0, 1, 0)
}

function findObjectByName(scene, name) {
  if (!scene || typeof scene.traverse !== 'function') {
    return null
  }
  
  let foundObject = null
  
  scene.traverse((object) => {
    if (object.name === name && !foundObject) {
      foundObject = object
    }
  })
  
  return foundObject
}

const AnnotationMarker = memo(function AnnotationMarker({ modelGroup, annotation }) {
  const meshRef = useRef()
  const labelRef = useRef()
  const [labelTexture, setLabelTexture] = React.useState(null)
  const arrowPositionRef = useRef(null)
  
  // Create texture once when component mounts
  useEffect(() => {
    const texture = createLabelTexture(annotation.label, annotation.color)
    setLabelTexture(texture)
  }, [annotation.label, annotation.color])

  // Get arrow position based on object
  useEffect(() => {
    const actualGroup = modelGroup.current?.current
    
    if (annotation.position && typeof annotation.position === 'object') {
      const pos = annotation.position
      const direction = getDirectionVector(annotation.direction || 'up')
      const offset = annotation.offset || 2.0
      const directionVector = direction.clone().normalize()
      
      const arrowPosition = new THREE.Vector3(pos.x || 0, pos.y || 0, pos.z || 0)
        .add(directionVector.multiplyScalar(offset))
      
      const arrowOffset = annotation.arrowOffset || { x: 0, y: 0, z: 0 }
      arrowPosition.x += arrowOffset.x || 0
      arrowPosition.y += arrowOffset.y || 0
      arrowPosition.z += arrowOffset.z || 0
      
      arrowPositionRef.current = arrowPosition
      return
    }
    
    if (annotation.targetObject && actualGroup) {
      const targetObject = findObjectByName(actualGroup, annotation.targetObject)
      
      if (targetObject) {
        targetObject.updateMatrixWorld(true)
        
        const objectPosition = new THREE.Vector3()
        targetObject.getWorldPosition(objectPosition)
        
        const direction = getDirectionVector(annotation.direction || 'up')
        const offset = annotation.offset || 2.0
        const directionVector = direction.clone().normalize()
        
        const arrowPosition = objectPosition.clone().add(directionVector.multiplyScalar(offset))
        
        const arrowOffset = annotation.arrowOffset || { x: 0, y: 0, z: 0 }
        arrowPosition.x += arrowOffset.x || 0
        arrowPosition.y += arrowOffset.y || 0
        arrowPosition.z += arrowOffset.z || 0
        
        arrowPositionRef.current = arrowPosition
      }
    }
  }, [annotation.targetObject, annotation.offset, annotation.direction, annotation.arrowOffset, annotation.position, modelGroup])

  useFrame(({ camera }) => {
    if (labelRef.current && meshRef.current) {
      labelRef.current.quaternion.copy(camera.quaternion)
      
      const distance = camera.position.distanceTo(meshRef.current.position)
      const labelSize = annotation.labelSize || 1.0
      const scale = Math.max(0.15, distance * 0.008) * labelSize
      labelRef.current.scale.setScalar(scale)
    }
  })

  const arrowPosition = arrowPositionRef.current
  
  if (!arrowPosition) return null

  const labelOffset = annotation.labelOffset || { x: 0, y: 0, z: 0 }
  const labelY = annotation.labelPosition === 'below' ? -0.5 : 1
  const labelPosition = [
    labelOffset.x || 0,
    labelY + (labelOffset.y || 0),
    labelOffset.z || 0
  ]

  return (
    <group position={[arrowPosition.x, arrowPosition.y, arrowPosition.z]}>
      <group rotation={[0, 0, Math.PI]}>
        <mesh ref={meshRef}>
          <cylinderGeometry args={[0.1, 0.1, 2]} />
          <meshStandardMaterial color={annotation.color} />
        </mesh>
        
        <mesh position={[0, 1.2, 0]}>
          <coneGeometry args={[0.3, 0.6, 8]} />
          <meshStandardMaterial color={annotation.color} />
        </mesh>
      </group>
      
      {labelTexture && (
        <mesh 
          position={labelPosition}
          ref={labelRef}
        >
          <planeGeometry args={[20, 5]} />
          <meshBasicMaterial 
            map={labelTexture} 
            transparent={true} 
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}
    </group>
  )
})

function createLabelTexture(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)
  
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Loading overlay component
function LoadingOverlay({ progress, total, isDarkMode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20"
         style={{ background: isDarkMode ? '#1a1a1a' : '#f5f5f5' }}>
      <div className="w-10 h-10 mb-4 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-[#e30613] animate-spin" />
      <div className="text-center">
        <motion.p 
          className="text-lg font-semibold text-neutral-900 dark:text-white mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Loading models...
        </motion.p>
        <motion.p 
          className="text-sm text-neutral-600 dark:text-neutral-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {progress} of {total} loaded
        </motion.p>
        {/* Progress bar */}
        <div className="w-64 h-2 bg-neutral-300 dark:bg-neutral-700 rounded-full mt-4 overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: total > 0 ? `${(progress / total) * 100}%` : '0%' }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}

function CameraCapture({ cameraRef, onReady }) {
  useFrame(({ camera }) => {
    if (camera && !cameraRef.current) {
      cameraRef.current = camera
      if (onReady) onReady()
    }
  })
  return null
}

function normalizeCameraData(camera) {
  const target = camera?.target && typeof camera.target === 'object'
    ? camera.target
    : {}

  return {
    x: Number.isFinite(camera?.x) ? camera.x : 0,
    y: Number.isFinite(camera?.y) ? camera.y : 0,
    z: Number.isFinite(camera?.z) ? camera.z : 50,
    target: {
      x: Number.isFinite(target?.x) ? target.x : 0,
      y: Number.isFinite(target?.y) ? target.y : 0,
      z: Number.isFinite(target?.z) ? target.z : 0
    }
  }
}

const Sequential3DViewer = forwardRef(function Sequential3DViewer({ models, activeIndex, onIndexChange, onCenterObjectChange, allowCenterPicking = false, viewportMode = 'default', showControls = true, resetSignal = 0 }, ref) {
  const [internalIndex, setInternalIndex] = useState(0)
  const [parsedModels, setParsedModels] = useState([])
  const [modelReady, setModelReady] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isPreloading, setIsPreloading] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)
  const cameraRef = useRef()
  const controlsRef = useRef()
  const modelGroupRef = useRef()
  const animationRef = useRef(0)
  const hasOrientedRef = useRef(false)
  const initialViewRef = useRef(null)
  const [autoTarget, setAutoTarget] = useState(null)
  const [isPickingCenter, setIsPickingCenter] = useState(false)
  const [failedFile, setFailedFile] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const modelReadyRef = useRef(false)

  useEffect(() => {
    modelReadyRef.current = modelReady
  }, [modelReady])

  // Parse input once. The new MDX wrapper passes structured data, while old
  // manual markers still pass the legacy JSON string.
  useEffect(() => {
    try {
      if (!models) {
        setParsedModels([])
        setLoadingProgress(0)
        setIsPreloading(false)
        return undefined
      }

      const parsed = typeof models === 'string' ? JSON.parse(models) : models
      if (!Array.isArray(parsed)) {
        throw new Error('Sequential viewer models must be an array')
      }
      setParsedModels(parsed)

      if (parsed.length === 0) {
        setLoadingProgress(0)
        setIsPreloading(false)
        return undefined
      }

      setLoadingProgress(0)
      setIsPreloading(false)
    } catch (error) {
      console.error('Error parsing models:', error)
      setParsedModels([])
      setLoadingProgress(0)
      setIsPreloading(false)
    }

  }, [models])

  // Detect theme changes
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                       window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(isDark)
    }

    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkTheme)
    }
  }, [])

  const currentIndex = typeof activeIndex === 'number' ? activeIndex : internalIndex
  const currentModel = parsedModels[currentIndex]
  const parsedAnnotations = currentModel?.annotations || []
  // Memoized so the fly-to-camera effect only reruns on actual step changes,
  // not on every unrelated state update (model ready, loading progress, …).
  const parsedCamera = useMemo(() => normalizeCameraData(currentModel?.camera), [currentModel])
  const centerObject = currentModel?.centerObject || ''
  const orbitTarget = useMemo(
    () => autoTarget || new THREE.Vector3(parsedCamera.target.x, parsedCamera.target.y, parsedCamera.target.z),
    [autoTarget, parsedCamera]
  )
  const position = currentModel?.position || 'flat'

  // The Canvas camera / OrbitControls target props must never change after
  // mount: react-three-fiber re-applies them on change, teleporting the view.
  // All later movement goes through the animated fly-to below.
  if (!initialViewRef.current) {
    initialViewRef.current = {
      position: [parsedCamera.x, parsedCamera.y, parsedCamera.z],
      target: [orbitTarget.x, orbitTarget.y, orbitTarget.z],
    }
  }
  const canvasViewportClass = viewportMode === 'manual'
    ? 'manual-3d-viewport h-[420px] sm:h-auto sm:aspect-[16/9]'
    : 'aspect-[16/9]'

  // Different guided stages have different GLBs. Keep loading bounded by
  // warming only the current and immediately following step. A file that
  // already failed is skipped — preloading it just re-caches the rejection.
  useEffect(() => {
    if (!currentModel?.file || currentModel.file === failedFile) return undefined

    let cancelled = false
    const nextModel = parsedModels[currentIndex + 1]
    useGLTF.preload(currentModel.file)
    setLoadingProgress(1)

    const preloadNext = () => {
      if (!cancelled && nextModel?.file && nextModel.file !== failedFile) {
        useGLTF.preload(nextModel.file)
        setLoadingProgress(2)
      }
    }

    const timeoutId = window.setTimeout(preloadNext, 180)
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [currentIndex, currentModel, parsedModels, failedFile])

  // Reset model readiness when changing steps or selecting a different model.
  useEffect(() => {
    setModelReady(false)
    setAutoTarget(null)
    setIsPickingCenter(false)
  }, [currentIndex, currentModel?.file])

  // Do not leave a guided step on a permanent loading state when its model
  // request never settles. Errors are handled separately by the boundary.
  useEffect(() => {
    if (!currentModel?.file) return undefined
    setFailedFile(null)
    const timeout = window.setTimeout(() => {
      if (!modelReadyRef.current) setFailedFile(currentModel.file)
    }, 15000)
    return () => window.clearTimeout(timeout)
  }, [currentModel?.file, currentIndex, retryCount])

  const handleModelCenter = useCallback(({ target }) => {
    setAutoTarget(target)
  }, [])

  const handleModelError = useCallback((error) => {
    console.error('Failed to load 3D model:', error)
    setFailedFile(currentModel?.file || null)
    setModelReady(false)
  }, [currentModel?.file])

  const handleRetry = useCallback(() => {
    setFailedFile(null)
    setRetryCount((count) => count + 1)
  }, [])

  const handleObjectClick = useCallback(({ path }) => {
    if (!allowCenterPicking || !isPickingCenter || !path) return
    setIsPickingCenter(false)
    if (onCenterObjectChange) onCenterObjectChange(path)
  }, [allowCenterPicking, isPickingCenter, onCenterObjectChange])
  
  const updateIndex = (nextIndex) => {
    if (typeof activeIndex !== 'number') {
      setInternalIndex(nextIndex)
    }
    if (onIndexChange) {
      onIndexChange(nextIndex)
    }
  }

  const handlePrevious = () => {
    updateIndex(Math.max(0, currentIndex - 1))
  }

  const handleNext = () => {
    updateIndex(Math.min(parsedModels.length - 1, currentIndex + 1))
  }

  // Only one camera animation may run at a time. Without cancellation, a
  // step change mid-flight leaves the old rAF loop fighting the new one.
  const stopCameraAnimation = useCallback(() => {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current)
      animationRef.current = 0
    }
    if (controlsRef.current) {
      controlsRef.current.enabled = true
    }
  }, [])

  const animateCameraTo = useCallback((targetPosition, targetLookAt, duration) => {
    if (!cameraRef.current) return
    stopCameraAnimation()

    const startPosition = cameraRef.current.position.clone()
    const startLookAt = controlsRef.current
      ? controlsRef.current.target.clone()
      : targetLookAt.clone()
    const startTime = Date.now()

    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }

    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Smooth sine-based ease-in-out - very gentle start and end
      const ease = -(Math.cos(Math.PI * progress) - 1) / 2

      cameraRef.current.position.lerpVectors(startPosition, targetPosition, ease)
      const currentLookAt = new THREE.Vector3().lerpVectors(startLookAt, targetLookAt, ease)
      if (controlsRef.current) {
        controlsRef.current.target.copy(currentLookAt)
      }
      cameraRef.current.lookAt(currentLookAt)

      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(animate)
      } else {
        animationRef.current = 0
        if (controlsRef.current) {
          controlsRef.current.enabled = true
        }
      }
    }

    animate()
  }, [stopCameraAnimation])

  const handleReset = useCallback(() => {
    animateCameraTo(
      new THREE.Vector3(parsedCamera.x, parsedCamera.y, parsedCamera.z),
      orbitTarget.clone(),
      500
    )
  }, [animateCameraTo, parsedCamera, orbitTarget])

  // Lets wrappers (e.g. the guided-steps Home button) trigger a camera reset
  // without a ref, which next/dynamic does not forward.
  useEffect(() => {
    if (resetSignal) handleReset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])

  const getCameraPosition = () => {
    if (!cameraRef.current) return null
    const pos = cameraRef.current.position
    const target = controlsRef.current?.target
    return {
      x: parseFloat(pos.x.toFixed(2)),
      y: parseFloat(pos.y.toFixed(2)),
      z: parseFloat(pos.z.toFixed(2)),
      target: {
        x: parseFloat((target?.x ?? parsedCamera.target.x).toFixed(2)),
        y: parseFloat((target?.y ?? parsedCamera.target.y).toFixed(2)),
        z: parseFloat((target?.z ?? parsedCamera.target.z).toFixed(2))
      }
    }
  }

  useImperativeHandle(ref, () => ({
    getCameraPosition,
    getCurrentIndex: () => currentIndex,
    setCurrentIndex: (nextIndex) => updateIndex(nextIndex),
    resetCamera: handleReset
  }))

  // Auto-orient camera when model changes
  useEffect(() => {
    if (!cameraReady || !cameraRef.current || !currentModel) return undefined

    const targetPosition = new THREE.Vector3(parsedCamera.x, parsedCamera.y, parsedCamera.z)
    const targetLookAt = orbitTarget.clone()

    // The very first orientation happens while the viewer is still loading —
    // snap instead of flying in from the frozen initial Canvas camera.
    if (!hasOrientedRef.current) {
      hasOrientedRef.current = true
      cameraRef.current.position.copy(targetPosition)
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt)
      }
      cameraRef.current.lookAt(targetLookAt)
      return undefined
    }

    animateCameraTo(targetPosition, targetLookAt, 800)
    return stopCameraAnimation
  }, [cameraReady, currentModel, parsedCamera, orbitTarget, animateCameraTo, stopCameraAnimation])

  if (parsedModels.length === 0 && !isPreloading) {
    return (
      <div className="relative w-full aspect-[16/9] my-6 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        <p className="text-neutral-600 dark:text-neutral-400">No models to display</p>
      </div>
    )
  }

  return (
    <div className={showControls ? 'relative w-full my-6 rounded-lg border border-neutral-300 dark:border-neutral-700 overflow-hidden' : 'relative w-full overflow-hidden'}>
      {showControls ? (
      <>
      {/* Navigation Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-white/90 dark:from-black/90 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Previous model"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-700 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={handleNext}
              disabled={currentIndex === parsedModels.length - 1}
              className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Next model"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-700 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div className="flex flex-col">
              <motion.span
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0 }}
                className="text-sm font-semibold text-neutral-900 dark:text-white"
              >
              {currentModel?.label || `Stage ${currentIndex + 1}`}
            </motion.span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Stage {currentIndex + 1} of {parsedModels.length}
            </span>
            </div>
          </div>
          
          {allowCenterPicking ? <button
            onClick={handleReset}
            className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            title="Reset camera"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-700 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button> : null}
          {allowCenterPicking ? <button
              onClick={() => setIsPickingCenter((value) => !value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              title="Choose the object used as the orbit center"
            >
              {isPickingCenter ? 'Click an object…' : 'Pick orbit center'}
            </button> : null}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-200 dark:bg-neutral-800 z-10">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: '0%' }}
          animate={{ width: parsedModels.length > 0 ? `${((currentIndex + 1) / parsedModels.length) * 100}%` : '0%' }}
          transition={{ duration: 0 }}
        />
      </div>
      </>
      ) : null}

      {/* Loading Overlay */}
      <AnimatePresence>
        {isPreloading && (
          <LoadingOverlay 
            progress={loadingProgress}
            total={parsedModels.length}
            isDarkMode={isDarkMode}
          />
        )}
      </AnimatePresence>

      {/* 3D Canvas */}
      <div className={`relative ${canvasViewportClass}`}>
        {failedFile && currentModel?.file === failedFile ? (
          <ModelUnavailableOverlay onRetry={handleRetry} />
        ) : null}

        <Canvas
          camera={{ position: initialViewRef.current.position, fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          style={{ background: isDarkMode ? '#1a1a1a' : '#f5f5f5' }}
        >
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />
          {/* The preset HDR is fetched from a CDN — keep a miss from killing the scene. */}
          <SceneErrorBoundary resetKey={retryCount}>
            <Suspense fallback={null}>
              <Environment preset="city" backgroundIntensity={0.2} />
            </Suspense>
          </SceneErrorBoundary>

          <CameraCapture cameraRef={cameraRef} onReady={() => setCameraReady(true)} />

          <SceneErrorBoundary
            clearUrl={currentModel?.file}
            resetKey={`${currentModel?.file}:${retryCount}`}
            onError={handleModelError}
          >
            <Suspense fallback={null}>
              {currentModel?.file && (
                <Model
                  key={`${currentModel.file}:${position}:${retryCount}`}
                  url={currentModel.file}
                  annotations={parsedAnnotations}
                  cameraPosition={parsedCamera}
                  position={position}
                  setModelGroup={modelGroupRef}
                  setModelReady={setModelReady}
                  centerObject={centerObject}
                  onModelCenter={handleModelCenter}
                  onObjectClick={handleObjectClick}
                />
              )}

              {modelReady && parsedAnnotations.map((annotation, index) => (
                <AnnotationMarker
                  key={`${annotation.targetObject}-${index}-${currentIndex}`}
                  modelGroup={modelGroupRef}
                  annotation={annotation}
                />
              ))}
            </Suspense>
          </SceneErrorBoundary>


          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            target={initialViewRef.current.target}
          />
        </Canvas>
      </div>
    </div>
  )
})

Sequential3DViewer.displayName = 'Sequential3DViewer'

export default Sequential3DViewer
