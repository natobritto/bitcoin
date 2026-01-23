#include <rpc/schema.h>

#include <rpc/server.h>
#include <rpc/util.h>
#include <univalue.h>
#include <util/string.h>

using util::SplitString;

<<<<<<< HEAD
class Schema {
public:
    static UniValue Command(const std::string& category, const RPCHelpMan& command) {
        UniValue value{UniValue::VOBJ};

        value.pushKV("name", command.m_name);
        value.pushKV("category", category);
        value.pushKV("description", command.m_description);

        auto examples = Schema::Examples(command.m_examples);

        if (examples) {
            value.pushKV("examples", examples.value());
        }

        UniValue arguments{UniValue::VOBJ};

        arguments.pushKV("$schema", "https://json-schema.org/draft/2020-12/schema");
        arguments.pushKV("$id", std::format("https://bitcoincore.org/{}-arguments.json", command.m_name));
        arguments.pushKV("type", "object");

        if (!command.m_args.empty()) {
            UniValue required{UniValue::VARR};

            UniValue properties{UniValue::VOBJ};
            for (const auto& argument : command.m_args) {
                assert(!argument.m_names.empty());

                bool argument_required = std::holds_alternative<RPCArg::Optional>(argument.m_fallback)
                    && std::get<RPCArg::Optional>(argument.m_fallback) == RPCArg::Optional::NO;

                for (auto const& name: SplitString(argument.m_names, '|')) {
                    assert(!properties.exists(name));
                    properties.pushKV(name, Schema::Argument(argument));
                    if (argument_required) {
                        required.push_back(name);
                    }
                }
            }
            arguments.pushKV("properties", properties);

            if (!required.empty()) {
                arguments.pushKV("required", required);
            }

            arguments.pushKV("additionalProperties", false);
        }

        value.pushKV("arguments", arguments);
=======
// Notes
// =====
//
// This file implements the `schema` RPC. See `Schema::Commands` for the entry
// point. This RPC is intended to facilite writing code generators which can
// generate Bitcoin Core RPC clients in other languages. It is as
// self-contained as possible in this file, to facilitate back-porting to older
// versions and rebasing onto newer versions.
//
// We should probably use something like Open RPC, but the Bitcoin Core RPC API
// is weird enough that this may be difficult.
//
// The returned JSON includes all avaialable information about the RPC, whether
// useful to external callers or not. There is certainly more detail than
// necessary, and some of it should probably be elided.
//
// The top level type is a map of strings to `vector<CRPCCommand>`. This is
// because commands can have aliases, at least according to the types. However,
// I haven't actually seen one, so we just assert that there are no aliases so
// we don't have to worry about it.

class Schema {
public:
    static UniValue Commands(const std::map<std::string, std::vector<const CRPCCommand*>>& commands) {
        UniValue value{UniValue::VOBJ};

        UniValue rpcs{UniValue::VOBJ};

        for (const auto& entry: commands) {
            assert(entry.second.size() == 1);

            const auto& command = entry.second[0];

            RPCHelpMan rpc = ((RpcMethodFnType)command->unique_id)();

            rpcs.pushKV(entry.first, Schema::Command(command->category, rpc, command->argNames));
        }

        value.pushKV("rpcs", rpcs);
>>>>>>> 9d90e50d191330237688eea1a4bd93018b417da2

        return value;
    }

<<<<<<< HEAD
    static UniValue Argument(const RPCArg& argument) {
        UniValue value{UniValue::VOBJ};

        if (!argument.m_description.empty()) {
            value.pushKV("description", argument.m_description);
        }

        value.pushKV("type", Schema::ArgumentType(argument.m_type));

        if (argument.m_type == RPCArg::Type::STR_HEX) {
            value.pushKV("pattern", "^([0-9][a-f]{2})+$");
        }

        if (argument.m_type == RPCArg::Type::OBJ_NAMED_PARAMS) {
            value.pushKV("format", "named");
        }

        if (!argument.m_inner.empty()) {
            assert(
                argument.m_type == RPCArg::Type::ARR
                || argument.m_type == RPCArg::Type::OBJ
                || argument.m_type == RPCArg::Type::OBJ_NAMED_PARAMS
                || argument.m_type == RPCArg::Type::OBJ_USER_KEYS
            );

            if (argument.m_type == RPCArg::Type::ARR) {
                UniValue items{UniValue::VARR};
                for (const auto& inner : argument.m_inner) {
                    items.push_back(Argument(inner));
                }
                assert(!argument.m_inner.empty());
                value.pushKV("items", items);
            } else if (argument.m_type == RPCArg::Type::OBJ_USER_KEYS) {
                assert(argument.m_inner.size() == 1);
                value.pushKV("additionalProperties", Schema::Argument(argument.m_inner[0]));
            } else {
                UniValue properties{UniValue::VOBJ};
                UniValue required{UniValue::VARR};
                for (const auto& inner : argument.m_inner) {
                    assert(!inner.m_names.empty());
                    bool argument_required = std::holds_alternative<RPCArg::Optional>(inner.m_fallback)
                        && std::get<RPCArg::Optional>(inner.m_fallback) == RPCArg::Optional::NO;
                    for (auto const& name: SplitString(inner.m_names, '|')) {
                        assert(!properties.exists(name));
                        properties.pushKV(name, Argument(inner));
                        if (argument_required) {
                            required.push_back(name);
                        }
                    }
                }
                value.pushKV("properties", properties);
                value.pushKV("additionalProperties", false);
                if (!required.empty()) {
                    value.pushKV("required", required);
                }
            }
=======
private:
    static UniValue Argument(const RPCArg& argument) {
        UniValue value{UniValue::VOBJ};

        UniValue names{UniValue::VARR};
        for (auto const& name: SplitString(argument.m_names, '|')) {
            names.push_back(name);
        }
        value.pushKV("names", names);

        value.pushKV("description", argument.m_description);

        value.pushKV("oneline_description", argument.m_opts.oneline_description);

        value.pushKV("also_positional", argument.m_opts.also_positional);

        UniValue type_str{UniValue::VARR};
        for (auto const& str: argument.m_opts.type_str) {
            type_str.push_back(str);
        }
        value.pushKV("type_str", type_str);

        bool required = std::holds_alternative<RPCArg::Optional>(argument.m_fallback)
            && std::get<RPCArg::Optional>(argument.m_fallback) == RPCArg::Optional::NO;

        value.pushKV("required", required);

        if (std::holds_alternative<UniValue>(argument.m_fallback)) {
            value.pushKV("default", std::get<UniValue>(argument.m_fallback));
        }

        if (std::holds_alternative<std::string>(argument.m_fallback)) {
            value.pushKV("default_hint", std::get<std::string>(argument.m_fallback));
        }

        value.pushKV("hidden", argument.m_opts.hidden);

        value.pushKV("type", Schema::ArgumentType(argument.m_type));

        UniValue inner{UniValue::VARR};
        for (auto const& argument: argument.m_inner) {
            inner.push_back(Schema::Argument(argument));
        }
        if (!inner.empty()) {
            value.pushKV("inner", inner);
>>>>>>> 9d90e50d191330237688eea1a4bd93018b417da2
        }

        return value;
    }

    static UniValue ArgumentType(const RPCArg::Type& type) {
        UniValue value{UniValue::VARR};

        switch (type) {
            case RPCArg::Type::AMOUNT:
                value.push_back("number");
                value.push_back("string");
                return value;
            case RPCArg::Type::ARR:
                return "array";
            case RPCArg::Type::BOOL:
                return "boolean";
            case RPCArg::Type::NUM:
                return "number";
            case RPCArg::Type::OBJ:
                return "object";
            case RPCArg::Type::OBJ_NAMED_PARAMS:
                return "object";
            case RPCArg::Type::OBJ_USER_KEYS:
                return "object";
            case RPCArg::Type::RANGE:
<<<<<<< HEAD
                value.push_back("number");
                value.push_back("array");
                return value;
            case RPCArg::Type::STR:
                return "string";
            case RPCArg::Type::STR_HEX:
                return "string";
=======
                return "range";
            case RPCArg::Type::STR:
                return "string";
            case RPCArg::Type::STR_HEX:
                return "hex";
>>>>>>> 9d90e50d191330237688eea1a4bd93018b417da2
            default:
                NONFATAL_UNREACHABLE();
        }
    }

<<<<<<< HEAD
private:
    static std::optional<UniValue> Examples(const RPCExamples& examples) {
        if (examples.m_examples.empty()) {
            return {};
        } else {
            return {examples.m_examples};
=======
    static UniValue Command(
        const std::string& category,
        const RPCHelpMan& command,
        const std::vector<std::pair<std::string, bool>>& argNames
    ) {
        UniValue value{UniValue::VOBJ};

        value.pushKV("category", category);
        value.pushKV("description", command.m_description);
        value.pushKV("examples", command.m_examples.m_examples);
        value.pushKV("name", command.m_name);

        UniValue argument_names{UniValue::VARR};
        for (const auto& pair : argNames) {
            UniValue argument_name{UniValue::VARR};
            argument_names.push_back(pair.first);
        }
        value.pushKV("argument_names", argument_names);

        UniValue arguments{UniValue::VARR};
        for (const auto& argument : command.m_args) {
            arguments.push_back(Schema::Argument(argument));
        }
        value.pushKV("arguments", arguments);

        UniValue results{UniValue::VARR};
        for (const auto& result : command.m_results.m_results) {
            results.push_back(Schema::Result(result));
        }
        value.pushKV("results", results);

        return value;
    }

    static UniValue Result(const RPCResult& result) {
        UniValue value{UniValue::VOBJ};
        value.pushKV("type", Schema::ResultType(result.m_type));
        value.pushKV("optional", result.m_optional);
        value.pushKV("description", result.m_description);
        value.pushKV("skip_type_check", result.m_skip_type_check);
        value.pushKV("key_name", result.m_key_name);
        value.pushKV("condition", result.m_cond);

        UniValue inner{UniValue::VARR};
        for (auto const& result: result.m_inner) {
            inner.push_back(Schema::Result(result));
        }
        if (!inner.empty()) {
            value.pushKV("inner", inner);
        }

        return value;
    }

    static std::string ResultType(const RPCResult::Type& type) {
        switch (type) {
            case RPCResult::Type::OBJ:
                return "object";
            case RPCResult::Type::ARR:
                return "array";
            case RPCResult::Type::STR:
                return "string";
            case RPCResult::Type::NUM:
                return "number";
            case RPCResult::Type::BOOL:
                return "boolean";
            case RPCResult::Type::NONE:
                return "none";
            case RPCResult::Type::ANY:
                return "any";
            case RPCResult::Type::STR_AMOUNT:
                return "amount";
            case RPCResult::Type::STR_HEX:
                return "hex";
            case RPCResult::Type::OBJ_DYN:
                return "object";
            case RPCResult::Type::ARR_FIXED:
                return "object";
            case RPCResult::Type::NUM_TIME:
                return "timestamp";
            case RPCResult::Type::ELISION:
                return "elision";
            default:
                NONFATAL_UNREACHABLE();
>>>>>>> 9d90e50d191330237688eea1a4bd93018b417da2
        }
    }
};

<<<<<<< HEAD
UniValue APISchema(const std::map<std::string, std::vector<const CRPCCommand*>>& mapCommands) {
    UniValue value{UniValue::VOBJ};

    UniValue commands{UniValue::VOBJ};

    for (const auto& entry: mapCommands) {
        assert(entry.second.size() == 1);

        UniValue aliases{UniValue::VARR};

        for (const auto& command: entry.second) {
            RPCHelpMan man = ((RpcMethodFnType)command->unique_id)();
            aliases.push_back(Schema::Command(command->category, man));
        }

        commands.pushKV(entry.first, aliases);
    }

    value.pushKV("commands", commands);

    return value;
=======
UniValue CommandSchemas(const std::map<std::string, std::vector<const CRPCCommand*>>& commands) {
    return Schema::Commands(commands);
>>>>>>> 9d90e50d191330237688eea1a4bd93018b417da2
}
