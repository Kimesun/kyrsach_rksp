class WebSocketService {
  constructor() {
    this.socket = null;
  }

  connect(token, onMessage) {
    this.socket = new WebSocket(`ws://localhost:5000/ws?token=${token}`);
    this.socket.onmessage = onMessage;
    return this.socket;
  }

  send(data) {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

export default new WebSocketService();