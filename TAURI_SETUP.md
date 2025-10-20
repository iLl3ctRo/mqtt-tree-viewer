# Tauri Setup - Native MQTT over TCP

This document describes the Tauri desktop app setup that enables native MQTT over TCP/TLS connections.

## Overview

The app now supports **two modes**:

1. **Browser mode** (via `npm run dev`): Uses WebSocket-only (`ws://` or `wss://`)
2. **Desktop mode** (via `npm run tauri:dev`): Supports **native TCP MQTT** (`mqtt://` or `mqtts://`)

## Architecture

```
┌─────────────────────────────────────┐
│  React Frontend (unchanged)         │
│  - TreeView, PayloadPanel, etc.    │
└──────────────┬──────────────────────┘
               │ Auto-detection
          ┌────┴────┐
          │         │
    ┌─────▼───┐   ┌▼──────────┐
    │ Browser │   │   Tauri   │
    │ mqtt.js │   │  Rust     │
    │  ws://  │   │ mqtt://   │
    └─────────┘   └───────────┘
```

## What Changed

### 1. Rust Backend (`src-tauri/`)

- **`src/mqtt.rs`**: Native MQTT client using `rumqttc`
  - Connects to `mqtt://` and `mqtts://` brokers
  - Handles subscriptions via Tauri commands
  - Emits events to frontend: `mqtt://connected`, `mqtt://message`, `mqtt://error`

- **`src/lib.rs`**: Registers Tauri commands:
  - `mqtt_connect(profile, subscriptions)`
  - `mqtt_disconnect()`

- **`Cargo.toml`**: Dependencies added:
  - `rumqttc = "0.24"` - Native MQTT client library
  - `tokio = { version = "1", features = ["full"] }` - Async runtime
  - `anyhow = "1.0"` - Error handling

### 2. TypeScript Frontend

- **`src/modules/mqtt/tauriClient.ts`**: Tauri MQTT client wrapper
  - Implements same interface as `mqtt.js` for compatibility
  - Uses Tauri IPC (`invoke`) to call Rust commands
  - Listens to Tauri events for incoming messages

- **`src/modules/mqtt/client.ts`**: Transport detection
  - Checks if running in Tauri (`window.__TAURI__`)
  - If Tauri + `mqtt://` URL → uses `TauriMqttClient`
  - Otherwise → uses browser `mqtt.js` WebSocket client

- **`src/modules/mqtt/useMqttClient.ts`**: Updated hook
  - Detects Tauri client and calls `.connect()` explicitly
  - Handles subscriptions differently for Tauri (done during connect)

### 3. Configuration

- **`src-tauri/tauri.conf.json`**:
  - Window size: 1400x900
  - Dev URL: `http://localhost:5173`
  - Build output: `../dist`

- **`package.json`**: Added scripts:
  - `npm run tauri:dev` - Run desktop app in development
  - `npm run tauri:build` - Build desktop app for distribution

## Usage

### Running the Desktop App

```bash
# Start Tauri desktop app (first run will compile Rust)
npm run tauri:dev
```

The app window will open automatically.

### Connecting to Your Broker

1. Create/select a profile
2. Set URL to: **`mqtt://localhost:61883`**
3. Enter credentials if needed
4. Click "Connect"

The app will use the native Rust MQTT client to connect over TCP!

### Browser vs Desktop

| Feature | Browser (`npm run dev`) | Desktop (`npm run tauri:dev`) |
|---------|------------------------|-------------------------------|
| WebSocket (`ws://`) | ✅ Yes | ✅ Yes |
| Native TCP (`mqtt://`) | ❌ No | ✅ **Yes** |
| TLS (`mqtts://`) | ❌ Limited | ✅ **Yes** |
| mTLS (client certs) | ❌ No | ✅ **Yes** (future) |
| Port access | Restricted | Full |

## How Transport Detection Works

```typescript
// src/modules/mqtt/client.ts
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export function createMqttClient(profile: ConnectionProfile) {
  // If running in Tauri and URL is mqtt:// (TCP), use native client
  if (isTauri() && (profile.url.startsWith('mqtt://') || profile.url.startsWith('mqtts://'))) {
    return new TauriMqttClient();
  }

  // Otherwise, use browser WebSocket client
  return mqtt.connect(profile.url, opts);
}
```

## Testing

### Test with your broker on `mqtt://localhost:61883`:

1. **Make sure your broker is running**:
   ```bash
   # If using Mosquitto
   mosquitto -c /path/to/mosquitto.conf
   ```

2. **Launch Tauri app**:
   ```bash
   npm run tauri:dev
   ```

3. **Create profile**:
   - URL: `mqtt://localhost:61883`
   - Client ID: (auto-generated)
   - Subscription: `#` (all topics)

4. **Click Connect** - should connect via native TCP!

5. **Publish a test message** (from another terminal):
   ```bash
   mosquitto_pub -h localhost -p 61883 -t test/topic -m "Hello from TCP!"
   ```

6. **See the message** appear in the tree view!

## Building for Distribution

```bash
# Build desktop app bundle
npm run tauri:build
```

Output will be in `src-tauri/target/release/bundle/`:
- **macOS**: `.dmg` and `.app`
- **Windows**: `.msi` and `.exe`
- **Linux**: `.deb`, `.AppImage`

## Future Enhancements

- **mTLS support**: Add client certificate configuration
- **TLS certificates**: Custom CA certificates for self-signed brokers
- **Connection status**: Better visual feedback in Tauri mode
- **Performance**: Message batching optimizations for native client

## Troubleshooting

### Rust compilation errors
- Make sure Rust is installed: `rustup --version`
- Update Rust: `rustup update`

### Connection fails
- Check broker is running: `telnet localhost 61883`
- Check logs in terminal for Rust errors
- Verify URL format: `mqtt://hostname:port` (no `/mqtt` path for TCP)

### App doesn't open
- Check console for Tauri errors
- Try clean build: `cd src-tauri && cargo clean && cd ..`
- Restart: `npm run tauri:dev`

## Summary

✅ **You can now connect to your broker at `mqtt://localhost:61883` using the Tauri desktop app!**

The browser mode still works for WebSocket brokers, and the same React UI code works for both - the transport layer is automatically selected based on the environment and URL protocol.
