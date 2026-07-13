# Interactive 3D Guide

An embeddable React/Three.js guided 3D instruction module. It displays one GLB/GLTF model per step, supports camera presets, model orientation, annotations, named-object centering, URL-safe step navigation, and a JSON editor for content authors.

<img width="1302" height="1032" alt="Animation" src="https://github.com/user-attachments/assets/8d43cba2-64a4-44cd-b049-e2d1cc78f8bf" />

## Requirements

React 18+, `three`, `@react-three/fiber`, `@react-three/drei`, and `framer-motion`. The package is intentionally framework-neutral; it works in Vite, Next.js, Remix, and similar React apps. Render the viewer only on the client because WebGL and GLTF loading require a browser.

## Quick start

```jsx
import { Guided3DSteps } from './src/index.js'
import steps from './steps.json'

export default function ProductGuide() {
  return <Guided3DSteps id="board-install" title="Install the board" steps={steps} />
}
```

Use `Guided3DStepsEditor` when a simple authoring surface is needed:

```jsx
<Guided3DStepsEditor value={json} onChange={setJson} />
```

Models should be publicly reachable URLs, or paths served by the host site. Keep CORS enabled on the model host. The viewer auto-centers and scales each model.

## Step format

```json
[
  {
    "id": "remove-cover",
    "title": "Remove the cover",
    "instruction": "Undo the four screws and lift the cover away.",
    "model": "/models/cover-removed.glb",
    "orientation": "flat",
    "camera": { "x": 0, "y": 18, "z": 42, "target": { "x": 0, "y": 0, "z": 0 } },
    "annotations": [{ "label": "Screw", "color": "#e30613", "position": { "x": 2, "y": 1, "z": 0 }, "direction": "up", "offset": 2 }],
    "centerObject": "Assembly/Screw",
    "note": "Disconnect power first.",
    "relatedLinks": [{ "label": "Safety", "href": "/safety" }]
  }
]
```

`orientation` accepts `flat`, `up`, `down`, `left`, or `right`. Annotation directions accept `up`, `down`, `north`, `south`, `east`, `west`, or a custom `{x,y,z}` vector. `position` is preferred for precise annotation placement; `targetObject` can be used when GLTF node names are stable.


## Accessibility and production notes

The written instruction remains in the DOM below the canvas. Add a visible product title and meaningful step instructions. Avoid relying on annotations alone. Large GLBs should be compressed and split by step; do not load a complete product assembly for every stage.

See [`docs/LLM-CONTEXT.md`](docs/LLM-CONTEXT.md) for implementation context and an LLM-ready prompt.
