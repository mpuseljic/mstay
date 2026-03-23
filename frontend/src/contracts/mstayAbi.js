export const MSTAY_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'host',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'title',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'location',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string[]',
        name: 'imageUrls',
        type: 'string[]',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'pricePerNight',
        type: 'uint256',
      },
    ],
    name: 'ListingCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'reservationId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'host',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'PayoutReleased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'reservationId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'guest',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'RefundIssued',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'reservationId',
        type: 'uint256',
      },
    ],
    name: 'ReservationCancelledByGuest',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'reservationId',
        type: 'uint256',
      },
    ],
    name: 'ReservationCancelledByHost',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'listingId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'guest',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'checkInDate',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'checkOutDate',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nights',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalPrice',
        type: 'uint256',
      },
    ],
    name: 'ReservationCreated',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_listingId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_checkInDate',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_checkOutDate',
        type: 'uint256',
      },
    ],
    name: 'calculateReservationPrice',
    outputs: [
      {
        internalType: 'uint256',
        name: 'nights',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalPrice',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_reservationId',
        type: 'uint256',
      },
    ],
    name: 'cancelReservationByGuest',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_reservationId',
        type: 'uint256',
      },
    ],
    name: 'cancelReservationByHost',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_title',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_location',
        type: 'string',
      },
      {
        internalType: 'string[]',
        name: '_imageUrls',
        type: 'string[]',
      },
      {
        internalType: 'uint256',
        name: '_pricePerNight',
        type: 'uint256',
      },
    ],
    name: 'createListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllListings',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'id',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'host',
            type: 'address',
          },
          {
            internalType: 'string',
            name: 'title',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'location',
            type: 'string',
          },
          {
            internalType: 'string[]',
            name: 'imageUrls',
            type: 'string[]',
          },
          {
            internalType: 'uint256',
            name: 'pricePerNight',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'isActive',
            type: 'bool',
          },
        ],
        internalType: 'struct mStay.Listing[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllReservations',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'id',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'listingId',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'guest',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'checkInDate',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'checkOutDate',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'nights',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'totalPrice',
            type: 'uint256',
          },
          {
            internalType: 'enum mStay.ReservationStatus',
            name: 'status',
            type: 'uint8',
          },
        ],
        internalType: 'struct mStay.Reservation[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_id',
        type: 'uint256',
      },
    ],
    name: 'getListing',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'id',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'host',
            type: 'address',
          },
          {
            internalType: 'string',
            name: 'title',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'location',
            type: 'string',
          },
          {
            internalType: 'string[]',
            name: 'imageUrls',
            type: 'string[]',
          },
          {
            internalType: 'uint256',
            name: 'pricePerNight',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'isActive',
            type: 'bool',
          },
        ],
        internalType: 'struct mStay.Listing',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_guest',
        type: 'address',
      },
    ],
    name: 'getReservationsByGuest',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'id',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'listingId',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'guest',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'checkInDate',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'checkOutDate',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'nights',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'totalPrice',
            type: 'uint256',
          },
          {
            internalType: 'enum mStay.ReservationStatus',
            name: 'status',
            type: 'uint8',
          },
        ],
        internalType: 'struct mStay.Reservation[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_host',
        type: 'address',
      },
    ],
    name: 'getReservationsByHost',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'id',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'listingId',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'guest',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'checkInDate',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'checkOutDate',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'nights',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'totalPrice',
            type: 'uint256',
          },
          {
            internalType: 'enum mStay.ReservationStatus',
            name: 'status',
            type: 'uint8',
          },
        ],
        internalType: 'struct mStay.Reservation[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'listingCount',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'listings',
    outputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'host',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'title',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'location',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'pricePerNight',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'isActive',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_listingId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_checkInDate',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_checkOutDate',
        type: 'uint256',
      },
    ],
    name: 'makeReservation',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_reservationId',
        type: 'uint256',
      },
    ],
    name: 'releasePayout',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'reservationCount',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'reservations',
    outputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'listingId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'guest',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'checkInDate',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'checkOutDate',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'nights',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalPrice',
        type: 'uint256',
      },
      {
        internalType: 'enum mStay.ReservationStatus',
        name: 'status',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]
