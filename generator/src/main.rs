use bitcoin_cli_rpc::types;
use std::collections::BTreeMap;

fn main() {
    let script_pubkey = types::GetBlockVariant3TxItemInputsItemPrevoutScriptPubkey {
        asm: "".to_string(),
        descriptor: "".to_string(),
        hex: "".to_string(),
        address: None,
        type_: "".to_string(),
    };

    let prevout = types::GetBlockVariant3TxItemInputsItemPrevout {
        generated: false,
        height: 0.0,
        value: 0.0,
        script_pubkey,
    };

    let input_item = types::GetBlockVariant3TxItemInputsItem {
        prevout,
        extra: BTreeMap::new(),
    };

    let tx_item = types::GetBlockVariant3TxItem { inputs: vec![input_item] };

    let variant3 = types::GetBlockVariant3 {
        tx: vec![tx_item],
        extra: BTreeMap::new(),
    };

    let block = types::GetBlock::Variant3(variant3);

    println!("{block:?}");
}
