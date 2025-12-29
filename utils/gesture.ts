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

  // Also calculate total X travel to detect zig-zags
  let totalAbsDx = 0;

  points.forEach((p, index) => {
    if (index > 0) {
        totalAbsDx += Math.abs(p.x - points[index - 1].x);
    }

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
  // Relaxed Rule: Start and End points must be effectively touching relative to the total drawing size
  // Increased tolerance significantly to 0.50 (50% of length) to allow spirals/open loops
  if (startEndDist < totalLength * 0.50 && totalLength > 60) {
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      
      const area = getPolygonArea(points);
      const perimeter = totalLength + startEndDist; 
      const roundness = (4 * Math.PI * area) / (perimeter * perimeter);

      const radii = points.map(p => Math.hypot(p.x - centerX, p.y - centerY));
      const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
      const variance = radii.reduce((a, b) => a + Math.pow(b - avgRadius, 2), 0) / radii.length;
      const cv = Math.sqrt(variance) / avgRadius; 

      // Very wide aspect ratio tolerance for tall '0's or wide ovals
      if (aspectRatio > 0.3 && aspectRatio < 3.3) { 
          
          // Heuristic Priority:
          // 1. High Roundness -> Circle
          // 2. Low Radius Variance -> Circle
          // 3. Low Roundness + High Variance -> Triangle

          // Relaxed thresholds again:
          // A perfect circle is 1.0. A square is ~0.78. A messy oval can be 0.6.
          if (roundness > 0.60) return SpellType.CIRCLE; 
          
          // CV: Lower is better. 0.0 is perfect circle. 
          // Relaxed from 0.25 to 0.35 to allow wobbly hands.
          if (cv < 0.35) return SpellType.CIRCLE; 

          // If it wasn't a circle, check for Triangle traits (pointy, high variance)
          // Triangles have low roundness (usually < 0.6) and high CV.
          if (roundness < 0.55 && cv > 0.25) return SpellType.TRIANGLE;
          
          // Fallback: If it's a closed loop and ambiguous, bias towards Circle as it's the most common "closed" error
          return SpellType.CIRCLE; 
      }
  }

  // -- 3. VERTEX SHAPES (V, ^) --
  // Moved BEFORE Linear shapes to ensure fast/wide Vs aren't misclassified as lines.
  
  // Safety Check: Must have a minimum size to be a distinct V shape
  if (height > 15 && width > 15) {
      const totalPoints = points.length;
      
      // Determine relative position of vertex in the stroke sequence (0.0 to 1.0)
      const apexRatio = minYIndex / totalPoints;
      const nadirRatio = maxYIndex / totalPoints;

      // CARET (^) Logic:
      // Vertex (minY) is roughly in the middle of the stroke.
      if (apexRatio > 0.2 && apexRatio < 0.8) {
          const startDrop = start.y - minY; // Distance from start to top
          const endDrop = end.y - minY;     // Distance from end to top
          
          // Relaxed threshold: sides need to drop only 20% of height
          if (startDrop > height * 0.20 && endDrop > height * 0.20) {
              return SpellType.CARET;
          }
      }

      // V-SHAPE (v) Logic:
      // Vertex (maxY) is roughly in the middle of the stroke.
      if (nadirRatio > 0.2 && nadirRatio < 0.8) {
          const startRise = maxY - start.y; // Distance from bottom to start
          const endRise = maxY - end.y;     // Distance from bottom to end
          
          // Relaxed threshold: sides need to rise only 20% of height
          if (startRise > height * 0.20 && endRise > height * 0.20) {
              return SpellType.V_SHAPE;
          }
      }
  }

  // -- 4. LINEAR SHAPES (Horizontal / Vertical) --
  // High linearity required for lines
  // Only check this if it wasn't a V/Caret or Circle/Triangle
  if (linearity > 0.80) {
      if (width > height * 1.5) {
          return SpellType.HORIZONTAL;
      }
      if (height > width * 1.5) {
          return SpellType.VERTICAL;
      }
  }

  // -- 5. COMPLEX SHAPES (Lightning / Z) --

  // LIGHTNING (Z)
  // Logic: A Z moves Right -> Left -> Right.
  // This causes the total X distance traveled to be significantly larger than the bounding box width.
  // Ratio = TotalAbsDx / Width.
  // Line = ~1.0. V = ~1.0. Triangle = ~2.0. Z = ~3.0.
  
  if (totalLength > 40 && aspectRatio > 0.2 && aspectRatio < 5.0) {
      const xTravelRatio = totalAbsDx / (width || 1);
      const isGeneralDown = start.y < end.y + (height * 0.2); // Allows slightly upward finish but mostly down
      
      // Strong check: High X-backtracking
      // Threshold > 1.3 separates it from V and Line
      if (xTravelRatio > 1.3 && isGeneralDown) {
          return SpellType.LIGHTNING;
      }

      // Fallback check: Low linearity diagonal that is NOT a V or Triangle
      // If the user draws a "Lightning Bolt" (DownRight -> Left -> DownRight) without much overlap
      // Linearity will be low (< 0.85) because it zig-zags.
      const startsLeftEndsRight = start.x < end.x;
      if (startsLeftEndsRight && isGeneralDown && linearity < 0.85) {
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