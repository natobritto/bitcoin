#ifndef BITCOIN_RPC_SCHEMA_H
#define BITCOIN_RPC_SCHEMA_H

#include <map>
#include <string>
#include <vector>

class CRPCCommand;
class UniValue;

class Schema;

<<<<<<< HEAD
UniValue APISchema(const std::map<std::string, std::vector<const CRPCCommand*>>& mapCommands);
=======
UniValue CommandSchemas(const std::map<std::string, std::vector<const CRPCCommand*>>& commands);
>>>>>>> 9d90e50d191330237688eea1a4bd93018b417da2

#endif // BITCOIN_RPC_SCHEMA_H
