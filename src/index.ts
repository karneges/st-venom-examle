import { Address } from "everscale-inpage-provider";

import { initContext } from "./provider";
import { TOKEN_ROOT_ABI, TOKEN_WALLET_ABI } from "./misc/abi";
import BigNumber from "bignumber.js";
import moment from "moment";
import { program } from "commander";
const { Command } = require("commander");

const stakeProgram = new Command();
stakeProgram
  .name("stake")
  .requiredOption("-a --vaultAddress <string>")
  .requiredOption("-s --signerPrivateKey <string>")
  .requiredOption("-n --amount <number>")
  .requiredOption("-j --jrpc <string>")

  .action(
    async ({
      jrpc,
      signerPrivateKey,
      vaultAddress,
      amount,
    }: {
      vaultAddress: string;
      signerPrivateKey: string;
      amount: string;
      jrpc: string;
    }) => {
      const { stVenomContract, everWalletAccount } = await initContext({ jrpc, vaultAddress, signerPrivateKey });
      const randomNonce = Math.floor(Math.random() * 10000);
      console.log(`Staking ${new BigNumber(amount).shiftedBy(-9)} venom`);
      const startTime = moment().unix();
      const transaction = await stVenomContract.methods.deposit({ _amount: amount, _nonce: randomNonce }).sendDelayed({
        from: everWalletAccount.address,
        amount: new BigNumber(amount)
          // add 1 ever to cover the fee
          .plus(new BigNumber(1).shiftedBy(9))
          .toString(),
      });
      console.log(`Waiting for confirmation...`);

      const event = await stVenomContract
        .waitForEvent({
          filter: async params => {
            return (
              params.event === "Deposit" &&
              params.data.user.equals(everWalletAccount.address) &&
              params.transaction.createdAt >= (await transaction.transaction.then(res => res.createdAt))
            );
          },
        })
        .then(res => {
          if (res?.event === "Deposit") {
            return res.data;
          }
        });
      console.log(`deposit result ${JSON.stringify(event, null, 4)}`);
    },
  );

const unStakeProgram = new Command();
unStakeProgram
  .name("withdraw")
  .requiredOption("-a --vaultAddress <string>")
  .requiredOption("-s --signerPrivateKey <string>")
  .requiredOption("-n --amount <number>")
  .requiredOption("-j --jrpc <string>")
  .requiredOption("-r --tokenRootAddress <string>")
  .action(
    async ({
      jrpc,
      signerPrivateKey,
      vaultAddress,
      amount,
      tokenRootAddress,
    }: {
      vaultAddress: string;
      signerPrivateKey: string;
      amount: string;
      jrpc: string;
      tokenRootAddress: string;
    }) => {
      const { stVenomContract, everWalletAccount, ever } = await initContext({ jrpc, vaultAddress, signerPrivateKey });
      // get user token wallet
      console.log(`Calculate user token wallet address`);
      const userStVenomWallet = await new ever.Contract(TOKEN_ROOT_ABI, new Address(tokenRootAddress)).methods
        .walletOf({
          walletOwner: everWalletAccount.address,
          answerId: 0,
        })
        .call()
        .then(res => new ever.Contract(TOKEN_WALLET_ABI, res.value0));
      // prepare token transfer payload
      console.log(`Preparing token transfer payload`);
      const { depositPayload: tokenTransferPayload } = await stVenomContract.methods
        .encodeDepositPayload({
          // it should be random number
          _nonce: Math.floor(Math.random() * 10000),
        })
        .call();

      console.log(`Sending tokens to the vault`);
      // transfer tokens to the vault
      const withdrawTransaction = await userStVenomWallet.methods
        .transfer({
          amount,
          notify: true,
          payload: tokenTransferPayload,
          recipient: stVenomContract.address,
          deployWalletValue: 0,
          remainingGasTo: everWalletAccount.address,
        })
        .sendDelayed({
          from: everWalletAccount.address,
          amount: new BigNumber(3).shiftedBy(9).toString(),
        });

      console.log(`Waiting for confirmation...`);
      await stVenomContract
        .waitForEvent({
          filter: async params => {
            console.log(`new event ${JSON.stringify(params.event, null, 4)}`);
            return (
              (params.event === "WithdrawRequest" || params.event === "BadWithdrawRequest") &&
              params.data.user.equals(everWalletAccount.address) &&
              params.transaction.createdAt >= (await withdrawTransaction.transaction.then(res => res.createdAt))
            );
          },
        })
        .then(res => {
          if (res?.event === "WithdrawRequest") {
            console.log(`withdraw request created ${JSON.stringify(res.data, null, 4)}`);
          }
          if (res?.event === "BadWithdrawRequest") {
            throw new Error(`Withdraw request failed: ${JSON.stringify(res.data, null, 4)}`);
          }
        });
    },
  );

program.addCommand(stakeProgram);
program.addCommand(unStakeProgram);
program.parse(process.argv);
