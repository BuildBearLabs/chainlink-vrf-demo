# Chainlink VRF plugin demo with Buildbear sandbox

This hardhat project contains a demo script for chainlink VRF plugin working with Buildbear sandbox.

## How to use?

create a `.env` file based on the `env.sample` provided and then run the following commands

```shell
yarn install
yarn hardhat compile
yarn hardhat run scripts/vrf-consumer.ts --network buildbear
```
