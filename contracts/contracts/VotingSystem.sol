// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract VotingSystem is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // --- NFT Storage ---
    uint256 public nextTokenId;
    mapping(uint256 => string) public studentIds;

    // --- Voting Storage ---
    struct Session {
        uint256 id;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    struct VoteRecord {
        uint256 sessionId;
        uint256 candidateId;
        uint256 timestamp;
    }

    mapping(uint256 => Session) public sessions;
    mapping(uint256 => Candidate[]) public sessionCandidates;
    mapping(uint256 => mapping(address => bool)) public hasVotedInSession;
    mapping(uint256 => mapping(address => bool)) public isSessionVoterAllowed;
    mapping(uint256 => address[]) private sessionAllowedVoters;
    mapping(address => VoteRecord[]) public userVoteHistory;
    
    uint256 public sessionsCount;

    // --- Events ---
    // NFT Events
    // (ERC721 already has Transfer events)

    // Voting Events
    event SessionCreated(uint256 indexed sessionId, string name, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 indexed sessionId, uint256 indexed candidateId, string name);
    event Voted(uint256 indexed sessionId, address indexed voter, uint256 indexed candidateId);
    event SessionStatusChanged(uint256 indexed sessionId, bool isActive);
    event SessionAllowedVotersUpdated(uint256 indexed sessionId, uint256 voterCount);

    constructor() ERC721("StudentIdentity", "STU") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // Track used student IDs to prevent duplicates
    mapping(string => bool) private _studentIdUsed;

    // ==========================================
    //               NFT LOGIC
    // ==========================================

    function mint(address to, string memory _studentId) public onlyRole(ADMIN_ROLE) {
        require(!_studentIdUsed[_studentId], "Student ID already has an NFT");
        
        uint256 tokenId = nextTokenId++;
        studentIds[tokenId] = _studentId;
        _studentIdUsed[_studentId] = true;
        
        _safeMint(to, tokenId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("VotingSystem: Soulbound token cannot be transferred");
        }
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory studentId = studentIds[tokenId];
        
        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "Student ID: ', studentId, '",',
            '"description": "Digital Identity for Student ID ', studentId, '. Verified by University.",',
            '"attributes": [{"trait_type": "Student ID", "value": "', studentId, '"}]}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    // ==========================================
    //             VOTING LOGIC
    // ==========================================

    function createSession(string memory _name, string memory _description, uint256 _startTime, uint256 _endTime) public onlyRole(ADMIN_ROLE) {
        sessionsCount++;
        sessions[sessionsCount] = Session(sessionsCount, _name, _description, _startTime, _endTime, true);
        emit SessionCreated(sessionsCount, _name, _startTime, _endTime);
    }

    function setSessionStatus(uint256 _sessionId, bool _isActive) public onlyRole(ADMIN_ROLE) {
        require(_sessionId > 0 && _sessionId <= sessionsCount, "Invalid session ID");
        sessions[_sessionId].isActive = _isActive;
        emit SessionStatusChanged(_sessionId, _isActive);
    }

    function addCandidate(uint256 _sessionId, string memory _name) public onlyRole(ADMIN_ROLE) {
        require(_sessionId > 0 && _sessionId <= sessionsCount, "Invalid session ID");
        require(sessions[_sessionId].isActive, "Session is not active");
        
        uint256 candidateId = sessionCandidates[_sessionId].length + 1;
        sessionCandidates[_sessionId].push(Candidate(candidateId, _name, 0));
        
        emit CandidateAdded(_sessionId, candidateId, _name);
    }

    function setSessionAllowedVoters(uint256 _sessionId, address[] memory _voters) public onlyRole(ADMIN_ROLE) {
        require(_sessionId > 0 && _sessionId <= sessionsCount, "Invalid session ID");

        address[] storage existingVoters = sessionAllowedVoters[_sessionId];
        for (uint256 i = 0; i < existingVoters.length; i++) {
            isSessionVoterAllowed[_sessionId][existingVoters[i]] = false;
        }
        delete sessionAllowedVoters[_sessionId];

        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            require(voter != address(0), "Invalid voter address");

            if (!isSessionVoterAllowed[_sessionId][voter]) {
                isSessionVoterAllowed[_sessionId][voter] = true;
                sessionAllowedVoters[_sessionId].push(voter);
            }
        }

        emit SessionAllowedVotersUpdated(_sessionId, sessionAllowedVoters[_sessionId].length);
    }

    function getSessionAllowedVoters(uint256 _sessionId) public view returns (address[] memory) {
        require(_sessionId > 0 && _sessionId <= sessionsCount, "Invalid session ID");
        return sessionAllowedVoters[_sessionId];
    }

    function isEligibleForSession(uint256 _sessionId, address _voter) public view returns (bool) {
        require(_sessionId > 0 && _sessionId <= sessionsCount, "Invalid session ID");

        if (sessionAllowedVoters[_sessionId].length == 0) {
            return true;
        }

        return isSessionVoterAllowed[_sessionId][_voter];
    }

    function vote(uint256 _sessionId, uint256 _candidateId) public {
        require(_sessionId > 0 && _sessionId <= sessionsCount, "Invalid session ID");
        Session storage session = sessions[_sessionId];
        
        require(session.isActive, "Session is closed");
        require(block.timestamp >= session.startTime, "Voting has not started");
        require(block.timestamp <= session.endTime, "Voting has ended");
        require(!hasVotedInSession[_sessionId][msg.sender], "You have already voted in this session");
        require(isEligibleForSession(_sessionId, msg.sender), "You are not eligible for this session");
        
        // ** NFT OWNERSHIP CHECK (INTERNAL) **
        require(balanceOf(msg.sender) > 0, "You must hold a Student NFT to vote");

        require(_candidateId > 0 && _candidateId <= sessionCandidates[_sessionId].length, "Invalid candidate ID");

        // Record vote
        hasVotedInSession[_sessionId][msg.sender] = true;
        
        // Update candidate vote count (array is 0-indexed, ID is 1-indexed)
        sessionCandidates[_sessionId][_candidateId - 1].voteCount++;

        userVoteHistory[msg.sender].push(VoteRecord({
            sessionId: _sessionId,
            candidateId: _candidateId,
            timestamp: block.timestamp
        }));

        emit Voted(_sessionId, msg.sender, _candidateId);
    }

    // --- View Functions ---

    function getAllSessions() public view returns (Session[] memory) {
        Session[] memory allSessions = new Session[](sessionsCount);
        for (uint256 i = 1; i <= sessionsCount; i++) {
            allSessions[i - 1] = sessions[i];
        }
        return allSessions;
    }

    function getCandidates(uint256 _sessionId) public view returns (Candidate[] memory) {
        return sessionCandidates[_sessionId];
    }

    function getUserHistory(address _user) public view returns (VoteRecord[] memory) {
        return userVoteHistory[_user];
    }

    function checkUserVoted(uint256 _sessionId, address _user) public view returns (bool) {
        return hasVotedInSession[_sessionId][_user];
    }

    // Required override for AccessControl and ERC721 interaction if any, 
    // ERC721 and AccessControl both implement supportsInterface
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
