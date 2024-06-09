const AirdropAddress = '0xa17Cc3eE45e3F4b60313489Ad1072E683Ee2E5d5';
const tokenDecimals = 18;
let web3;
let account;
let allocation;
let AirdropABI;
let proofs = [];

document.getElementById('connect-wallet-btn').addEventListener('click', connectWallet);
document.getElementById('claim-tokens-btn').addEventListener('click', claimTokens);

async function connectWallet() {
  const provider = await detectEthereumProvider();
  if (provider) {
    web3 = new Web3(provider);
    try {
      const accounts = await web3.eth.requestAccounts();
      account = accounts[0];
      document.getElementById('wallet-section').classList.add('hidden');
      document.getElementById('allocation-section').classList.remove('hidden');
      document.getElementById('account-address').textContent = obfuscateAddress(account);
      await fetchAllocation(account);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  } else {
    alert('Please install MetaMask!');
  }
}

async function fetchAllocation(address) {
  try {
    const response = await axios.get(`https://trailblazer.hekla.taiko.xyz/api/address?address=${address}`);
    allocation = BigInt(response.data.value) * BigInt(20) * BigInt(10 ** tokenDecimals);
    if (allocation > 0) {
      document.getElementById('allocation-message').textContent = `Your Allocation: ${web3.utils.fromWei(allocation.toString(), 'ether')} TAIKO`;
      document.getElementById('claim-tokens-btn').classList.remove('hidden');
      await checkClaimedStatus(address);
    } else {
      document.getElementById('allocation-message').textContent = 'You have no allocation.';
    }
  } catch (error) {
    console.error('Error fetching allocation:', error);
    document.getElementById('allocation-message').textContent = 'Error fetching allocation.';
  }
}

async function checkClaimedStatus(address) {
  try {
    const response = await fetch('maiko.abi');
    AirdropABI = await response.json();

    const contract = new web3.eth.Contract(AirdropABI, AirdropAddress);
    const hasClaimed = await contract.methods.hasClaimed(address).call();

    if (hasClaimed) {
      document.getElementById('allocation-message').textContent += ' You have already claimed.';
      document.getElementById('claim-tokens-btn').textContent = 'Claimed';
      document.getElementById('claim-tokens-btn').disabled = true;
    } else {
      document.getElementById('claim-tokens-btn').textContent = 'Claim Tokens';
      document.getElementById('claim-tokens-btn').disabled = false;
    }
  } catch (error) {
    console.error('Error checking claim status:', error);
  }
}

function obfuscateAddress(address) {
  return `${address.substring(0, 6)}****${address.substring(address.length - 4)}`;
}

async function fetchProofs(requiredProofsCount) {
  try {
    const response = await axios.get('apiproofs.json');
    proofs = response.data.slice(0, requiredProofsCount).map(p => web3.utils.keccak256(p));
  } catch (error) {
    console.error('Error fetching proofs:', error);
  }
}

async function getRequiredProofsCount() {
  try {
    const contract = new web3.eth.Contract(AirdropABI, AirdropAddress);
    const requiredProofsCount = await contract.methods.getRequiredProofs().call();
    return requiredProofsCount;
  } catch (error) {
    console.error('Error fetching required proofs count:', error);
    return 0;
  }
}

async function claimTokens() {
  if (!account) return;
  const button = document.getElementById('claim-tokens-btn');
  const status = document.getElementById('claim-status');
  button.disabled = true;
  button.textContent = 'Claiming...';

  const requiredProofsCount = await getRequiredProofsCount();
  await fetchProofs(requiredProofsCount);

  try {
    const contract = new web3.eth.Contract(AirdropABI, AirdropAddress);

    const amount = allocation.toString();

    await contract.methods.claim(amount, proofs).send({
      from: account,
      value: web3.utils.toWei('0.0004', 'ether')
    });

    status.textContent = `Claim Successful! You have claimed ${web3.utils.fromWei(allocation.toString(), 'ether')} TAIKO.`;
    status.classList.remove('hidden');
    button.textContent = 'Claimed';
  } catch (error) {
    console.error('Error claiming tokens:', error);
    status.textContent = 'Error claiming tokens.';
    status.classList.remove('hidden');
    button.disabled = false;
    button.textContent = 'Claim Tokens';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const answer = question.nextElementSibling;
      answer.classList.toggle('hidden');
    });
  });
});
