import * as THREE from 'three'

function hasRenderableDescendant(object) {
  if (object?.isMesh) return true
  return Boolean(object?.children?.some(hasRenderableDescendant))
}

function boundsFor(object) {
  const box = new THREE.Box3().setFromObject(object)
  return box.isEmpty() ? null : box
}

function sizeScore(box) {
  const size = box.getSize(new THREE.Vector3())
  // Surface footprint is more useful than volume for thin PCBs and plates.
  // It prevents a small, thick arrow from winning over a large flat board.
  const footprint = Math.max(size.x * size.y, size.x * size.z, size.y * size.z)
  return footprint > 0 ? footprint : size.lengthSq()
}

// Prefer the largest top-level component (PCB versus an arrow, for example).
// If a GLB has one wrapper node, inspect its children so the wrapper does not
// make the whole scene look like one indivisible object.
export function findOrbitCenterObject(root) {
  if (!root) return null
  root.updateMatrixWorld(true)

  let candidates = (root.children || []).filter(hasRenderableDescendant)
  if (candidates.length === 1 && candidates[0].children?.length > 1) {
    const children = candidates[0].children.filter(hasRenderableDescendant)
    if (children.length > 1) candidates = children
  }

  if (candidates.length === 0) {
    root.traverse((object) => {
      if (object.isMesh) candidates.push(object)
    })
  }

  let best = null
  let bestScore = -1
  candidates.forEach((candidate) => {
    const box = boundsFor(candidate)
    if (!box) return
    const score = sizeScore(box)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  })
  return best
}

export function findNamedObject(root, name) {
  if (!root || !name) return null
  let found = null
  root.traverse((object) => {
    if (!found && object.name === name) found = object
  })
  return found
}

// Names are not unique in many GLBs. Persist the object's child-index path so
// the editor can re-select the exact mesh that was clicked.
export function getObjectPath(root, object) {
  if (!root || !object) return ''
  const indexes = []
  let current = object
  while (current && current !== root) {
    if (!current.parent) return ''
    indexes.unshift(current.parent.children.indexOf(current))
    current = current.parent
  }
  return current === root ? `path:${indexes.join('/')}` : ''
}

export function findObjectByPath(root, path) {
  if (!root || typeof path !== 'string' || !path.startsWith('path:')) return null
  let current = root
  const indexes = path.slice(5).split('/').filter(Boolean).map(Number)
  for (const index of indexes) {
    if (!Number.isInteger(index) || !current.children?.[index]) return null
    current = current.children[index]
  }
  return current === root ? null : current
}

export function getObjectCenter(object) {
  const box = object && boundsFor(object)
  return box ? box.getCenter(new THREE.Vector3()) : null
}

export function getObjectBox(object) {
  return object ? boundsFor(object) : null
}
