// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract mStay {
    uint256 public listingCount;
    uint256 public reservationCount;

    enum ReservationStatus {
        Active,
        CancelledByGuest,
        CancelledByHost,
        PaidOut,
        Refunded
    }

    struct Listing {
        uint256 id;
        address host;
        string title;
        string location;
        string[] imageUrls;
        uint256 pricePerNight;
        bool isActive;
    }

    struct Reservation {
        uint256 id;
        uint256 listingId;
        address guest;
        uint256 checkInDate;
        uint256 checkOutDate;
        uint256 nights;
        uint256 totalPrice;
        ReservationStatus status;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Reservation) public reservations;

    event ListingCreated(
        uint256 indexed id,
        address indexed host,
        string title,
        string location,
        string[] imageUrls,
        uint256 pricePerNight
    );

    event ReservationCreated(
        uint256 indexed id,
        uint256 indexed listingId,
        address indexed guest,
        uint256 checkInDate,
        uint256 checkOutDate,
        uint256 nights,
        uint256 totalPrice

    );

    event ReservationCancelledByGuest(uint256 indexed reservationId);
    event ReservationCancelledByHost(uint256 indexed reservationId);
    event RefundIssued(uint256 indexed reservationId, address indexed guest, uint256 amount);
    event PayoutReleased(uint256 indexed reservationId, address indexed host, uint256 amount);

    function createListing(
        string memory _title,
        string memory _location,
        string[] memory _imageUrls,
        uint256 _pricePerNight
    ) public {
        require(bytes(_title).length > 0, "Title is required");
        require(bytes(_location).length > 0, "Location is required");
        require(_imageUrls.length > 0, "At least one image is required");
        require(_pricePerNight > 0, "Price must be greater than 0");

        listingCount++;

        listings[listingCount] = Listing({
            id: listingCount,
            host: msg.sender,
            title: _title,
            location: _location,
            imageUrls: _imageUrls,
            pricePerNight: _pricePerNight,
            isActive: true
        });

        emit ListingCreated(
            listingCount,
            msg.sender,
            _title,
            _location,
            _imageUrls,
            _pricePerNight
        );
    }

    function makeReservation(
        uint256 _listingId,
        uint256 _checkInDate,
        uint256 _checkOutDate
    ) public payable {
        require(_listingId > 0 && _listingId <= listingCount, "Listing does not exist");
        require(listings[_listingId].isActive, "Listing is not active");
        require(listings[_listingId].host != msg.sender, "Host cannot reserve own listing");
        require(_checkOutDate > _checkInDate, "Invalid dates");

        (uint256 nights, uint256 totalPrice) = calculateReservationPrice(
            _listingId,
            _checkInDate,
            _checkOutDate
        );

        require(msg.value == totalPrice, "Incorrect ETH amount sent");

        reservationCount++;

        reservations[reservationCount] = Reservation({
            id: reservationCount,
            listingId: _listingId,
            guest: msg.sender,
            checkInDate: _checkInDate,
            checkOutDate: _checkOutDate,
            nights: nights,
            totalPrice: totalPrice,
            status: ReservationStatus.Active
        });

        emit ReservationCreated(
            reservationCount,
            _listingId,
            msg.sender,
            _checkInDate,
            _checkOutDate,
            nights,
            totalPrice
        );
    }

    function calculateReservationPrice(
    uint256 _listingId,
    uint256 _checkInDate,
    uint256 _checkOutDate
) public view returns (uint256 nights, uint256 totalPrice) {
    require(_listingId > 0 && _listingId <= listingCount, "Listing does not exist");
    require(listings[_listingId].isActive, "Listing is not active");
    require(_checkOutDate > _checkInDate, "Invalid dates");

    nights = (_checkOutDate - _checkInDate) / 1 days;
    require(nights > 0, "Reservation must be at least 1 night");

    totalPrice = nights * listings[_listingId].pricePerNight;
}

    function cancelReservationByGuest(uint256 _reservationId) public {
        require(_reservationId > 0 && _reservationId <= reservationCount, "Reservation does not exist");

        Reservation storage reservation = reservations[_reservationId];
        require(reservation.guest == msg.sender, "Only guest can cancel");
        require(reservation.status == ReservationStatus.Active, "Reservation is not active");
        require(block.timestamp < reservation.checkInDate, "Cannot cancel after check-in");

        reservation.status = ReservationStatus.CancelledByGuest;

        uint256 refundAmount = reservation.totalPrice;
        reservation.status = ReservationStatus.Refunded;

        (bool success, ) = reservation.guest.call{value: refundAmount}("");
        require(success, "Refund failed");

        emit ReservationCancelledByGuest(_reservationId);
        emit RefundIssued(_reservationId, reservation.guest, refundAmount);
    }

    function cancelReservationByHost(uint256 _reservationId) public {
        require(_reservationId > 0 && _reservationId <= reservationCount, "Reservation does not exist");

        Reservation storage reservation = reservations[_reservationId];
        Listing storage listing = listings[reservation.listingId];

        require(listing.host == msg.sender, "Only host can cancel");
        require(reservation.status == ReservationStatus.Active, "Reservation is not active");

        reservation.status = ReservationStatus.CancelledByHost;

        uint256 refundAmount = reservation.totalPrice;
        reservation.status = ReservationStatus.Refunded;

        (bool success, ) = reservation.guest.call{value: refundAmount}("");
        require(success, "Refund failed");

        emit ReservationCancelledByHost(_reservationId);
        emit RefundIssued(_reservationId, reservation.guest, refundAmount);
    }

    function releasePayout(uint256 _reservationId) public {
        require(_reservationId > 0 && _reservationId <= reservationCount, "Reservation does not exist");

        Reservation storage reservation = reservations[_reservationId];
        Listing storage listing = listings[reservation.listingId];

        require(listing.host == msg.sender, "Only host can release payout");
        require(reservation.status == ReservationStatus.Active, "Reservation is not active");
        require(block.timestamp >= reservation.checkInDate, "Payout available after check-in");

        reservation.status = ReservationStatus.PaidOut;

        uint256 payoutAmount = reservation.totalPrice;

        (bool success, ) = listing.host.call{value: payoutAmount}("");
        require(success, "Payout failed");

        emit PayoutReleased(_reservationId, listing.host, payoutAmount);
    }

    function getListing(uint256 _id) public view returns (Listing memory) {
        require(_id > 0 && _id <= listingCount, "Listing does not exist");
        return listings[_id];
    }

    function getAllListings() public view returns (Listing[] memory){
        Listing[] memory result = new Listing[](listingCount);

        for(uint256 i = 0; i < listingCount; i++){
            result[i] = listings[i + 1];
        }

        return result;
    }


function getAllReservations() public view returns (Reservation[] memory) {
        Reservation[] memory result = new Reservation[](reservationCount);

        for (uint256 i = 0; i < reservationCount; i++) {
            result[i] = reservations[i + 1];
        }

        return result;
    }

    function getReservationsByGuest(address _guest) public view returns (Reservation[] memory) {
        uint256 count = 0;

        for (uint256 i = 1; i <= reservationCount; i++) {
            if (reservations[i].guest == _guest) {
                count++;
            }
        }

        Reservation[] memory result = new Reservation[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= reservationCount; i++) {
            if (reservations[i].guest == _guest) {
                result[index] = reservations[i];
                index++;
            }
        }

        return result;
    }

    function getReservationsByHost(address _host) public view returns (Reservation[] memory) {
        uint256 count = 0;

        for (uint256 i = 1; i <= reservationCount; i++) {
            Listing memory listing = listings[reservations[i].listingId];
            if (listing.host == _host) {
                count++;
            }
        }

        Reservation[] memory result = new Reservation[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= reservationCount; i++) {
            Listing memory listing = listings[reservations[i].listingId];
            if (listing.host == _host) {
                result[index] = reservations[i];
                index++;
            }
        }

        return result;
    }
}