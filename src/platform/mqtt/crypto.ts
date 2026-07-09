import { spog } from './schema.js';

const MASTER_KEY_STRING = 'SPOG-ENTERPRISE-SECRET-KEY-2026-X';
const ENCODER = new TextEncoder();
const KEY_BYTES = ENCODER.encode(MASTER_KEY_STRING.padEnd(32, '0').substring(0, 32));

let cryptoKey: CryptoKey | null = null;
async function getKey(): Promise<CryptoKey> {
  if (cryptoKey) return cryptoKey;
  cryptoKey = await crypto.subtle.importKey(
    'raw',
    KEY_BYTES,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return cryptoKey;
}

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

export async function encodeAndEncrypt(payloadObj: any): Promise<Uint8Array> {
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

  const protobufBytes = spog.PayloadWrapper.encode(spog.PayloadWrapper.create(wrapper)).finish();
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, protobufBytes as unknown as BufferSource);
  
  const finalPayload = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
  finalPayload.set(iv);
  finalPayload.set(new Uint8Array(ciphertextBuffer), iv.length);
  return finalPayload;
}

export async function decryptAndDecode(bytes: Uint8Array): Promise<any> {
  if (bytes[0] === 123 || bytes[0] === 91) {
    try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { /* ignore */ }
  }

  try {
    const key = await getKey();
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);
    
    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const wrapper = spog.PayloadWrapper.decode(new Uint8Array(decryptedBuffer));

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

export async function debugDecryptAndDecode(bytes: Uint8Array): Promise<{ rawProtoJSON: any, decodedPayload: any, error?: string }> {
  try {
    const key = await getKey();
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);
    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const wrapper = spog.PayloadWrapper.decode(new Uint8Array(decryptedBuffer));
    
    // Create a plain JSON representation of the Protobuf AST
    const rawProtoJSON = spog.PayloadWrapper.toObject(wrapper, { longs: Number, defaults: false });
    const decodedPayload = await decryptAndDecode(bytes);
    return { rawProtoJSON, decodedPayload };
  } catch (e) {
    return { rawProtoJSON: null, decodedPayload: null, error: String(e) };
  }
}
