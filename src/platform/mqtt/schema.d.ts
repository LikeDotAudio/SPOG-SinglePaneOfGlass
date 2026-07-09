import * as $protobuf from "protobufjs";
import Long = require("long");

/** Namespace spog. */
export namespace spog {

    /**
     * Properties of a ParamValue.
     * @deprecated Use spog.ParamValue.$Properties instead.
     */
    interface IParamValue extends spog.ParamValue.$Properties {
    }

    /** Represents a ParamValue. */
    class ParamValue {

        /**
         * Constructs a new ParamValue.
         * @param [properties] Properties to set
         */
        constructor(properties?: spog.ParamValue.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ParamValue numberValue. */
        numberValue?: (number|null);

        /** ParamValue stringValue. */
        stringValue?: (string|null);

        /** ParamValue boolValue. */
        boolValue?: (boolean|null);

        /** ParamValue value. */
        value?: ("numberValue"|"stringValue"|"boolValue");

        /**
         * Creates a new ParamValue instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ParamValue instance
         */
        static create(properties: spog.ParamValue.$Shape): spog.ParamValue & spog.ParamValue.$Shape;
        static create(properties?: spog.ParamValue.$Properties): spog.ParamValue;

        /**
         * Encodes the specified ParamValue message. Does not implicitly {@link spog.ParamValue.verify|verify} messages.
         * @param message ParamValue message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: spog.ParamValue.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ParamValue message, length delimited. Does not implicitly {@link spog.ParamValue.verify|verify} messages.
         * @param message ParamValue message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: spog.ParamValue.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ParamValue message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {spog.ParamValue & spog.ParamValue.$Shape} ParamValue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): spog.ParamValue & spog.ParamValue.$Shape;

        /**
         * Decodes a ParamValue message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {spog.ParamValue & spog.ParamValue.$Shape} ParamValue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): spog.ParamValue & spog.ParamValue.$Shape;

        /**
         * Verifies a ParamValue message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ParamValue message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ParamValue
         */
        static fromObject(object: { [k: string]: any }): spog.ParamValue;

        /**
         * Creates a plain object from a ParamValue message. Also converts values to other types if specified.
         * @param message ParamValue
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: spog.ParamValue, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ParamValue to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ParamValue
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ParamValue {

        /** Properties of a ParamValue. */
        interface $Properties {

            /** ParamValue numberValue */
            numberValue?: (number|null);

            /** ParamValue stringValue */
            stringValue?: (string|null);

            /** ParamValue boolValue */
            boolValue?: (boolean|null);

            /** ParamValue value */
            value?: ("numberValue"|"stringValue"|"boolValue");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of a ParamValue. */
        type $Shape = {
          numberValue?: number|null;
          stringValue?: string|null;
          boolValue?: boolean|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ value?: undefined; numberValue?: null; stringValue?: null; boolValue?: null }|{ value?: "numberValue"; numberValue: number; stringValue?: null; boolValue?: null }|{ value?: "stringValue"; numberValue?: null; stringValue: string; boolValue?: null }|{ value?: "boolValue"; numberValue?: null; stringValue?: null; boolValue: boolean })
        );
    }

    /**
     * Properties of a ValueMsg.
     * @deprecated Use spog.ValueMsg.$Properties instead.
     */
    interface IValueMsg extends spog.ValueMsg.$Properties {
    }

    /** Represents a ValueMsg. */
    class ValueMsg {

        /**
         * Constructs a new ValueMsg.
         * @param [properties] Properties to set
         */
        constructor(properties?: spog.ValueMsg.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ValueMsg value. */
        value?: (spog.ParamValue.$Properties|null);

        /** ValueMsg ts. */
        ts: number;

        /** ValueMsg fullId. */
        fullId: string;

        /** ValueMsg valueList. */
        valueList: string[];

        /** ValueMsg originId. */
        originId: number;

        /** ValueMsg tsMs. */
        tsMs: (number|Long);

        /**
         * Creates a new ValueMsg instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ValueMsg instance
         */
        static create(properties: spog.ValueMsg.$Shape): spog.ValueMsg & spog.ValueMsg.$Shape;
        static create(properties?: spog.ValueMsg.$Properties): spog.ValueMsg;

        /**
         * Encodes the specified ValueMsg message. Does not implicitly {@link spog.ValueMsg.verify|verify} messages.
         * @param message ValueMsg message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: spog.ValueMsg.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ValueMsg message, length delimited. Does not implicitly {@link spog.ValueMsg.verify|verify} messages.
         * @param message ValueMsg message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: spog.ValueMsg.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ValueMsg message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {spog.ValueMsg & spog.ValueMsg.$Shape} ValueMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): spog.ValueMsg & spog.ValueMsg.$Shape;

        /**
         * Decodes a ValueMsg message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {spog.ValueMsg & spog.ValueMsg.$Shape} ValueMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): spog.ValueMsg & spog.ValueMsg.$Shape;

        /**
         * Verifies a ValueMsg message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ValueMsg message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ValueMsg
         */
        static fromObject(object: { [k: string]: any }): spog.ValueMsg;

        /**
         * Creates a plain object from a ValueMsg message. Also converts values to other types if specified.
         * @param message ValueMsg
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: spog.ValueMsg, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ValueMsg to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ValueMsg
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ValueMsg {

        /** Properties of a ValueMsg. */
        interface $Properties {

            /** ValueMsg value */
            value?: (spog.ParamValue.$Properties|null);

            /** ValueMsg ts */
            ts?: (number|null);

            /** ValueMsg fullId */
            fullId?: (string|null);

            /** ValueMsg valueList */
            valueList?: (string[]|null);

            /** ValueMsg originId */
            originId?: (number|null);

            /** ValueMsg tsMs */
            tsMs?: (number|Long|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a ValueMsg. */
        type $Shape = {
          value?: spog.ParamValue.$Shape|null;
          ts?: number|null;
          fullId?: string|null;
          valueList?: string[]|null;
          originId?: number|null;
          tsMs?: number|Long|null;
          $unknowns?: Uint8Array[];
        };
    }

    /**
     * Properties of a PresenceMsg.
     * @deprecated Use spog.PresenceMsg.$Properties instead.
     */
    interface IPresenceMsg extends spog.PresenceMsg.$Properties {
    }

    /** Represents a PresenceMsg. */
    class PresenceMsg {

        /**
         * Constructs a new PresenceMsg.
         * @param [properties] Properties to set
         */
        constructor(properties?: spog.PresenceMsg.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** PresenceMsg active. */
        active: boolean;

        /** PresenceMsg fullId. */
        fullId: string;

        /** PresenceMsg ts. */
        ts: number;

        /** PresenceMsg originId. */
        originId: number;

        /**
         * Creates a new PresenceMsg instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PresenceMsg instance
         */
        static create(properties: spog.PresenceMsg.$Shape): spog.PresenceMsg & spog.PresenceMsg.$Shape;
        static create(properties?: spog.PresenceMsg.$Properties): spog.PresenceMsg;

        /**
         * Encodes the specified PresenceMsg message. Does not implicitly {@link spog.PresenceMsg.verify|verify} messages.
         * @param message PresenceMsg message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: spog.PresenceMsg.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PresenceMsg message, length delimited. Does not implicitly {@link spog.PresenceMsg.verify|verify} messages.
         * @param message PresenceMsg message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: spog.PresenceMsg.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PresenceMsg message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {spog.PresenceMsg & spog.PresenceMsg.$Shape} PresenceMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): spog.PresenceMsg & spog.PresenceMsg.$Shape;

        /**
         * Decodes a PresenceMsg message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {spog.PresenceMsg & spog.PresenceMsg.$Shape} PresenceMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): spog.PresenceMsg & spog.PresenceMsg.$Shape;

        /**
         * Verifies a PresenceMsg message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PresenceMsg message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PresenceMsg
         */
        static fromObject(object: { [k: string]: any }): spog.PresenceMsg;

        /**
         * Creates a plain object from a PresenceMsg message. Also converts values to other types if specified.
         * @param message PresenceMsg
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: spog.PresenceMsg, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PresenceMsg to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for PresenceMsg
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace PresenceMsg {

        /** Properties of a PresenceMsg. */
        interface $Properties {

            /** PresenceMsg active */
            active?: (boolean|null);

            /** PresenceMsg fullId */
            fullId?: (string|null);

            /** PresenceMsg ts */
            ts?: (number|null);

            /** PresenceMsg originId */
            originId?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a PresenceMsg. */
        type $Shape = spog.PresenceMsg.$Properties;
    }

    /**
     * Properties of a RateMsg.
     * @deprecated Use spog.RateMsg.$Properties instead.
     */
    interface IRateMsg extends spog.RateMsg.$Properties {
    }

    /** Represents a RateMsg. */
    class RateMsg {

        /**
         * Constructs a new RateMsg.
         * @param [properties] Properties to set
         */
        constructor(properties?: spog.RateMsg.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** RateMsg messagesPerMinute. */
        messagesPerMinute: number;

        /** RateMsg ts. */
        ts: number;

        /** RateMsg fullId. */
        fullId: string;

        /** RateMsg originId. */
        originId: number;

        /**
         * Creates a new RateMsg instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RateMsg instance
         */
        static create(properties: spog.RateMsg.$Shape): spog.RateMsg & spog.RateMsg.$Shape;
        static create(properties?: spog.RateMsg.$Properties): spog.RateMsg;

        /**
         * Encodes the specified RateMsg message. Does not implicitly {@link spog.RateMsg.verify|verify} messages.
         * @param message RateMsg message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: spog.RateMsg.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RateMsg message, length delimited. Does not implicitly {@link spog.RateMsg.verify|verify} messages.
         * @param message RateMsg message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: spog.RateMsg.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RateMsg message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {spog.RateMsg & spog.RateMsg.$Shape} RateMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): spog.RateMsg & spog.RateMsg.$Shape;

        /**
         * Decodes a RateMsg message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {spog.RateMsg & spog.RateMsg.$Shape} RateMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): spog.RateMsg & spog.RateMsg.$Shape;

        /**
         * Verifies a RateMsg message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RateMsg message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RateMsg
         */
        static fromObject(object: { [k: string]: any }): spog.RateMsg;

        /**
         * Creates a plain object from a RateMsg message. Also converts values to other types if specified.
         * @param message RateMsg
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: spog.RateMsg, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RateMsg to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for RateMsg
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace RateMsg {

        /** Properties of a RateMsg. */
        interface $Properties {

            /** RateMsg messagesPerMinute */
            messagesPerMinute?: (number|null);

            /** RateMsg ts */
            ts?: (number|null);

            /** RateMsg fullId */
            fullId?: (string|null);

            /** RateMsg originId */
            originId?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a RateMsg. */
        type $Shape = spog.RateMsg.$Properties;
    }

    /**
     * Properties of a PayloadWrapper.
     * @deprecated Use spog.PayloadWrapper.$Properties instead.
     */
    interface IPayloadWrapper extends spog.PayloadWrapper.$Properties {
    }

    /** Represents a PayloadWrapper. */
    class PayloadWrapper {

        /**
         * Constructs a new PayloadWrapper.
         * @param [properties] Properties to set
         */
        constructor(properties?: spog.PayloadWrapper.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** PayloadWrapper valueMsg. */
        valueMsg?: (spog.ValueMsg.$Properties|null);

        /** PayloadWrapper presenceMsg. */
        presenceMsg?: (spog.PresenceMsg.$Properties|null);

        /** PayloadWrapper rateMsg. */
        rateMsg?: (spog.RateMsg.$Properties|null);

        /** PayloadWrapper jsonFallback. */
        jsonFallback?: (string|null);

        /** PayloadWrapper payload. */
        payload?: ("valueMsg"|"presenceMsg"|"rateMsg"|"jsonFallback");

        /**
         * Creates a new PayloadWrapper instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PayloadWrapper instance
         */
        static create(properties: spog.PayloadWrapper.$Shape): spog.PayloadWrapper & spog.PayloadWrapper.$Shape;
        static create(properties?: spog.PayloadWrapper.$Properties): spog.PayloadWrapper;

        /**
         * Encodes the specified PayloadWrapper message. Does not implicitly {@link spog.PayloadWrapper.verify|verify} messages.
         * @param message PayloadWrapper message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: spog.PayloadWrapper.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PayloadWrapper message, length delimited. Does not implicitly {@link spog.PayloadWrapper.verify|verify} messages.
         * @param message PayloadWrapper message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: spog.PayloadWrapper.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PayloadWrapper message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {spog.PayloadWrapper & spog.PayloadWrapper.$Shape} PayloadWrapper
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): spog.PayloadWrapper & spog.PayloadWrapper.$Shape;

        /**
         * Decodes a PayloadWrapper message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {spog.PayloadWrapper & spog.PayloadWrapper.$Shape} PayloadWrapper
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): spog.PayloadWrapper & spog.PayloadWrapper.$Shape;

        /**
         * Verifies a PayloadWrapper message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PayloadWrapper message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PayloadWrapper
         */
        static fromObject(object: { [k: string]: any }): spog.PayloadWrapper;

        /**
         * Creates a plain object from a PayloadWrapper message. Also converts values to other types if specified.
         * @param message PayloadWrapper
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: spog.PayloadWrapper, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PayloadWrapper to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for PayloadWrapper
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace PayloadWrapper {

        /** Properties of a PayloadWrapper. */
        interface $Properties {

            /** PayloadWrapper valueMsg */
            valueMsg?: (spog.ValueMsg.$Properties|null);

            /** PayloadWrapper presenceMsg */
            presenceMsg?: (spog.PresenceMsg.$Properties|null);

            /** PayloadWrapper rateMsg */
            rateMsg?: (spog.RateMsg.$Properties|null);

            /** PayloadWrapper jsonFallback */
            jsonFallback?: (string|null);

            /** PayloadWrapper payload */
            payload?: ("valueMsg"|"presenceMsg"|"rateMsg"|"jsonFallback");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of a PayloadWrapper. */
        type $Shape = {
          valueMsg?: spog.ValueMsg.$Shape|null;
          presenceMsg?: spog.PresenceMsg.$Shape|null;
          rateMsg?: spog.RateMsg.$Shape|null;
          jsonFallback?: string|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ payload?: undefined; valueMsg?: null; presenceMsg?: null; rateMsg?: null; jsonFallback?: null }|{ payload?: "valueMsg"; valueMsg: spog.ValueMsg.$Shape; presenceMsg?: null; rateMsg?: null; jsonFallback?: null }|{ payload?: "presenceMsg"; valueMsg?: null; presenceMsg: spog.PresenceMsg.$Shape; rateMsg?: null; jsonFallback?: null }|{ payload?: "rateMsg"; valueMsg?: null; presenceMsg?: null; rateMsg: spog.RateMsg.$Shape; jsonFallback?: null }|{ payload?: "jsonFallback"; valueMsg?: null; presenceMsg?: null; rateMsg?: null; jsonFallback: string })
        );
    }
}
