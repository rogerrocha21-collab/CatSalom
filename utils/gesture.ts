import { Point, SpellType } from '../types';

// Helper: Calculate angle in degrees between two points
const getAngleDegrees = (p1: Point, p2: Point): number => {
  const dy = p2.y - p1.y;
  const dx = p2.x - p1.x;
  let theta = Math.atan2(dy, dx); // radians
  theta *= 180 / Math.PI; // degrees
  return theta;
};

// Helper: Distance between two points
const getDistance = (p1: Point, p2: Point): number => {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

// Helper: Total path length
const getPathLength = (points: Point[]): number => {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += getDistance(points[i - 1], points[i]);
  }
  return length;
};

// Helper: Get max perpendicular distance of points from the line segment (Start -> End)
const getMaxDeviation = (points: Point[], start: Point, end: Point): { maxDist: number, index: number, yDiff: number } => {
  let maxDist = 0;
  let index = -1;
  let yDiffOfPeak = 0;

  // Line eq: Ax + By + C = 0
  const A = start.y - end.y;
  const B = end.x - start.x;
  const C = start.x * end.y - end.x * start.y;
  const denominator = Math.sqrt(A*A + B*B);

  if (denominator === 0) return { maxDist: 0, index: 0, yDiff: 0 };

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dist = Math.abs(A * p.x + B * p.y + C) / denominator;
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
      yDiffOfPeak = p.y - start.y;
    }
  }

  return { maxDist, index, yDiff: yDiffOfPeak };
};

export const recognizeGesture = (points: Point[]): SpellType | null => {
  if (points.length < 5) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const pathLength = getPathLength(points);
  const chordLength = getDistance(start, end);
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  const width = maxX - minX;
  const height = maxY - minY;
  
  // -----------------------------------------------------------
  // DETECTOR: CLOSED SHAPES (Circle vs Triangle)
  // -----------------------------------------------------------
  if (chordLength < pathLength * 0.3 && pathLength > 100) {
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      
      // Calculate distances from center to all points
      const radii = points.map(p => Math.hypot(p.x - centerX, p.y - centerY));
      const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
      
      // Calculate variance/standard deviation of radius
      const variance = radii.reduce((a, b) => a + Math.pow(b - avgRadius, 2), 0) / radii.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / avgRadius; // Coefficient of Variation

      // Visual Ratio check
      const ratio = width / (height || 1);
      
      if (ratio > 0.6 && ratio < 1.6) {
          // Circle has very consistent radius (low CV)
          // Triangle has alternating far corners and close edges (high CV)
          
          if (cv < 0.18) {
              return SpellType.CIRCLE;
          } else if (cv >= 0.18) {
              // Further check: Count peaks? 
              // For now, if it's closed, roughly square aspect, but high variance, assume Triangle
              return SpellType.TRIANGLE;
          }
      }
  }

  // -----------------------------------------------------------
  // DETECTOR: LINEAR SHAPES
  // -----------------------------------------------------------

  // 2. Is it a LINE? (Horizontal or Vertical)
  const { maxDist } = getMaxDeviation(points, start, end);
  
  if (maxDist < chordLength * 0.15) {
      const angle = getAngleDegrees(start, end);
      
      if (Math.abs(angle) <= 20 || Math.abs(Math.abs(angle) - 180) <= 20) {
          return SpellType.HORIZONTAL;
      }
      if (Math.abs(Math.abs(angle) - 90) <= 20) {
          return SpellType.VERTICAL;
      }
      return null;
  }

  // 3. Is it a SHAPE? (^, v, Z)
  
  // Normalize Y to check for V or Caret
  const yDiffStartEnd = Math.abs(start.y - end.y);
  
  if (yDiffStartEnd < height * 0.5 && height > 30) {
      const isCaret = minY < Math.min(start.y, end.y) - height * 0.5;
      const isV = maxY > Math.max(start.y, end.y) + height * 0.5;
      
      if (isCaret && !isV) return SpellType.CARET;
      if (isV && !isCaret) return SpellType.V_SHAPE;
  }

  // LIGHTNING (Z)
  if (start.y < end.y - height * 0.5 && start.x < end.x - width * 0.5) {
      if (width > 30 && height > 30) {
          return SpellType.LIGHTNING;
      }
  }

  return null;
};

export const getSymbolIcon = (type: SpellType): string => {
  switch (type) {
    case SpellType.HORIZONTAL: return '—';
    case SpellType.VERTICAL: return '|';
    case SpellType.CARET: return '^';
    case SpellType.LIGHTNING: return 'Z';
    case SpellType.V_SHAPE: return 'v';
    case SpellType.CIRCLE: return 'O';
    case SpellType.TRIANGLE: return 'Δ';
    default: return '?';
  }
};

export const getSymbolColor = (type: SpellType): string => {
    switch (type) {
        case SpellType.TRIANGLE: return '#fbbf24'; // Amber
        case SpellType.LIGHTNING: return '#fef08a'; // Yellow
        case SpellType.CIRCLE: return '#a5f3fc'; // Cyan
        default: return '#FFFFFF';
    }
};