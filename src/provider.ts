import {
  EverscaleStandaloneClient,
  EverWalletAccount,
  SimpleAccountsStorage,
  SimpleKeystore,
} from "everscale-standalone-client/nodejs";
import { getPublicKey } from "everscale-crypto";

import { Address, ProviderRpcClient } from "everscale-inpage-provider";
import { ST_EVER_VAULT_ABI } from "./misc/abi";

export const getProvider = (jrpc: string) => {
  const keystore = new SimpleKeystore();

  const accountsStorage = new SimpleAccountsStorage();
  const ever = new ProviderRpcClient({
    forceUseFallback: true,
    fallback: () =>
      EverscaleStandaloneClient.create({
        connection:
          jrpc === "mainnet"
            ? "mainnetJrpc"
            : {
                type: "jrpc",
                data: {
                  endpoint: jrpc,
                },
                id: 0,
              },
        keystore,
        accountsStorage,
      }),
  });

  return {
    ever,
    keystore,
    accountsStorage,
  };
};

export const initContext = async ({
  jrpc,
  vaultAddress,
  signerPrivateKey,
}: {
  jrpc: string;
  vaultAddress: string;
  signerPrivateKey: string;
}) => {
  const { accountsStorage, keystore, ever } = getProvider(jrpc);
  const stVenomContract = new ever.Contract(ST_EVER_VAULT_ABI, new Address(vaultAddress));
  const publicKey = getPublicKey(signerPrivateKey);
  keystore.addKeyPair({ secretKey: signerPrivateKey, publicKey });
  const everWalletAccount = await EverWalletAccount.fromPubkey({
    publicKey,
  });
  accountsStorage.addAccount(everWalletAccount);
  return {
    stVenomContract,
    everWalletAccount,
    ever,
  };
};
