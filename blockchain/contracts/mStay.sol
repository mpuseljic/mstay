// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract mStay {
    uint256 public listingCount;

    struct Listing {
        uint256 id;
        address host;
        string title;
        string location;
        uint256 pricePerNight;
        bool isActive;
    }

    mapping(uint256 => Listing) public listings;

    event ListingCreated(
        uint256 indexed id,
        address indexed host,
        string title,
        string location,
        uint256 pricePerNight
    );

    function createListing(
        string memory _title,
        string memory _location,
        uint256 _pricePerNight
    ) public {
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

    function getListing(uint256 _id) public view returns (Listing memory) {
        return listings[_id];
    }
}