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
  // Relaxed Rule: Start and End points must be effectively touching relative to the total drawing size
  // Increased tolerance from 0.35 to 0.45 to allow more open circles
  if (startEndDist < totalLength * 0.45 && totalLength > 80) {
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      
      const area = getPolygonArea(points);
      const perimeter = totalLength + startEndDist; 
      const roundness = (4 * Math.PI * area) / (perimeter * perimeter);

      const radii = points.map(p => Math.hypot(p.x - centerX, p.y - centerY));
      const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
      const variance = radii.reduce((a, b) => a + Math.pow(b - avgRadius, 2), 0) / radii.length;
      const cv = Math.sqrt(variance) / avgRadius; 

      if (aspectRatio > 0.5 && aspectRatio < 2.0) { // Slight tighten on aspect ratio for better distinction
          // Relaxed Roundness thresholds:
          // Circle ideal = 1.0. Sloppy circle can be 0.7-0.8.
          // Triangle ideal = 0.6. Sloppy triangle can be 0.5-0.65.
          
          if (roundness > 0.72) return SpellType.CIRCLE; // Was 0.80
          if (roundness < 0.60) return SpellType.TRIANGLE; // Was 0.72
          
          // CV (Coefficient of Variation) check for the middle ground:
          // Circles have constant radius (Low CV). Triangles have high variance.
          return cv < 0.25 ? SpellType.CIRCLE : SpellType.TRIANGLE; // CV relaxed from 0.18 to 0.25
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
          
          // Relaxed threshold: sides need to drop only 25% of height or 15px
          // This accepts flatter carets.
          if (startDrop > height * 0.25 && endDrop > height * 0.25) {
              return SpellType.CARET;
          }
      }

      // V-SHAPE (v) Logic:
      // Vertex (maxY) is roughly in the middle of the stroke.
      if (nadirRatio > 0.2 && nadirRatio < 0.8) {
          const startRise = maxY - start.y; // Distance from bottom to start
          const endRise = maxY - end.y;     // Distance from bottom to end
          
          // Relaxed threshold: sides need to rise only 25% of height
          // This accepts checkmark-style Vs and wide Vs.
          if (startRise > height * 0.25 && endRise > height * 0.25) {
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
  // Must be roughly square or wide
  if (aspectRatio > 0.5 && aspectRatio < 3.0 && totalLength > 60) {
      // Must have distinct direction changes
      const startsLeftEndsRight = start.x < end.x;
      const startsTopEndsBottom = start.y < end.y;

      if (startsLeftEndsRight && startsTopEndsBottom) {
           // A Z usually has low linearity because it zig-zags
           // Relaxed logic: If it wasn't caught by V or Line, and goes TopLeft->BotRight...
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