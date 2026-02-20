build_dir := "build-ninja"
data_dir := "regtest-data"
rpc_port := "19443"
p2p_port := "19444"
rpc_user := "openrpc"
rpc_pass := "openrpc"

cli := "./src/bitcoin-cli"
daemon := "./src/bitcoind"
cli_args := "-datadir=" + data_dir + " -regtest -rpcport=" + rpc_port + " -rpcuser=" + rpc_user + " -rpcpassword=" + rpc_pass

setup:
  sudo apt update
  sudo apt install -y build-essential ccache pkg-config cmake ninja-build
  just build

configure:
  ./configure

build: configure
  make -j "$(nproc)"

getopenrpc: build
  mkdir -p "{{data_dir}}"

  # stop regtest if running
  {{cli}} {{cli_args}} stop 2>/dev/null || true
  sleep 1

  # start daemon
  {{daemon}} -datadir="{{data_dir}}" -regtest -port={{p2p_port}} -rpcport={{rpc_port}} -rpcuser={{rpc_user}} -rpcpassword={{rpc_pass}} -daemon
  sleep 2

  # wait for RPC ready
  {{cli}} {{cli_args}} -rpcwait getblockchaininfo >/dev/null
  sleep 0.5

  # fetch the OpenRPC spec
  {{cli}} {{cli_args}} getopenrpc > openrpc_v28.json
  echo "Wrote OpenRPC spec to openrpc_v28.json"

  # stop the daemon
  {{cli}} {{cli_args}} stop 2>/dev/null || true
