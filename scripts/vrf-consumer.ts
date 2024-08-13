import { ethers } from "hardhat";

async function main() {
  const privateKey = process.env.PRIVATE_KEY!;
  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(ethers.provider);
  const mainnetVRFCoordinatorAddr = process.env.VRF_COORDINATOR_ADDR!;
  const linkTokenAddr = process.env.LINK_TOKEN_ADDR!;

  console.log({ signer: signer.address });
  console.log({ mainnetVRFCoordinatorAddr, linkTokenAddr });

  const vrfCoordinator = await ethers.getContractAt(
    "VRFCoordinatorV2_5",
    mainnetVRFCoordinatorAddr,
  );

  //--------------------------------------------------------------------------------
  // Create subscription
  console.log("[Coordinator] Creating subscription...");
  const subsTx = await vrfCoordinator.connect(signer).createSubscription();
  const subRecipt = await subsTx.wait();
  console.log({ createSubTxnHash: subsTx.hash });

  //@ts-ignore
  const args = subRecipt?.logs[0]?.args;
  const subId = args[0];
  const abiCoder = new ethers.AbiCoder();
  const encodedSubId = abiCoder.encode(["uint256"], [subId]);
  console.log({ subId, encodedSubId });

  //--------------------------------------------------------------------------------
  // Fund subscription
  const linkToken = await ethers.getContractAt(
    "LinkTokenInterface",
    linkTokenAddr,
  );
  const value = parseInt(process.env.LINK_AMOUNT!);
  console.log(`[LINK Token] Transferring ${value} LINK to subscription...`);
  const linkTxn = await linkToken
    .connect(signer)
    .transferAndCall(
      mainnetVRFCoordinatorAddr,
      BigInt(value * 1e18),
      encodedSubId,
    );
  await linkTxn.wait();
  console.log("Funded subscription.", { fundTxnHash: linkTxn.hash });

  //--------------------------------------------------------------------------------
  // Deploy consumer
  console.log("Deploying consumer...");
  const vrfConsumer = await ethers.deployContract(
    "RandomNumberConsumerV2_5",
    [
      subId,
      mainnetVRFCoordinatorAddr,
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    ],
    signer,
  );
  const consumerAddr = vrfConsumer.target;
  console.log({ consumerAddr });

  //--------------------------------------------------------------------------------
  // Add consumer to coordinator
  console.log("[Coordinator] Adding consumer to coordinator...");
  const addCosumerTx = await vrfCoordinator
    .connect(signer)
    .addConsumer(subId, consumerAddr);
  await addCosumerTx.wait();
  console.log({ addCosumerTxnHash: addCosumerTx.hash });

  //--------------------------------------------------------------------------------
  // Request random words
  console.log("[Consumer] Requesting random words...");
  const requestRandomnessTx = await vrfConsumer
    .connect(signer)
    .requestRandomWords();
  await requestRandomnessTx.wait();
  console.log({ requestRandomnessTxnHash: requestRandomnessTx.hash });

  const reqId = await vrfConsumer.connect(signer).s_requestId();
  console.log({ reqId });

  //--------------------------------------------------------------------------------
  // Now we wait for the request to be fulfilled before chencking the random word
  console.log(
    "Waiting for request to be fulfilled.... Sleeping for 60 seconds...",
  );
  await new Promise((resolve) => setTimeout(resolve, 60000));
  console.log("Finished sleeping.");

  //--------------------------------------------------------------------------------
  // Check random word
  console.log("[Consumer] Checking random word...");
  let randomWord = await vrfConsumer.connect(signer).s_randomWords(0);
  console.log({ randomWord });
  randomWord = await vrfConsumer.connect(signer).s_randomWords(1);
  console.log({ randomWord });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
