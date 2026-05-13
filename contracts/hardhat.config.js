require("@nomicfoundation/hardhat-toolbox");
require("hardhat-ethernal");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      // Ethernal hanya diperlukan saat node lokal berjalan
    },
    amoy: {
      url: process.env.AMOY_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY !== undefined && process.env.PRIVATE_KEY.length >= 64 ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002
    }
  },

  // Konfigurasi Ethernal (blockchain explorer untuk development)
  ethernal: {
    apiToken: process.env.ETHERNAL_API_TOKEN,        // Token dari app.tryethernal.com
    workspace: process.env.ETHERNAL_WORKSPACE,        // (Opsional) nama workspace spesifik
    disableSync: false,                               // true = matikan sinkronisasi otomatis
    uploadAst: true,                                  // Upload AST untuk fitur Storage di dashboard
    disabled: !process.env.ETHERNAL_API_TOKEN,        // Otomatis disable jika token belum diset
  },
};
