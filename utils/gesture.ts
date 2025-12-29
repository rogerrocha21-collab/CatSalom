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

// Helper: Check if lines intersect (for X and 8 shape)
const doLinesIntersect = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const ccw = (p1: Point, p2: Point, p3: Point) => {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  };
  return (ccw(a, c, d) !== ccw(b, c, d)) && (ccw(a, b, c) !== ccw(a, b, d));
};

export const recognizeGesture = (points: Point[]): SpellType | null => {
  if (points.length < 10) return null; // Need more resolution for complex shapes

  const start = points[0];
  const end = points[points.length - 1];
  const totalLength = getPathLength(points);
  const startEndDist = getDistance(start, end);
  
  // -- BOUNDING BOX --
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  const aspectRatio = width / (height || 1); 
  const linearity = startEndDist / (totalLength || 1);

  // -- INTERSECTION CHECK --
  // Needed for X and 8
  let intersectionCount = 0;
  const stride = 2;
  // Only check intersections if the gesture is complex enough
  if (totalLength > 60) {
      for (let i = 0; i < points.length - stride - 1; i += stride) {
          for (let j = i + stride + 2; j < points.length - stride - 1; j += stride) {
              if (doLinesIntersect(points[i], points[i+stride], points[j], points[j+stride])) {
                  intersectionCount++;
              }
          }
      }
  }

  // -- 1. "8" SHAPE (New) --
  // Closed loop (start near end) AND has intersection.
  // 8 usually crosses in the middle.
  const isClosed = startEndDist < totalLength * 0.25;
  if (isClosed && intersectionCount >= 1 && height > 30) {
      return SpellType.EIGHT_SHAPE;
  }

  // -- 2. X SHAPE --
  // Open shape (start far from end) AND has intersection.
  if (!isClosed && intersectionCount >= 1 && aspectRatio > 0.4 && aspectRatio < 2.5) {
      return SpellType.X_SHAPE;
  }

  // -- 3. LINEAR SHAPES (Horizontal / Vertical) --
  if (linearity > 0.85 && intersectionCount === 0) {
      if (width > height * 1.5) return SpellType.HORIZONTAL;
      if (height > width * 1.5) return SpellType.VERTICAL;
  }

  // -- 4. "7" SHAPE (Replaces T) --
  // Horizontal Top (Left->Right) then Diagonal/Vertical Down.
  // Start Top-Left, End Bottom-Right or Bottom-Center.
  if (start.y < minY + height * 0.3 && width > 20 && height > 20 && intersectionCount === 0) {
      // Analyze first 40% vs last 40%
      const splitIndex = Math.floor(points.length * 0.4);
      const firstPart = points.slice(0, splitIndex);
      const lastPart = points.slice(splitIndex);

      // First part: Mostly Horizontal movement
      let dx1 = 0, dy1 = 0;
      for(let i=1; i<firstPart.length; i++) {
          dx1 += Math.abs(firstPart[i].x - firstPart[i-1].x);
          dy1 += Math.abs(firstPart[i].y - firstPart[i-1].y);
      }
      
      const isFirstHorizontal = dx1 > dy1 * 1.5;
      
      // Last part: Downward movement (Vertical or Diagonal)
      const lastStart = lastPart[0];
      const lastEnd = lastPart[lastPart.length - 1];
      const goesDown = lastEnd.y > lastStart.y + (height * 0.4);
      
      if (isFirstHorizontal && goesDown) {
          return SpellType.SEVEN_SHAPE;
      }
  }

  // -- 5. C SHAPE --
  // Open curve, Gap on Right. 
  const isOpen = startEndDist > totalLength * 0.2; 
  if (isOpen && intersectionCount === 0) {
      const startRight = start.x > minX + width * 0.5;
      const endRight = end.x > minX + width * 0.5;
      const midPoint = points[Math.floor(points.length/2)];
      const midLeft = midPoint.x < minX + width * 0.4;

      if (startRight && endRight && midLeft && height > width * 0.5) {
          return SpellType.C_SHAPE;
      }
  }

  // -- 6. S SHAPE --
  // Start Top-Rightish -> Left Curve -> Right Curve -> End Bottom-Leftish
  if (height > 30 && intersectionCount === 0) {
      const startTop = start.y < minY + height * 0.3;
      const endBottom = end.y > maxY - height * 0.3;
      
      if (startTop && endBottom) {
          const firstHalf = points.slice(0, Math.floor(points.length/2));
          const secondHalf = points.slice(Math.floor(points.length/2));
          
          let minX1 = Infinity; firstHalf.forEach(p => minX1 = Math.min(minX1, p.x));
          let maxX2 = -Infinity; secondHalf.forEach(p => maxX2 = Math.max(maxX2, p.x));
          
          const goesLeft = minX1 < start.x - (width * 0.15);
          const goesRight = maxX2 > end.x + (width * 0.15);

          if (goesLeft && goesRight) {
              return SpellType.S_SHAPE;
          }
      }
  }

  // -- 7. LIGHTNING (Z) --
  // Zig Zag Horizontal
  let totalAbsDx = 0;
  for(let i=1; i<points.length; i++) totalAbsDx += Math.abs(points[i].x - points[i-1].x);
  const xTravelRatio = totalAbsDx / (width || 1);
  
  if (xTravelRatio > 2.0 && start.y < end.y && linearity < 0.8 && intersectionCount === 0) {
      return SpellType.LIGHTNING;
  }

  return null;
};

export const getSymbolIcon = (type: SpellType): string => {
  switch (type) {
    case SpellType.HORIZONTAL: return '—';
    case SpellType.VERTICAL: return '|';
    case SpellType.LIGHTNING: return 'Z';
    case SpellType.C_SHAPE: return 'C';
    case SpellType.S_SHAPE: return 'S';
    case SpellType.EIGHT_SHAPE: return '8';
    case SpellType.SEVEN_SHAPE: return '7';
    case SpellType.X_SHAPE: return 'X';
    default: return '?';
  }
};

export const getSymbolColor = (type: SpellType): string => {
    switch (type) {
        case SpellType.LIGHTNING: return '#fef08a'; // Yellow
        case SpellType.C_SHAPE: return '#a5f3fc'; // Cyan
        case SpellType.EIGHT_SHAPE: return '#f472b6'; // Pink
        case SpellType.S_SHAPE: return '#c084fc'; // Purple
        case SpellType.SEVEN_SHAPE: return '#4ade80'; // Green
        case SpellType.X_SHAPE: return '#f87171'; // Red
        default: return '#FFFFFF';
    }
};