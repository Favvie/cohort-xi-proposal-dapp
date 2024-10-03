import { Flex, Text } from "@radix-ui/themes";
import Proposal from "./Proposal";

const Proposals = ({ proposals, handleVote }) => {
   


    return (    
        <Flex className="w-full flex gap-4 flex-wrap">
            {proposals.length === 0 ? (
                <Text>No data to display</Text>
            ) : (
                proposals.map(
                    ({
                        proposalId,
                        deadline,
                        minRequiredVote,
                        amount,
                        description,
                        executed,
                        votecount,
                        
                    }) => (
                        <Proposal
                            key={`${deadline}${minRequiredVote}`}
                            proposalId={proposalId}
                            amount={amount}
                            deadline={deadline}
                            description={description}
                            executed={executed}
                            minRequiredVote={minRequiredVote}
                            votecount={votecount}
                            handleVote={handleVote}
                        />
                    )
                )
            )}
        </Flex>
    );
};

export default Proposals;
