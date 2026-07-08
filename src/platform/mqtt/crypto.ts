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

export async function encodeAndEncrypt(payloadObj: any): Promise<Uint8Array> {
  let wrapper: spog.PayloadWrapper.$Shape;

  if (payloadObj.messagesPerMinute !== undefined) {
    wrapper = { rateMsg: { messagesPerMinute: payloadObj.messagesPerMinute, fullId: payloadObj.full_id, ts: payloadObj.ts } };
  } else if (payloadObj.active !== undefined) {
    wrapper = { presenceMsg: { active: payloadObj.active, fullId: payloadObj.full_id, ts: payloadObj.ts } };
  } else if (payloadObj.value !== undefined) {
    const value = payloadObj.value;
    let paramVal: spog.ParamValue.$Shape = {};
    if (typeof value === 'number') paramVal = { numberValue: value, value: 'numberValue' };
    else if (typeof value === 'boolean') paramVal = { boolValue: value, value: 'boolValue' };
    else paramVal = { stringValue: String(value), value: 'stringValue' };

    wrapper = {
      valueMsg: {
        value: paramVal,
        ts: payloadObj.ts,
        fullId: payloadObj.full_id
      }
    };
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
      let val: any;
      if (wrapper.valueMsg.value?.numberValue != null) val = wrapper.valueMsg.value.numberValue;
      else if (wrapper.valueMsg.value?.boolValue != null) val = wrapper.valueMsg.value.boolValue;
      else val = wrapper.valueMsg.value?.stringValue;
      
      return {
        value: val,
        ts: wrapper.valueMsg.ts,
        full_id: wrapper.valueMsg.fullId
      };
    }
    if (wrapper.presenceMsg) return { active: wrapper.presenceMsg.active, full_id: wrapper.presenceMsg.fullId, ts: wrapper.presenceMsg.ts };
    if (wrapper.rateMsg) return { messagesPerMinute: wrapper.rateMsg.messagesPerMinute, full_id: wrapper.rateMsg.fullId, ts: wrapper.rateMsg.ts };
    if (wrapper.jsonFallback) {
      try { return JSON.parse(wrapper.jsonFallback); } catch { return wrapper.jsonFallback; }
    }
    return null;
  } catch (e) {
    return null;
  }
}
