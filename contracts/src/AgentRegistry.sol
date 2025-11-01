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
    
    // Storage
    mapping(address => Agent) public agents;
    mapping(string => address[]) public capabilityIndex;
    mapping(address => mapping(string => bool)) private capabilityTracker; // Track duplicates
    address[] public agentList;
    
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
        newAgent.trustScore = 50; // Neutral starting score
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

