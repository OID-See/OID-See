/**
 * QuadTree spatial index for efficient spatial queries
 * Used to quickly find nodes within a viewport region
 */

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface QuadTreeNode<T> {
  point: Point
  data: T
}

export class QuadTree<T> {
  private boundary: Bounds
  private capacity: number
  private points: QuadTreeNode<T>[]
  private divided: boolean
  private northeast?: QuadTree<T>
  private northwest?: QuadTree<T>
  private southeast?: QuadTree<T>
  private southwest?: QuadTree<T>

  constructor(boundary: Bounds, capacity: number = 4) {
    this.boundary = boundary
    this.capacity = capacity
    this.points = []
    this.divided = false
  }

  /**
   * Check if a point is within the boundary
   */
  private contains(point: Point): boolean {
    return (
      point.x >= this.boundary.x &&
      point.x < this.boundary.x + this.boundary.width &&
      point.y >= this.boundary.y &&
      point.y < this.boundary.y + this.boundary.height
    )
  }

  /**
   * Check if two boundaries intersect
   */
  private intersects(range: Bounds): boolean {
    return !(
      range.x > this.boundary.x + this.boundary.width ||
      range.x + range.width < this.boundary.x ||
      range.y > this.boundary.y + this.boundary.height ||
      range.y + range.height < this.boundary.y
    )
  }

  /**
   * Subdivide this quad into four children
   */
  private subdivide(): void {
    const x = this.boundary.x
    const y = this.boundary.y
    const w = this.boundary.width / 2
    const h = this.boundary.height / 2

    const ne = { x: x + w, y: y, width: w, height: h }
    const nw = { x: x, y: y, width: w, height: h }
    const se = { x: x + w, y: y + h, width: w, height: h }
    const sw = { x: x, y: y + h, width: w, height: h }

    this.northeast = new QuadTree<T>(ne, this.capacity)
    this.northwest = new QuadTree<T>(nw, this.capacity)
    this.southeast = new QuadTree<T>(se, this.capacity)
    this.southwest = new QuadTree<T>(sw, this.capacity)

    this.divided = true
  }

  /**
   * Insert a point into the quadtree
   */
  insert(point: Point, data: T): boolean {
    if (!this.contains(point)) {
      return false
    }

    if (this.points.length < this.capacity) {
      this.points.push({ point, data })
      return true
    }

    if (!this.divided) {
      this.subdivide()
    }

    // Try to insert into subdivisions
    if (this.northeast!.insert(point, data)) return true
    if (this.northwest!.insert(point, data)) return true
    if (this.southeast!.insert(point, data)) return true
    if (this.southwest!.insert(point, data)) return true

    // This should never happen
    return false
  }

  /**
   * Query all points within a given range
   */
  query(range: Bounds, found: QuadTreeNode<T>[] = []): QuadTreeNode<T>[] {
    if (!this.intersects(range)) {
      return found
    }

    for (const p of this.points) {
      if (this.pointInRange(p.point, range)) {
        found.push(p)
      }
    }

    if (this.divided) {
      this.northeast!.query(range, found)
      this.northwest!.query(range, found)
      this.southeast!.query(range, found)
      this.southwest!.query(range, found)
    }

    return found
  }

  /**
   * Check if a point is within a range
   */
  private pointInRange(point: Point, range: Bounds): boolean {
    return (
      point.x >= range.x &&
      point.x < range.x + range.width &&
      point.y >= range.y &&
      point.y < range.y + range.height
    )
  }

  /**
   * Get all points in the tree
   */
  getAll(): QuadTreeNode<T>[] {
    const all: QuadTreeNode<T>[] = []
    
    // Add points from this node
    all.push(...this.points)
    
    // Recursively add from children
    if (this.divided) {
      all.push(...this.northeast!.getAll())
      all.push(...this.northwest!.getAll())
      all.push(...this.southeast!.getAll())
      all.push(...this.southwest!.getAll())
    }
    
    return all
  }

  /**
   * Get the total number of points in the tree
   */
  size(): number {
    let count = this.points.length
    
    if (this.divided) {
      count += this.northeast!.size()
      count += this.northwest!.size()
      count += this.southeast!.size()
      count += this.southwest!.size()
    }
    
    return count
  }

  /**
   * Clear all points from the tree
   */
  clear(): void {
    this.points = []
    this.divided = false
    this.northeast = undefined
    this.northwest = undefined
    this.southeast = undefined
    this.southwest = undefined
  }
}
