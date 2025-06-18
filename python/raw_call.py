import os
import json
import asyncio
import datetime
from utils.broadcast import broadcast_tx
from utils.sign_payload import sign
from dotenv import load_dotenv

load_dotenv()

async def call_contract(evm_chain: str, vault_id: str, target_contract: str, custom_note: str, data: str, value: str):
    request_json = {
        "signer_type": "api_signer",
        "vault_id": vault_id,
        "note": custom_note,
        "type": "evm_transaction",
        "sign_mode": "triggered",
        "details": {
            "chain": f"evm_{evm_chain}_mainnet",
            "skip_prediction": True,
            "fail_on_prediction_failure": False,
            "push_mode": "auto",
            "data": {
                "type": "hex",
                "hex_data": data
            },
            "type": "evm_raw_transaction",
            "gas": {
                "gas_limit": "100000",
                "type": "custom",
                "details": {
                    "type": "dynamic",
                    "max_priority_fee_per_gas": "2000000000", # 2 GWEI
                    "max_fee_per_gas": "3000000000" # 3 GWEI
                }
            },
            "to": target_contract,
            "value": value
        }
    }
    
    return request_json

## Fordefi configuration
USER_API_TOKEN = os.getenv("FORDEFI_API_TOKEN")
EVM_VAULT_ID = os.getenv("EVM_VAULT_ID")
evm_chain = "ethereum"
path = "/api/v1/transactions"
contract_address = "0x4e7d2186eb8b75fbdca867761636637e05baef1e" # CHANGE to your target contract address
custom_note = "Raw Call!" # Optional note
raw_call_data = "0x0efe6a8b000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000186a00000000000000000000000000000000000000000000000000000000000000000"
value = "0" # The value of native currency to send this transaction with (in wei)

async def main():
    try:
        ## Building transaction
        request_json = await call_contract(evm_chain=evm_chain, vault_id=EVM_VAULT_ID, target_contract=contract_address, custom_note=custom_note, data=raw_call_data, value=value)
        request_body = json.dumps(request_json)
        timestamp = datetime.datetime.now().strftime("%s")
        payload = f"{path}|{timestamp}|{request_body}"
        ## Signing transaction with API Signer
        signature = await sign(payload=payload)
        ## Broadcasting tx
        fordefi_response  = await broadcast_tx(path, USER_API_TOKEN, signature, timestamp, request_body)
        print("✅ Transaction submitted successfully!")
        print(fordefi_response.json()["id"])
    except Exception as e:
        print(f"❌ Transaction failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())