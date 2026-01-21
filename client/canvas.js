export class CanvasManager {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { 
        alpha: false,
        desynchronized: true
      });
      
      this.operations = [];
      this.redoStack = [];
      this.currentOperation = null;
      
      this.initialize();
    }
  
    initialize() {
      this.resize();
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      this.canvas.width = rect.width;
      this.canvas.height = rect.height;

      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  
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
  
    addPoint(x, y) {
      if (!this.currentOperation) return null;
      
      this.currentOperation.points.push({ x, y });
      return this.currentOperation;
    }
  
    endDrawing() {
      if (!this.currentOperation || this.currentOperation.points.length === 0) {
        return null;
      }
      
      const operation = this.currentOperation;
      this.operations.push(operation);
      this.redoStack = []; 
      this.currentOperation = null;
      
      return operation;
    }
  
    drawStroke(points, color, width, tool) {
      if (!points || points.length === 0) return;
      
      this.ctx.save();
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.lineWidth = width;
      
      if (tool === 'eraser') {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.globalCompositeOperation = 'source-over';
      } else {
        this.ctx.strokeStyle = color;
        this.ctx.globalCompositeOperation = 'source-over';
      }
      
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      
      if (points.length === 1) {
        this.ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        for (let i = 1; i < points.length; i++) {
          this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
      }
      
      this.ctx.restore();
    }
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
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.globalCompositeOperation = 'source-over';
      } else {
        this.ctx.strokeStyle = color;
        this.ctx.globalCompositeOperation = 'source-over';
      }
      
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      
      if (points.length === 1) {
        this.ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        for (let i = 1; i < points.length; i++) {
          this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
      }
      
      this.ctx.restore();
    }
    redraw() {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.operations.forEach(op => this.drawOperation(op));
    }
    undo() {
      if (this.operations.length === 0) return null;
      
      const operation = this.operations.pop();
      this.redoStack.push(operation);
      this.redraw();
      
      return operation;
    }

    redo() {
      if (this.redoStack.length === 0) return null;
      
      const operation = this.redoStack.pop();
      this.operations.push(operation);
      this.drawOperation(operation);
      
      return operation;
    }
    clear() {
      this.operations = [];
      this.redoStack = [];
      this.currentOperation = null;
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    addRemoteOperation(operation) {
      this.operations.push(operation);
      this.drawOperation(operation);
    }

    removeOperation(operationId) {
      const index = this.operations.findIndex(op => op.id === operationId);
      
      if (index !== -1) {
        this.operations.splice(index, 1);
        this.redraw();
        return true;
      }
      
      return false;
    }

    getState() {
      return {
        operations: [...this.operations],
        canUndo: this.operations.length > 0,
        canRedo: this.redoStack.length > 0
      };
    }
    loadOperations(operations) {
      this.operations = operations;
      this.redraw();
    }
    exportImage() {
      return this.canvas.toDataURL('image/png');
    }
    getCanvasCoordinates(event) {
      const rect = this.canvas.getBoundingClientRect();
      
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  }
  
  export default CanvasManager;