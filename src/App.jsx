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

const multicallAbi = [
    "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
];

function App() {
    const readOnlyProposalContract = useContract(true);
    const { readOnlyProvider } = useRunners();
    const [proposals, setProposals] = useState([]);

    console.log(proposals)

    const fetchProposals = useCallback(async () => {
        if (!readOnlyProposalContract) return;

 
        const multicallContract = new Contract(
            import.meta.env.VITE_MULTICALL_ADDRESS,
            multicallAbi,
            readOnlyProvider
        );

        const itf = new Interface(ABI);

        try {
            const proposalCount = Number(
                await readOnlyProposalContract.proposalCount()
            );

            const proposalsIds = Array.from(
                { length: proposalCount - 1 },
                (_, i) => i + 1
            );

            const calls = proposalsIds.map((id) => ({
                target: import.meta.env.VITE_CONTRACT_ADDRESS,
                callData: itf.encodeFunctionData("proposals", [id]),
            }));

            const responses = await multicallContract.tryAggregate.staticCall(
                true,
                calls
            );

            const decodedResults = responses.map((res) =>
                itf.decodeFunctionResult("proposals", res.returnData)
            );

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
        console.log(proposalId)
        if(readOnlyProposalContract) {
            const tx = await readOnlyProposalContract.vote(proposalId)

            const receipt = await tx.wait();
            
            console.log("tx", tx)

            readOnlyProposalContract.on("Voted", fetchProposals)

            

            if (receipt.status === 1) {
                toast.success("Voted successful");
                return;
            } else {
            toast.error("Proposal Creation failed");
            }
        }

    }

    useEffect(() => {
        fetchProposals();

        if(readOnlyProposalContract) {
        readOnlyProposalContract.on("ProposalCreated", fetchProposals);

        } return () => {
            
            if(readOnlyProposalContract) {
            readOnlyProposalContract.off("ProposalCreated", fetchProposals);
            }

             if(readOnlyProposalContract) {
            readOnlyProposalContract.off("Voted", fetchProposals);
            }
        }

       

    }, [readOnlyProposalContract]);

    return (
        <Layout>
            <Box className="flex justify-end p-4">
                <CreateProposalModal />
            </Box>
            <Proposals proposals={proposals} handleVote={handleVote}/>
        </Layout>
    );
}

export default App;
