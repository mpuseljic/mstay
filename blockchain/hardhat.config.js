require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 50,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8546",
    },
  },
};
