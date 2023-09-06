# StVenom example

## Stake
- -a StVenomVault address
- -s Signer private key
- -n Amount of tokens to stake (nVENOM), 1 VENOM = 1000000000 nVENOM
- -j JSON RPC endpoint
```bash
ts-node src/index.ts stake \
-a 0:9420f5e57f4b588b3d3dd8f1b7e6a16a7debf55bcccd467e26927a1d0e8c120e \n
-s {{secret key}} \
-n 150 \ 
-j "https://jrpc-testnet.venom.foundation/rpc",
```
## Unstake
- -a StVenomVault address
- -s Signer private key
- -n Amount of tokens to stake (nSTVENOM), 1 VENOM = 1000000000 nSTVENOM
- -j JSON RPC endpoint
- -r StVenom token root address
```bash
ts-node src/index.ts withdraw \
-a 0:9420f5e57f4b588b3d3dd8f1b7e6a16a7debf55bcccd467e26927a1d0e8c120e \
-s {{secret key}} \
-n 150 \
-j "https://jrpc-testnet.venom.foundation/rpc" \
-r 0:30c8d42e9c84d214eec662621b0614e8b6798b33a4b93ce7a2d0662f532ee01d
```
