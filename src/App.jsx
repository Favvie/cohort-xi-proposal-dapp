import { Box } from "@radix-ui/themes";
import Layout from "./components/Layout";
import CreateProposalModal from "./components/CreateProposalModal";
import Proposals from "./components/Proposals";
import useContract from "./hooks/useContract";
import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import useRunners from "./hooks/useRunners";
import { Interface } from "ethers";
import ABI from "./ABI/proposal.json";
import { toast } from "react-toastify";
import { ethers } from "ethers";

const multicallAbi = ["function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)"];

function App() {
	const readOnlyProposalContract = useContract(true);
	const { readOnlyProvider } = useRunners();
	const [proposals, setProposals] = useState([]);

	console.log(proposals);

	const fetchProposals = useCallback(async () => {
		if (!readOnlyProposalContract) return;

		const multicallContract = new Contract(import.meta.env.VITE_MULTICALL_ADDRESS, multicallAbi, readOnlyProvider);

		const itf = new Interface(ABI);

		try {
			const proposalCount = Number(await readOnlyProposalContract.proposalCount());

			const proposalsIds = Array.from({ length: proposalCount - 1 }, (_, i) => i + 1);

			const calls = proposalsIds.map((id) => ({
				target: import.meta.env.VITE_CONTRACT_ADDRESS,
				callData: itf.encodeFunctionData("proposals", [id]),
			}));

			const responses = await multicallContract.tryAggregate.staticCall(true, calls);

			const decodedResults = responses.map((res) => itf.decodeFunctionResult("proposals", res.returnData));

			const data = decodedResults.map((proposalStruct, index) => ({
				proposalId: proposalsIds[index],
				description: proposalStruct.description,
				amount: proposalStruct.amount,
				minRequiredVote: proposalStruct.minVotesToPass,
				votecount: proposalStruct.voteCount,
				deadline: proposalStruct.votingDeadline,
				executed: proposalStruct.executed,
			}));

			setProposals(data);
		} catch (error) {
			console.log("error fetching proposals: ", error);
		}
	}, [readOnlyProposalContract, readOnlyProvider]);

	const handleVote = async (proposalId) => {
		console.log(proposalId);
		if (readOnlyProposalContract) {
			const tx = await readOnlyProposalContract.vote(proposalId);

			const receipt = await tx.wait();

			console.log("tx", tx);

			if (receipt.status === 1) {
				toast.success("Voted successful");
				return;
			} else {
				toast.error("Proposal Creation failed");
			}
		}
	};

	const handleVoting = useCallback((proposalId) => {
		setProposals((prevProposals) => {
			prevProposals.map((proposal) => {
				proposal.proposalId === proposalId.toString() ? { ...proposal, votecount: proposal.voteCount + 1 } : proposal;
			});
		});
	}, []);

	const handleProposalCreated = useCallback((proposalId, description, amount, minVotesToPass, voteCount, votingDeadline, executed) => {
		const newProposal = {
			proposalId: proposalId.toString(),
			description,
			amount: ethers.utils.formatEther(amount),
			minVotesToPass: minVotesToPass.toString(),
			voteCount: voteCount.toString(),
			votingDeadline: new Date(votingDeadline.toNumber() * 1000).toLocaleString(),
			executed: executed.toString(),
		};
		setProposals((prevProposals) => [...prevProposals, newProposal]);
	}, []);

	useEffect(() => {
		fetchProposals();

		const contract = new Contract(import.meta.env.VITE_CONTRACT_ADDRESS, ABI, readOnlyProvider);
		contract.on("ProposalCreated", handleProposalCreated);
		console.log("created listener added");

		// if (readOnlyProposalContract) {
		// 	readOnlyProposalContract.on("ProposalCreated", handleProposalCreated);
		// }

		// if (readOnlyProposalContract) {
		// 	readOnlyProposalContract.on("Voted", handleVoting);
		// }
		return () => {
			contract.off("ProposalCreated", handleProposalCreated)
			// if (readOnlyProposalContract) {
			// 	readOnlyProposalContract.off("ProposalCreated", handleProposalCreated);
			// }

			if (readOnlyProposalContract) {
				readOnlyProposalContract.off("Voted", handleVoting);
			}
		};
	}, [readOnlyProposalContract, handleProposalCreated, handleVoting, fetchProposals]);

	return (
		<Layout>
			<Box className="flex justify-end p-4">
				<CreateProposalModal />
			</Box>
			<Proposals
				proposals={proposals}
				handleVote={handleVote}
			/>
		</Layout>
	);
}

export default App;
