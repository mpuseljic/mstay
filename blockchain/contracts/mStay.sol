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
}