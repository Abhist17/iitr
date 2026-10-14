// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DocumentVerification {

    enum Status { Pending, Approved, Rejected }

    struct DocumentRecord {
        string applicationId;
        string ipfsCid;
        bytes32 documentHash;
        uint256 confidenceScore; // stored as integer, e.g. 93 = 0.93
        Status status;
        address submittedBy;
        address verifiedBy;
        uint256 submittedAt;
        uint256 verifiedAt;
        string rejectionReason;
    }

    mapping(string => DocumentRecord) public records;
    mapping(address => bool) public authorizedOfficers;
    address public admin;

    event DocumentSubmitted(string applicationId, string ipfsCid, uint256 timestamp);
    event DocumentVerified(string applicationId, Status status, address officer, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyOfficer() {
        require(authorizedOfficers[msg.sender], "Not authorized officer");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedOfficers[msg.sender] = true;
    }

    function addOfficer(address officer) external onlyAdmin {
        authorizedOfficers[officer] = true;
    }

    function submitDocument(
        string memory applicationId,
        string memory ipfsCid,
        bytes32 documentHash,
        uint256 confidenceScore
    ) external {
        require(bytes(records[applicationId].applicationId).length == 0, "Already submitted");

        records[applicationId] = DocumentRecord({
            applicationId: applicationId,
            ipfsCid: ipfsCid,
            documentHash: documentHash,
            confidenceScore: confidenceScore,
            status: Status.Pending,
            submittedBy: msg.sender,
            verifiedBy: address(0),
            submittedAt: block.timestamp,
            verifiedAt: 0,
            rejectionReason: ""
        });

        emit DocumentSubmitted(applicationId, ipfsCid, block.timestamp);
    }

    function verifyDocument(
        string memory applicationId,
        bool approved,
        string memory rejectionReason
    ) external onlyOfficer {
        DocumentRecord storage record = records[applicationId];
        require(bytes(record.applicationId).length > 0, "Record not found");
        require(record.status == Status.Pending, "Already verified");

        record.status = approved ? Status.Approved : Status.Rejected;
        record.verifiedBy = msg.sender;
        record.verifiedAt = block.timestamp;
        record.rejectionReason = rejectionReason;

        emit DocumentVerified(applicationId, record.status, msg.sender, block.timestamp);
    }

    function getRecord(string memory applicationId) external view returns (DocumentRecord memory) {
        return records[applicationId];
    }
}