# MQTT Tree Viewer

A modern web-based MQTT client for visualizing topic trees and inspecting messages in real-time.

## Features

- 🌳 **Hierarchical Topic Tree** - Visualize MQTT topics in an expandable/collapsible tree structure
- ⚡ **High Performance** - Custom virtualized list with message batching (120ms throttling, ~60 Hz updates)
- 📊 **Message Inspection** - View payloads as JSON, text, hex, or base64
- 🔍 **Search & Filter** - Real-time topic search with retained/timestamp filters
- ⏸️ **Pause/Resume** - Control message updates without disconnecting
- 💾 **Profile Management** - Save and switch between broker configurations
- 🔒 **MQTT v5 Support** - Full support for MQTT v5 properties and features
- 🎨 **Modern UI** - Built with React 19, TypeScript, and Tailwind CSS

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **MQTT Client**: mqtt.js (WebSocket only)
- **Storage**: Dexie (IndexedDB)
- **Styling**: Tailwind CSS v3
- **Routing**: React Router

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- An MQTT broker with WebSocket support (WSS)

### Installation

```bash
npm install
```

### Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at http://localhost:5173/

### Local MQTT Broker (Optional)

Start a local Mosquitto broker with WebSocket support:

```bash
# Start broker
docker-compose up -d

# Stop broker
docker-compose down
```

Default broker URL: `ws://localhost:8083/mqtt`

## Architecture

### Key Components

- **VirtualList** (`src/modules/ui/VirtualList.tsx`) - Custom virtualized list for efficient rendering of large topic trees
- **MessageBatcher** (`src/modules/tree/messageBatcher.ts`) - Throttles message updates for high-frequency scenarios
- **useMqttClient** (`src/modules/mqtt/useMqttClient.ts`) - MQTT lifecycle management hook
- **useTopicStore** (`src/modules/tree/useTopicStore.ts`) - Zustand store with 50k message cap and LRU eviction

### Performance Optimizations

1. **Virtualization**: Only renders visible tree nodes
2. **Batching**: Groups incoming messages into 120ms batches
3. **Message Cap**: Limits storage to 50,000 messages (LRU eviction)
4. **Memoization**: Flattened tree list is memoized with `useMemo`

## Project Structure

```
src/
  modules/
    mqtt/          # MQTT client and connection management
    tree/          # Topic tree logic and state
    payload/       # Payload decoding and viewing
    profiles/      # Profile CRUD and storage
    ui/            # Reusable UI components
  pages/
    ConnectPage    # Profile management and connection
    ExplorerPage   # Main tree + message explorer
```

## Environment Variables

Create a `.env` file (see `.env.example`):

```bash
VITE_DEFAULT_BROKER_URL=wss://broker.example.com:8083/mqtt
VITE_DEFAULT_CLIENT_ID_PREFIX=mqttui_
VITE_DEFAULT_KEEPALIVE=60
VITE_DEFAULT_RECONNECT_MS=2000
```

## Desktop App (Tauri) - NEW!

The project now includes a **Tauri desktop app** that supports **native MQTT over TCP**!

```bash
# Run desktop app with native TCP MQTT support
npm run tauri:dev

# Build desktop app for distribution
npm run tauri:build
```

### Desktop vs Browser

| Feature | Browser (`npm run dev`) | Desktop (`npm run tauri:dev`) |
|---------|------------------------|-------------------------------|
| WebSocket (`ws://`) | ✅ Yes | ✅ Yes |
| **Native TCP** (`mqtt://`) | ❌ No | ✅ **Yes** |
| TLS (`mqtts://`) | ❌ Limited | ✅ **Yes** |
| mTLS (client certs) | ❌ No | 🚧 Future |
| Port access | Restricted | Full |

**Use the desktop app to connect to brokers like `mqtt://localhost:61883` directly!**

See [TAURI_SETUP.md](./TAURI_SETUP.md) for detailed information.

## Known Limitations (Browser Mode)

- **Browser only** - Requires WebSocket (WSS) transport
- **No mTLS** - Browser limitations prevent mTLS client certificates
- **No publishing** - Phase 1 is read-only (easy to add later)

**Solution**: Use the Tauri desktop app for native TCP/TLS support!

## Roadmap

See [plan.md](./plan.md) for detailed implementation progress.

### Phase 2 (Future)

- Publishing messages with QoS/retained options
- Recording & replay (NDJSON export)
- Tauri desktop app with native MQTT (TCP + mTLS)
- Custom decoders (CBOR, MessagePack, Protobuf)
- Shared subscriptions for team dashboards

## Contributing

This is a personal project. Feel free to fork and adapt to your needs.

## License

MIT
