'use client'
import React, { useEffect, useState } from 'react'
import { DEFAULT_CAMERA, parseSteps } from './schema'
import Guided3DSteps from './Guided3DSteps'
export default function Guided3DStepsEditor({ value = '[]', onChange }) { const [text, setText] = useState(typeof value === 'string' ? value : JSON.stringify(value, null, 2)); const steps = parseSteps(text); useEffect(() => { onChange?.(text) }, [text, onChange]); const add = () => setText(JSON.stringify([...steps, { id: `step-${steps.length + 1}`, title: `Step ${steps.length + 1}`, instruction: '', model: '', orientation: 'flat', camera: DEFAULT_CAMERA, annotations: [], relatedLinks: [] }], null, 2)); return <div><textarea aria-label="Guided 3D steps JSON" value={text} onChange={e => setText(e.target.value)} rows={16} style={{ width: '100%', fontFamily: 'monospace' }} /><button type="button" onClick={add}>Add guided step</button><Guided3DSteps steps={steps} /></div> }
