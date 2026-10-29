interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Compare visible node overlap after clamping each candidate into the viewport. */
export function placeRoutePanel(anchor: Rect, nodes: Rect[], width: number, height: number,
  viewportWidth: number, viewportHeight: number, wires: Rect[] = []) {
  const margin = 12
  const gap = 12
  const candidates = [
    { left: anchor.right + gap, top: anchor.top },
    { left: anchor.left, top: anchor.bottom + gap },
    { left: anchor.left - width - gap, top: anchor.top },
    { left: anchor.left, top: anchor.top - height - gap }
  ]
  // Slide beside the trigger as well as changing sides. Obstacle boundaries give
  // the smallest useful offset without depending on arbitrary pixel increments.
  const verticalStops = [anchor.top, anchor.bottom - height, (anchor.top + anchor.bottom - height) / 2]
  const horizontalStops = [anchor.left, anchor.right - width]
  for (const node of [...nodes, ...wires]) {
    verticalStops.push(node.bottom + gap, node.top - height - gap)
    horizontalStops.push(node.right + gap, node.left - width - gap)
  }
  for (const top of verticalStops) {
    candidates.push({ left: anchor.right + gap, top }, { left: anchor.left - width - gap, top })
  }
  for (const left of horizontalStops) {
    candidates.push({ left, top: anchor.bottom + gap }, { left, top: anchor.top - height - gap })
  }
  // Retain remote lanes as fallbacks when all adjacent positions are obstructed.
  for (const node of [...nodes, ...wires]) {
    candidates.push(
      { left: node.right + gap, top: anchor.top },
      { left: anchor.left, top: node.bottom + gap },
      { left: node.left - width - gap, top: anchor.top },
      { left: anchor.left, top: node.top - height - gap }
    )
  }
  const overlap = (left: number, top: number, rect: Rect) =>
    Math.max(0, Math.min(left + width, rect.right) - Math.max(left, rect.left)) *
    Math.max(0, Math.min(top + height, rect.bottom) - Math.max(top, rect.top))
  return candidates.map((candidate, priority) => {
    const left = Math.max(margin, Math.min(candidate.left, viewportWidth - width - margin))
    const top = Math.max(margin, Math.min(candidate.top, viewportHeight - height - margin))
    const areas = nodes.map(node => overlap(left, top, node))
    // Above/below panels align with the node's left edge; side panels align
    // with its top edge. A global right-side origin would pull vertical panels right.
    const isVertical = top >= anchor.bottom || top + height <= anchor.top
    const alignmentOffset = isVertical ? Math.abs(left - anchor.left) : Math.abs(top - anchor.top)
    return {
      left, top, priority,
      anchorOverlap: overlap(left, top, anchor),
      count: areas.filter(area => area > 0).length,
      area: areas.reduce((sum, area) => sum + area, 0),
      wireOverlap: wires.reduce((sum, wire) => sum + overlap(left, top, wire), 0),
      // Measure proximity to the panel edge, not its top-left corner: a tall
      // panel shifted upward may still sit immediately beside the clicked node.
      distance: Math.hypot(
        Math.max(left - anchor.right, anchor.left - left - width, 0),
        Math.max(top - anchor.bottom, anchor.top - top - height, 0)
      ) + 0.15 * alignmentOffset
    }
  }).sort((a, b) =>
    a.anchorOverlap - b.anchorOverlap || a.count - b.count || a.area - b.area ||
    a.wireOverlap - b.wireOverlap ||
    // All clear candidates compete on proximity, including shifted side positions.
    a.distance - b.distance || a.priority - b.priority
  )[0]!
}
