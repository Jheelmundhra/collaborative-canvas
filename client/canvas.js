/**
 * CanvasManager - Handles all canvas drawing operations
 * Implements efficient path rendering and operation management
 */
export class CanvasManager {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { 
        alpha: false,
        desynchronized: true
      });
      
      // Drawing state
      this.operations = [];
      this.redoStack = [];
      this.currentOperation = null;
      
      this.initialize();
    }
  
    /**
     * Initialize canvas
     */
    initialize() {
      // Set canvas size to match display size
      this.resize();
      
      // Clear canvas with white background
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  
    /**
     * Resize canvas to fit container
     */
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      
      // Store old canvas data
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      // Resize canvas
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      
      // Set white background
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  
    /**
     * Start a new drawing operation
     */
    startDrawing(x, y, color, width, tool) {
      this.currentOperation = {
        id: Date.now() + Math.random(),
        type: tool,
        color: color,
        width: width,
        points: [{ x, y }],
        timestamp: Date.now()
      };
    }
  
    /**
     * Add point to current operation
     */
    addPoint(x, y) {
      if (!this.currentOperation) return null;
      
      this.currentOperation.points.push({ x, y });
      return this.currentOperation;
    }
  
    /**
     * End current drawing operation
     */
    endDrawing() {
      if (!this.currentOperation || this.currentOperation.points.length === 0) {
        return null;
      }
      
      const operation = this.currentOperation;
      this.operations.push(operation);
      this.redoStack = []; // Clear redo stack
      this.currentOperation = null;
      
      return operation;
    }
  
    /**
     * Draw a stroke (used for real-time drawing)
     */
    drawStroke(points, color, width, tool) {
      if (!points || points.length === 0) return;
      
      this.ctx.save();
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.lineWidth = width;
      
      if (tool === 'eraser') {
        // Eraser mode - actually erase by drawing white
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.globalCompositeOperation = 'source-over';
      } else {
        // Brush mode - normal drawing
        this.ctx.strokeStyle = color;
        this.ctx.globalCompositeOperation = 'source-over';
      }
      
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      
      if (points.length === 1) {
        // Single point - draw a circle
        this.ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Multiple points - draw smooth line
        for (let i = 1; i < points.length; i++) {
          this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
      }
      
      this.ctx.restore();
    }
  
    /**
     * Draw a complete operation
     */
    drawOperation(operation) {
      if (!operation || !operation.points || operation.points.length === 0) {
        return;
      }
  
      const { type, color, width, points } = operation;
      
      this.ctx.save();
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.lineWidth = width;
      
      if (type === 'eraser') {
        // Eraser draws white
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.globalCompositeOperation = 'source-over';
      } else {
        // Brush draws with color
        this.ctx.strokeStyle = color;
        this.ctx.globalCompositeOperation = 'source-over';
      }
      
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      
      if (points.length === 1) {
        // Single point
        this.ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Multiple points
        for (let i = 1; i < points.length; i++) {
          this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
      }
      
      this.ctx.restore();
    }
  
    /**
     * Redraw entire canvas from operations
     */
    redraw() {
      // Clear canvas with white
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Redraw all operations in order
      this.operations.forEach(op => this.drawOperation(op));
    }
  
    /**
     * Undo last operation
     */
    undo() {
      if (this.operations.length === 0) return null;
      
      const operation = this.operations.pop();
      this.redoStack.push(operation);
      this.redraw();
      
      return operation;
    }
  
    /**
     * Redo last undone operation
     */
    redo() {
      if (this.redoStack.length === 0) return null;
      
      const operation = this.redoStack.pop();
      this.operations.push(operation);
      this.drawOperation(operation);
      
      return operation;
    }
  
    /**
     * Clear entire canvas
     */
    clear() {
      this.operations = [];
      this.redoStack = [];
      this.currentOperation = null;
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  
    /**
     * Add remote operation (from another user)
     */
    addRemoteOperation(operation) {
      this.operations.push(operation);
      this.drawOperation(operation);
    }
  
    /**
     * Remove operation by ID (for remote undo)
     */
    removeOperation(operationId) {
      const index = this.operations.findIndex(op => op.id === operationId);
      
      if (index !== -1) {
        this.operations.splice(index, 1);
        this.redraw();
        return true;
      }
      
      return false;
    }
  
    /**
     * Get canvas state
     */
    getState() {
      return {
        operations: [...this.operations],
        canUndo: this.operations.length > 0,
        canRedo: this.redoStack.length > 0
      };
    }
  
    /**
     * Load operations (for initial sync)
     */
    loadOperations(operations) {
      this.operations = operations;
      this.redraw();
    }
  
    /**
     * Export canvas as image
     */
    exportImage() {
      return this.canvas.toDataURL('image/png');
    }
  
    /**
     * Get canvas coordinates from mouse event
     */
    getCanvasCoordinates(event) {
      const rect = this.canvas.getBoundingClientRect();
      
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  }
  
  export default CanvasManager;