// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AgentRegistry
 * @notice ERC-8004 compliant agent discovery and capability registry
 * @dev Stores agent information on-chain for trustless discovery
 */
contract AgentRegistry is Ownable, Pausable {
    
    // Constants
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MAX_METADATA_LENGTH = 500;
    uint256 public constant MAX_CAPABILITIES = 50;
    uint256 public constant MAX_CAPABILITY_LENGTH = 50;
    uint256 public constant MAX_AGENTS_PAGE_SIZE = 100;
    
    struct Agent {
        string name;
        address agentAddress;
        string[] capabilities;
        string metadata;        // IPFS hash or JSON
        uint256 trustScore;     // 0-100
        uint256 registeredAt;
        bool isActive;
    }
    
    struct ReputationFeedback {
        address fromAgent;
        address toAgent;
        uint256 rating;         // 1-5 stars
        string comment;
        bytes32 paymentTxHash;   // Link to proof-of-payment
        uint256 timestamp;
    }
    
    struct A2AInteraction {
        address fromAgent;
        address toAgent;
        string capability;
        bytes32 interactionId;
        uint256 timestamp;
        bool completed;
    }
    
    // Storage
    mapping(address => Agent) public agents;
    mapping(string => address[]) public capabilityIndex;
    mapping(address => mapping(string => bool)) private capabilityTracker; // Track duplicates
    address[] public agentList;
    
    // ERC-8004 Reputation Registry
    mapping(address => ReputationFeedback[]) public agentReputation;
    mapping(address => uint256) public averageRating;
    mapping(address => uint256) public totalRatings;
    mapping(address => uint256) public successfulTransactions;
    
    // A2A Communication tracking
    mapping(bytes32 => A2AInteraction) public a2aInteractions;
    mapping(address => bytes32[]) public agentInteractions;
    bytes32[] public allInteractionIds;
    
    // Events
    event AgentRegistered(
        address indexed agentAddress,
        string name,
        string[] capabilities
    );
    
    event AgentUpdated(
        address indexed agentAddress,
        string[] newCapabilities
    );
    
    event TrustScoreUpdated(
        address indexed agentAddress,
        uint256 newScore
    );
    
    event AgentDeactivated(
        address indexed agentAddress
    );
    
    event AgentProfileUpdated(
        address indexed agentAddress,
        string newName,
        string newMetadata
    );
    
    event ReputationFeedbackSubmitted(
        address indexed fromAgent,
        address indexed toAgent,
        uint256 rating
    );
    
    event A2AInteractionInitiated(
        bytes32 indexed interactionId,
        address indexed fromAgent,
        address indexed toAgent,
        string capability
    );
    
    event A2AInteractionCompleted(
        bytes32 indexed interactionId,
        address indexed fromAgent,
        address indexed toAgent
    );
    
    event TrustEstablished(
        address indexed agent1,
        address indexed agent2,
        bytes32 indexed transactionHash
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @notice Pause contract (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Register a new agent
     * @param _name Agent name
     * @param _capabilities Array of capability strings
     * @param _metadata Additional metadata (IPFS hash)
     */
    function registerAgent(
        string memory _name,
        string[] memory _capabilities,
        string memory _metadata
    ) external whenNotPaused {
        require(msg.sender != address(0), "Invalid address");
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_name).length <= MAX_NAME_LENGTH, "Name too long");
        require(!agents[msg.sender].isActive, "Already registered");
        require(_capabilities.length > 0, "At least one capability required");
        require(_capabilities.length <= MAX_CAPABILITIES, "Too many capabilities");
        require(bytes(_metadata).length <= MAX_METADATA_LENGTH, "Metadata too long");
        
        // Validate capability lengths and check for duplicates
        _validateCapabilities(_capabilities);
        
        Agent storage newAgent = agents[msg.sender];
        newAgent.name = _name;
        newAgent.agentAddress = msg.sender;
        newAgent.capabilities = _capabilities;
        newAgent.metadata = _metadata;
        newAgent.trustScore = _calculateInitialTrustScore(_capabilities, _metadata); // ERC-8004 compliant
        newAgent.registeredAt = block.timestamp;
        newAgent.isActive = true;
        
        agentList.push(msg.sender);
        
        // Index capabilities for search (prevent duplicates)
        for (uint i = 0; i < _capabilities.length; i++) {
            string memory cap = _capabilities[i];
            if (!capabilityTracker[msg.sender][cap]) {
                capabilityIndex[cap].push(msg.sender);
                capabilityTracker[msg.sender][cap] = true;
            }
        }
        
        emit AgentRegistered(msg.sender, _name, _capabilities);
    }
    
    /**
     * @notice Get agent details
     * @param _agentAddress Agent's address
     * @return Agent struct
     */
    function getAgent(address _agentAddress) 
        external 
        view 
        returns (Agent memory) 
    {
        require(agents[_agentAddress].isActive, "Agent not found");
        return agents[_agentAddress];
    }
    
    /**
     * @notice Search agents by capability
     * @param _capability Capability to search for
     * @return Array of agent addresses
     */
    function searchByCapability(string memory _capability) 
        external 
        view 
        returns (address[] memory) 
    {
        return capabilityIndex[_capability];
    }
    
    /**
     * @notice Get all registered agents (paginated)
     * @param _offset Starting index
     * @param _limit Maximum number to return (max 100)
     * @return Array of agent addresses and total count
     */
    function getAllAgents(uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (address[] memory, uint256) 
    {
        require(_limit > 0 && _limit <= MAX_AGENTS_PAGE_SIZE, "Invalid limit");
        uint256 total = agentList.length;
        
        if (_offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = _offset + _limit;
        if (end > total) end = total;
        
        address[] memory result = new address[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = agentList[i];
        }
        
        return (result, total);
    }
    
    /**
     * @notice Get all registered agents (legacy - returns all)
     */
    function getAllAgents() external view returns (address[] memory) {
        return agentList;
    }
    
    /**
     * @notice Update agent capabilities
     * @param _newCapabilities New array of capabilities
     */
    function updateCapabilities(string[] memory _newCapabilities) external whenNotPaused {
        require(agents[msg.sender].isActive, "Not registered");
        require(_newCapabilities.length > 0, "At least one capability required");
        require(_newCapabilities.length <= MAX_CAPABILITIES, "Too many capabilities");
        
        // Validate capability lengths and check for duplicates
        _validateCapabilities(_newCapabilities);
        
        // Remove old capability indexes and tracker
        string[] memory oldCapabilities = agents[msg.sender].capabilities;
        for (uint i = 0; i < oldCapabilities.length; i++) {
            _removeFromCapabilityIndex(oldCapabilities[i], msg.sender);
            capabilityTracker[msg.sender][oldCapabilities[i]] = false;
        }
        
        // Update and index new capabilities (prevent duplicates)
        agents[msg.sender].capabilities = _newCapabilities;
        for (uint i = 0; i < _newCapabilities.length; i++) {
            string memory cap = _newCapabilities[i];
            if (!capabilityTracker[msg.sender][cap]) {
                capabilityIndex[cap].push(msg.sender);
                capabilityTracker[msg.sender][cap] = true;
            }
        }
        
        emit AgentUpdated(msg.sender, _newCapabilities);
    }
    
    /**
     * @notice Update agent profile (name and metadata)
     * @param _newName New agent name
     * @param _newMetadata New metadata
     */
    function updateProfile(
        string memory _newName,
        string memory _newMetadata
    ) external whenNotPaused {
        require(agents[msg.sender].isActive, "Not registered");
        require(bytes(_newName).length > 0, "Name required");
        require(bytes(_newName).length <= MAX_NAME_LENGTH, "Name too long");
        require(bytes(_newMetadata).length <= MAX_METADATA_LENGTH, "Metadata too long");
        
        agents[msg.sender].name = _newName;
        agents[msg.sender].metadata = _newMetadata;
        
        emit AgentProfileUpdated(msg.sender, _newName, _newMetadata);
    }
    
    /**
     * @notice Update trust score (owner only)
     * @param _agentAddress Agent to update
     * @param _newScore New trust score (0-100)
     */
    function updateTrustScore(address _agentAddress, uint256 _newScore) 
        external 
        onlyOwner 
        whenNotPaused
    {
        require(agents[_agentAddress].isActive, "Agent not found");
        require(_newScore <= 100, "Score must be 0-100");
        
        agents[_agentAddress].trustScore = _newScore;
        emit TrustScoreUpdated(_agentAddress, _newScore);
    }
    
    /**
     * @notice Deactivate an agent (owner only)
     * @param _agentAddress Agent to deactivate
     */
    function deactivateAgent(address _agentAddress) external onlyOwner whenNotPaused {
        require(agents[_agentAddress].isActive, "Agent not active");
        
        // Remove from capability indexes
        string[] memory caps = agents[_agentAddress].capabilities;
        for (uint i = 0; i < caps.length; i++) {
            _removeFromCapabilityIndex(caps[i], _agentAddress);
            capabilityTracker[_agentAddress][caps[i]] = false;
        }
        
        agents[_agentAddress].isActive = false;
        
        emit AgentDeactivated(_agentAddress);
    }
    
    /**
     * @notice Get agent count
     * @return Total number of registered agents
     */
    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }
    
    /**
     * @notice Submit reputation feedback (ERC-8004 Reputation Registry)
     * @param _toAgent Agent being rated
     * @param _rating Rating from 1-5
     * @param _comment Optional comment
     * @param _paymentTxHash Transaction hash linking to proof-of-payment
     */
    function submitFeedback(
        address _toAgent,
        uint256 _rating,
        string memory _comment,
        bytes32 _paymentTxHash
    ) external whenNotPaused {
        require(agents[msg.sender].isActive, "You must be registered");
        require(agents[_toAgent].isActive, "Target agent not found");
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        require(msg.sender != _toAgent, "Cannot rate yourself");
        
        ReputationFeedback memory feedback = ReputationFeedback({
            fromAgent: msg.sender,
            toAgent: _toAgent,
            rating: _rating,
            comment: _comment,
            paymentTxHash: _paymentTxHash,
            timestamp: block.timestamp
        });
        
        agentReputation[_toAgent].push(feedback);
        totalRatings[_toAgent]++;
        
        // Recalculate average rating and update trust score
        uint256 previousTotal = (totalRatings[_toAgent] - 1) * averageRating[_toAgent];
        uint256 newTotal = previousTotal + (_rating * 20); // Convert 1-5 to 0-100 scale
        averageRating[_toAgent] = newTotal / totalRatings[_toAgent];
        
        // Update trust score based on average rating
        agents[_toAgent].trustScore = averageRating[_toAgent];
        
        emit ReputationFeedbackSubmitted(msg.sender, _toAgent, _rating);
        emit TrustScoreUpdated(_toAgent, agents[_toAgent].trustScore);
    }
    
    /**
     * @notice Get reputation feedback for an agent
     * @param _agentAddress Agent address
     * @return Array of reputation feedbacks
     */
    function getAgentReputation(address _agentAddress) 
        external 
        view 
        returns (ReputationFeedback[] memory) 
    {
        return agentReputation[_agentAddress];
    }
    
    /**
     * @notice Initiate A2A (Agent-to-Agent) communication
     * @param _toAgent Target agent address
     * @param _capability Capability being used for interaction
     * @return interactionId Unique interaction identifier
     */
    function initiateA2ACommunication(
        address _toAgent,
        string memory _capability
    ) external whenNotPaused returns (bytes32) {
        require(agents[msg.sender].isActive, "You must be registered");
        require(agents[_toAgent].isActive, "Target agent not found");
        require(msg.sender != _toAgent, "Cannot interact with yourself");
        require(agents[_toAgent].trustScore >= 40, "Target agent trust score too low");
        
        bytes32 interactionId = keccak256(
            abi.encodePacked(
                msg.sender,
                _toAgent,
                _capability,
                block.timestamp,
                block.number,
                agentInteractions[msg.sender].length
            )
        );
        
        require(a2aInteractions[interactionId].fromAgent == address(0), "Interaction exists");
        
        A2AInteraction storage interaction = a2aInteractions[interactionId];
        interaction.fromAgent = msg.sender;
        interaction.toAgent = _toAgent;
        interaction.capability = _capability;
        interaction.interactionId = interactionId;
        interaction.timestamp = block.timestamp;
        interaction.completed = false;
        
        agentInteractions[msg.sender].push(interactionId);
        agentInteractions[_toAgent].push(interactionId);
        allInteractionIds.push(interactionId);
        
        emit A2AInteractionInitiated(interactionId, msg.sender, _toAgent, _capability);
        
        return interactionId;
    }
    
    /**
     * @notice Complete A2A interaction (establishes trust)
     * @param _interactionId Interaction ID
     */
    function completeA2AInteraction(bytes32 _interactionId) external whenNotPaused {
        A2AInteraction storage interaction = a2aInteractions[_interactionId];
        require(interaction.fromAgent != address(0), "Interaction not found");
        require(
            msg.sender == interaction.fromAgent || msg.sender == interaction.toAgent,
            "Not authorized"
        );
        require(!interaction.completed, "Already completed");
        
        interaction.completed = true;
        
        // Small trust boost for successful A2A interactions
        if (agents[interaction.fromAgent].trustScore < 100) {
            agents[interaction.fromAgent].trustScore += 1;
        }
        if (agents[interaction.toAgent].trustScore < 100) {
            agents[interaction.toAgent].trustScore += 1;
        }
        
        emit A2AInteractionCompleted(_interactionId, interaction.fromAgent, interaction.toAgent);
        emit TrustScoreUpdated(interaction.fromAgent, agents[interaction.fromAgent].trustScore);
        emit TrustScoreUpdated(interaction.toAgent, agents[interaction.toAgent].trustScore);
    }
    
    /**
     * @notice Establish trust from successful payment transaction
     * @param _agent1 First agent address
     * @param _agent2 Second agent address
     * @param _transactionHash Transaction hash as proof
     */
    function establishTrustFromPayment(
        address _agent1,
        address _agent2,
        bytes32 _transactionHash
    ) external whenNotPaused {
        require(agents[_agent1].isActive, "Agent1 not found");
        require(agents[_agent2].isActive, "Agent2 not found");
        require(msg.sender == _agent1 || msg.sender == _agent2, "Not authorized");
        
        successfulTransactions[_agent1]++;
        successfulTransactions[_agent2]++;
        
        // Boost trust scores for successful transactions
        if (agents[_agent1].trustScore < 100) {
            agents[_agent1].trustScore = agents[_agent1].trustScore + 2 > 100 
                ? 100 
                : agents[_agent1].trustScore + 2;
        }
        if (agents[_agent2].trustScore < 100) {
            agents[_agent2].trustScore = agents[_agent2].trustScore + 2 > 100 
                ? 100 
                : agents[_agent2].trustScore + 2;
        }
        
        emit TrustEstablished(_agent1, _agent2, _transactionHash);
        emit TrustScoreUpdated(_agent1, agents[_agent1].trustScore);
        emit TrustScoreUpdated(_agent2, agents[_agent2].trustScore);
    }
    
    /**
     * @notice Get A2A interaction details
     * @param _interactionId Interaction ID
     * @return A2AInteraction struct
     */
    function getA2AInteraction(bytes32 _interactionId) 
        external 
        view 
        returns (A2AInteraction memory) 
    {
        require(a2aInteractions[_interactionId].fromAgent != address(0), "Interaction not found");
        return a2aInteractions[_interactionId];
    }
    
    /**
     * @notice Get agent's interaction history
     * @param _agentAddress Agent address
     * @return Array of interaction IDs
     */
    function getAgentInteractions(address _agentAddress) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return agentInteractions[_agentAddress];
    }
    
    /**
     * @notice Internal: Calculate initial trust score (ERC-8004 compliant)
     * @param _capabilities Agent capabilities
     * @param _metadata Agent metadata
     * @return Calculated trust score (0-100)
     */
    function _calculateInitialTrustScore(
        string[] memory _capabilities,
        string memory _metadata
    ) internal pure returns (uint256) {
        uint256 baseScore = 50; // Neutral starting score
        
        // Bonus for metadata completeness (ERC-8004 Identity Registry requirement)
        if (bytes(_metadata).length > 0) {
            baseScore += 5;
        }
        
        // Bonus for multiple capabilities (shows agent versatility)
        if (_capabilities.length >= 3) {
            baseScore += 5;
        }
        
        // Bonus for having 5+ capabilities
        if (_capabilities.length >= 5) {
            baseScore += 5;
        }
        
        return baseScore > 100 ? 100 : baseScore;
    }
    
    /**
     * @notice Internal: Validate capabilities
     */
    function _validateCapabilities(string[] memory _capabilities) internal pure {
        for (uint i = 0; i < _capabilities.length; i++) {
            require(bytes(_capabilities[i]).length > 0, "Empty capability");
            require(bytes(_capabilities[i]).length <= MAX_CAPABILITY_LENGTH, "Capability too long");
        }
        
        // Check for duplicates in array
        for (uint i = 0; i < _capabilities.length; i++) {
            for (uint j = i + 1; j < _capabilities.length; j++) {
                require(
                    keccak256(bytes(_capabilities[i])) != keccak256(bytes(_capabilities[j])),
                    "Duplicate capability"
                );
            }
        }
    }
    
    /**
     * @notice Internal: Remove agent from capability index
     */
    function _removeFromCapabilityIndex(
        string memory _capability, 
        address _agent
    ) internal {
        address[] storage addresses = capabilityIndex[_capability];
        for (uint i = 0; i < addresses.length; i++) {
            if (addresses[i] == _agent) {
                addresses[i] = addresses[addresses.length - 1];
                addresses.pop();
                break;
            }
        }
    }
}

