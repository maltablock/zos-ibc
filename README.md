# ZOS EOS <> WAX IBC

Contracts and server app to handle the ZOS token and its inter-blockchain-communication.

---

## Background

ZOS has a max supply of 10,000,000,000 ZOS and is managed by the token account [zosdiscounts](https://bloks.io/account/zosdiscounts). It is traded on [Bancor](https://www.bancor.network/token/ZOS).

Payments for AirdropsDAC services are sent in ZOS to one of AirdropsDAC's accounts, from where they will be forwarded to [zosburnaczos](https://bloks.io/account/zosburnaczos).
The ZOS tokens in `zosburnaczos` are regularly burned and the same amount of new ZOS tokens are released into circulating supply.

The new tokens, which are released into circulation upon each burn, are held by [zoscorporate](https://bloks.io/account/zoscorporate) and sent to the ZOS Bancor relay to make them purchasable. (Eventually leading to a circulating supply of 5,000,000,000 ZOS tokens when all tokens in `zoscorporate` are released.)



## Bringing ZOS onto the WAX network

The ZOS token should become a multi-chain token existing on the EOS and WAX network. This brings the following challenges that need to be solved:

1. Tokens should move freely between the two chains.
2. The circulating supply of ZOS and the rules mentioned in the white paper should now take both chains into account.
3. Services of AirdropsDAC should be directly payable by users on both chains without requiring the user to create a corresponding account on the other chain.

### Solution

A high-level overview of the suggested solution of bringing multi-chain tokens to the WAX network involves the following steps:

1. Create and deploy the ZOS contract onto the WAX network with the same token parameters (max supply) and no initial circulating supply.
2. Create a converter contract on all supported chains that is used to move tokens from the current chain to another chain.
3. Create a "burn" account on all supported chains where ZOS tokens that were used to pay for AirdropsDAC services are sent to. Upon burning these tokens, the same amount of new tokens are released into circulation (and purchasable on Bancor) on EOS mainnet by the `zoscorporate` account.
4. The new tokens from step 3 should also be purchasable by users of any other chain the token supports. When the Bancor network goes live on WAX this will be possible through the Bancor wallet which provides every user with an EOS and WAX account.

Once all accounts have been set up, users can use the converter contract on one chain to send tokens to accounts on the other chain.
To achieve IBC between EOS and WAX we do the following. (Achieving IBC between WAX and EOS is done the same way.)

1. We run a "watcher" script that uses [dfuse.io](https://dfuse.io) to scan the EOS blockchain for [ZOS transfers to the converter account](https://bloks.io/transaction/275710b7419909a9cb658943ab11db2afbf47abc03e45ee8bfa8d14657273ac4).
2. The watcher script extracts the target account on the WAX blockchain from the memo of the transfer. It [**reports** the _EOS_ transaction](https://wax.bloks.io/transaction/4dafd202c005ba782762461cf384e9bbfeeeff5dc83b92233e52c931cf4c3298?tab=traces) to the converter account on _WAX_.
3. Once a cross-chain transfer has been reported, the WAX converter issues the [tokens to the target account](https://wax.bloks.io/transaction/4dafd202c005ba782762461cf384e9bbfeeeff5dc83b92233e52c931cf4c3298?tab=traces).
4. After observing a successful inter-chain transfer, the watcher script initiates [a token burn](https://bloks.io/transaction/632c0d2815bc11f450d5cab5c1d2684108835ccd69961d2eade034e2a6afed3c) of the user's assets on EOS. If the transfer failed, for example, because the target account does not exist, the funds are refunded to the user. This is done to ensure the circulating supply stats are correct across all chains.

At the moment, we run a single reporter that coordinates the blockchain communication.
We plan to make this process more decentralized by having several independent parties act as reporters.
This would mean a cross-chain transfer is only marked as confirmed in step 3) if the number of independent reports reaches a certain threshold.

## Accounts

EOS Token: [zosdiscounts](https://bloks.io/account/zosdiscounts)
EOS Converter: [zoseosconvrt](https://bloks.io/account/zoseosconvrt#keys)
EOS Reporter: [zoscpustaker](https://bloks.io/account/zoscpustaker#keys)

WAX Token: [zoswaxtokens](https://wax.bloks.io/account/zoswaxtokens#keys)
WAX Converter: [zoswaxconvrt](https://wax.bloks.io/account/zoswaxconvrt#keys)
WAX Reporter: [zoswaxreport](https://wax.bloks.io/account/zoswaxreport#keys)

# License

ZOS IBC is [MIT licensed](./LICENSE).
