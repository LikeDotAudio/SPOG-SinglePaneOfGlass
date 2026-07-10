import { spog } from './schema.js';

// src/platform/mqtt/codec — payload CODEC for the TwistBus wire (protobuf ⇄ object).
//
// There is deliberately NO app-layer encryption here. A symmetric key shipped to
// every browser protects nothing — any client that loads the page holds it, so it
// grants neither confidentiality nor authenticity (see
// docs/Audits/Security-and-Architecture-Audit.md §1). Those properties belong to the
// transport (wss:// TLS to the broker) and to per-session, backend-issued keys — never
// to a constant baked into the SPA. The wire therefore carries PLAINTEXT protobuf (or
// JSON when the broker is in `plaintext` mode); protobuf here is purely a payload-SIZE
// optimization, not a security boundary.

/** Coerce a protobuf 64-bit field (a Long, or a number) to a JS number (0 if unset —
 *  proto3 scalars have no presence, so an absent tsMs reads as Long 0). */
function numOf(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** Reconstruct the identity string consumers read: the compact origin id becomes
 *  its 8-hex string (so `full_id.split(':')[0]` still yields the origin); a legacy
 *  message keeps its full "<hex>:TWIST:<birth>" string. */
function idOf(msg: { fullId?: string | null; originId?: number | null }): string {
  if (msg.fullId) return msg.fullId;
  const o = msg.originId ?? 0;
  return o ? (o >>> 0).toString(16).padStart(8, '0') : '';
}

/** The 4-byte session origin from a full_id ("a1b2c3d4:TWIST:…" → 0xa1b2c3d4). */
function originIdOf(fullId: unknown): number {
  const hex = String(fullId ?? '').split(':')[0] ?? '';
  const n = parseInt(hex, 16);
  return Number.isFinite(n) ? (n >>> 0) : 0;
}

/** Encode a payload object to plaintext protobuf bytes for the wire. */
export async function encodePayload(payloadObj: any): Promise<Uint8Array> {
  let wrapper: spog.PayloadWrapper.$Shape;
  // v2 (audit F1/F5): every arm carries the 4-byte origin id instead of the
  // "<hex>:TWIST:<birth-ms>" string. The full string is NOT sent — consumers only
  // ever read the origin prefix (self-echo, log grouping), which the decoder rebuilds.
  const originId = originIdOf(payloadObj.full_id);

  if (payloadObj.messagesPerMinute !== undefined) {
    wrapper = { rateMsg: { messagesPerMinute: payloadObj.messagesPerMinute, originId, ts: payloadObj.ts } };
  } else if (payloadObj.active !== undefined) {
    wrapper = { presenceMsg: { active: payloadObj.active, originId, ts: payloadObj.ts } };
  } else if (payloadObj.value !== undefined) {
    const value = payloadObj.value;
    const vm: spog.ValueMsg.$Shape = { originId, tsMs: payloadObj.ts };   // F5: ts as varint
    // F2: a non-empty string array (routing crosspoints) rides as repeated strings,
    // not JSON-in-a-string. Empty arrays / objects still use the JSON string_value.
    if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string')) {
      vm.valueList = value;
    } else {
      let paramVal: spog.ParamValue.$Shape = {};
      if (typeof value === 'number') paramVal = { numberValue: value, value: 'numberValue' };
      else if (typeof value === 'boolean') paramVal = { boolValue: value, value: 'boolValue' };
      else if (typeof value === 'object' && value !== null) paramVal = { stringValue: JSON.stringify(value), value: 'stringValue' };
      else paramVal = { stringValue: String(value), value: 'stringValue' };
      vm.value = paramVal;
    }
    wrapper = { valueMsg: vm };
  } else {
    wrapper = { jsonFallback: typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj) };
  }

  return spog.PayloadWrapper.encode(spog.PayloadWrapper.create(wrapper)).finish();
}

/** Decode wire bytes back to a payload object. Accepts plaintext protobuf, or a raw
 *  JSON payload (broker `plaintext` mode / legacy), detected by a leading `{` or `[`. */
export async function decodePayload(bytes: Uint8Array): Promise<any> {
  if (bytes[0] === 123 || bytes[0] === 91) {
    try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { /* ignore */ }
  }

  try {
    const wrapper = spog.PayloadWrapper.decode(bytes);

    if (wrapper.valueMsg) {
      const vm = wrapper.valueMsg;
      let val: any;
      if (vm.valueList && vm.valueList.length) val = vm.valueList;              // F2: repeated strings
      else if (vm.value?.numberValue != null) val = vm.value.numberValue;
      else if (vm.value?.boolValue != null) val = vm.value.boolValue;
      else {
        val = vm.value?.stringValue;
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
          try { val = JSON.parse(val); } catch { /* ignore */ }
        }
      }
      // New msgs carry ts_ms (varint); legacy carry the ts double — take whichever is set.
      return { value: val, ts: numOf(vm.tsMs) || vm.ts || 0, full_id: idOf(vm) };
    }
    if (wrapper.presenceMsg) return { active: wrapper.presenceMsg.active, full_id: idOf(wrapper.presenceMsg), ts: wrapper.presenceMsg.ts };
    if (wrapper.rateMsg) return { messagesPerMinute: wrapper.rateMsg.messagesPerMinute, full_id: idOf(wrapper.rateMsg), ts: wrapper.rateMsg.ts };
    if (wrapper.jsonFallback) {
      try { return JSON.parse(wrapper.jsonFallback); } catch { return wrapper.jsonFallback; }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/** Debug view for the payload sniffer: the raw protobuf AST + the decoded payload. */
export async function debugDecodePayload(bytes: Uint8Array): Promise<{ rawProtoJSON: any, decodedPayload: any, error?: string }> {
  try {
    const wrapper = spog.PayloadWrapper.decode(bytes);
    // Create a plain JSON representation of the Protobuf AST
    const rawProtoJSON = spog.PayloadWrapper.toObject(wrapper, { longs: Number, defaults: false });
    const decodedPayload = await decodePayload(bytes);
    return { rawProtoJSON, decodedPayload };
  } catch (e) {
    return { rawProtoJSON: null, decodedPayload: null, error: String(e) };
  }
}
