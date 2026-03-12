
# outfile variables will be set inside compare() using the provided method name


get_transaction_sample() {
    addr=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 getnewaddress)
    txid=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 sendtoaddress "$addr" 1)
    ./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 generatetoaddress 1 "$addr" >/dev/null
    ./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 gettransaction "$txid"
    bitcoin-cli -regtest -rpcwallet=w1 gettransaction "$txid"
    echo txid: $txid
}

get_raw_transaction_sample() {
    addr=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 getnewaddress)
    txid=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 sendtoaddress "$addr" 1)
    ./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 generatetoaddress 1 "$addr" >/dev/null
    # obtain blockhash from the wallet transaction so getrawtransaction can query the blockchain
    blockhash=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 gettransaction "$txid" | sed -n 's/.*"blockhash"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    if [ -n "$blockhash" ]; then
        ./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 getrawtransaction "$txid" 1 "$blockhash"
        bitcoin-cli -regtest -rpcwallet=w1 getrawtransaction "$txid" 1 "$blockhash"
    else
        ./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 getrawtransaction "$txid" 1 || true
        bitcoin-cli -regtest -rpcwallet=w1 getrawtransaction "$txid" 1 || true
    fi
    echo blockhash: $blockhash
    echo txid: $txid
}

decoderawtransaction_sample() {
    addr=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 getnewaddress)
    txid=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 sendtoaddress "$addr" 1)
    ./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 generatetoaddress 1 "$addr" >/dev/null
    rawhex=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 getrawtransaction "$txid" 0 || true)
    if [ -n "$rawhex" ]; then
        ./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 decoderawtransaction "$rawhex"
        bitcoin-cli -regtest -rpcwallet=w1 decoderawtransaction "$rawhex"
    else
        echo "failed to obtain raw transaction hex for txid: $txid"
    fi
    echo txid: $txid
}

get_block() {
    block=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 getblockcount)
    blockhash=$(./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 getblockhash "$block")
    echo "./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 getblock \"$blockhash\""
    bitcoin-cli -regtest -rpcwallet=w1 getblock "$blockhash" 0 > getblock_verbosity_0.json
    bitcoin-cli -regtest -rpcwallet=w1 getblock "$blockhash" 1 > getblock_verbosity_1.json
    bitcoin-cli -regtest -rpcwallet=w1 getblock "$blockhash" 2 > getblock_verbosity_2.json
    bitcoin-cli -regtest -rpcwallet=w1 getblock "$blockhash" 3 > getblock_verbosity_3.json
    # bitcoin-cli -regtest -rpcwallet=w1 getblock "$blockhash"
    echo blockhash: $blockhash
}


compare() {
    method="$1"
    shift
    outfile_local="local_cli_${method}.json"
    outfile_system="system_cli_${method}.json"

    ./build-ninja/bin/bitcoin-cli -regtest -rpcwallet=w1 "$method" "$@" &> "$outfile_local"
    bitcoin-cli -regtest -rpcwallet=w1 "$method" "$@" &> "$outfile_system"
    echo "Comparing outputs..." "$outfile_local" "$outfile_system"
    echo "============================="
    diff "$outfile_local" "$outfile_system"
}

get_block

output=$(get_block)
# txid=$(echo "$output" | sed -n 's/.*txid: \([^[:space:]]*\).*/\1/p')
blockhash=$(echo "$output" | sed -n 's/.*blockhash: \([^[:space:]]*\).*/\1/p')
compare "getblock" "$blockhash"
# echo "Testing with txid: $txid"
# if [ -n "$blockhash" ]; then
#     compare "getrawtransaction"
#     #  "$txid" 2 "$blockhash"
# else
#     compare "getrawtransaction"
#     #  "$txid" 2
# fi
