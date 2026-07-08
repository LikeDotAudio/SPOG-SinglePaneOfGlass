# AUDIT: Enterprise Payload Security — Encrypted Protobufs over MQTT

## 1. The Idea & Procedure
**The Objective**: Transition the SPOG (Single Pane of Glass) infrastructure from transmitting plaintext JSON over MQTT to transmitting AES-encrypted Protocol Buffers (Protobuf). 

**The Procedure**:
1. **Schema Definition**: Engineers define the structure of every message in a strict `.proto` file (e.g., `string id = 1; int32 bitrate = 2;`).
2. **Compilation**: The `.proto` file is compiled into native TypeScript and C++ models for the browser and hardware nodes.
3. **Serialization (Sender)**: When a client has telemetry to send, it populates the Protobuf model. The model is serialized into a highly compressed raw binary byte-array.
4. **Encryption**: The binary array is encrypted using an AES-256-GCM symmetric key (shared exclusively among authorized end-clients). 
5. **Transmission**: The resulting ciphertext is published to the MQTT broker.
6. **Decryption & Deserialization (Receiver)**: The receiving SPOG client receives the ciphertext, decrypts it using the shared key, and deserializes the binary back into a usable JavaScript object for the UI.

---

## 2. The Advantages

### Speed & Bandwidth (Mitigating DDOS)
* **Massive Payload Reduction**: JSON is bulky because it repeatedly sends string keys (e.g., `{"hardware_status_code": 200}`). Protobuf replaces strings with numerical tags (`1: 200`). A 600-byte JSON telemetry payload shrinks to a ~40-byte binary blob. 
* **Network Relief**: This extreme bandwidth reduction acts as a passive throttle. You can send 10x the amount of telemetry across the network using the exact same bandwidth footprint, practically eliminating the risk of network DDOS from chatty hardware.
* **CPU Parsing Velocity**: Decoding binary mathematically maps directly to memory. It skips the expensive string-parsing algorithms required for JSON, saving CPU cycles and battery life, and resulting in flawless 60fps rendering in the browser.

### Absolute Security (Zero-Trust)
* **End-to-End Encryption (E2EE)**: While TLS secures the tunnel to the broker, payload encryption secures the data itself. The MQTT broker only sees a meaningless stream of encrypted bytes. Even if a malicious actor compromises the enterprise broker, they cannot read or spoof the telemetry.

---

## 3. Targets and MQTT Topics

An encrypted payload system requires a highly organized topic hierarchy so clients only decrypt what they need.

**Example Topic Architecture**:
* `SPOG/system/rate/<client-id>`: Ephemeral telemetry topics for system health and transmission speeds.
* `SPOG/hardware/source/<node-id>/status`: Broadcast topics where hardware nodes announce their operational state.
* `SPOG/command/route/<destination-id>`: Action topics used to send routing switch commands to the matrix.

**Targets (The Listeners)**:
* **The UI (Captain/Ops)**: The SPOG browser client is a broad target. It subscribes to wildcards (`SPOG/hardware/#` and `SPOG/system/#`) to observe the entire grid simultaneously. 
* **The Hardware Nodes**: Physical hardware endpoints are narrow targets. A router node only subscribes to its specific command channel (`SPOG/command/route/router-a`), ignoring the rest of the noise on the network.

---

## 4. Decryption and Troubleshooting Protocol

**The Challenge**: Moving to encrypted binary means standard network tools (like Wireshark or MQTT Explorer) will no longer work. If an engineer looks at the MQTT traffic, they will only see garbled ciphertext.

**The Solution: The Diagnostic Sidecar**
To troubleshoot the network, engineers will use a dedicated diagnostic CLI tool or a hidden "Debug Menu" in the SPOG interface.

**Troubleshooting Procedure**:
1. **Key Injection**: The engineer inputs the current `AES-256` symmetric master key into their local diagnostic tool.
2. **Schema Loading**: The tool is pre-loaded with the `.proto` schema definitions.
3. **Live Decryption**: As the tool intercepts the garbled MQTT payloads, it applies the key to decrypt the bytes, and uses the schema to deserialize the binary.
4. **Human-Readable Output**: The tool converts the binary back into a pretty-printed JSON format strictly for the engineer's console screen. 
5. **Key Rotation**: If an engineer or contractor leaves the project, the AES key is rotated. The old key can no longer decrypt new traffic, instantly revoking their diagnostic access without needing to touch the broker's access control lists.
