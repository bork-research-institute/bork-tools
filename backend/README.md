# Elysia with Bun runtime

## Development
To start the development server run:
```bash
bun run dev
```

## Curl for getting silo data


## Curl for creating a vault

curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "12dea96f-ec20-0935-a6ab-75692c994959",
    "text": "create a vault for me",
    "agentId": "416659f6-a8ab-4d90-87b5-fd5635ebe37d",
    "walletAddress": "0xf672715f2bA85794659a7150e8C21F8d157bFe1D"
  }'


## Curl for depositing tokens

curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "12dea96f-ec20-0935-a6ab-75692c994959",
    "text": "Deposit 1 USDC in a silo vault",
    "agentId": "416659f6-a8ab-4d90-87b5-fd5635ebe37d",
    "walletAddress": "0xf672715f2bA85794659a7150e8C21F8d157bFe1D"
  }'


## Curl for checking vault

curl -X POST http://localhost:3000/vault/check -H "Content-Type: application/json" -d '{"walletAddress": "0xf672715f2bA85794659a7150e8C21F8d157bFe1D"}'


## Curl for creating vault

curl -X POST http://localhost:3000/vault/create -H "Content-Type: application/json" -d '{"walletAddress": "0x7e393441Edc1Bb1621318E000cDfC74947f23b26", "userId": "12dea96f-ec20-0935-a6ab-75692c994959"}'


## Curl for testing dexscreener

curl -X POST \
  'http://localhost:3000/tokens/prices' \
  -H 'Content-Type: application/json' \
  -d '{
    "chainId": "sonic",
    "tokenAddresses": ["0xE5DA20F15420aD15DE0fa650600aFc998bbE3955", "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38"]
  }'