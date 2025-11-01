// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaymentProcessor
 * @notice x402-compatible payment processor with escrow functionality
 * @dev Handles secure payments between agents with escrow mechanism
 */
contract PaymentProcessor is ReentrancyGuard, Pausable, Ownable {
    
    // Constants
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant DEFAULT_EXPIRATION_DAYS = 30;
    uint256 public constant MIN_EXPIRATION_DAYS = 1;
    uint256 public constant MAX_EXPIRATION_DAYS = 365;
    
    enum EscrowStatus {
        Active,
        Completed,
        Refunded,
        Disputed
    }
    
    struct Escrow {
        bytes32 escrowId;
        address payer;
        address payee;
        uint256 amount;
        string serviceDescription;
        EscrowStatus status;
        uint256 createdAt;
        uint256 completedAt;
        uint256 expirationTime;
    }
    
    // Storage
    mapping(bytes32 => Escrow) public escrows;
    mapping(address => bytes32[]) public payerEscrows;
    mapping(address => bytes32[]) public payeeEscrows;
    mapping(address => uint256) public nonces; // For unique escrow ID generation
    
    // Events
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        string serviceDescription,
        uint256 expirationTime
    );
    
    event EscrowCompleted(
        bytes32 indexed escrowId,
        uint256 amount
    );
    
    event EscrowRefunded(
        bytes32 indexed escrowId,
        uint256 amount
    );
    
    event EscrowDisputed(
        bytes32 indexed escrowId,
        address indexed disputer,
        string reason
    );
    
    event EscrowExpired(
        bytes32 indexed escrowId,
        uint256 amount,
        address refundedTo
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
     * @notice Create an escrow payment
     * @param _payee Recipient address
     * @param _serviceDescription Description of service
     * @param _expirationDays Number of days until expiration (0 = default 30 days)
     * @return escrowId Unique escrow identifier
     */
    function createEscrow(
        address _payee,
        string memory _serviceDescription,
        uint256 _expirationDays
    ) external payable whenNotPaused returns (bytes32) {
        require(msg.sender != address(0), "Invalid payer");
        require(msg.value > 0, "Amount must be > 0");
        require(_payee != address(0), "Invalid payee");
        require(_payee != msg.sender, "Cannot pay yourself");
        require(bytes(_serviceDescription).length > 0, "Description required");
        require(bytes(_serviceDescription).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        
        // Set expiration (default to 30 days if not specified or invalid)
        uint256 expirationDays = _expirationDays;
        if (expirationDays == 0 || expirationDays < MIN_EXPIRATION_DAYS || expirationDays > MAX_EXPIRATION_DAYS) {
            expirationDays = DEFAULT_EXPIRATION_DAYS;
        }
        uint256 expirationTime = block.timestamp + (expirationDays * 1 days);
        
        // Generate unique escrow ID using nonce to prevent collisions
        bytes32 escrowId = keccak256(
            abi.encodePacked(
                msg.sender,
                _payee,
                msg.value,
                block.timestamp,
                block.number,
                nonces[msg.sender]
            )
        );
        nonces[msg.sender]++;
        
        require(escrows[escrowId].payer == address(0), "Escrow exists");
        
        Escrow storage newEscrow = escrows[escrowId];
        newEscrow.escrowId = escrowId;
        newEscrow.payer = msg.sender;
        newEscrow.payee = _payee;
        newEscrow.amount = msg.value;
        newEscrow.serviceDescription = _serviceDescription;
        newEscrow.status = EscrowStatus.Active;
        newEscrow.createdAt = block.timestamp;
        newEscrow.completedAt = 0;
        newEscrow.expirationTime = expirationTime;
        
        payerEscrows[msg.sender].push(escrowId);
        payeeEscrows[_payee].push(escrowId);
        
        emit EscrowCreated(escrowId, msg.sender, _payee, msg.value, _serviceDescription, expirationTime);
        
        return escrowId;
    }
    
    /**
     * @notice Release escrow payment to payee
     * @param _escrowId Escrow to release
     */
    function releaseEscrow(bytes32 _escrowId) external nonReentrant whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.payer == msg.sender, "Only payer can release");
        require(escrow.status == EscrowStatus.Active, "Not active");
        require(escrow.amount > 0, "Invalid amount");
        require(block.timestamp < escrow.expirationTime, "Escrow expired - use claimExpiredEscrow");
        
        escrow.status = EscrowStatus.Completed;
        escrow.completedAt = block.timestamp;
        
        uint256 amount = escrow.amount;
        address payee = escrow.payee;
        
        // Use transfer with limited gas to prevent reentrancy
        (bool success, ) = payee.call{value: amount, gas: 2300}("");
        require(success, "Transfer failed");
        
        emit EscrowCompleted(_escrowId, amount);
    }
    
    /**
     * @notice Refund escrow payment to payer
     * @param _escrowId Escrow to refund
     */
    function refundEscrow(bytes32 _escrowId) external nonReentrant whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        
        require(
            escrow.payer == msg.sender || escrow.payee == msg.sender,
            "Not authorized"
        );
        require(escrow.status == EscrowStatus.Active, "Not active");
        require(escrow.amount > 0, "Invalid amount");
        
        escrow.status = EscrowStatus.Refunded;
        escrow.completedAt = block.timestamp;
        
        uint256 amount = escrow.amount;
        address payer = escrow.payer;
        
        // Use transfer with limited gas to prevent reentrancy
        (bool success, ) = payer.call{value: amount, gas: 2300}("");
        require(success, "Refund failed");
        
        emit EscrowRefunded(_escrowId, amount);
    }
    
    /**
     * @notice Dispute an escrow
     * @param _escrowId Escrow to dispute
     * @param _reason Reason for dispute
     */
    function disputeEscrow(bytes32 _escrowId, string memory _reason) external whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.status == EscrowStatus.Active, "Not active");
        require(
            escrow.payer == msg.sender || escrow.payee == msg.sender,
            "Not authorized"
        );
        require(bytes(_reason).length > 0, "Reason required");
        require(bytes(_reason).length <= 500, "Reason too long");
        
        escrow.status = EscrowStatus.Disputed;
        emit EscrowDisputed(_escrowId, msg.sender, _reason);
    }
    
    /**
     * @notice Claim expired escrow (auto-refund to payer)
     * @param _escrowId Expired escrow ID
     */
    function claimExpiredEscrow(bytes32 _escrowId) external nonReentrant whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.status == EscrowStatus.Active, "Not active");
        require(block.timestamp >= escrow.expirationTime, "Not expired");
        require(
            escrow.payer == msg.sender || escrow.payee == msg.sender,
            "Not authorized"
        );
        
        escrow.status = EscrowStatus.Refunded;
        escrow.completedAt = block.timestamp;
        
        uint256 amount = escrow.amount;
        address payer = escrow.payer;
        
        (bool success, ) = payer.call{value: amount, gas: 2300}("");
        require(success, "Refund failed");
        
        emit EscrowExpired(_escrowId, amount, payer);
    }
    
    /**
     * @notice Get escrow details
     * @param _escrowId Escrow ID
     * @return Escrow struct
     */
    function getEscrow(bytes32 _escrowId) 
        external 
        view 
        returns (Escrow memory) 
    {
        require(escrows[_escrowId].payer != address(0), "Escrow not found");
        return escrows[_escrowId];
    }
    
    /**
     * @notice Get all escrows for a payer (paginated)
     * @param _payer Payer address
     * @param _offset Starting index
     * @param _limit Maximum number to return
     * @return Array of escrow IDs and total count
     */
    function getPayerEscrows(address _payer, uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (bytes32[] memory, uint256) 
    {
        bytes32[] memory allEscrows = payerEscrows[_payer];
        uint256 total = allEscrows.length;
        
        if (_offset >= total) {
            return (new bytes32[](0), total);
        }
        
        uint256 end = _offset + _limit;
        if (end > total) end = total;
        
        bytes32[] memory result = new bytes32[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = allEscrows[i];
        }
        
        return (result, total);
    }
    
    /**
     * @notice Get all escrows for a payer (legacy - returns all)
     */
    function getPayerEscrows(address _payer) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return payerEscrows[_payer];
    }
    
    /**
     * @notice Get all escrows for a payee (paginated)
     * @param _payee Payee address
     * @param _offset Starting index
     * @param _limit Maximum number to return
     * @return Array of escrow IDs and total count
     */
    function getPayeeEscrows(address _payee, uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (bytes32[] memory, uint256) 
    {
        bytes32[] memory allEscrows = payeeEscrows[_payee];
        uint256 total = allEscrows.length;
        
        if (_offset >= total) {
            return (new bytes32[](0), total);
        }
        
        uint256 end = _offset + _limit;
        if (end > total) end = total;
        
        bytes32[] memory result = new bytes32[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = allEscrows[i];
        }
        
        return (result, total);
    }
    
    /**
     * @notice Get all escrows for a payee (legacy - returns all)
     */
    function getPayeeEscrows(address _payee) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return payeeEscrows[_payee];
    }
    
    /**
     * @notice Get contract balance
     * @return Balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

