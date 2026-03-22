// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract mStay {
    uint256 public listingCount;
    uint256 public reservationCount;

    struct Listing {
        uint256 id;
        address host;
        string title;
        string location;
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
        bool isCancelled;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Reservation) public reservations;

    event ListingCreated(
        uint256 indexed id,
        address indexed host,
        string title,
        string location,
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

    function createListing(
        string memory _title,
        string memory _location,
        uint256 _pricePerNight
    ) public {
        require(bytes(_title).length > 0, "Title is required");
        require(bytes(_location).length > 0, "Location is required");
        require(_pricePerNight > 0, "Price must be greater than 0");
        listingCount++;

        listings[listingCount] = Listing({
            id: listingCount,
            host: msg.sender,
            title: _title,
            location: _location,
            pricePerNight: _pricePerNight,
            isActive: true
        });

        emit ListingCreated(
            listingCount,
            msg.sender,
            _title,
            _location,
            _pricePerNight
        );
    }

    function makeReservation(
        uint256 _listingId,
        uint256 _checkInDate,
        uint256 _checkOutDate
    ) public {
        require(_listingId > 0 && _listingId <= listingCount, "Listing does not exist");
        require(listings[_listingId].isActive, "Listing is not active");
        require(_checkOutDate > _checkInDate, "Invalid dates");

        uint256 nights = (_checkOutDate - _checkInDate) / 1 days;
        require(nights > 0, "Reservation must be at least 1 night");

        uint256 totalPrice = nights * listings[_listingId].pricePerNight;

        reservationCount++;

        reservations[reservationCount] = Reservation({
            id: reservationCount,
            listingId: _listingId,
            guest: msg.sender,
            checkInDate: _checkInDate,
            checkOutDate: _checkOutDate,
            nights: nights,
            totalPrice: totalPrice,
            isCancelled: false
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
}