/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $TypeError = $util.global.TypeError, $Number = $util.global.Number, $String = $util.global.String, $Boolean = $util.global.Boolean, $isFinite = $util.global.isFinite, $Array = $util.global.Array, $parseInt = $util.global.parseInt, $BigInt = $util.global.BigInt;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const spog = $root.spog = (() => {

    /**
     * Namespace spog.
     * @exports spog
     * @namespace
     */
    const spog = {};

    spog.ParamValue = (function() {

        /**
         * Properties of a ParamValue.
         * @typedef {Object} spog.ParamValue.$Properties
         * @property {number|null} [numberValue] ParamValue numberValue
         * @property {string|null} [stringValue] ParamValue stringValue
         * @property {boolean|null} [boolValue] ParamValue boolValue
         * @property {"numberValue"|"stringValue"|"boolValue"} [value] ParamValue value
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ParamValue.
         * @memberof spog
         * @interface IParamValue
         * @augments spog.ParamValue.$Properties
         * @deprecated Use spog.ParamValue.$Properties instead.
         */

        /**
         * Narrowed shape of a ParamValue.
         * @typedef {{
         *   numberValue?: number|null;
         *   stringValue?: string|null;
         *   boolValue?: boolean|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ value?: undefined; numberValue?: null; stringValue?: null; boolValue?: null }|{ value?: "numberValue"; numberValue: number; stringValue?: null; boolValue?: null }|{ value?: "stringValue"; numberValue?: null; stringValue: string; boolValue?: null }|{ value?: "boolValue"; numberValue?: null; stringValue?: null; boolValue: boolean })
         * )} spog.ParamValue.$Shape
         */

        /**
         * Constructs a new ParamValue.
         * @memberof spog
         * @classdesc Represents a ParamValue.
         * @constructor
         * @param {spog.ParamValue.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ParamValue = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ParamValue numberValue.
         * @member {number|null|undefined} numberValue
         * @memberof spog.ParamValue
         * @instance
         */
        ParamValue.prototype.numberValue = null;

        /**
         * ParamValue stringValue.
         * @member {string|null|undefined} stringValue
         * @memberof spog.ParamValue
         * @instance
         */
        ParamValue.prototype.stringValue = null;

        /**
         * ParamValue boolValue.
         * @member {boolean|null|undefined} boolValue
         * @memberof spog.ParamValue
         * @instance
         */
        ParamValue.prototype.boolValue = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ParamValue value.
         * @member {"numberValue"|"stringValue"|"boolValue"|undefined} value
         * @memberof spog.ParamValue
         * @instance
         */
        $Object.defineProperty(ParamValue.prototype, "value", {
            get: $util.oneOfGetter($oneOfFields = ["numberValue", "stringValue", "boolValue"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new ParamValue instance using the specified properties.
         * @function create
         * @memberof spog.ParamValue
         * @static
         * @param {spog.ParamValue.$Properties=} [properties] Properties to set
         * @returns {spog.ParamValue} ParamValue instance
         * @type {{
         *   (properties: spog.ParamValue.$Shape): spog.ParamValue & spog.ParamValue.$Shape;
         *   (properties?: spog.ParamValue.$Properties): spog.ParamValue;
         * }}
         */
        ParamValue.create = function(properties) {
            return new ParamValue(properties);
        };

        /**
         * Encodes the specified ParamValue message. Does not implicitly {@link spog.ParamValue.verify|verify} messages.
         * @function encode
         * @memberof spog.ParamValue
         * @static
         * @param {spog.ParamValue.$Properties} message ParamValue message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ParamValue.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.numberValue != null && $Object.hasOwnProperty.call(message, "numberValue"))
                writer.uint32(/* id 1, wireType 1 =*/9).double(message.numberValue);
            if (message.stringValue != null && $Object.hasOwnProperty.call(message, "stringValue"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.stringValue);
            if (message.boolValue != null && $Object.hasOwnProperty.call(message, "boolValue"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.boolValue);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ParamValue message, length delimited. Does not implicitly {@link spog.ParamValue.verify|verify} messages.
         * @function encodeDelimited
         * @memberof spog.ParamValue
         * @static
         * @param {spog.ParamValue.$Properties} message ParamValue message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ParamValue.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ParamValue message from the specified reader or buffer.
         * @function decode
         * @memberof spog.ParamValue
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {spog.ParamValue & spog.ParamValue.$Shape} ParamValue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ParamValue.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.spog.ParamValue();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 1)
                            break;
                        message.numberValue = reader.double();
                        message.value = "numberValue";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.stringValue = reader.stringVerify();
                        message.value = "stringValue";
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        message.boolValue = reader.bool();
                        message.value = "boolValue";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ParamValue message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof spog.ParamValue
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {spog.ParamValue & spog.ParamValue.$Shape} ParamValue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ParamValue.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ParamValue message.
         * @function verify
         * @memberof spog.ParamValue
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ParamValue.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.numberValue != null && $Object.hasOwnProperty.call(message, "numberValue")) {
                properties.value = 1;
                if (typeof message.numberValue !== "number")
                    return "numberValue: number expected";
            }
            if (message.stringValue != null && $Object.hasOwnProperty.call(message, "stringValue")) {
                if (properties.value === 1)
                    return "value: multiple values";
                properties.value = 1;
                if (!$util.isString(message.stringValue))
                    return "stringValue: string expected";
            }
            if (message.boolValue != null && $Object.hasOwnProperty.call(message, "boolValue")) {
                if (properties.value === 1)
                    return "value: multiple values";
                properties.value = 1;
                if (typeof message.boolValue !== "boolean")
                    return "boolValue: boolean expected";
            }
            return null;
        };

        /**
         * Creates a ParamValue message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof spog.ParamValue
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {spog.ParamValue} ParamValue
         */
        ParamValue.fromObject = function (object, _depth) {
            if (object instanceof $root.spog.ParamValue)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".spog.ParamValue: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.spog.ParamValue();
            if (object.numberValue != null)
                message.numberValue = $Number(object.numberValue);
            if (object.stringValue != null)
                message.stringValue = $String(object.stringValue);
            if (object.boolValue != null)
                message.boolValue = $Boolean(object.boolValue);
            return message;
        };

        /**
         * Creates a plain object from a ParamValue message. Also converts values to other types if specified.
         * @function toObject
         * @memberof spog.ParamValue
         * @static
         * @param {spog.ParamValue} message ParamValue
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ParamValue.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.numberValue != null && $Object.hasOwnProperty.call(message, "numberValue")) {
                object.numberValue = options.json && !$isFinite(message.numberValue) ? $String(message.numberValue) : message.numberValue;
                if (options.oneofs)
                    object.value = "numberValue";
            }
            if (message.stringValue != null && $Object.hasOwnProperty.call(message, "stringValue")) {
                object.stringValue = message.stringValue;
                if (options.oneofs)
                    object.value = "stringValue";
            }
            if (message.boolValue != null && $Object.hasOwnProperty.call(message, "boolValue")) {
                object.boolValue = message.boolValue;
                if (options.oneofs)
                    object.value = "boolValue";
            }
            return object;
        };

        /**
         * Converts this ParamValue to JSON.
         * @function toJSON
         * @memberof spog.ParamValue
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ParamValue.prototype.toJSON = function() {
            return ParamValue.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ParamValue
         * @function getTypeUrl
         * @memberof spog.ParamValue
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ParamValue.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/spog.ParamValue";
        };

        return ParamValue;
    })();

    spog.ValueMsg = (function() {

        /**
         * Properties of a ValueMsg.
         * @typedef {Object} spog.ValueMsg.$Properties
         * @property {spog.ParamValue.$Properties|null} [value] ValueMsg value
         * @property {number|null} [ts] ValueMsg ts
         * @property {string|null} [fullId] ValueMsg fullId
         * @property {Array.<string>|null} [valueList] ValueMsg valueList
         * @property {number|null} [originId] ValueMsg originId
         * @property {number|Long|null} [tsMs] ValueMsg tsMs
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ValueMsg.
         * @memberof spog
         * @interface IValueMsg
         * @augments spog.ValueMsg.$Properties
         * @deprecated Use spog.ValueMsg.$Properties instead.
         */

        /**
         * Shape of a ValueMsg.
         * @typedef {{
         *   value?: spog.ParamValue.$Shape|null;
         *   ts?: number|null;
         *   fullId?: string|null;
         *   valueList?: Array.<string>|null;
         *   originId?: number|null;
         *   tsMs?: number|Long|null;
         *   $unknowns?: Array.<Uint8Array>;
         * }} spog.ValueMsg.$Shape
         */

        /**
         * Constructs a new ValueMsg.
         * @memberof spog
         * @classdesc Represents a ValueMsg.
         * @constructor
         * @param {spog.ValueMsg.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ValueMsg = function (properties) {
            this.valueList = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ValueMsg value.
         * @member {spog.ParamValue.$Properties|null|undefined} value
         * @memberof spog.ValueMsg
         * @instance
         */
        ValueMsg.prototype.value = null;

        /**
         * ValueMsg ts.
         * @member {number} ts
         * @memberof spog.ValueMsg
         * @instance
         */
        ValueMsg.prototype.ts = 0;

        /**
         * ValueMsg fullId.
         * @member {string} fullId
         * @memberof spog.ValueMsg
         * @instance
         */
        ValueMsg.prototype.fullId = "";

        /**
         * ValueMsg valueList.
         * @member {Array.<string>} valueList
         * @memberof spog.ValueMsg
         * @instance
         */
        ValueMsg.prototype.valueList = $util.emptyArray;

        /**
         * ValueMsg originId.
         * @member {number} originId
         * @memberof spog.ValueMsg
         * @instance
         */
        ValueMsg.prototype.originId = 0;

        /**
         * ValueMsg tsMs.
         * @member {number|Long} tsMs
         * @memberof spog.ValueMsg
         * @instance
         */
        ValueMsg.prototype.tsMs = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Creates a new ValueMsg instance using the specified properties.
         * @function create
         * @memberof spog.ValueMsg
         * @static
         * @param {spog.ValueMsg.$Properties=} [properties] Properties to set
         * @returns {spog.ValueMsg} ValueMsg instance
         * @type {{
         *   (properties: spog.ValueMsg.$Shape): spog.ValueMsg & spog.ValueMsg.$Shape;
         *   (properties?: spog.ValueMsg.$Properties): spog.ValueMsg;
         * }}
         */
        ValueMsg.create = function(properties) {
            return new ValueMsg(properties);
        };

        /**
         * Encodes the specified ValueMsg message. Does not implicitly {@link spog.ValueMsg.verify|verify} messages.
         * @function encode
         * @memberof spog.ValueMsg
         * @static
         * @param {spog.ValueMsg.$Properties} message ValueMsg message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ValueMsg.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.value != null && $Object.hasOwnProperty.call(message, "value"))
                $root.spog.ParamValue.encode(message.value, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.ts != null && $Object.hasOwnProperty.call(message, "ts") && !$Object.is(message.ts, 0))
                writer.uint32(/* id 2, wireType 1 =*/17).double(message.ts);
            if (message.fullId != null && $Object.hasOwnProperty.call(message, "fullId") && message.fullId !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.fullId);
            if (message.valueList != null && message.valueList.length)
                for (let i = 0; i < message.valueList.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.valueList[i]);
            if (message.originId != null && $Object.hasOwnProperty.call(message, "originId") && message.originId !== 0)
                writer.uint32(/* id 5, wireType 5 =*/45).fixed32(message.originId);
            if (message.tsMs != null && $Object.hasOwnProperty.call(message, "tsMs") && (typeof message.tsMs === "object" ? message.tsMs.low || message.tsMs.high : message.tsMs !== 0))
                writer.uint32(/* id 6, wireType 0 =*/48).uint64(message.tsMs);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ValueMsg message, length delimited. Does not implicitly {@link spog.ValueMsg.verify|verify} messages.
         * @function encodeDelimited
         * @memberof spog.ValueMsg
         * @static
         * @param {spog.ValueMsg.$Properties} message ValueMsg message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ValueMsg.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ValueMsg message from the specified reader or buffer.
         * @function decode
         * @memberof spog.ValueMsg
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {spog.ValueMsg & spog.ValueMsg.$Shape} ValueMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ValueMsg.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.spog.ValueMsg(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.value = $root.spog.ParamValue.decode(reader, reader.uint32(), $undefined, _depth + 1, message.value);
                        continue;
                    }
                case 2: {
                        if (wireType !== 1)
                            break;
                        if (!$Object.is(value = reader.double(), 0))
                            message.ts = value;
                        else
                            delete message.ts;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.fullId = value;
                        else
                            delete message.fullId;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if (!(message.valueList && message.valueList.length))
                            message.valueList = [];
                        message.valueList.push(reader.stringVerify());
                        continue;
                    }
                case 5: {
                        if (wireType !== 5)
                            break;
                        if (value = reader.fixed32())
                            message.originId = value;
                        else
                            delete message.originId;
                        continue;
                    }
                case 6: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.uint64()) === "object" ? value.low || value.high : value !== 0)
                            message.tsMs = value;
                        else
                            delete message.tsMs;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ValueMsg message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof spog.ValueMsg
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {spog.ValueMsg & spog.ValueMsg.$Shape} ValueMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ValueMsg.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ValueMsg message.
         * @function verify
         * @memberof spog.ValueMsg
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ValueMsg.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.value != null && $Object.hasOwnProperty.call(message, "value")) {
                let error = $root.spog.ParamValue.verify(message.value, _depth + 1);
                if (error)
                    return "value." + error;
            }
            if (message.ts != null && $Object.hasOwnProperty.call(message, "ts"))
                if (typeof message.ts !== "number")
                    return "ts: number expected";
            if (message.fullId != null && $Object.hasOwnProperty.call(message, "fullId"))
                if (!$util.isString(message.fullId))
                    return "fullId: string expected";
            if (message.valueList != null && $Object.hasOwnProperty.call(message, "valueList")) {
                if (!$Array.isArray(message.valueList))
                    return "valueList: array expected";
                for (let i = 0; i < message.valueList.length; ++i)
                    if (!$util.isString(message.valueList[i]))
                        return "valueList: string[] expected";
            }
            if (message.originId != null && $Object.hasOwnProperty.call(message, "originId"))
                if (!$util.isInteger(message.originId))
                    return "originId: integer expected";
            if (message.tsMs != null && $Object.hasOwnProperty.call(message, "tsMs"))
                if (!$util.isInteger(message.tsMs) && !(message.tsMs && $util.isInteger(message.tsMs.low) && $util.isInteger(message.tsMs.high)))
                    return "tsMs: integer|Long expected";
            return null;
        };

        /**
         * Creates a ValueMsg message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof spog.ValueMsg
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {spog.ValueMsg} ValueMsg
         */
        ValueMsg.fromObject = function (object, _depth) {
            if (object instanceof $root.spog.ValueMsg)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".spog.ValueMsg: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.spog.ValueMsg();
            if (object.value != null) {
                if (!$util.isObject(object.value))
                    throw $TypeError(".spog.ValueMsg.value: object expected");
                message.value = $root.spog.ParamValue.fromObject(object.value, _depth + 1);
            }
            if (object.ts != null)
                if (!$Object.is($Number(object.ts), 0))
                    message.ts = $Number(object.ts);
            if (object.fullId != null)
                if (typeof object.fullId !== "string" || object.fullId.length)
                    message.fullId = $String(object.fullId);
            if (object.valueList) {
                if (!$Array.isArray(object.valueList))
                    throw $TypeError(".spog.ValueMsg.valueList: array expected");
                message.valueList = $Array(object.valueList.length);
                for (let i = 0; i < object.valueList.length; ++i)
                    message.valueList[i] = $String(object.valueList[i]);
            }
            if (object.originId != null)
                if ($Number(object.originId) !== 0)
                    message.originId = object.originId >>> 0;
            if (object.tsMs != null)
                if (typeof object.tsMs === "object" ? object.tsMs.low || object.tsMs.high : $Number(object.tsMs) !== 0)
                    if ($util.Long)
                        message.tsMs = $util.Long.fromValue(object.tsMs, true);
                    else if (typeof object.tsMs === "string")
                        message.tsMs = $parseInt(object.tsMs, 10);
                    else if (typeof object.tsMs === "number")
                        message.tsMs = object.tsMs;
                    else if (typeof object.tsMs === "object")
                        message.tsMs = new $util.LongBits(object.tsMs.low >>> 0, object.tsMs.high >>> 0).toNumber(true);
            return message;
        };

        /**
         * Creates a plain object from a ValueMsg message. Also converts values to other types if specified.
         * @function toObject
         * @memberof spog.ValueMsg
         * @static
         * @param {spog.ValueMsg} message ValueMsg
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ValueMsg.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.valueList = [];
            if (options.defaults) {
                object.value = null;
                object.ts = 0;
                object.fullId = "";
                object.originId = 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, true);
                    object.tsMs = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.tsMs = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
            }
            if (message.value != null && $Object.hasOwnProperty.call(message, "value"))
                object.value = $root.spog.ParamValue.toObject(message.value, options, _depth + 1);
            if (message.ts != null && $Object.hasOwnProperty.call(message, "ts"))
                object.ts = options.json && !$isFinite(message.ts) ? $String(message.ts) : message.ts;
            if (message.fullId != null && $Object.hasOwnProperty.call(message, "fullId"))
                object.fullId = message.fullId;
            if (message.valueList && message.valueList.length) {
                object.valueList = $Array(message.valueList.length);
                for (let j = 0; j < message.valueList.length; ++j)
                    object.valueList[j] = message.valueList[j];
            }
            if (message.originId != null && $Object.hasOwnProperty.call(message, "originId"))
                object.originId = message.originId;
            if (message.tsMs != null && $Object.hasOwnProperty.call(message, "tsMs"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.tsMs = typeof message.tsMs === "number" ? $BigInt(message.tsMs) : $util.Long.fromBits(message.tsMs.low >>> 0, message.tsMs.high >>> 0, true).toBigInt();
                else if (typeof message.tsMs === "number")
                    object.tsMs = options.longs === $String ? $String(message.tsMs) : message.tsMs;
                else
                    object.tsMs = options.longs === $String ? $util.Long.prototype.toString.call(message.tsMs) : options.longs === $Number ? new $util.LongBits(message.tsMs.low >>> 0, message.tsMs.high >>> 0).toNumber(true) : message.tsMs;
            return object;
        };

        /**
         * Converts this ValueMsg to JSON.
         * @function toJSON
         * @memberof spog.ValueMsg
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ValueMsg.prototype.toJSON = function() {
            return ValueMsg.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ValueMsg
         * @function getTypeUrl
         * @memberof spog.ValueMsg
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ValueMsg.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/spog.ValueMsg";
        };

        return ValueMsg;
    })();

    spog.PresenceMsg = (function() {

        /**
         * Properties of a PresenceMsg.
         * @typedef {Object} spog.PresenceMsg.$Properties
         * @property {boolean|null} [active] PresenceMsg active
         * @property {string|null} [fullId] PresenceMsg fullId
         * @property {number|null} [ts] PresenceMsg ts
         * @property {number|null} [originId] PresenceMsg originId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PresenceMsg.
         * @memberof spog
         * @interface IPresenceMsg
         * @augments spog.PresenceMsg.$Properties
         * @deprecated Use spog.PresenceMsg.$Properties instead.
         */

        /**
         * Shape of a PresenceMsg.
         * @typedef {spog.PresenceMsg.$Properties} spog.PresenceMsg.$Shape
         */

        /**
         * Constructs a new PresenceMsg.
         * @memberof spog
         * @classdesc Represents a PresenceMsg.
         * @constructor
         * @param {spog.PresenceMsg.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PresenceMsg = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * PresenceMsg active.
         * @member {boolean} active
         * @memberof spog.PresenceMsg
         * @instance
         */
        PresenceMsg.prototype.active = false;

        /**
         * PresenceMsg fullId.
         * @member {string} fullId
         * @memberof spog.PresenceMsg
         * @instance
         */
        PresenceMsg.prototype.fullId = "";

        /**
         * PresenceMsg ts.
         * @member {number} ts
         * @memberof spog.PresenceMsg
         * @instance
         */
        PresenceMsg.prototype.ts = 0;

        /**
         * PresenceMsg originId.
         * @member {number} originId
         * @memberof spog.PresenceMsg
         * @instance
         */
        PresenceMsg.prototype.originId = 0;

        /**
         * Creates a new PresenceMsg instance using the specified properties.
         * @function create
         * @memberof spog.PresenceMsg
         * @static
         * @param {spog.PresenceMsg.$Properties=} [properties] Properties to set
         * @returns {spog.PresenceMsg} PresenceMsg instance
         * @type {{
         *   (properties: spog.PresenceMsg.$Shape): spog.PresenceMsg & spog.PresenceMsg.$Shape;
         *   (properties?: spog.PresenceMsg.$Properties): spog.PresenceMsg;
         * }}
         */
        PresenceMsg.create = function(properties) {
            return new PresenceMsg(properties);
        };

        /**
         * Encodes the specified PresenceMsg message. Does not implicitly {@link spog.PresenceMsg.verify|verify} messages.
         * @function encode
         * @memberof spog.PresenceMsg
         * @static
         * @param {spog.PresenceMsg.$Properties} message PresenceMsg message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PresenceMsg.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.active != null && $Object.hasOwnProperty.call(message, "active") && message.active !== false)
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.active);
            if (message.fullId != null && $Object.hasOwnProperty.call(message, "fullId") && message.fullId !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.fullId);
            if (message.ts != null && $Object.hasOwnProperty.call(message, "ts") && !$Object.is(message.ts, 0))
                writer.uint32(/* id 3, wireType 1 =*/25).double(message.ts);
            if (message.originId != null && $Object.hasOwnProperty.call(message, "originId") && message.originId !== 0)
                writer.uint32(/* id 4, wireType 5 =*/37).fixed32(message.originId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PresenceMsg message, length delimited. Does not implicitly {@link spog.PresenceMsg.verify|verify} messages.
         * @function encodeDelimited
         * @memberof spog.PresenceMsg
         * @static
         * @param {spog.PresenceMsg.$Properties} message PresenceMsg message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PresenceMsg.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a PresenceMsg message from the specified reader or buffer.
         * @function decode
         * @memberof spog.PresenceMsg
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {spog.PresenceMsg & spog.PresenceMsg.$Shape} PresenceMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PresenceMsg.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.spog.PresenceMsg(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.active = value;
                        else
                            delete message.active;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.fullId = value;
                        else
                            delete message.fullId;
                        continue;
                    }
                case 3: {
                        if (wireType !== 1)
                            break;
                        if (!$Object.is(value = reader.double(), 0))
                            message.ts = value;
                        else
                            delete message.ts;
                        continue;
                    }
                case 4: {
                        if (wireType !== 5)
                            break;
                        if (value = reader.fixed32())
                            message.originId = value;
                        else
                            delete message.originId;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PresenceMsg message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof spog.PresenceMsg
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {spog.PresenceMsg & spog.PresenceMsg.$Shape} PresenceMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PresenceMsg.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PresenceMsg message.
         * @function verify
         * @memberof spog.PresenceMsg
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PresenceMsg.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.active != null && $Object.hasOwnProperty.call(message, "active"))
                if (typeof message.active !== "boolean")
                    return "active: boolean expected";
            if (message.fullId != null && $Object.hasOwnProperty.call(message, "fullId"))
                if (!$util.isString(message.fullId))
                    return "fullId: string expected";
            if (message.ts != null && $Object.hasOwnProperty.call(message, "ts"))
                if (typeof message.ts !== "number")
                    return "ts: number expected";
            if (message.originId != null && $Object.hasOwnProperty.call(message, "originId"))
                if (!$util.isInteger(message.originId))
                    return "originId: integer expected";
            return null;
        };

        /**
         * Creates a PresenceMsg message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof spog.PresenceMsg
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {spog.PresenceMsg} PresenceMsg
         */
        PresenceMsg.fromObject = function (object, _depth) {
            if (object instanceof $root.spog.PresenceMsg)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".spog.PresenceMsg: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.spog.PresenceMsg();
            if (object.active != null)
                if (object.active)
                    message.active = $Boolean(object.active);
            if (object.fullId != null)
                if (typeof object.fullId !== "string" || object.fullId.length)
                    message.fullId = $String(object.fullId);
            if (object.ts != null)
                if (!$Object.is($Number(object.ts), 0))
                    message.ts = $Number(object.ts);
            if (object.originId != null)
                if ($Number(object.originId) !== 0)
                    message.originId = object.originId >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a PresenceMsg message. Also converts values to other types if specified.
         * @function toObject
         * @memberof spog.PresenceMsg
         * @static
         * @param {spog.PresenceMsg} message PresenceMsg
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PresenceMsg.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.active = false;
                object.fullId = "";
                object.ts = 0;
                object.originId = 0;
            }
            if (message.active != null && $Object.hasOwnProperty.call(message, "active"))
                object.active = message.active;
            if (message.fullId != null && $Object.hasOwnProperty.call(message, "fullId"))
                object.fullId = message.fullId;
            if (message.ts != null && $Object.hasOwnProperty.call(message, "ts"))
                object.ts = options.json && !$isFinite(message.ts) ? $String(message.ts) : message.ts;
            if (message.originId != null && $Object.hasOwnProperty.call(message, "originId"))
                object.originId = message.originId;
            return object;
        };

        /**
         * Converts this PresenceMsg to JSON.
         * @function toJSON
         * @memberof spog.PresenceMsg
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PresenceMsg.prototype.toJSON = function() {
            return PresenceMsg.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PresenceMsg
         * @function getTypeUrl
         * @memberof spog.PresenceMsg
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PresenceMsg.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/spog.PresenceMsg";
        };

        return PresenceMsg;
    })();

    spog.RateMsg = (function() {

        /**
         * Properties of a RateMsg.
         * @typedef {Object} spog.RateMsg.$Properties
         * @property {number|null} [messagesPerMinute] RateMsg messagesPerMinute
         * @property {number|null} [ts] RateMsg ts
         * @property {string|null} [fullId] RateMsg fullId
         * @property {number|null} [originId] RateMsg originId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a RateMsg.
         * @memberof spog
         * @interface IRateMsg
         * @augments spog.RateMsg.$Properties
         * @deprecated Use spog.RateMsg.$Properties instead.
         */

        /**
         * Shape of a RateMsg.
         * @typedef {spog.RateMsg.$Properties} spog.RateMsg.$Shape
         */

        /**
         * Constructs a new RateMsg.
         * @memberof spog
         * @classdesc Represents a RateMsg.
         * @constructor
         * @param {spog.RateMsg.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const RateMsg = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * RateMsg messagesPerMinute.
         * @member {number} messagesPerMinute
         * @memberof spog.RateMsg
         * @instance
         */
        RateMsg.prototype.messagesPerMinute = 0;

        /**
         * RateMsg ts.
         * @member {number} ts
         * @memberof spog.RateMsg
         * @instance
         */
        RateMsg.prototype.ts = 0;

        /**
         * RateMsg fullId.
         * @member {string} fullId
         * @memberof spog.RateMsg
         * @instance
         */
        RateMsg.prototype.fullId = "";

        /**
         * RateMsg originId.
         * @member {number} originId
         * @memberof spog.RateMsg
         * @instance
         */
        RateMsg.prototype.originId = 0;

        /**
         * Creates a new RateMsg instance using the specified properties.
         * @function create
         * @memberof spog.RateMsg
         * @static
         * @param {spog.RateMsg.$Properties=} [properties] Properties to set
         * @returns {spog.RateMsg} RateMsg instance
         * @type {{
         *   (properties: spog.RateMsg.$Shape): spog.RateMsg & spog.RateMsg.$Shape;
         *   (properties?: spog.RateMsg.$Properties): spog.RateMsg;
         * }}
         */
        RateMsg.create = function(properties) {
            return new RateMsg(properties);
        };

        /**
         * Encodes the specified RateMsg message. Does not implicitly {@link spog.RateMsg.verify|verify} messages.
         * @function encode
         * @memberof spog.RateMsg
         * @static
         * @param {spog.RateMsg.$Properties} message RateMsg message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RateMsg.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.messagesPerMinute != null && $Object.hasOwnProperty.call(message, "messagesPerMinute") && message.messagesPerMinute !== 0)
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.messagesPerMinute);
            if (message.ts != null && $Object.hasOwnProperty.call(message, "ts") && !$Object.is(message.ts, 0))
                writer.uint32(/* id 2, wireType 1 =*/17).double(message.ts);
            if (message.fullId != null && $Object.hasOwnProperty.call(message, "fullId") && message.fullId !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.fullId);
            if (message.originId != null && $Object.hasOwnProperty.call(message, "originId") && message.originId !== 0)
                writer.uint32(/* id 4, wireType 5 =*/37).fixed32(message.originId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified RateMsg message, length delimited. Does not implicitly {@link spog.RateMsg.verify|verify} messages.
         * @function encodeDelimited
         * @memberof spog.RateMsg
         * @static
         * @param {spog.RateMsg.$Properties} message RateMsg message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RateMsg.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a RateMsg message from the specified reader or buffer.
         * @function decode
         * @memberof spog.RateMsg
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {spog.RateMsg & spog.RateMsg.$Shape} RateMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RateMsg.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.spog.RateMsg(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.int32())
                            message.messagesPerMinute = value;
                        else
                            delete message.messagesPerMinute;
                        continue;
                    }
                case 2: {
                        if (wireType !== 1)
                            break;
                        if (!$Object.is(value = reader.double(), 0))
                            message.ts = value;
                        else
                            delete message.ts;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.fullId = value;
                        else
                            delete message.fullId;
                        continue;
                    }
                case 4: {
                        if (wireType !== 5)
                            break;
                        if (value = reader.fixed32())
                            message.originId = value;
                        else
                            delete message.originId;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a RateMsg message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof spog.RateMsg
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {spog.RateMsg & spog.RateMsg.$Shape} RateMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RateMsg.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RateMsg message.
         * @function verify
         * @memberof spog.RateMsg
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RateMsg.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.messagesPerMinute != null && $Object.hasOwnProperty.call(message, "messagesPerMinute"))
                if (!$util.isInteger(message.messagesPerMinute))
                    return "messagesPerMinute: integer expected";
            if (message.ts != null && $Object.hasOwnProperty.call(message, "ts"))
                if (typeof message.ts !== "number")
                    return "ts: number expected";
            if (message.fullId != null && $Object.hasOwnProperty.call(message, "fullId"))
                if (!$util.isString(message.fullId))
                    return "fullId: string expected";
            if (message.originId != null && $Object.hasOwnProperty.call(message, "originId"))
                if (!$util.isInteger(message.originId))
                    return "originId: integer expected";
            return null;
        };

        /**
         * Creates a RateMsg message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof spog.RateMsg
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {spog.RateMsg} RateMsg
         */
        RateMsg.fromObject = function (object, _depth) {
            if (object instanceof $root.spog.RateMsg)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".spog.RateMsg: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.spog.RateMsg();
            if (object.messagesPerMinute != null)
                if ($Number(object.messagesPerMinute) !== 0)
                    message.messagesPerMinute = object.messagesPerMinute | 0;
            if (object.ts != null)
                if (!$Object.is($Number(object.ts), 0))
                    message.ts = $Number(object.ts);
            if (object.fullId != null)
                if (typeof object.fullId !== "string" || object.fullId.length)
                    message.fullId = $String(object.fullId);
            if (object.originId != null)
                if ($Number(object.originId) !== 0)
                    message.originId = object.originId >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a RateMsg message. Also converts values to other types if specified.
         * @function toObject
         * @memberof spog.RateMsg
         * @static
         * @param {spog.RateMsg} message RateMsg
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RateMsg.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.messagesPerMinute = 0;
                object.ts = 0;
                object.fullId = "";
                object.originId = 0;
            }
            if (message.messagesPerMinute != null && $Object.hasOwnProperty.call(message, "messagesPerMinute"))
                object.messagesPerMinute = message.messagesPerMinute;
            if (message.ts != null && $Object.hasOwnProperty.call(message, "ts"))
                object.ts = options.json && !$isFinite(message.ts) ? $String(message.ts) : message.ts;
            if (message.fullId != null && $Object.hasOwnProperty.call(message, "fullId"))
                object.fullId = message.fullId;
            if (message.originId != null && $Object.hasOwnProperty.call(message, "originId"))
                object.originId = message.originId;
            return object;
        };

        /**
         * Converts this RateMsg to JSON.
         * @function toJSON
         * @memberof spog.RateMsg
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RateMsg.prototype.toJSON = function() {
            return RateMsg.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for RateMsg
         * @function getTypeUrl
         * @memberof spog.RateMsg
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        RateMsg.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/spog.RateMsg";
        };

        return RateMsg;
    })();

    spog.PayloadWrapper = (function() {

        /**
         * Properties of a PayloadWrapper.
         * @typedef {Object} spog.PayloadWrapper.$Properties
         * @property {spog.ValueMsg.$Properties|null} [valueMsg] PayloadWrapper valueMsg
         * @property {spog.PresenceMsg.$Properties|null} [presenceMsg] PayloadWrapper presenceMsg
         * @property {spog.RateMsg.$Properties|null} [rateMsg] PayloadWrapper rateMsg
         * @property {string|null} [jsonFallback] PayloadWrapper jsonFallback
         * @property {"valueMsg"|"presenceMsg"|"rateMsg"|"jsonFallback"} [payload] PayloadWrapper payload
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PayloadWrapper.
         * @memberof spog
         * @interface IPayloadWrapper
         * @augments spog.PayloadWrapper.$Properties
         * @deprecated Use spog.PayloadWrapper.$Properties instead.
         */

        /**
         * Narrowed shape of a PayloadWrapper.
         * @typedef {{
         *   valueMsg?: spog.ValueMsg.$Shape|null;
         *   presenceMsg?: spog.PresenceMsg.$Shape|null;
         *   rateMsg?: spog.RateMsg.$Shape|null;
         *   jsonFallback?: string|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ payload?: undefined; valueMsg?: null; presenceMsg?: null; rateMsg?: null; jsonFallback?: null }|{ payload?: "valueMsg"; valueMsg: spog.ValueMsg.$Shape; presenceMsg?: null; rateMsg?: null; jsonFallback?: null }|{ payload?: "presenceMsg"; valueMsg?: null; presenceMsg: spog.PresenceMsg.$Shape; rateMsg?: null; jsonFallback?: null }|{ payload?: "rateMsg"; valueMsg?: null; presenceMsg?: null; rateMsg: spog.RateMsg.$Shape; jsonFallback?: null }|{ payload?: "jsonFallback"; valueMsg?: null; presenceMsg?: null; rateMsg?: null; jsonFallback: string })
         * )} spog.PayloadWrapper.$Shape
         */

        /**
         * Constructs a new PayloadWrapper.
         * @memberof spog
         * @classdesc Represents a PayloadWrapper.
         * @constructor
         * @param {spog.PayloadWrapper.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PayloadWrapper = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * PayloadWrapper valueMsg.
         * @member {spog.ValueMsg.$Properties|null|undefined} valueMsg
         * @memberof spog.PayloadWrapper
         * @instance
         */
        PayloadWrapper.prototype.valueMsg = null;

        /**
         * PayloadWrapper presenceMsg.
         * @member {spog.PresenceMsg.$Properties|null|undefined} presenceMsg
         * @memberof spog.PayloadWrapper
         * @instance
         */
        PayloadWrapper.prototype.presenceMsg = null;

        /**
         * PayloadWrapper rateMsg.
         * @member {spog.RateMsg.$Properties|null|undefined} rateMsg
         * @memberof spog.PayloadWrapper
         * @instance
         */
        PayloadWrapper.prototype.rateMsg = null;

        /**
         * PayloadWrapper jsonFallback.
         * @member {string|null|undefined} jsonFallback
         * @memberof spog.PayloadWrapper
         * @instance
         */
        PayloadWrapper.prototype.jsonFallback = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * PayloadWrapper payload.
         * @member {"valueMsg"|"presenceMsg"|"rateMsg"|"jsonFallback"|undefined} payload
         * @memberof spog.PayloadWrapper
         * @instance
         */
        $Object.defineProperty(PayloadWrapper.prototype, "payload", {
            get: $util.oneOfGetter($oneOfFields = ["valueMsg", "presenceMsg", "rateMsg", "jsonFallback"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new PayloadWrapper instance using the specified properties.
         * @function create
         * @memberof spog.PayloadWrapper
         * @static
         * @param {spog.PayloadWrapper.$Properties=} [properties] Properties to set
         * @returns {spog.PayloadWrapper} PayloadWrapper instance
         * @type {{
         *   (properties: spog.PayloadWrapper.$Shape): spog.PayloadWrapper & spog.PayloadWrapper.$Shape;
         *   (properties?: spog.PayloadWrapper.$Properties): spog.PayloadWrapper;
         * }}
         */
        PayloadWrapper.create = function(properties) {
            return new PayloadWrapper(properties);
        };

        /**
         * Encodes the specified PayloadWrapper message. Does not implicitly {@link spog.PayloadWrapper.verify|verify} messages.
         * @function encode
         * @memberof spog.PayloadWrapper
         * @static
         * @param {spog.PayloadWrapper.$Properties} message PayloadWrapper message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PayloadWrapper.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.valueMsg != null && $Object.hasOwnProperty.call(message, "valueMsg"))
                $root.spog.ValueMsg.encode(message.valueMsg, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.presenceMsg != null && $Object.hasOwnProperty.call(message, "presenceMsg"))
                $root.spog.PresenceMsg.encode(message.presenceMsg, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.rateMsg != null && $Object.hasOwnProperty.call(message, "rateMsg"))
                $root.spog.RateMsg.encode(message.rateMsg, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.jsonFallback != null && $Object.hasOwnProperty.call(message, "jsonFallback"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.jsonFallback);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PayloadWrapper message, length delimited. Does not implicitly {@link spog.PayloadWrapper.verify|verify} messages.
         * @function encodeDelimited
         * @memberof spog.PayloadWrapper
         * @static
         * @param {spog.PayloadWrapper.$Properties} message PayloadWrapper message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PayloadWrapper.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a PayloadWrapper message from the specified reader or buffer.
         * @function decode
         * @memberof spog.PayloadWrapper
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {spog.PayloadWrapper & spog.PayloadWrapper.$Shape} PayloadWrapper
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PayloadWrapper.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.spog.PayloadWrapper();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.valueMsg = $root.spog.ValueMsg.decode(reader, reader.uint32(), $undefined, _depth + 1, message.valueMsg);
                        message.payload = "valueMsg";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.presenceMsg = $root.spog.PresenceMsg.decode(reader, reader.uint32(), $undefined, _depth + 1, message.presenceMsg);
                        message.payload = "presenceMsg";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.rateMsg = $root.spog.RateMsg.decode(reader, reader.uint32(), $undefined, _depth + 1, message.rateMsg);
                        message.payload = "rateMsg";
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        message.jsonFallback = reader.stringVerify();
                        message.payload = "jsonFallback";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PayloadWrapper message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof spog.PayloadWrapper
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {spog.PayloadWrapper & spog.PayloadWrapper.$Shape} PayloadWrapper
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PayloadWrapper.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PayloadWrapper message.
         * @function verify
         * @memberof spog.PayloadWrapper
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PayloadWrapper.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.valueMsg != null && $Object.hasOwnProperty.call(message, "valueMsg")) {
                properties.payload = 1;
                {
                    let error = $root.spog.ValueMsg.verify(message.valueMsg, _depth + 1);
                    if (error)
                        return "valueMsg." + error;
                }
            }
            if (message.presenceMsg != null && $Object.hasOwnProperty.call(message, "presenceMsg")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.spog.PresenceMsg.verify(message.presenceMsg, _depth + 1);
                    if (error)
                        return "presenceMsg." + error;
                }
            }
            if (message.rateMsg != null && $Object.hasOwnProperty.call(message, "rateMsg")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.spog.RateMsg.verify(message.rateMsg, _depth + 1);
                    if (error)
                        return "rateMsg." + error;
                }
            }
            if (message.jsonFallback != null && $Object.hasOwnProperty.call(message, "jsonFallback")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                if (!$util.isString(message.jsonFallback))
                    return "jsonFallback: string expected";
            }
            return null;
        };

        /**
         * Creates a PayloadWrapper message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof spog.PayloadWrapper
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {spog.PayloadWrapper} PayloadWrapper
         */
        PayloadWrapper.fromObject = function (object, _depth) {
            if (object instanceof $root.spog.PayloadWrapper)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".spog.PayloadWrapper: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.spog.PayloadWrapper();
            if (object.valueMsg != null) {
                if (!$util.isObject(object.valueMsg))
                    throw $TypeError(".spog.PayloadWrapper.valueMsg: object expected");
                message.valueMsg = $root.spog.ValueMsg.fromObject(object.valueMsg, _depth + 1);
            }
            if (object.presenceMsg != null) {
                if (!$util.isObject(object.presenceMsg))
                    throw $TypeError(".spog.PayloadWrapper.presenceMsg: object expected");
                message.presenceMsg = $root.spog.PresenceMsg.fromObject(object.presenceMsg, _depth + 1);
            }
            if (object.rateMsg != null) {
                if (!$util.isObject(object.rateMsg))
                    throw $TypeError(".spog.PayloadWrapper.rateMsg: object expected");
                message.rateMsg = $root.spog.RateMsg.fromObject(object.rateMsg, _depth + 1);
            }
            if (object.jsonFallback != null)
                message.jsonFallback = $String(object.jsonFallback);
            return message;
        };

        /**
         * Creates a plain object from a PayloadWrapper message. Also converts values to other types if specified.
         * @function toObject
         * @memberof spog.PayloadWrapper
         * @static
         * @param {spog.PayloadWrapper} message PayloadWrapper
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PayloadWrapper.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.valueMsg != null && $Object.hasOwnProperty.call(message, "valueMsg")) {
                object.valueMsg = $root.spog.ValueMsg.toObject(message.valueMsg, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "valueMsg";
            }
            if (message.presenceMsg != null && $Object.hasOwnProperty.call(message, "presenceMsg")) {
                object.presenceMsg = $root.spog.PresenceMsg.toObject(message.presenceMsg, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "presenceMsg";
            }
            if (message.rateMsg != null && $Object.hasOwnProperty.call(message, "rateMsg")) {
                object.rateMsg = $root.spog.RateMsg.toObject(message.rateMsg, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "rateMsg";
            }
            if (message.jsonFallback != null && $Object.hasOwnProperty.call(message, "jsonFallback")) {
                object.jsonFallback = message.jsonFallback;
                if (options.oneofs)
                    object.payload = "jsonFallback";
            }
            return object;
        };

        /**
         * Converts this PayloadWrapper to JSON.
         * @function toJSON
         * @memberof spog.PayloadWrapper
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PayloadWrapper.prototype.toJSON = function() {
            return PayloadWrapper.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PayloadWrapper
         * @function getTypeUrl
         * @memberof spog.PayloadWrapper
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PayloadWrapper.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/spog.PayloadWrapper";
        };

        return PayloadWrapper;
    })();

    return spog;
})();

export {
  $root as default
};
