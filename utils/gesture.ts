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
  let minYIndex = 0; // Index of the highest point (visual top)
  let maxYIndex = 0; // Index of the lowest point (visual bottom)

  points.forEach((p, index) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    
    if (p.y < minY) {
        minY = p.y;
        minYIndex = index;
    }
    if (p.y > maxY) {
        maxY = p.y;
        maxYIndex = index;
    }
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

  // -- 4. VERTEX SHAPES (V, ^) --
  
  // Safety Check: Must have a minimum size
  if (height > 30 && width > 20) {
      const totalPoints = points.length;
      
      // Determine relative position of vertex in the stroke sequence (0.0 to 1.0)
      const apexRatio = minYIndex / totalPoints;
      const nadirRatio = maxYIndex / totalPoints;

      // CARET (^) Logic:
      // 1. The highest point (minY) is roughly in the middle of the stroke (not start/end).
      // 2. Start and End are significantly lower (higher Y) than the apex.
      if (apexRatio > 0.2 && apexRatio < 0.8) {
          const startDrop = start.y - minY; // Distance from start to top
          const endDrop = end.y - minY;     // Distance from end to top
          
          if (startDrop > height * 0.4 && endDrop > height * 0.4) {
              return SpellType.CARET;
          }
      }

      // V-SHAPE (v) Logic:
      // 1. The lowest point (maxY) is roughly in the middle of the stroke.
      // 2. Start and End are significantly higher (lower Y) than the nadir.
      if (nadirRatio > 0.2 && nadirRatio < 0.8) {
          const startRise = maxY - start.y; // Distance from bottom to start
          const endRise = maxY - end.y;     // Distance from bottom to end
          
          if (startRise > height * 0.4 && endRise > height * 0.4) {
              return SpellType.V_SHAPE;
          }
      }
  }

  // -- 5. COMPLEX SHAPES (Lightning / Z) --

  // LIGHTNING (Z)
  // Must be roughly square or wide
  if (aspectRatio > 0.5 && aspectRatio < 3.0 && totalLength > 60) {
      // Must have distinct direction changes
      const startsLeftEndsRight = start.x < end.x;
      const startsTopEndsBottom = start.y < end.y;

      if (startsLeftEndsRight && startsTopEndsBottom) {
           // A Z usually has low linearity because it zig-zags
           if (linearity < 0.8) {
                return SpellType.LIGHTNING;
           }
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