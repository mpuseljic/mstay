// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMStayCore {
    function getReservationBasic(uint256 _reservationId)
        external
        view
        returns (
            uint256 listingId,
            address guest,
            uint256 checkOutDate,
            uint8 status
        );

    function getListingHost(uint256 _listingId) external view returns (address);
}

contract MStayReviews {
    IMStayCore public core;
    uint256 public reviewCount;

    struct Review {
        uint256 id;
        uint256 reservationId;
        address reviewer;
        address reviewedUser;
        uint8 rating;
        string comment;
        bool forHost;
        uint256 createdAt;
    }

    mapping(uint256 => Review) public reviews;
    mapping(uint256 => bool) public guestReviewLeft;
    mapping(uint256 => bool) public hostReviewLeft;

    event ReviewAdded(
        uint256 indexed id,
        uint256 indexed reservationId,
        address indexed reviewer,
        address reviewedUser,
        uint8 rating,
        string comment,
        bool forHost
    );

    constructor(address _coreAddress) {
        core = IMStayCore(_coreAddress);
    }

    function leaveReview(
        uint256 _reservationId,
        uint8 _rating,
        string memory _comment,
        bool _forHost
    ) public {
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
        require(bytes(_comment).length > 0, "Comment is required");

        (
            uint256 listingId,
            address guest,
            uint256 checkOutDate,
            uint8 status
        ) = core.getReservationBasic(_reservationId);

        require(listingId > 0, "Reservation does not exist");
        require(block.timestamp >= checkOutDate, "Review available after check-out");
        require(status == 0 || status == 3, "Reservation is not reviewable");

        address host = core.getListingHost(listingId);
        address reviewedUser;

        if (_forHost) {
            require(msg.sender == guest, "Only guest can review host");
            require(!guestReviewLeft[_reservationId], "Guest review already submitted");
            reviewedUser = host;
            guestReviewLeft[_reservationId] = true;
        } else {
            require(msg.sender == host, "Only host can review guest");
            require(!hostReviewLeft[_reservationId], "Host review already submitted");
            reviewedUser = guest;
            hostReviewLeft[_reservationId] = true;
        }

        reviewCount++;

        reviews[reviewCount] = Review({
            id: reviewCount,
            reservationId: _reservationId,
            reviewer: msg.sender,
            reviewedUser: reviewedUser,
            rating: _rating,
            comment: _comment,
            forHost: _forHost,
            createdAt: block.timestamp
        });

        emit ReviewAdded(
            reviewCount,
            _reservationId,
            msg.sender,
            reviewedUser,
            _rating,
            _comment,
            _forHost
        );
    }

    function getReviewsForUser(address _user) public view returns (Review[] memory) {
        uint256 count = 0;

        for (uint256 i = 1; i <= reviewCount; i++) {
            if (reviews[i].reviewedUser == _user) {
                count++;
            }
        }

        Review[] memory result = new Review[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= reviewCount; i++) {
            if (reviews[i].reviewedUser == _user) {
                result[index] = reviews[i];
                index++;
            }
        }

        return result;
    }

    function getReviewSummaryForUser(address _user)
    public
    view
    returns (uint256 averageRatingScaled, uint256 totalReviews)
{
    uint256 sum = 0;
    uint256 count = 0;

    for (uint256 i = 1; i <= reviewCount; i++) {
        if (reviews[i].reviewedUser == _user) {
            sum += reviews[i].rating;
            count++;
        }
    }

    if (count == 0) {
        return (0, 0);
    }

    averageRatingScaled = (sum * 10) / count;
    totalReviews = count;
}
}