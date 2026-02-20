build_dir := "build-ninja"
rpc_port := "19443"
p2p_port := "19444"
rpc_user := "openrpc"
rpc_pass := "openrpc"

cli := "./src/bitcoin-cli"
daemon := "./src/bitcoind"

setup:
  sudo apt update
  sudo apt install -y build-essential ccache pkg-config cmake ninja-build
  just build

configure:
  [ -f config.status ] || ./configure

build: configure
  make -j "$(nproc)"

getopenrpc:
  # stop regtest if running
  {{cli}} -regtest stop || true
  sleep 1

  # start daemon
  {{daemon}} -regtest -daemon
  sleep 2

  # wait for RPC ready
  {{cli}} -regtest getblockchaininfo
  sleep 0.5

  # fetch the OpenRPC spec
  {{cli}} -regtest getopenrpc > openrpc_v28.json
  echo "Wrote OpenRPC spec to openrpc_v28.json"

