# LLM implementation context

## Purpose

Implement an interactive, sequential 3D instruction guide in an existing React website. Each stage has its own GLB/GLTF URL, text instruction, camera position, optional warning, optional links, and optional 3D annotations.

## Public API

- `Guided3DSteps({ id, title, hardwareRevision, steps })`: runtime component.
- `Guided3DStepsEditor({ value, onChange })`: basic JSON authoring component.
- `parseSteps(value)`: forgiving parser and normalizer.
- `normalizeSteps(value)`: schema normalizer; invalid input becomes an empty list.

## Integration rules

- Use client-only rendering or dynamic import with SSR disabled.
- Keep model URLs same-origin or configure CORS on the asset host.
- Do not make the viewer the only source of instructions; text must remain usable if WebGL fails.
- Preserve stable `id` values because they are used for deep links and analytics.
- Use direct annotation positions for precision. Use `centerObject` or `targetObject` only for named GLTF nodes.
- If the host has its own design system, replace the small inline styles in `Guided3DSteps.jsx`; the viewer itself does not require Tailwind.

## Prompt for an implementation agent

> Add the `packages/3d-step-generator` directory to this React website. Install the peer dependencies. Create a client-only route/component that imports `Guided3DSteps`, loads step data from JSON or CMS content, and serves GLB files from a public or CDN path. Preserve the step schema and stable IDs. Add a no-WebGL fallback, verify keyboard navigation and written instructions, and test with at least two small GLB files. Do not add server-side GLTF loading or require TinaCMS.

## Troubleshooting

- Blank canvas: check browser WebGL support, model URL, and CORS.
- Model missing: open the GLB URL directly and inspect the network request.
- Wrong focus: capture a camera target or set `centerObject` to a GLTF node path/name.
- Slow page: compress GLBs and use one optimized asset per stage.
