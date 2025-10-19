implement everything you read here and use this as a living document where you track your progress and list todos so we can tackle each step individually.

# 0) Goals & non-goals (phase 1)

**Goals**

* Connect to MQTT v5 brokers via **WSS** only (browser).
* Subscribe to **all topics** (or a pattern) and render a **collapsible topic tree** with **virtualization**.
* Show **payloads** (pretty JSON if possible) and **MQTT v5 properties**; indicate **retained**; show **QoS**.
* Keep **profiles** (broker endpoints, creds) and **UI state** in persistent storage.
* Handle reconnect, backpressure, and large topic sets reasonably.

**Non-goals (phase 1)**

* No native TCP, no mTLS (browser can’t do mTLS to brokers reliably).
* No editing/publishing (optional, easy to add later).
* No Tauri packaging (that’s phase 2).

---

# 1) Tech stack

* **Frontend:** React 18 + TypeScript, Vite.
* **State mgmt:** Zustand (simple) or Redux Toolkit; below I’ll use **Zustand**.
* **Networking:** `mqtt` (mqtt.js) with protocolVersion 5 over **wss://**.
* **Routing:** React Router (optional).
* **Virtualized list/tree:** `react-window` (fast & tiny) + your own tree adapter.
* **Storage:** **Dexie** (IndexedDB wrapper) for profiles/history; `localStorage` for quick UI prefs.
* **UI kit (optional):** Headless UI / Radix UI + Tailwind for speed.
* **Code quality:** ESLint, Prettier, Vitest, Playwright.

---

# 2) Repository & scripts

```
mqtt-tree-viewer/
├─ src/
├─ public/
├─ .env.example
├─ vite.config.ts
├─ package.json
└─ README.md
```

**Scripts**

* `dev` – vite dev server
* `build` – production build
* `preview` – vite preview
* `test` – vitest
* `test:e2e` – playwright

---

# 3) Environment & configuration

**.env.example**

```bash
# default broker (override in UI)
VITE_DEFAULT_BROKER_URL=wss://broker.example.com:8083/mqtt
VITE_DEFAULT_CLIENT_ID_PREFIX=mqttui_
VITE_DEFAULT_KEEPALIVE=60
VITE_DEFAULT_RECONNECT_MS=2000
```

* Never hardcode secrets. Username/password are entered in the UI and stored (optionally encrypted) in IndexedDB.
* For public deployments, prefer anonymous or tokenized brokers.

---

# 4) Project structure (src/)

```
src/
  app/
    App.tsx
    routes.tsx
    providers/
      QueryProvider.tsx        # if using react-query later
      ThemeProvider.tsx
  modules/
    mqtt/
      client.ts                # mqtt.js connection factory
      types.ts                 # MQTT v5 types (augmentations)
      events.ts                # event -> store adapters
      useMqttClient.ts         # hook managing lifecycle
    tree/
      topicTree.ts             # algorithms for tree building
      topicSearch.ts           # filter & search helpers
      types.ts
      useTopicStore.ts         # Zustand store for nodes/messages
      TreeView.tsx             # virtualized tree component
      TreeNodeRow.tsx
    payload/
      decode.ts                # UTF-8, JSON, hex, base64, fallback
      JsonViewer.tsx           # react-json-view / jsoneditor
      PayloadPanel.tsx
      PropertiesPanel.tsx
    profiles/
      db.ts                    # Dexie schema
      repo.ts                  # CRUD for profiles
      useProfiles.ts           # hook
      types.ts
      ProfileForm.tsx
      ProfileSwitcher.tsx
    ui/
      Button.tsx, Input.tsx, Dialog.tsx, Toast.tsx, Icons.tsx ...
    utils/
      bytes.ts                 # size formatting, hex
      time.ts                  # timestamp formatting
      a11y.ts
  pages/
    ConnectPage.tsx
    ExplorerPage.tsx
    SettingsPage.tsx
  styles/
    index.css                  # Tailwind entry
  main.tsx
  index.html
```

---

# 5) Data model (TypeScript)

```ts
// modules/mqtt/types.ts
export type ConnectionProfile = {
  id: string;             // uuid
  name: string;
  url: string;            // wss://...
  clientId?: string;
  username?: string;
  passwordEnc?: string;   // optional: simple crypto, or plaintext for dev
  keepalive?: number;     // seconds
  cleanStart?: boolean;   // default true for phase 1
  sessionExpiry?: number; // seconds
  caCertPem?: string;     // browser: typically unused
};

export type SubscriptionSpec = {
  filter: string; // e.g. "#", "sensors/#"
  qos: 0 | 1 | 2;
  noLocal?: boolean;      // v5
  retainAsPublished?: boolean; // v5
  retainHandling?: 0 | 1 | 2;  // v5
};

// modules/tree/types.ts
export type TopicNodeId = string; // stable path key e.g. sensors/room1/temp
export type TopicNode = {
  id: TopicNodeId;
  name: string;                // segment name
  path: string;                // full topic path till this node
  parentId?: TopicNodeId;
  children: TopicNodeId[];
  expanded: boolean;
  // Message metadata
  lastPayloadId?: string;
  lastTimestamp?: number;
  retained?: boolean;
  qos?: 0|1|2;
  hasChildrenPlaceholder?: boolean; // for lazy UI expansion
};

export type MessageRecord = {
  id: string;                  // uuid
  topic: string;
  ts: number;
  // raw bytes & decoded previews
  payload: Uint8Array;
  payloadText?: string;        // utf-8 try
  payloadJson?: unknown;       // parsed if valid
  contentType?: string;        // v5 property (User Properties or Content Type)
  properties?: Record<string, unknown>; // all v5 props
  retained: boolean;
  qos: 0|1|2;
  dup?: boolean;
};
```

---

# 6) Topic tree algorithm

**Core idea**

* Maintain a **normalized store** of `TopicNode`s keyed by `path`.
* On each incoming message:

  1. **Split** topic by `/` into segments.
  2. **Ensure** each prefix path exists as a node; link as children.
  3. **Attach** metadata (retained, qos, lastTimestamp).
  4. Store the **MessageRecord**; point node.lastPayloadId to it.

**Implementation tips**

* Use a **map<string, TopicNode>** in Zustand store for O(1) access.
* Keep **children arrays** sorted alphabetically once (or lazily).
* For **large brokers**: only **create nodes for paths that appear**. No discovery scan.
* Support **lazy expansion**: render children only when expanded and known.

**Pseudocode**

```ts
function upsertTopicPath(topic: string, meta: {retained:boolean,qos:0|1|2}) {
  let path = '';
  for (const seg of topic.split('/')) {
    path = path ? `${path}/${seg}` : seg;
    if (!nodes.has(path)) createNode(path, seg, parent(path));
    addChild(parent(path), path); // dedup
  }
  // mark leaf
  const leaf = nodes.get(topic)!;
  leaf.retained = meta.retained;
  leaf.qos = meta.qos;
  leaf.lastTimestamp = Date.now();
}
```

---

# 7) State stores (Zustand)

* **`useTopicStore`** – nodes, messages, UI tree state.
* **`useConnectionStore`** – connection status, active profile, subscriptions.
* **`useUiStore`** – panes, filters, search query, selected node.

Design for **backpressure**:

* Cap in-memory messages via **LRU** or **count limit** (e.g. keep last 1,000 per topic or global 50k).
* Persist selectively if user enables “recording”.

---

# 8) MQTT client lifecycle (browser)

**Connection factory** (`modules/mqtt/client.ts`)

```ts
import { connect, IClientOptions, MqttClient } from 'mqtt';

export function createMqttClient(p: ConnectionProfile): MqttClient {
  const opts: IClientOptions = {
    protocolVersion: 5,
    clean: p.cleanStart ?? true,
    clientId: p.clientId ?? `mqttui_${crypto.randomUUID().slice(0,8)}`,
    username: p.username,
    password: p.passwordEnc ? decrypt(p.passwordEnc) : undefined,
    keepalive: p.keepalive ?? 60,
    reconnectPeriod: Number(import.meta.env.VITE_DEFAULT_RECONNECT_MS ?? 2000),
    properties: {
      sessionExpiryInterval: p.sessionExpiry ?? 0,
    },
  };
  const client = connect(p.url, opts); // url must be wss://.../mqtt
  return client;
}
```

**Hook** (`useMqttClient.ts`)

* Create client on “Connect”.
* Bind listeners:

  * `connect`, `reconnect`, `close`, `error`.
  * `message` → dispatch to `useTopicStore` via adapter.
* After connected, subscribe to user patterns (`#` by default) with v5 options.
* Provide `disconnect()` and `resubscribe()` helpers.

**Message handler**

* Extract v5 properties (retain, qos, dup, userProperties, contentType, responseTopic, subscriptionId, etc.).
* Build `MessageRecord` with decoded previews (see §9).
* `upsertTopicPath(topic)`, link `lastPayloadId`.

**Reconnect strategy**

* Let mqtt.js handle backoff (`reconnectPeriod`).
* On reconnect, **re-subscribe** to filters (mqtt.js can auto, but be explicit if `cleanStart` true).
* If `cleanStart false` and `sessionExpiry > 0`, broker may queue while offline.

---

# 9) Payload decoding & display

**Heuristics**

1. If v5 `contentType` is `application/json` or payload looks like `{` `[` … → try `JSON.parse`.
2. Else try **UTF-8** decode; if valid printable -> show text.
3. Else show **hex** with length and a “Copy as base64” action.

`decode.ts`

* `isLikelyJson(bytes: Uint8Array): boolean`
* `tryParseJson(text: string): unknown | undefined`
* `toUtf8(bytes)`, `toHex(bytes)`, `toBase64(bytes)`

**UI**

* **PayloadPanel**: tabs → “Pretty JSON” (if parsed), “Text”, “Hex”, “Raw size xx KB”.
* **PropertiesPanel**: show retained, qos, contentType, userProperties (key/value), correlationData size.

---

# 10) Topic tree UI (virtualized)

**Tree model**

* Flatten expanded nodes to a **linear list** for `react-window`.
* Each row renders indentation + chevron + label + (retained/QoS badges) + timestamp.

**Actions**

* Click chevron → toggle `expanded`.
* Click node → open **MessagePane** (right side) with last payload.
* Right-click (context) → “Copy topic”, “Subscribe children” (future), “Pin”.

**Search/filter**

* Live filter by substring or regex.
* Option “Retained only”, “Changed in last X minutes”.
* When filtering, keep ancestor nodes to preserve path context.

**Performance**

* Don’t compute the flattened list on every keystroke: memoize with `useMemo()` against `expanded`, `filter`, `nodesVersion`.

---

# 11) Pages & flows

**ConnectPage**

* Profile selector (CRUD).
* Connection form: URL, Client ID, username/password, keepalive, clean start, session expiry.
* Subscription filters list (start with `#`, QoS=0).
* Connect button → navigates to Explorer on success.

**ExplorerPage**

* Left: Tree (virtualized).
* Right top: Message header (topic path, retained badge, timestamp).
* Right body: PayloadPanel + PropertiesPanel.
* Top bar: Search input, “Pause updates” toggle, “Clear stats”, connection status dot.
* Footer: message rate indicator (msgs/sec), memory usage estimate.

**SettingsPage**

* UI preferences: theme, font size.
* Storage: toggle history persistence (IndexedDB), max messages cap.
* Advanced: show raw MQTT debug log (optional).

---

# 12) Persistence (Dexie schema)

```ts
// modules/profiles/db.ts
import Dexie, { Table } from 'dexie';
import { ConnectionProfile } from '../mqtt/types';

export class AppDB extends Dexie {
  profiles!: Table<ConnectionProfile, string>;
  messages!: Table<{ id:string; topic:string; ts:number; payload:Uint8Array }, string>;
  constructor() {
    super('mqttui');
    this.version(1).stores({
      profiles: 'id, name',
      messages: 'id, topic, ts',
    });
  }
}
export const db = new AppDB();
```

* **Phase 1**: persist only **profiles** by default; messages optional (behind toggle).
* When persisting messages, chunk or cap to avoid unbounded growth.

---

# 13) Error handling & UX

* **Connection errors**: show toast with broker URL and reason code; suggest enabling WebSockets on broker.
* **Auth errors**: prompt to re-enter creds; don’t auto-retry too fast.
* **Payload decode errors**: non-blocking, fall back to hex.
* **Backpressure**: if inbound rate too high, show a banner “Throttling UI updates” and switch to **coalesced updates** (e.g., batch tree updates every 250 ms with `requestIdleCallback`/`setTimeout`).

---

# 14) Security & broker prerequisites

* Browser requires **WebSockets**; ensure broker is configured with **WSS**.
* **TLS**: Deploy site over **HTTPS** to allow **wss://** without mixed-content issues.
* Content Security Policy (CSP) permitting `connect-src` to your broker domains.

**Example Mosquitto (minimal)**

```
listener 8083
protocol websockets
# Optional TLS
# cafile /etc/mosquitto/ca.crt
# certfile /etc/mosquitto/server.crt
# keyfile /etc/mosquitto/server.key
```

---

# 15) Performance tactics

* **Virtualize** everything lists/trees.
* Use **Map** for nodes/messages; avoid deep React state; store big data in Zustand outside React component state, then **select slices**.
* Batch updates: push incoming messages into a queue; flush to store at ~60–120 Hz depending on load.
* Debounce search input.
* Cap **global message count**; evict oldest (ring buffer) with metrics.

---

# 16) Accessibility & i18n

* Tree rows: proper `role="treeitem"`, `aria-expanded`, keyboard: ↑↓ to navigate, → to expand, ← to collapse, Enter to select.
* JSON viewer: ensure selectable/copyable text.
* i18n scaffolding (e.g., `i18next`) for German/English strings.

---

# 17) Testing

**Unit (Vitest):**

* `topicTree.ts`: path insertion, dedup children, filters.
* `decode.ts`: json detection, utf8 vs binary.
* `client.ts`: options building, session expiry.

**Component (React Testing Library):**

* TreeView expand/collapse; virtualization renders the right nodes.

**E2E (Playwright):**

* Mock broker (see §18) or wire to test broker.
* Connect flow → subscribe → receive messages → payload renders.

---

# 18) Local dev setup

* **Dev broker via Docker (Mosquitto)**

`docker-compose.yml`

```yml
services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports: ["1883:1883", "8083:8083"]
    volumes:
      - ./dev/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf
```

`dev/mosquitto/mosquitto.conf`

```
persistence false
allow_anonymous true
listener 1883
protocol mqtt
listener 8083
protocol websockets
```

* Publish test messages (another container or local CLI) to verify tree growth.

---

# 19) Milestones & checklist

**M1 – Skeleton**

* [ ] Vite + React + TS; Tailwind; routing.
* [ ] Zustand stores scaffolding.
* [ ] Profiles CRUD (Dexie).

**M2 – Connect & Subscribe**

* [ ] `useMqttClient` implemented (connect, events, subscribe).
* [ ] Basic toast/error system.
* [ ] Subscribe to `#` by default.

**M3 – Topic Tree**

* [ ] Topic store + upsert algorithm.
* [ ] Virtualized TreeView with expand/collapse.

**M4 – Payload & Properties**

* [ ] Decode heuristics + JSON viewer.
* [ ] Properties panel (retained, qos, userProperties…).

**M5 – Perf & UX polish**

* [ ] Batched updates + throttling UI.
* [ ] Search/filter + badges + timestamps.
* [ ] Pause updates toggle.

**M6 – Testing & Hardening**

* [ ] Unit + e2e tests against dockerized Mosquitto.
* [ ] CSP/HTTPS docs, sample mosquitto.conf for WSS+TLS.

---

# 20) Key code snippets

**Zustand topic store (minimal)**

```ts
import { create } from 'zustand';
import { TopicNode, TopicNodeId, MessageRecord } from './types';

type TopicState = {
  nodes: Map<TopicNodeId, TopicNode>;
  messages: Map<string, MessageRecord>;
  expanded: Set<TopicNodeId>;
  upsertMessage: (msg: MessageRecord) => void;
  toggleExpanded: (id: TopicNodeId) => void;
};

export const useTopicStore = create<TopicState>((set, get) => ({
  nodes: new Map(), messages: new Map(), expanded: new Set(),
  toggleExpanded: (id) => set(s => {
    const expanded = new Set(s.expanded);
    expanded.has(id) ? expanded.delete(id) : expanded.add(id);
    return { expanded };
  }),
  upsertMessage: (msg) => set(s => {
    // ensure nodes for path
    const nodes = new Map(s.nodes);
    ensurePath(nodes, msg.topic);
    // store message & link
    const messages = new Map(s.messages);
    messages.set(msg.id, msg);
    const leaf = nodes.get(msg.topic)!;
    leaf.lastPayloadId = msg.id;
    leaf.lastTimestamp = msg.ts;
    leaf.retained = msg.retained;
    leaf.qos = msg.qos;
    nodes.set(leaf.id, leaf);
    return { nodes, messages };
  }),
}));

function ensurePath(nodes: Map<TopicNodeId, TopicNode>, topic: string) {
  let path = '';
  const parts = topic.split('/');
  parts.forEach((seg, i) => {
    path = i === 0 ? seg : `${path}/${seg}`;
    if (!nodes.has(path)) {
      nodes.set(path, {
        id: path,
        name: seg,
        path,
        parentId: i ? parts.slice(0, i).join('/') : undefined,
        children: [],
        expanded: i < 2, // auto-expand first 2 levels (tweak)
      });
    }
    const parentPath = i ? parts.slice(0, i).join('/') : '';
    if (parentPath) {
      const parent = nodes.get(parentPath)!;
      if (!parent.children.includes(path)) parent.children.push(path);
    }
  });
}
```

**Message adapter from mqtt.js event**

```ts
client.on('message', (topic, payloadBuf, pkt) => {
  const bytes = new Uint8Array(payloadBuf);
  const { text, json } = decodePreview(bytes, pkt?.properties?.contentType);
  const msg: MessageRecord = {
    id: crypto.randomUUID(),
    topic,
    ts: Date.now(),
    payload: bytes,
    payloadText: text,
    payloadJson: json,
    contentType: pkt?.properties?.contentType,
    properties: pkt?.properties as any,
    retained: !!pkt?.retain,
    qos: pkt?.qos ?? 0,
    dup: !!pkt?.dup,
  };
  useTopicStore.getState().upsertMessage(msg);
});
```

**Virtualized row renderer (sketch)**

```tsx
function TreeRow({ index, style }: { index: number; style: React.CSSProperties }) {
  const item = useFlattenedTree()[index]; // {id, depth}
  const node = useTopicNode(item.id);
  return (
    <div style={style} className="flex items-center">
      <div style={{ width: item.depth * 16 }} />
      <button onClick={() => toggleExpanded(node.id)} aria-label={node.expanded ? 'Collapse' : 'Expand'}>
        {node.children.length ? (node.expanded ? '▾' : '▸') : '•'}
      </button>
      <span className="ml-2">{node.name}</span>
      {node.retained && <span className="ml-2 text-xs px-1 border rounded">retained</span>}
      {node.qos !== undefined && <span className="ml-1 text-xs">QoS {node.qos}</span>}
      <span className="ml-auto text-xs opacity-70">{formatTime(node.lastTimestamp)}</span>
    </div>
  );
}
```

---

# 21) Future hooks (phase 2+)

* **Publish panel** (QoS/retained/user props).
* **Recording & replay** (NDJSON export).
* **Shared subscriptions** (`$share/ui/#`) for team dashboards.
* **Tauri desktop** with `rumqttc` for TCP & mTLS.
* **Plugins**: custom decoders (CBOR/MsgPack/Protobuf) via WebAssembly.

---

If you want, I can spin this into a starter repo spec (package.json, vite config, Tailwind setup, and the minimal working Connect → Subscribe → Tree → Payload flow) that you can paste-in and run.
