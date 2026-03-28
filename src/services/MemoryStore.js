/**
 * MemoryStore - Tracks objects seen by the camera and agent history.
 * In production this would persist to AsyncStorage or a backend.
 */

class MemoryStore {
  constructor() {
    this.detectedObjects = [];
    this.recentHistory = [];
    this.visualAnchors = [];
    this._preloadDemoData();
  }

  // Record an object sighting
  recordObject(object) {
    this.detectedObjects.push(object);
  }

  // Find most recently seen object by label (case-insensitive)
  findObject(label) {
    const matches = this.detectedObjects
      .filter((o) => o.label.toLowerCase().includes(label.toLowerCase()))
      .sort((a, b) => b.lastSeen - a.lastSeen);
    return matches[0] || null;
  }

  // Get full history of an object
  objectHistory(label) {
    return this.detectedObjects
      .filter((o) => o.label.toLowerCase().includes(label.toLowerCase()))
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  // Add a message to history
  addMessage(message) {
    this.recentHistory.push(message);
  }

  // Prune old entries (default: 1 hour)
  pruneOldEntries(maxAgeMs = 3600000) {
    const cutoff = new Date(Date.now() - maxAgeMs);
    this.detectedObjects = this.detectedObjects.filter((o) => o.lastSeen > cutoff);
    this.recentHistory = this.recentHistory.filter((m) => m.timestamp > cutoff);
  }

  // Pre-populate with demo data so "where is my X" works immediately
  _preloadDemoData() {
    const demoObjects = [
      { label: 'Glasses', location: 'kitchen counter', minutesAgo: 10 },
      { label: 'Keys', location: 'hallway table by the front door', minutesAgo: 30 },
      { label: 'Phone', location: 'living room couch cushion', minutesAgo: 5 },
      { label: 'Wallet', location: 'bedroom dresser', minutesAgo: 60 },
      { label: 'TV Remote', location: 'living room side table', minutesAgo: 2 },
      { label: 'Medication Bottle', location: 'bathroom cabinet', minutesAgo: 120 },
    ];

    demoObjects.forEach(({ label, location, minutesAgo }) => {
      this.detectedObjects.push({
        id: `demo-${label.toLowerCase()}`,
        label,
        confidence: 0.85 + Math.random() * 0.13,
        lastSeen: new Date(Date.now() - minutesAgo * 60000),
        location,
      });
    });

    // Visual anchors for the user's specific items
    this.visualAnchors = [
      { id: 'anchor-1', name: 'Reading Glasses', category: 'personal', lastKnownLocation: 'kitchen counter' },
      { id: 'anchor-2', name: 'House Keys', category: 'personal', lastKnownLocation: 'hallway table' },
      { id: 'anchor-3', name: 'Wallet', category: 'personal', lastKnownLocation: 'bedroom dresser' },
      { id: 'anchor-4', name: 'Phone', category: 'personal', lastKnownLocation: 'living room couch' },
      { id: 'anchor-5', name: 'Medication Bottle', category: 'medical', lastKnownLocation: 'bathroom cabinet' },
      { id: 'anchor-6', name: 'TV Remote', category: 'household', lastKnownLocation: 'living room side table' },
    ];
  }
}

export default new MemoryStore();
