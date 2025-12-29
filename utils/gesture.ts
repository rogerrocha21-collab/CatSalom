import { Point, SpellType } from '../types';

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

// Helper: Calculate Polygon Area using Shoelace Formula
const getPolygonArea = (points: Point[]): number => {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

export const recognizeGesture = (points: Point[]): SpellType | null => {
  if (points.length < 8) return null; // Ignore tiny scribbles

  const start = points[0];
  const end = points[points.length - 1];
  const totalLength = getPathLength(points);
  const startEndDist = getDistance(start, end);
  
  // -- 1. BOUNDING BOX ANALYSIS --
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Aspect Ratio: Width / Height. 
  const aspectRatio = width / (height || 1); 

  // Linearity: How straight is the line? 1.0 = Perfect line.
  const linearity = startEndDist / (totalLength || 1);

  // -- 2. CLOSED SHAPES (Circle / Triangle) --
  // Rule: Start and End points must be effectively touching relative to the total drawing size
  if (startEndDist < totalLength * 0.35 && totalLength > 80) {
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      
      const area = getPolygonArea(points);
      const perimeter = totalLength + startEndDist; 
      const roundness = (4 * Math.PI * area) / (perimeter * perimeter);

      const radii = points.map(p => Math.hypot(p.x - centerX, p.y - centerY));
      const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
      const variance = radii.reduce((a, b) => a + Math.pow(b - avgRadius, 2), 0) / radii.length;
      const cv = Math.sqrt(variance) / avgRadius; 

      if (aspectRatio > 0.4 && aspectRatio < 2.5) {
          if (roundness > 0.80) return SpellType.CIRCLE;
          if (roundness < 0.72) return SpellType.TRIANGLE;
          return cv < 0.18 ? SpellType.CIRCLE : SpellType.TRIANGLE;
      }
  }

  // -- 3. LINEAR SHAPES (Horizontal / Vertical) --
  // High linearity required for lines
  if (linearity > 0.85) {
      if (width > height * 2.0) {
          return SpellType.HORIZONTAL;
      }
      if (height > width * 2.0) {
          return SpellType.VERTICAL;
      }
  }

  // -- 4. COMPLEX OPEN SHAPES (Z, ^, v) --
  
  // Safety Check: Complex shapes must have a minimum size to be recognized.
  // This prevents small shaky lines from being detected as 'V' or 'Z'.
  if (height < 20 || width < 20) return null;

  const yDiffStartEnd = Math.abs(start.y - end.y);
  
  // V and Caret check
  if (yDiffStartEnd < height * 0.6) {
      const avgY = (start.y + end.y) / 2;
      const distToTop = avgY - minY;
      const distToBottom = maxY - avgY;

      // Caret (^): Mass goes UP.
      if (distToTop > height * 0.6 && distToTop > distToBottom) {
          return SpellType.CARET;
      }

      // V-Shape (v): Mass goes DOWN.
      if (distToBottom > height * 0.6 && distToBottom > distToTop) {
          return SpellType.V_SHAPE;
      }
  }

  // LIGHTNING (Z)
  // Must be roughly square or wide
  if (aspectRatio > 0.5 && aspectRatio < 3.0 && totalLength > 60) {
      // Must have distinct direction changes
      const startsLeftEndsRight = start.x < end.x;
      const startsTopEndsBottom = start.y < end.y;

      if (startsLeftEndsRight && startsTopEndsBottom) {
           // Basic Z structure check: does it zig-zag?
           // We can check the middle point vs start/end
           const midIndex = Math.floor(points.length / 2);
           const mid = points[midIndex];
           
           // In a Z, the middle is usually to the left of the "diagonal down" path
           // But simply returning it here if other checks failed is usually sufficient for this game play feel
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
        case SpellType.CARET: return '#f472b6'; // Pink
        case SpellType.V_SHAPE: return '#c084fc'; // Purple
        default: return '#FFFFFF';
    }
};