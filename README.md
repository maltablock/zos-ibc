# ZOS EOS <> WAX IBC

Contracts and server app to handle the ZOS token and its inter-blockchain-communication.

---

## Background

ZOS has a max supply of 10,000,000,000 ZOS and is manged by the token account [zosdiscounts](https://bloks.io/account/zosdiscounts). It is traded on [Bancor](https://www.bancor.network/token/ZOS).

Payments for AirdropsDAC services are sent in ZOS to one of AirdropsDAC's accounts, from where they will be forwarded to [zosburnaczos](https://bloks.io/account/zosburnaczos).
The ZOS tokens in `zosburnaczos` are regularly burned and the same amount of new ZOS tokens are released into circulating supply.

The new tokens, which are released into circulation upon each burn, are held by [zoscorporate](https://bloks.io/account/zoscorporate) and sent to the ZOS Bancor relay to make them purchasable. (Eventually leading to a circulating supply of 5,000,000,000 ZOS tokens when all tokens in `zoscorporate` are released.)



## Proposal - Bringing ZOS onto the WAX network

The ZOS token should become a multi-chain token existing on the EOS and WAX network. This brings the following challenges that need to be solved:

1. Tokens should move freely between the two chains.
2. The circulating supply of ZOS and the rules mentioned in the white paper should now take both chains into account.
3. Services of AirdropsDAC should be directly payable by users on both chains without requiring the user to create a corresponding account on the other chain.

### Solution

To achieve interblockchain communication (IBC) in a _trustless and decentralized_ way we plan on using the [LiquidApps Network](https://liquidapps.io) which comes with a wide range of Digital Service Providers (DSPs) to choose from.
DSPs provide solutions for many blockchain problems that dapps repeatedly encounter, including oracles, IBC, vRAM, and storage.
Of particular interest for this proposal is the [LiquidLink](https://liquidapps.io/liquid-link) service which provides interblockchain communication.

A high-level overview of the suggested solution of bringing multi-chain tokens to the WAX network involves the following steps:

1. Create and deploy the ZOS contract onto the WAX network with the same token parameters (max supply) and no initial circulating supply.
2. Create a converter contract on all supported chains that is used to move tokens from the current chain to another chain.
3. For ZOS: Create a burn account on all supported chains where ZOS tokens that were used to pay for AirdropsDAC services are sent to. Upon burning these tokens, the same amount of new tokens are released into circulation (and purchasable on Bancor) on EOS mainnet by the `zoscorporate` account.
4. The new tokens from step 3 should also be purchasable by users of any other chain the token supports. When the Bancor network goes live on WAX this will be possible through the Bancor wallet which provides every user with an EOS and WAX account.

### Deliverables

1. Create and setup ZOS token contract and burn account on WAX
2. Create a converter contract on EOS mainnet that can move EOS ZOS to WAX ZOS. This will be done in a decentralized way using LiquidApp's DSPs on EOS mainnet.
This can be done using the [LiquidOracle service](https://liquidapps.io/liquid-oracles) or [LiquidLink](https://liquidapps.io/liquid-link) if available. When ZOS tokens are sent to the converter contract, the tokens are burned on EOS. 
<!-- soft-burned without reducing the max supply -->
An oracle request tells the DSPs to invoke an action on the ZOS WAX token contract that issues the same amount of tokens on WAX.
1. Design and release a UI for the EOS converter interface which makes it easy for any user to move their tokens onto WAX.
2. Create a converter contract on WAX. We cannot make use of the same technique of using oracles here, because the LiquidApps network and DSPs are only available on EOS mainnet. However, the [LiquidLink](https://liquidapps.io/liquid-link) services allows us to "trigger our dApp with events on other blockchains". Meaning, upon sending tokens to the WAX converter contract, we burn the tokens, and emit an event on WAX that the DSPs on EOS mainnet will pick up. On receiving the conversion event, we issue the same amount of tokens on the EOS mainnet. (TODO: Hope LiquidLink is available by then and allows us to listen to events on WAX blockchain. Otherwise, we need to do the monitoring on WAX and invoking actions on EOS ourselves. Seems like [WAX partnered with Dfuse](https://wax.io/blog/new-dfuse-will-help-developers-create-a-better-user-experience-on-the-wax-blockchain) which we can use for monitoring actions on the WAX converter account.)
3. Design and release a similar UI for the WAX converter interface which makes it easy for any WAX user to move their tokens onto EOS.
4. Make the ZOS token purchasable on WAX through BANCOR. WAX users can uses the bancor wallet to exchange WAX for EOS mainnet ZOS tokens which they can then withdraw to our EOS mainnet converter to receive ZOS on their WAX accounts.
5. (Optional: Automate the burning of ZOS tokens and releasing new tokens on EOS mainnet.)

## Accounts

EOS Token: [zosdiscounts](https://bloks.io/account/zosdiscounts)
EOS Converter: [zoseosconvrt](https://bloks.io/account/zoseosconvrt#keys)
EOS Reporter: [zoscpustaker](https://bloks.io/account/zoscpustaker#keys)

WAX Token: [zoswaxtokens](https://wax.bloks.io/account/zoswaxtokens#keys)
WAX Converter: [zoswaxconvrt](https://wax.bloks.io/account/zoswaxconvrt#keys)
WAX Reporter: [zoswaxreport](https://wax.bloks.io/account/zoswaxreport#keys)

# License

ZOS IBC is [MIT licensed](./LICENSE).
