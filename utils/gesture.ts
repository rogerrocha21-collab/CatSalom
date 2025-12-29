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

// Helper: Check if lines intersect (for X shape)
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
  let minYIndex = 0;
  let maxYIndex = 0;

  points.forEach((p, index) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) { minY = p.y; minYIndex = index; }
    if (p.y > maxY) { maxY = p.y; maxYIndex = index; }
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  const aspectRatio = width / (height || 1); 
  const linearity = startEndDist / (totalLength || 1);

  // -- 1. CHECK FOR INTERSECTIONS (X SHAPE) --
  // X is unique because it crosses itself. 
  // We sample points to avoid O(N^2) on large arrays.
  let intersectionCount = 0;
  // Analyze segments with a stride to reduce noise
  const stride = 2;
  if (totalLength > 80 && aspectRatio > 0.4 && aspectRatio < 2.5) {
      for (let i = 0; i < points.length - stride - 1; i += stride) {
          for (let j = i + stride + 2; j < points.length - stride - 1; j += stride) {
              if (doLinesIntersect(points[i], points[i+stride], points[j], points[j+stride])) {
                  intersectionCount++;
              }
          }
      }
      // An X usually has a distinct intersection near the center
      if (intersectionCount > 0) {
          return SpellType.X_SHAPE;
      }
  }

  // -- 2. LINEAR SHAPES (Horizontal / Vertical) --
  if (linearity > 0.85) {
      if (width > height * 1.5) return SpellType.HORIZONTAL;
      if (height > width * 1.5) return SpellType.VERTICAL;
  }

  // -- 3. C SHAPE --
  // Open curve, Gap on Right. 
  // Logic: Start and End are on the Right side of the bounding box. MinX is far left.
  // Not linear.
  const isOpen = startEndDist > totalLength * 0.2; // Must be somewhat open
  if (isOpen && !intersectionCount) {
      const startRight = start.x > minX + width * 0.5;
      const endRight = end.x > minX + width * 0.5;
      const midPoint = points[Math.floor(points.length/2)];
      const midLeft = midPoint.x < minX + width * 0.4;

      if (startRight && endRight && midLeft && height > width * 0.5) {
          return SpellType.C_SHAPE;
      }
  }

  // -- 4. N SHAPE --
  // Starts Bottom-Left -> Top-Left -> Bottom-Right -> Top-Right (or just Up-Down-Up)
  // Characteristic: 3 Vertical movements.
  // Bounding box usually tall or square.
  if (height > 30) {
      const startBottom = start.y > minY + height * 0.6;
      const endTop = end.y < maxY - height * 0.6;
      // Zig-zag check: Total X travel vs Width is moderate, Total Y travel is high (3x height)
      let totalAbsDy = 0;
      for(let i=1; i<points.length; i++) totalAbsDy += Math.abs(points[i].y - points[i-1].y);
      
      const yTravelRatio = totalAbsDy / height;
      
      // N usually travels Up(~1) + Down(~1) + Up(~1) = ~3 height
      if (startBottom && endTop && yTravelRatio > 2.2 && aspectRatio < 1.5) {
          return SpellType.N_SHAPE;
      }
  }

  // -- 5. S SHAPE --
  // Start Top-Rightish -> Left Curve -> Right Curve -> End Bottom-Leftish
  // Key: X direction changes Left then Right.
  if (height > 30 && !intersectionCount) {
      const startTop = start.y < minY + height * 0.3;
      const endBottom = end.y > maxY - height * 0.3;
      
      if (startTop && endBottom) {
          // Check inflection
          // Divide into two halves. Top half should bulge Left, Bottom half bulge Right (or vice versa for standard S)
          // Standard S: Top part goes Left, Bottom part goes Right
          const firstHalf = points.slice(0, Math.floor(points.length/2));
          const secondHalf = points.slice(Math.floor(points.length/2));
          
          let minX1 = Infinity; firstHalf.forEach(p => minX1 = Math.min(minX1, p.x));
          let maxX2 = -Infinity; secondHalf.forEach(p => maxX2 = Math.max(maxX2, p.x));
          
          // The leftmost point of first half is significantly to the left of start
          const goesLeft = minX1 < start.x - (width * 0.2);
          // The rightmost point of second half is significantly to the right of end/minX1
          const goesRight = maxX2 > end.x + (width * 0.2);

          if (goesLeft && goesRight) {
              return SpellType.S_SHAPE;
          }
      }
  }

  // -- 6. T SHAPE --
  // Draw Top bar (Left->Right) then Down. (Looks like a 7 or Gamma)
  // OR Draw Up then Horizontal.
  // Let's support the continuous "Top-Left -> Top-Right -> Center/Down"
  if (start.y < minY + height * 0.3 && width > 20 && height > 20) {
      // Check if the first 30% of the path is horizontal
      const thirdIndex = Math.floor(points.length * 0.3);
      const firstPart = points.slice(0, thirdIndex);
      const lastPart = points.slice(thirdIndex);
      
      let dy1 = 0; firstPart.forEach((p, i) => i>0 ? dy1+=Math.abs(p.y - firstPart[i-1].y) : 0);
      let dx1 = 0; firstPart.forEach((p, i) => i>0 ? dx1+=Math.abs(p.x - firstPart[i-1].x) : 0);
      
      const isFirstHorizontal = dx1 > dy1 * 2;
      const isLastVertical = (end.y - points[thirdIndex].y) > height * 0.6;
      
      if (isFirstHorizontal && isLastVertical) {
          return SpellType.T_SHAPE;
      }
  }

  // -- 7. LIGHTNING (Z) --
  // Fallback for Z if N didn't catch it
  // Z is Top-Left -> Top-Right -> Bottom-Left -> Bottom-Right (Zig Zag Horizontal)
  // N is Zig Zag Vertical.
  let totalAbsDx = 0;
  for(let i=1; i<points.length; i++) totalAbsDx += Math.abs(points[i].x - points[i-1].x);
  const xTravelRatio = totalAbsDx / (width || 1);
  
  if (xTravelRatio > 2.0 && start.y < end.y && linearity < 0.8) {
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
    case SpellType.N_SHAPE: return 'N';
    case SpellType.T_SHAPE: return 'T';
    case SpellType.X_SHAPE: return 'X';
    default: return '?';
  }
};

export const getSymbolColor = (type: SpellType): string => {
    switch (type) {
        case SpellType.LIGHTNING: return '#fef08a'; // Yellow
        case SpellType.C_SHAPE: return '#a5f3fc'; // Cyan
        case SpellType.N_SHAPE: return '#f472b6'; // Pink
        case SpellType.S_SHAPE: return '#c084fc'; // Purple
        case SpellType.T_SHAPE: return '#4ade80'; // Green
        case SpellType.X_SHAPE: return '#f87171'; // Red
        default: return '#FFFFFF';
    }
};