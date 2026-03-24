export const MSTAY_REVIEWS_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_coreAddress',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
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
        name: 'reservationId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'reviewer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'reviewedUser',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'rating',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'comment',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'forHost',
        type: 'bool',
      },
    ],
    name: 'ReviewAdded',
    type: 'event',
  },
  {
    inputs: [],
    name: 'core',
    outputs: [
      {
        internalType: 'contract IMStayCore',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'getReviewsForUser',
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
            name: 'reservationId',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'reviewer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'reviewedUser',
            type: 'address',
          },
          {
            internalType: 'uint8',
            name: 'rating',
            type: 'uint8',
          },
          {
            internalType: 'string',
            name: 'comment',
            type: 'string',
          },
          {
            internalType: 'bool',
            name: 'forHost',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'createdAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct MStayReviews.Review[]',
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
        name: '',
        type: 'uint256',
      },
    ],
    name: 'guestReviewLeft',
    outputs: [
      {
        internalType: 'bool',
        name: '',
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
        name: '',
        type: 'uint256',
      },
    ],
    name: 'hostReviewLeft',
    outputs: [
      {
        internalType: 'bool',
        name: '',
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
        name: '_reservationId',
        type: 'uint256',
      },
      {
        internalType: 'uint8',
        name: '_rating',
        type: 'uint8',
      },
      {
        internalType: 'string',
        name: '_comment',
        type: 'string',
      },
      {
        internalType: 'bool',
        name: '_forHost',
        type: 'bool',
      },
    ],
    name: 'leaveReview',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'reviewCount',
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
    name: 'reviews',
    outputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'reservationId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'reviewer',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'reviewedUser',
        type: 'address',
      },
      {
        internalType: 'uint8',
        name: 'rating',
        type: 'uint8',
      },
      {
        internalType: 'string',
        name: 'comment',
        type: 'string',
      },
      {
        internalType: 'bool',
        name: 'forHost',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'createdAt',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]
